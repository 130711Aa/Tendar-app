import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushSubscriptionRow = {
  id: number;
  endpoint: string;
  subscription: Record<string, unknown>;
  target_url: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@tendar.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys are not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, customer_name, status, tenant_id")
      .eq("id", order_id)
      .single();

    if (orderError || !order) throw orderError || new Error("Order not found");

    if (order.status !== "completed") {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Order is not completed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("order_push_subscriptions")
      .select("id, endpoint, subscription, target_url")
      .eq("order_id", order.id)
      .is("notified_completed_at", null);

    if (subscriptionError) throw subscriptionError;

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No active subscriptions for this order" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload = JSON.stringify({
      title: "Pesanan sudah selesai",
      body: `Pesanan #${order.order_number || order.id} sudah selesai. Silakan ambil di kasir.`,
      tag: `order-${order.id}-completed`,
      url: subscriptions[0].target_url || "/"
    });

    let sent = 0;
    const failed: Array<{ id: number; message: string }> = [];

    await Promise.all((subscriptions as PushSubscriptionRow[]).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription as any, payload);
        sent += 1;
        await supabase
          .from("order_push_subscriptions")
          .update({ notified_completed_at: new Date().toISOString(), last_error: null })
          .eq("id", row.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ id: row.id, message });
        await supabase
          .from("order_push_subscriptions")
          .update({ last_error: message })
          .eq("id", row.id);
      }
    }));

    return new Response(
      JSON.stringify({ sent, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-order-notification]", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
