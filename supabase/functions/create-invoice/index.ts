import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plan prices in IDR
const PLAN_PRICES: Record<string, number> = {
  starter:  25000,
  business: 50000,
  pro:      100000,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan_id, tenant_id, promo_code } = await req.json();

    if (!plan_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "plan_id and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseAmount = PLAN_PRICES[plan_id];
    if (!baseAmount) {
      return new Response(
        JSON.stringify({ error: `Invalid plan: ${plan_id}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Handle Promo Code if provided
    let discountAmount = 0;
    let promoCodeId = null;

    if (promo_code) {
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .ilike("code", promo_code)
        .eq("is_active", true)
        .single();
      
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

      discountAmount = promo.discount_amount;
      promoCodeId = promo.id;

      // Increment usage count
      await supabase
        .from("promo_codes")
        .update({ current_uses: promo.current_uses + 1 })
        .eq("id", promo.id);
    }

    // Safety: Check if there's already a review_needed invoice for this tenant+plan.
    // If so, return it directly — user has already paid, don't create a new one.
    const { data: existingReview } = await supabase
      .from("invoices")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("plan_id", plan_id)
      .eq("status", "review_needed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReview) {
      console.log("[create-invoice] Found existing review_needed invoice, returning it.");
      return new Response(
        JSON.stringify({ invoice: existingReview }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there is already a PENDING invoice for this plan
    const { data: existingPending } = await supabase
      .from("invoices")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("plan_id", plan_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let invoice;

    if (existingPending) {
      // Reuse the unique_code and just update the amounts/promo
      const finalBaseAmount = Math.max(0, baseAmount - discountAmount);
      const totalAmount = finalBaseAmount === 0 ? 0 : finalBaseAmount + existingPending.unique_code;

      const updatePayload: any = {
        total_amount: totalAmount,
        status: totalAmount === 0 ? 'valid' : 'pending',
      };

      if (promoCodeId) {
        updatePayload.promo_code_id = promoCodeId;
        updatePayload.discount_amount = discountAmount;
      }

      const { data: updatedInvoice, error: updateError } = await supabase
        .from("invoices")
        .update(updatePayload)
        .eq("id", existingPending.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      invoice = updatedInvoice;
    } else {
      // Generate new unique code and insert new invoice
      const uniqueCode = Math.floor(Math.random() * 900) + 100;
      const finalBaseAmount = Math.max(0, baseAmount - discountAmount);
      const totalAmount = finalBaseAmount === 0 ? 0 : finalBaseAmount + uniqueCode;

      const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const insertPayload: any = {
        tenant_id,
        plan_id,
        base_amount: baseAmount,
        unique_code: uniqueCode,
        total_amount: totalAmount,
        deadline,
        status: totalAmount === 0 ? 'valid' : 'pending',
      };

      if (promoCodeId) {
        insertPayload.promo_code_id = promoCodeId;
        insertPayload.discount_amount = discountAmount;
      }

      const { data: newInvoice, error: insertError } = await supabase
        .from("invoices")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) throw insertError;
      invoice = newInvoice;
    }

    // Audit log
    await supabase.from("payment_audit_logs").insert({
      entity: "invoice",
      entity_id: invoice.id,
      action: existingPending ? "updated" : "created",
      payload: {
        plan_id,
        base_amount: baseAmount,
        unique_code: invoice.unique_code,
        total_amount: invoice.total_amount,
        deadline: invoice.deadline,
      },
    });

    console.log(
      `[create-invoice] Invoice ${existingPending ? 'updated' : 'created'}: ${invoice.id} | Tenant: ${tenant_id} | Plan: ${plan_id} | Amount: Rp${invoice.total_amount}`
    );

    return new Response(JSON.stringify({ invoice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[create-invoice] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
