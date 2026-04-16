import { supabase } from './supabase'

/**
 * Compute SHA-256 hash of a File object (for receipt deduplication).
 * @param {File} file
 * @returns {Promise<string>} hex string
 */
export async function hashFile(file) {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Create a QRIS invoice for a plan via Edge Function.
 * Returns the invoice object with id, unique_code, total_amount, deadline, etc.
 * @param {string} tenantId
 * @param {string} planId  - 'starter' | 'business' | 'pro'
 */
export async function createInvoice(tenantId, planId, promoCode = '') {
  const { data, error } = await supabase.functions.invoke('create-invoice', {
    body: { tenant_id: tenantId, plan_id: planId, promo_code: promoCode },
  })
  if (error) {
    throw new Error(error.message || 'Gagal membuat invoice')
  }
  if (data?.error) throw new Error(data.error)
  return data.invoice
}

/**
 * Apply a promo code to an existing pending invoice.
 * Validates the promo from Supabase, then updates the invoice directly.
 * Does NOT create a new invoice.
 * @param {string} invoiceId - The existing pending invoice ID
 * @param {string} promoCode - The promo code string entered by user
 * @param {number} baseAmount - The original plan price (without discount)
 * @returns {object} The updated invoice
 */
export async function applyPromoToInvoice(invoiceId, promoCode, baseAmount) {
  // 1. Fetch promo code from DB
  const { data: promo, error: promoError } = await supabase
    .from('promo_codes')
    .select('*')
    .ilike('code', promoCode.trim())
    .eq('is_active', true)
    .single()

  if (promoError || !promo) throw new Error('Kode promo tidak valid atau sudah tidak aktif.')

  if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
    throw new Error('Kode promo sudah kadaluarsa.')
  }

  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    throw new Error('Kuota kode promo telah habis digunakan.')
  }

  // 2. Calculate new total (preserve the existing unique_code by fetching the invoice first)
  const { data: currentInvoice, error: fetchErr } = await supabase
    .from('invoices')
    .select('unique_code')
    .eq('id', invoiceId)
    .single()

  if (fetchErr || !currentInvoice) throw new Error('Invoice tidak ditemukan.')

  const discountAmount = promo.discount_amount
  const finalBase = Math.max(0, baseAmount - discountAmount)
  // If after discount the amount is 0, no unique code needed
  const newTotal = finalBase === 0 ? 0 : finalBase + currentInvoice.unique_code

  // 3. Update invoice with new totals and promo reference
  const { data: updatedInvoice, error: updateErr } = await supabase
    .from('invoices')
    .update({
      discount_amount: discountAmount,
      total_amount: newTotal,
      promo_code_id: promo.id,
      status: newTotal === 0 ? 'valid' : 'pending',
    })
    .eq('id', invoiceId)
    .select()
    .single()

  if (updateErr) throw new Error('Gagal menerapkan promo: ' + updateErr.message)

  // 4. Increment usage count
  await supabase
    .from('promo_codes')
    .update({ current_uses: promo.current_uses + 1 })
    .eq('id', promo.id)

  return updatedInvoice
}

/**
 * Upload receipt image to Supabase Storage and trigger OCR.
 * @param {string} invoiceId
 * @param {string} tenantId
 * @param {File} file
 * @returns {{ status, score, payment_id, message }}
 */
export async function uploadReceiptAndProcess(invoiceId, tenantId, file) {
  // 1. Compute hash for deduplication
  const receiptHash = await hashFile(file)

  // 2. Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'jpg'
  const storagePath = `${tenantId}/${invoiceId}/${Date.now()}.${ext}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('payment-receipts')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    // If bucket doesn't exist, provide a helpful message
    if (uploadError.message?.includes('Bucket not found')) {
      throw new Error('Storage bucket "payment-receipts" belum dibuat. Buat bucket ini di Supabase Dashboard → Storage terlebih dahulu.')
    }
    throw new Error(`Upload gagal: ${uploadError.message}`)
  }

  // 3. Get the public/signed URL
  const { data: urlData } = supabase.storage
    .from('payment-receipts')
    .getPublicUrl(uploadData.path)
  const receiptUrl = urlData?.publicUrl ?? uploadData.path

  // 4. Invoke OCR Edge Function
  const { data: ocrData, error: ocrError } = await supabase.functions.invoke('process-payment-ocr', {
    body: {
      invoice_id: invoiceId,
      tenant_id: tenantId,
      receipt_url: receiptUrl,
      receipt_hash: receiptHash,
    },
  })

  if (ocrError) {
    // Supabase functions.invoke wraps non-2xx responses - try to extract actual message
    let errorMessage = 'Gagal memproses OCR'
    try {
      // ocrError.context can contain the response body for non-2xx status
      if (ocrError.context?.body) {
        const reader = ocrError.context.body.getReader()
        const { value } = await reader.read()
        const text = new TextDecoder().decode(value)
        const parsed = JSON.parse(text)
        errorMessage = parsed.error || errorMessage
      } else if (typeof ocrError.message === 'string') {
        // Try to parse JSON from the error message
        try {
          const parsed = JSON.parse(ocrError.message)
          errorMessage = parsed.error || ocrError.message
        } catch {
          errorMessage = ocrError.message
        }
      }
    } catch {
      errorMessage = ocrError.message || errorMessage
    }
    throw new Error(errorMessage)
  }
  if (ocrData?.error) throw new Error(ocrData.error)

  return ocrData // { status, score, payment_id, message }
}

/**
 * Poll a payment's status from the payments table.
 * Used to check if async OCR processing completed.
 * @param {string} paymentId
 * @returns {{ status, confidence_score }}
 */
export async function getPaymentStatus(paymentId) {
  const { data, error } = await supabase
    .from('payments')
    .select('status, confidence_score, rejection_reason')
    .eq('id', paymentId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get the latest active invoice for a tenant + plan.
 * Returns:
 *   - status 'pending'       → invoice exists, user hasn't paid yet
 *   - status 'review_needed' → user already paid, waiting for superadmin review
 *   - null                   → no active invoice, safe to create new one
 */
export async function getActiveInvoice(tenantId, planId) {
  // We need to fetch both, but filter out 'pending' invoices that have passed their deadline
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('plan_id', planId)
    .in('status', ['pending', 'review_needed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  // If it's pending but past deadline, we treat it as no active invoice
  if (data.status === 'pending' && new Date(data.deadline) < new Date()) {
    return null
  }

  return data
}

/**
 * Format IDR amount with dots as thousands separator.
 * e.g. 50129 → "Rp50.129"
 */
export function formatIDR(amount) {
  return 'Rp' + amount.toLocaleString('id-ID')
}
