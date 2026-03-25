// Supabase Edge Function: cleanup-payment-proofs
// Runs daily via cron to delete payment proof files for completed orders older than 7 days.
//
// Deploy:
//   supabase functions deploy cleanup-payment-proofs
//
// Set the cron schedule in supabase/config.toml:
//   [functions.cleanup-payment-proofs]
//   schedule = "0 2 * * *"   # Runs daily at 2 AM UTC
//
// Or via SQL:
//   SELECT cron.schedule(
//     'cleanup-payment-proofs',
//     '0 2 * * *',
//     $$
//     SELECT net.http_post(
//       url := 'https://jyulpqqbdlmqphssuryn.supabase.co/functions/v1/cleanup-payment-proofs',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_BUCKET = "payment-proofs";
const RETENTION_DAYS = 7;

Deno.serve(async (req: Request) => {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Calculate cutoff date (7 days ago)
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
        const cutoffISO = cutoff.toISOString();

        console.log(`[cleanup] Starting cleanup. Cutoff date: ${cutoffISO}`);

        // Find completed orders older than 7 days with payment proofs
        const { data: orders, error: queryError } = await supabase
            .from("orders")
            .select("id, payment_proof, payment_proof_path, created_at")
            .eq("status", "completed")
            .lt("created_at", cutoffISO)
            .not("payment_proof", "is", null);

        if (queryError) {
            console.error("[cleanup] Query error:", queryError.message);
            return new Response(
                JSON.stringify({ error: queryError.message }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!orders || orders.length === 0) {
            console.log("[cleanup] No orders to clean up.");
            return new Response(
                JSON.stringify({ message: "No orders to clean up", deleted: 0 }),
                { status: 200, headers: { "Content-Type": "application/json" } }
            );
        }

        console.log(`[cleanup] Found ${orders.length} order(s) to clean up.`);

        let deletedCount = 0;
        let errorCount = 0;
        const results: Array<{ id: number; status: string; detail?: string }> = [];

        for (const order of orders) {
            try {
                // Delete the file from storage if path exists
                if (order.payment_proof_path) {
                    const { error: storageError } = await supabase.storage
                        .from(STORAGE_BUCKET)
                        .remove([order.payment_proof_path]);

                    if (storageError) {
                        console.warn(
                            `[cleanup] Storage delete failed for order ${order.id} (path: ${order.payment_proof_path}):`,
                            storageError.message
                        );
                        // Continue anyway — file might already be deleted
                    } else {
                        console.log(
                            `[cleanup] Deleted file: ${order.payment_proof_path} (order ${order.id})`
                        );
                    }
                }

                // Null out the payment proof fields in the database
                const { error: updateError } = await supabase
                    .from("orders")
                    .update({
                        payment_proof: null,
                        payment_proof_path: null,
                    })
                    .eq("id", order.id);

                if (updateError) {
                    console.error(
                        `[cleanup] Update failed for order ${order.id}:`,
                        updateError.message
                    );
                    errorCount++;
                    results.push({ id: order.id, status: "error", detail: updateError.message });
                } else {
                    deletedCount++;
                    results.push({ id: order.id, status: "cleaned" });
                    console.log(`[cleanup] Cleaned order ${order.id}`);
                }
            } catch (err) {
                console.error(`[cleanup] Unexpected error for order ${order.id}:`, err);
                errorCount++;
                results.push({ id: order.id, status: "error", detail: String(err) });
            }
        }

        const summary = {
            message: "Cleanup completed",
            total_found: orders.length,
            deleted: deletedCount,
            errors: errorCount,
            retention_days: RETENTION_DAYS,
            cutoff_date: cutoffISO,
            results,
        };

        console.log("[cleanup] Summary:", JSON.stringify(summary));

        return new Response(JSON.stringify(summary), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("[cleanup] Fatal error:", err);
        return new Response(
            JSON.stringify({ error: String(err) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
