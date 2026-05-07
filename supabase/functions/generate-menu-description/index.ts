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

    const MODELS = ["gemini-2.5-flash", "gemini-2.5-pro"];
    let response: Response | null = null;
    const errors: string[] = [];

    for (const model of MODELS) {
      console.log(`[generate-menu-description] Trying model: ${model}`);
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 1024,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );
      if (response.ok) {
        console.log(`[generate-menu-description] Success with model: ${model}`);
        break;
      }
      const errText = await response.text();
      console.error(`[generate-menu-description] Gemini error (${model}):`, errText);
      errors.push(`${model}: ${response.status}`);
      // Only retry on 503 (overloaded) or 404 (model not available for this key)
      if (response.status !== 503 && response.status !== 404) break;
    }

    if (!response || !response.ok) {
      throw new Error(`Semua model gagal: ${errors.join(" | ")}`);
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
