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
    const { plan, tenant_id, tenant_name } = await req.json();

    if (!plan || !tenant_id) {
        throw new Error("Missing plan or tenant_id");
    }

    let gross_amount = 0;
    if (plan === 'starter') gross_amount = 25000;
    else if (plan === 'business') gross_amount = 50000;
    else if (plan === 'pro') gross_amount = 100000;
    else throw new Error("Invalid plan");

    // Midtrans order_id max length is 50 chars.
    const order_id = `SUBS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const payload = {
        transaction_details: {
            order_id: order_id,
            gross_amount: gross_amount
        },
        item_details: [{
            id: plan,
            price: gross_amount,
            quantity: 1,
            name: `Langganan Tendar - ${plan.toUpperCase()}`
        }],
        customer_details: {
            first_name: tenant_name || "Pemilik Toko"
        }
    };

    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY");
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is not configured");
    const base64Key = btoa(serverKey + ":");

    console.log(`[midtrans] Creating transaction for ${tenant_id} (Paket: ${plan}, Rp${gross_amount})`);

    const response = await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Basic ${base64Key}`
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.token) {
        console.error("[midtrans] API Error:", data);
        throw new Error(data.error_messages ? data.error_messages.join(", ") : "Gagal membuat token pembayaran");
    }

    console.log(`[midtrans] Token generated: ${data.token}`);

    return new Response(JSON.stringify({ token: data.token, redirect_url: data.redirect_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[midtrans] Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
