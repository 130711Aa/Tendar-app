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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        JSON.stringify({ error: `Kode promo tidak valid atau error db: ${promoError?.message || ''}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Kode promo sudah kadaluarsa." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return new Response(
        JSON.stringify({ error: "Kuota kode promo telah habis digunakan." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get current invoice to preserve unique_code
    const { data: currentInvoice, error: fetchErr } = await supabase
      .from("invoices")
      .select("id, unique_code, status, tenant_id, promo_code_id")
      .eq("id", invoice_id)
      .maybeSingle();

    if (fetchErr || !currentInvoice) {
      return new Response(
        JSON.stringify({ error: `Invoice tidak ditemukan: ${fetchErr?.message || ''}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currentInvoice.status !== "pending") {
      return new Response(
        JSON.stringify({ error: "Promo hanya bisa diterapkan ke invoice yang masih pending." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2.5. Check 1 promo per store limitation
    if (currentInvoice.tenant_id) {
      const { data: existingUsage, error: usageErr } = await supabase
        .from("invoices")
        .select("id")
        .eq("tenant_id", currentInvoice.tenant_id)
        .eq("promo_code_id", promo.id)
        .neq("id", invoice_id)
        .limit(1);

      if (usageErr) {
        return new Response(
          JSON.stringify({ error: `Gagal mengecek histori penggunaan promo: ${usageErr.message}` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existingUsage && existingUsage.length > 0) {
        return new Response(
          JSON.stringify({ error: "Toko Anda sudah pernah menggunakan kode promo ini sebelumnya." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
        status: newTotal === 0 ? "paid" : "pending",
      })
      .eq("id", invoice_id)
      .select('*, tenants(id)')
      .maybeSingle();

    if (updateErr || !updatedInvoice) {
      console.error("[apply-promo] Update error:", updateErr);
      return new Response(
        JSON.stringify({ error: "Gagal memperbarui invoice: " + (updateErr?.message || "Unknown error") }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4.b. Automatically activate plan if total is 0
    if (newTotal === 0 && updatedInvoice.tenant_id) {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      await supabase
        .from("tenants")
        .update({
          plan: updatedInvoice.plan_id,
          plan_expires_at: newExpiry.toISOString(),
        })
        .eq("id", updatedInvoice.tenant_id);
      
      console.log(`[apply-promo] Plan automatically activated for tenant ${updatedInvoice.tenant_id} (total 0)`);
    }

    // 5. Increment promo usage count
    // Only increment if we're actually changing to a new promo code
    // This prevents double incrementing if user clicks "apply" multiple times on the same invoice
    if (currentInvoice.promo_code_id !== promo.id) {
      await supabase
        .from("promo_codes")
        .update({ current_uses: promo.current_uses + 1 })
        .eq("id", promo.id);
    }

    console.log(`[apply-promo] Promo "${promo.code}" applied to invoice ${invoice_id} | Discount: Rp${discountAmount} | New Total: Rp${newTotal}`);

    return new Response(JSON.stringify({ invoice: updatedInvoice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[apply-promo] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem Edge Function" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
