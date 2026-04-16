import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoice_id, promo_code, base_amount } = await req.json();

    if (!invoice_id || !promo_code || base_amount === undefined) {
      return new Response(
        JSON.stringify({ error: "invoice_id, promo_code, dan base_amount wajib diisi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Validate promo code
    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .select("*")
      .ilike("code", promo_code.trim())
      .eq("is_active", true)
      .maybeSingle();

    if (promoError || !promo) {
      return new Response(
        JSON.stringify({ error: "Kode promo tidak valid atau sudah tidak aktif." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Kode promo sudah kadaluarsa." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ error: "Kuota kode promo telah habis digunakan." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get current invoice to preserve unique_code
    const { data: currentInvoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, unique_code, status")
      .eq("id", invoice_id)
      .maybeSingle();

    if (fetchErr || !currentInvoice) {
      return new Response(
        JSON.stringify({ error: "Invoice tidak ditemukan." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currentInvoice.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Promo hanya bisa diterapkan ke invoice yang masih pending." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Calculate new total — unique_code is PRESERVED
    const discountAmount = Number(promo.discount_amount);
    const finalBase = Math.max(0, Number(base_amount) - discountAmount);
    const newTotal = finalBase === 0 ? 0 : finalBase + currentInvoice.unique_code;

    // 4. Update the invoice (service role bypasses RLS)
    const { data: updatedInvoice, error: updateErr } = await supabase
      .from("invoices")
      .update({
        discount_amount: discountAmount,
        total_amount: newTotal,
        promo_code_id: promo.id,
        status: newTotal === 0 ? "valid" : "pending",
      })
      .eq("id", invoice_id)
      .select()
      .maybeSingle();

    if (updateErr || !updatedInvoice) {
      console.error("[apply-promo] Update error:", updateErr);
      return new Response(
        JSON.stringify({ error: "Gagal memperbarui invoice: " + (updateErr?.message || "Unknown error") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Increment promo usage count
    await supabase
      .from("promo_codes")
      .update({ current_uses: promo.current_uses + 1 })
      .eq("id", promo.id);

    console.log(`[apply-promo] Promo "${promo.code}" applied to invoice ${invoice_id} | Discount: Rp${discountAmount} | New Total: Rp${newTotal}`);

    return new Response(JSON.stringify({ invoice: updatedInvoice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[apply-promo] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
