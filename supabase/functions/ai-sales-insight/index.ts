import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY tidak dikonfigurasi" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
       return new Response(
        JSON.stringify({ error: "SUPABASE_URL atau SUPABASE_ANON_KEY tidak dikonfigurasi" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { 
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Fetch orders from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount, status, created_at, items, payment_method")
      .eq("tenant_id", tenant_id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({
          insight: "Belum ada data pesanan dalam 30 hari terakhir. Mulai terima pesanan pertamamu hari ini! 🚀",
          stats: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute stats for prompt
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    // Product ranking
    const productCounts: Record<string, number> = {};
    orders.forEach(o => {
      (o.items || []).forEach((item: { name: string; quantity: number }) => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });
    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count}x)`);

    // Peak hours
    const hourCounts: Record<number, number> = {};
    orders.forEach(o => {
      const jakartaHour = new Date(
        new Date(o.created_at).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      ).getHours();
      hourCounts[jakartaHour] = (hourCounts[jakartaHour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
    const peakHourStr = peakHour ? `${peakHour[0]}:00 - ${Number(peakHour[0]) + 1}:00 WIB` : "-";

    // Revenue by day of week
    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayRevenue: Record<string, number> = {};
    orders.forEach(o => {
      const day = dayNames[new Date(new Date(o.created_at).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getDay()];
      dayRevenue[day] = (dayRevenue[day] || 0) + (o.total_amount || 0);
    });
    const bestDay = Object.entries(dayRevenue).sort(([, a], [, b]) => b - a)[0];

    // Payment method split
    const cashCount = orders.filter(o => o.payment_method === "cash").length;
    const qrisCount = orders.filter(o => o.payment_method === "cashless").length;

    const prompt = `Kamu adalah AI business consultant untuk UMKM F&B Indonesia. Analisis data penjualan berikut dan berikan insight yang actionable dalam Bahasa Indonesia:

DATA PENJUALAN 30 HARI TERAKHIR:
- Total Pesanan Selesai: ${orders.length}
- Total Pendapatan: Rp${totalRevenue.toLocaleString("id-ID")}
- Rata-rata per pesanan: Rp${Math.round(totalRevenue / orders.length).toLocaleString("id-ID")}
- Produk Terlaris: ${topProducts.join(", ") || "Tidak ada data"}
- Jam Tersibuk: ${peakHourStr}
- Hari Terbaik: ${bestDay ? `${bestDay[0]} (Rp${Number(bestDay[1]).toLocaleString("id-ID")})` : "-"}
- Metode Bayar: Cash ${cashCount} pesanan, QRIS ${qrisCount} pesanan

INSTRUKSI:
- Berikan 3 insight bisnis yang paling actionable dan spesifik
- Setiap insight dimulai dengan emoji yang relevan
- Format: paragraf singkat per insight, gunakan bullet point
- Gunakan angka spesifik dari data di atas
- Berikan saran konkret yang bisa langsung diimplementasikan
- Tone: seperti konsultan berpengalaman, ramah tapi profesional
- Maksimal 200 kata total

Balas langsung dengan insight-nya, tanpa pembukaan atau penutup formal.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ai-sales-insight] Gemini error:", errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const insight = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!insight) {
      throw new Error("Respons kosong dari Gemini");
    }

    return new Response(
      JSON.stringify({
        insight,
        stats: {
          totalOrders: orders.length,
          totalRevenue,
          topProducts,
          peakHour: peakHourStr,
          bestDay: bestDay ? bestDay[0] : null,
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-sales-insight]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
