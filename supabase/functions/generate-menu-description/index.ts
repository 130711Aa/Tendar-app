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

    const { name, price, category } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Nama produk wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Kamu adalah copywriter F&B profesional untuk brand minuman Indonesia. Buatkan deskripsi menu yang menarik, singkat, dan menggugah selera untuk produk berikut:

Nama Produk: ${name}
${price ? `Harga: Rp${Number(price).toLocaleString("id-ID")}` : ""}
${category ? `Kategori: ${category}` : ""}

Instruksi:
- Tulis dalam Bahasa Indonesia yang natural dan hangat
- Maksimal 2 kalimat, langsung ke poin
- Sebutkan bahan utama jika bisa diinfer dari nama produk
- Tone: menggiurkan, segar, dan mengundang
- JANGAN sertakan nama produk di awal deskripsi
- JANGAN gunakan kata "lezat" atau "nikmat" (terlalu klise)

Balas HANYA dengan teks deskripsinya saja, tanpa tanda kutip atau penjelasan tambahan.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-menu-description] Gemini error:", errText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const description = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!description) {
      throw new Error("Respons kosong dari Gemini");
    }

    return new Response(
      JSON.stringify({ description }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-menu-description]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
