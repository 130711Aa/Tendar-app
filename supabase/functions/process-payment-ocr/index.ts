import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// QRIS Config — from Supabase Edge Function secrets
// Set with: supabase secrets set QRIS_NMID=ID1025424801849
// ============================================================
const QRIS_NMID          = Deno.env.get("QRIS_NMID")          ?? "ID1025424801849";
const QRIS_MERCHANT_NAME = Deno.env.get("QRIS_MERCHANT_NAME") ?? "KAREEEM JUICE";
const GOOGLE_VISION_KEY  = Deno.env.get("GOOGLE_VISION_API_KEY") ?? "";

// ============================================================
// Regex Patterns for receipt text extraction
// ============================================================
const PATTERNS = {
  // Amount: handles "Rp50.129", "Rp 50.129", "IDR 50129", "50,129.00"
  amount: /(?:Rp\.?|IDR)\s*([\d.,]+)/gi,

  // Merchant: "KAREEEM JUICE" with flexible spacing
  merchantName: new RegExp(QRIS_MERCHANT_NAME.replace(/\s+/g, "\\s*"), "i"),

  // NMID: "NMID: ID1025424801849" or "Merchant ID ID1025424801849"
  nmid: /(?:NMID|Merchant\s*ID|ID)\s*[:\-]?\s*(ID\d{10,})/i,

  // Timestamp: various Indonesian bank app date formats
  timestamp: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}[\s,]+\d{2}:\d{2}(?::\d{2})?)|(\d{1,2}\s+\w+\s+\d{4}\s+\d{2}:\d{2})/i,

  // Success keywords
  successKeyword: /\b(berhasil|sukses|success|approved|paid|selesai|lunas)\b/i,

  // Reference/transaction ID
  referenceId: /(?:No\.?\s*Ref|Ref(?:erence)?|Kode\s*Transaksi|Trx\s*ID|No\.?\s*Transaksi)[:\s]*([A-Z0-9]{8,25})/i,
};

// ============================================================
// Amount normalization
// ============================================================
function normalizeAmount(raw: string): number {
  let cleaned = raw.replace(/[Rp\sIDR]/gi, "");
  // Indonesian: "50.129" → 50129 (dot = thousands separator)
  // International: "50,129.00" → 50129
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/,/g, ""); // remove thousands comma
  } else {
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ""); // remove all seps
  }
  return parseInt(cleaned, 10);
}

// ============================================================
// Google Cloud Vision API call
// ============================================================
async function callVisionAPI(imageBase64: string): Promise<string> {
  if (!GOOGLE_VISION_KEY) {
    throw new Error("GOOGLE_VISION_API_KEY is not configured in Edge Function secrets.");
  }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        }],
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Vision API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const fullText = data?.responses?.[0]?.fullTextAnnotation?.text ?? "";
  if (!fullText) throw new Error("Vision API returned no text. Image may be too blurry.");
  return fullText;
}

// ============================================================
// Reconciliation Engine
// ============================================================
interface ReconcileResult {
  status: "valid" | "review_needed" | "rejected";
  score: number;
  reasons: string[];
  extracted: {
    amount?: number;
    nmid?: string;
    refId?: string;
    timestamp?: string;
    successKeyword?: boolean;
    merchantFound?: boolean;
  };
}

function reconcile(rawText: string, invoice: Record<string, unknown>): ReconcileResult {
  let score = 0;
  const reasons: string[] = [];
  const extracted: ReconcileResult["extracted"] = {};

  // --- AMOUNT (50 pts) — hard fail if wrong ---
  const amountMatches = [...rawText.matchAll(PATTERNS.amount)];
  let extractedAmount: number | undefined;
  for (const m of amountMatches) {
    const val = normalizeAmount(m[1]);
    if (!isNaN(val) && val > 0) { extractedAmount = val; break; }
  }
  extracted.amount = extractedAmount;

  if (extractedAmount === undefined) {
    return { status: "rejected", score: 0, reasons: ["no_amount_found"], extracted };
  }
  if (extractedAmount !== (invoice.total_amount as number)) {
    return {
      status: "rejected",
      score: 0,
      reasons: [`amount_mismatch: got ${extractedAmount}, expected ${invoice.total_amount}`],
      extracted,
    };
  }
  score += 50;
  reasons.push("amount_match: +50");

  // --- MERCHANT NAME (20 pts) ---
  if (PATTERNS.merchantName.test(rawText)) {
    score += 20;
    reasons.push("merchant_match: +20");
    extracted.merchantFound = true;
  }

  // --- TIMESTAMP (15 pts) ---
  const tsMatch = rawText.match(PATTERNS.timestamp);
  if (tsMatch) {
    extracted.timestamp = tsMatch[0];
    const txTime = new Date(tsMatch[0]).getTime();
    const invoiceCreated = new Date(invoice.created_at as string).getTime();
    const invoiceDeadline = new Date(invoice.deadline as string).getTime();
    if (!isNaN(txTime) && txTime >= invoiceCreated && txTime <= invoiceDeadline) {
      score += 15;
      reasons.push("time_window: +15");
    }
    // Still give partial credit if timestamp is found but can't be parsed
    else if (tsMatch[0]) {
      score += 5;
      reasons.push("timestamp_found_unparseable: +5");
    }
  }

  // --- NMID (10 pts) — strongest validator ---
  const nmidMatch = rawText.match(PATTERNS.nmid);
  if (nmidMatch) {
    extracted.nmid = nmidMatch[1];
    if (extracted.nmid === QRIS_NMID) {
      score += 10;
      reasons.push(`nmid_match: +10 (${extracted.nmid})`);
    } else {
      reasons.push(`nmid_mismatch: found ${extracted.nmid}, expected ${QRIS_NMID}`);
    }
  }

  // --- SUCCESS KEYWORD (5 pts) ---
  if (PATTERNS.successKeyword.test(rawText)) {
    score += 5;
    reasons.push("success_keyword: +5");
    extracted.successKeyword = true;
  }

  // --- REFERENCE ID (stored for deduplication, no score) ---
  const refMatch = rawText.match(PATTERNS.referenceId);
  if (refMatch) extracted.refId = refMatch[1];

  // --- DECISION ---
  if (score >= 70) return { status: "valid",        score, reasons, extracted };
  if (score >= 40) return { status: "review_needed", score, reasons, extracted };
  return              { status: "rejected",          score, reasons, extracted };
}

// ============================================================
// Main Edge Function
// ============================================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { invoice_id, receipt_url, receipt_hash, tenant_id } = await req.json();

    if (!invoice_id || !receipt_url || !receipt_hash || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "invoice_id, receipt_url, receipt_hash, tenant_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Fetch invoice
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) throw new Error("Invoice tidak ditemukan");
    if (invoice.status === "paid") throw new Error("Invoice sudah dibayar");
    if (new Date(invoice.deadline) < new Date()) {
      await supabase.from("invoices").update({ status: "expired" }).eq("id", invoice_id);
      throw new Error("Invoice sudah kadaluarsa. Buat invoice baru.");
    }

    // Check receipt_hash uniqueness (replay attack prevention)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("receipt_hash", receipt_hash)
      .maybeSingle();

    if (existingPayment) {
      // Only block if the existing payment was valid or still processing
      if (existingPayment.status === "valid" || existingPayment.status === "processing") {
        return new Response(
          JSON.stringify({ error: "Bukti pembayaran ini sudah pernah diupload dan sedang/sudah diproses.", existing_payment: existingPayment }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // If previous payment was rejected or review_needed, allow re-upload
      // Delete the old rejected record to avoid unique constraint issues
      console.log(`[ocr] Previous payment ${existingPayment.id} was ${existingPayment.status}, allowing re-upload`);
      await supabase.from("payments").delete().eq("id", existingPayment.id);
    }

    // Check upload attempt limit (max 3 per invoice)
    const { count: attemptCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("invoice_id", invoice_id);

    if ((attemptCount ?? 0) >= 3) {
      throw new Error("Batas maksimal 3 kali upload per invoice tercapai. Hubungi CS Tendar.");
    }

    // === Create payment record (processing status) ===
    const { data: payment, error: pmtError } = await supabase
      .from("payments")
      .insert({
        invoice_id,
        receipt_url,
        receipt_hash,
        status: "processing",
      })
      .select()
      .single();

    if (pmtError) throw pmtError;

    console.log(`[ocr] Processing payment ${payment.id} for invoice ${invoice_id}`);

    // === Download receipt image from Supabase Storage ===
    const receiptPath = receipt_url.split("/payment-receipts/")[1];
    const { data: fileData, error: dlError } = await supabase.storage
      .from("payment-receipts")
      .download(receiptPath);

    if (dlError || !fileData) throw new Error("Gagal mengunduh file bukti pembayaran");

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const imageBase64 = btoa(binary);

    // === Call Google Cloud Vision API ===
    let rawText = "";
    let ocrError: string | null = null;
    try {
      rawText = await callVisionAPI(imageBase64);
      console.log(`[ocr] OCR text extracted (${rawText.length} chars)`);
    } catch (visionErr) {
      ocrError = visionErr instanceof Error ? visionErr.message : "OCR gagal";
      console.error("[ocr] Vision API error:", ocrError);
    }

    // If OCR failed entirely, send to manual review
    if (ocrError || !rawText) {
      await supabase.from("payments").update({
        status: "review_needed",
        ocr_raw_text: null,
        rejection_reason: ocrError ?? "OCR returned empty text",
      }).eq("id", payment.id);

      await supabase.from("payment_audit_logs").insert({
        entity: "payment", entity_id: payment.id,
        action: "ocr_failed",
        payload: { error: ocrError },
      });

      return new Response(JSON.stringify({
        status: "review_needed",
        message: "OCR gagal memproses gambar. Pembayaran akan diverifikasi manual oleh tim Tendar.",
        payment_id: payment.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Reconciliation Engine ===
    const result = reconcile(rawText, invoice);

    console.log(`[ocr] Reconcile result: ${result.status} (score: ${result.score}) | Reasons: ${result.reasons.join(", ")}`);

    // === Update payment record ===
    await supabase.from("payments").update({
      ocr_raw_text: rawText,
      extracted_amount: result.extracted.amount,
      extracted_nmid: result.extracted.nmid,
      extracted_ref_id: result.extracted.refId,
      confidence_score: result.score,
      status: result.status,
      rejection_reason: result.status === "rejected" ? result.reasons.join("; ") : null,
    }).eq("id", payment.id);

    // === If valid: activate subscription ===
    if (result.status === "valid") {
      // Mark invoice as paid
      await supabase.from("invoices").update({ status: "paid" }).eq("id", invoice_id);

      // Calculate new expiry: 30 days from now
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);

      // Update tenant plan
      const { error: tenantUpdateError } = await supabase
        .from("tenants")
        .update({
          plan: invoice.plan_id,
          plan_expires_at: newExpiry.toISOString(),
        })
        .eq("id", tenant_id);

      if (tenantUpdateError) {
        console.error("[ocr] Failed to update tenant plan:", tenantUpdateError.message);
      } else {
        console.log(`[ocr] Tenant ${tenant_id} upgraded to ${invoice.plan_id} until ${newExpiry.toISOString()}`);
      }

      await supabase.from("payment_audit_logs").insert({
        entity: "payment", entity_id: payment.id,
        action: "ocr_valid_auto_approved",
        payload: { score: result.score, reasons: result.reasons, plan: invoice.plan_id, new_expiry: newExpiry },
      });
    } else {
      await supabase.from("payment_audit_logs").insert({
        entity: "payment", entity_id: payment.id,
        action: `ocr_${result.status}`,
        payload: { score: result.score, reasons: result.reasons },
      });
    }

    return new Response(JSON.stringify({
      status: result.status,
      score: result.score,
      payment_id: payment.id,
      message: result.status === "valid"
        ? "Pembayaran berhasil diverifikasi! Paket Anda sedang diaktifkan."
        : result.status === "review_needed"
        ? "Pembayaran sedang ditinjau oleh tim Tendar (1×24 jam)."
        : "Bukti pembayaran tidak valid. Pastikan nominal dan merchant benar.",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[process-payment-ocr] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Terjadi kesalahan sistem" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
