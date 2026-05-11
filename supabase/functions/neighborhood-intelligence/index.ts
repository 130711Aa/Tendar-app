import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface NearbyMerchant {
  merchant_id: string;
  business_name: string;
  category: string;
  address_label: string;
  distance_m: number;
  lon: number;
  lat: number;
}

// ── Gemini helper ─────────────────────────────────────────────────────────────
async function callGemini(prompt: string, geminiApiKey: string): Promise<string> {
  const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
  let lastError = "";

  for (const model of MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return text;
      throw new Error("Respons kosong dari Gemini");
    }

    const errText = await res.text();
    console.error(`[neighborhood-intelligence] Gemini error (${model}):`, errText);
    lastError = errText;
    if (res.status !== 503 && res.status !== 404) break;
  }

  throw new Error(`Gemini API gagal: ${lastError.slice(0, 200)}`);
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) return json({ error: "GEMINI_API_KEY tidak dikonfigurasi" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json();
    const { action, tenant_id, lon, lat, radius_km = 5, business_name, category } = body;

    if (!tenant_id) return json({ error: "tenant_id wajib diisi" }, 400);

    // ── ACTION: save_location ──────────────────────────────────────────────────
    if (action === "save_location") {
      if (!lon || !lat) return json({ error: "lon & lat wajib diisi" }, 400);

      const { error } = await supabase.from("merchant_locations").upsert(
        {
          merchant_id: tenant_id,
          coordinates: `POINT(${lon} ${lat})`,
          address_label: body.address_label || null,
          category: body.category || null,
          is_visible_on_map: body.is_visible_on_map !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "merchant_id" }
      );

      if (error) throw error;
      return json({ success: true });
    }

    // ── ACTION: get_my_location ───────────────────────────────────────────────
    if (action === "get_my_location") {
      const { data, error } = await supabase
        .from("merchant_locations")
        .select("*")
        .eq("merchant_id", tenant_id)
        .maybeSingle();

      if (error) throw error;
      return json({ location: data });
    }

    // ── ACTION: get_nearby ─────────────────────────────────────────────────────
    if (action === "get_nearby") {
      if (!lon || !lat) return json({ error: "lon & lat wajib diisi" }, 400);

      const radiusMeters = Math.min(radius_km * 1000, 50000);

      const { data, error } = await supabase.rpc("get_nearby_merchants", {
        p_lon: lon,
        p_lat: lat,
        p_radius: radiusMeters,
      });

      if (error) throw error;

      // Exclude self
      const nearby = (data as NearbyMerchant[]).filter(
        (m) => m.merchant_id !== tenant_id
      );

      return json({ nearby, total: nearby.length });
    }

    // ── ACTION: competitive_analysis ──────────────────────────────────────────
    if (action === "competitive_analysis") {
      if (!lon || !lat) return json({ error: "lon & lat wajib diisi" }, 400);

      // Check cache (max 24h old)
      const cacheFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from("neighborhood_insights")
        .select("content, generated_at, metadata")
        .eq("merchant_id", tenant_id)
        .eq("insight_type", "competitive")
        .gte("generated_at", cacheFrom)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return json({ insight: cached.content, metadata: cached.metadata, cached: true });
      }

      // Fetch nearby merchants
      const radiusMeters = Math.min(radius_km * 1000, 50000);
      const { data: nearbyRaw, error: nearbyErr } = await supabase.rpc("get_nearby_merchants", {
        p_lon: lon,
        p_lat: lat,
        p_radius: radiusMeters,
      });
      if (nearbyErr) throw nearbyErr;

      const nearby = (nearbyRaw as NearbyMerchant[]).filter((m) => m.merchant_id !== tenant_id);

      // Category distribution
      const catMap: Record<string, number> = {};
      nearby.forEach((m) => {
        const cat = m.category || "lainnya";
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      const prompt = `Kamu adalah konsultan bisnis F&B untuk UMKM Indonesia. Berikan analisis pasar lokal berdasarkan data berikut:

Merchant saya: "${business_name || "Warung saya"}", kategori: ${category || "makanan/minuman"}, dalam radius ${radius_km}km.
Total merchant Tendar di sekitar: ${nearby.length} warung.
Distribusi kategori di area: ${Object.entries(catMap).map(([k, v]) => `${k} (${v})`).join(", ") || "belum ada data"}.
Merchant terdekat: ${nearby.slice(0, 8).map((m) => `${m.business_name} (${m.category}, ${Math.round(m.distance_m)}m)`).join("; ") || "belum ada merchant lain"}.

Tugas kamu:
1. Identifikasi gap pasar — kategori yang kurang atau belum ada di area ini
2. Berikan 1 rekomendasi diferensiasi yang spesifik dan langsung bisa dieksekusi
3. Identifikasi 1 peluang kolaborasi dengan merchant terdekat (jika ada) beserta alasannya

Gunakan bahasa Indonesia yang santai dan akrab, seperti teman bicara. Maksimal 180 kata. Mulai langsung dengan poin pertama tanpa kalimat pembuka.`;

      const insight = await callGemini(prompt, geminiApiKey);

      const metadata = {
        radius_km,
        nearby_count: nearby.length,
        category_distribution: catMap,
        lon,
        lat,
      };

      // Save to cache
      await supabase.from("neighborhood_insights").insert({
        merchant_id: tenant_id,
        insight_type: "competitive",
        content: insight,
        metadata,
      });

      return json({ insight, metadata, cached: false });
    }

    // ── ACTION: time_machine ───────────────────────────────────────────────────
    if (action === "time_machine") {
      // Check cache (max 6h old — more frequent for time-sensitive predictions)
      const cacheFrom = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from("neighborhood_insights")
        .select("content, generated_at, metadata")
        .eq("merchant_id", tenant_id)
        .eq("insight_type", "time_machine")
        .gte("generated_at", cacheFrom)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return json({ insight: cached.content, metadata: cached.metadata, cached: true });
      }

      // Fetch order history (last 28 days)
      const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
      const { data: orders, error: ordersErr } = await supabase
        .from("orders")
        .select("total_amount, status, created_at, items, payment_method")
        .eq("tenant_id", tenant_id)
        .eq("status", "completed")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(300);

      if (ordersErr) throw ordersErr;

      // Build sales summary
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayRevenue: Record<string, number> = {};
      const hourCounts: Record<number, number> = {};
      const productCounts: Record<string, number> = {};

      (orders || []).forEach((o) => {
        const d = new Date(
          new Date(o.created_at).toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
        );
        const day = dayNames[d.getDay()];
        dayRevenue[day] = (dayRevenue[day] || 0) + (o.total_amount || 0);
        hourCounts[d.getHours()] = (hourCounts[d.getHours()] || 0) + 1;
        (o.items || []).forEach((item: { name: string; quantity: number }) => {
          productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
        });
      });

      const topProducts = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => `${name} (${count}x)`);

      const bestDay = Object.entries(dayRevenue).sort(([, a], [, b]) => b - a)[0];
      const worstDay = Object.entries(dayRevenue).sort(([, a], [, b]) => a - b)[0];
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];

      // Get current Jakarta date/time context
      const jakartaNow = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })
      );
      const tomorrowDay = dayNames[(jakartaNow.getDay() + 1) % 7];
      const tomorrowDate = new Date(jakartaNow);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowStr = tomorrowDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });

      // Weather data (OpenWeatherMap free tier — lon/lat passed from frontend)
      let weatherContext = "data cuaca tidak tersedia";
      const openWeatherKey = Deno.env.get("OPENWEATHER_API_KEY");
      if (openWeatherKey && lon && lat) {
        try {
          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${openWeatherKey}&units=metric&lang=id&cnt=8`
          );
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            const tomorrow = weatherData.list?.[4]; // ~12 hours ahead
            if (tomorrow) {
              const desc = tomorrow.weather?.[0]?.description || "-";
              const temp = Math.round(tomorrow.main?.temp || 0);
              const rain = tomorrow.rain?.["3h"] || 0;
              weatherContext = `${desc}, suhu ${temp}°C${rain > 0 ? `, hujan ${rain}mm` : ""}`;
            }
          }
        } catch (_) {
          // Weather fetch silently fails — prediction continues without it
        }
      }

      const prompt = `Kamu adalah asisten prediksi bisnis yang cerdas untuk warung "${business_name || "ini"}".

Data penjualan 4 minggu terakhir (${(orders || []).length} transaksi):
- Produk paling laris: ${topProducts.join(", ") || "belum ada data"}
- Hari terbaik: ${bestDay ? `${bestDay[0]} (Rp${Number(bestDay[1]).toLocaleString("id-ID")})` : "belum ada data"}
- Hari paling sepi: ${worstDay ? worstDay[0] : "belum ada data"}
- Jam paling ramai: ${peakHour ? `${peakHour[0]}:00 - ${Number(peakHour[0]) + 1}:00 WIB` : "belum ada data"}

Konteks besok (${tomorrowStr}):
- Cuaca: ${weatherContext}

Berikan prediksi bisnis untuk besok dalam format:
📈 **Perkiraan Traffic** — lebih ramai/sama/lebih sepi (dan perkiraan %)
🍽️ **Menu Andalan Besok** — apa yang kemungkinan paling laku
💡 **Satu Tips Persiapan** — satu aksi konkret yang bisa dilakukan sekarang

Gunakan bahasa santai seperti teman lama yang pintar. Maksimal 120 kata total.`;

      const insight = await callGemini(prompt, geminiApiKey);

      const metadata = {
        order_count: (orders || []).length,
        top_products: topProducts,
        best_day: bestDay?.[0] || null,
        peak_hour: peakHour ? `${peakHour[0]}:00` : null,
        weather_context: weatherContext,
        tomorrow: tomorrowStr,
        lon,
        lat,
      };

      // Save to cache
      await supabase.from("neighborhood_insights").insert({
        merchant_id: tenant_id,
        insight_type: "time_machine",
        content: insight,
        metadata,
      });

      return json({ insight, metadata, cached: false });
    }

    return json({ error: `Action tidak dikenal: ${action}` }, 400);
  } catch (err) {
    console.error("[neighborhood-intelligence]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
