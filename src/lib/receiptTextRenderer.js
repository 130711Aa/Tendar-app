/**
 * ============================================================
 *  receiptTextRenderer.js — SINGLE SOURCE OF TRUTH
 *
 *  buildReceiptLines(order, layoutConfig) => string[]
 *
 *  Returns an array of strings where every string is exactly
 *  layoutConfig.maxCharsPerLine characters wide (space-padded).
 *
 *  Used by:
 *    - ReceiptDesignerPage (preview)   → lines.join('\n')
 *    - escpos.js (print)               → each line → cmdText(line) + LF
 *
 *  This is the ONLY place receipt layout logic lives.
 *  Do NOT duplicate this logic elsewhere.
 * ============================================================
 */

import { DEFAULT_LAYOUT_CONFIG } from '../hooks/useReceiptConfig'

// ── String utilities ─────────────────────────────────────────────────────────

/** Pad/truncate string to exactly `w` characters */
export function exact(s, w, align = 'left') {
  const str = String(s ?? '')
  if (str.length > w) return str.slice(0, w)
  const pad = ' '.repeat(w - str.length)
  return align === 'right' ? pad + str : str + pad
}

/** Center a string within `w` characters */
export function center(s, w) {
  const str = String(s ?? '')
  if (str.length >= w) return str.slice(0, w)
  const total = w - str.length
  const left  = Math.floor(total / 2)
  return ' '.repeat(left) + str + ' '.repeat(total - left)
}

/** Word-wrap a string into lines of at most `max` characters */
export function wordWrap(text, max) {
  if (max <= 0) return [String(text ?? '').slice(0, 1) || '']
  const words = String(text ?? '').split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    if (w.length > max) {
      if (cur) { lines.push(cur); cur = '' }
      for (let i = 0; i < w.length; i += max) {
        const chunk = w.slice(i, i + max)
        if (i + max < w.length) lines.push(chunk); else cur = chunk
      }
      continue
    }
    const candidate = cur ? `${cur} ${w}` : w
    if (candidate.length <= max) { cur = candidate }
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

/** Format a number as currency */
export function fmtCur(n, sym = 'Rp', loc = 'id-ID') {
  try {
    return sym + Number(n).toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } catch {
    return sym + Number(n).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
}

/** Format ISO timestamp for receipt display */
export function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day:    'numeric',
      month:  'short',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    })
  } catch { return String(iso) }
}

/**
 * Right-align `val` against `label` to fill exactly `w` characters.
 * Example (w=32): "Subtotal            Rp110.000"
 */
export function labelVal(label, val, w) {
  const v = String(val ?? '')
  const available = w - v.length - 1
  if (available <= 0) return exact(v, w, 'right')
  return exact(label, available, 'left') + exact(v, w - available, 'right')
}

// ── Core renderer ─────────────────────────────────────────────────────────────

/**
 * Build receipt lines from order data and layout config.
 *
 * @param {Object} order        - Order data from the API (read-only, never mutated)
 * @param {Object} layoutConfig - Layout/visibility preferences only (no business data)
 * @returns {string[]}          - Array of strings, each exactly maxCharsPerLine wide
 */
export function buildReceiptLines(order, layoutConfig) {
  // Merge caller config with defaults so partial configs work
  const L = { ...DEFAULT_LAYOUT_CONFIG, ...layoutConfig }

  const W   = L.maxCharsPerLine
  const sym = L.currencySymbol
  const loc = L.locale
  const fmt = (n) => fmtCur(n, sym, loc)
  const div = L.dividerChar.repeat(W)

  const lines = []
  const push  = (...ls) => lines.push(...ls)
  const blank = () => { if (!L.compactMode) push('') }

  // ── HEADER ────────────────────────────────────────────────────────────────
  // if (L.showLogo)
  //   push(center('[LOGO]', W))

  // storeName comes from escpos.js (tenantName from TenantContext)
  if (L.showStoreName && order.storeName)
    wordWrap(order.storeName, W).forEach(l => push(center(l, W)))

  // Address: prefer order.storeAddress, fall back to layoutConfig.storeAddress
  const resolvedAddress = order.storeAddress || L.storeAddress || ''
  if (L.showAddress && resolvedAddress)
    wordWrap(resolvedAddress, W).forEach(l => push(center(l, W)))

  // Phone: prefer order.storePhone, fall back to layoutConfig.storePhone
  const resolvedPhone = order.storePhone || L.storePhone || ''
  if (L.showPhone && resolvedPhone)
    push(center(resolvedPhone, W))

  blank()

  // ── ORDER META ────────────────────────────────────────────────────────────
  let hasMeta = false
  if (L.showOrderId  && order.order_number) { push(labelVal('Order #', order.order_number,            W)); hasMeta = true }
  if (L.showDateTime && order.created_at)   { push(labelVal('Tanggal', fmtDate(order.created_at),     W)); hasMeta = true }
  if (L.showCashier  && order.cashier_name) { push(labelVal('Kasir',   order.cashier_name,            W)); hasMeta = true }
  if (hasMeta) push(div)

  // ── ITEMS ─────────────────────────────────────────────────────────────────
  const items = order.items ?? []
  if (items.length > 0) {
    const qtyW   = L.showQty       ? L.qtyColWidth   : 0
    const priceW = L.showItemTotal ? L.priceColWidth : 0
    const nameW  = Math.max(W - qtyW - priceW, 4)

    for (const item of items) {
      const qtyStr   = L.showQty       ? `x${item.quantity}`.slice(0, L.qtyColWidth) : ''
      const priceStr = L.showItemTotal ? fmt(item.price * item.quantity).slice(0, L.priceColWidth) : ''

      const nameLines = L.wrapItemName
        ? wordWrap(item.name, nameW)
        : [item.name.length > nameW ? item.name.slice(0, nameW - 1) + '~' : item.name]

      nameLines.forEach((nl, i) => {
        if (i === 0) {
          push(
            exact(nl, nameW) +
            (L.showQty       ? exact(qtyStr,   qtyW)              : '') +
            (L.showItemTotal ? exact(priceStr, priceW, 'right')   : '')
          )
        } else {
          // Continuation lines: empty qty/price columns to maintain alignment
          push(exact(nl, nameW) + ' '.repeat(qtyW + priceW))
        }
      })

      // Optional unit price sub-line (indented under item name)
      if (L.showUnitPrice) {
        push(exact(`  @ ${fmt(item.price)}`, W))
      }
    }
    push(div)
  }

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const sub = order.subtotal
    ?? (items.length > 0 ? items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0) : 0)

  if (L.showSubtotal)
    push(labelVal('Subtotal', fmt(sub), W))

  if (L.showDiscount && (order.discount_amount ?? 0) > 0)
    push(labelVal('Diskon', `-${fmt(order.discount_amount)}`, W))

  // Tax: removed per product decision (no showTax)

  if (L.showTotal) {
    push(div)
    push(labelVal('TOTAL', fmt(order.total_amount ?? 0), W))
    push(div)
  }
  blank()

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  if (L.showPaymentMethod && order.payment_method) {
    const method =
      order.payment_method === 'cashless' ? 'QRIS' :
      order.payment_method === 'qris'     ? 'QRIS' :
      order.payment_method === 'kartu'    ? 'Kartu' : 'Cash'
    push(labelVal('Bayar', method, W))
  }

  // Cash/change ONLY shown when payment method is cash/tunai
  // (not applicable for QRIS/cashless orders from the menu)
  const isCashPayment = !order.payment_method ||
    order.payment_method === 'cash' ||
    order.payment_method === 'tunai'

  if (L.showCashChange && isCashPayment) {
    if (order.cash_paid     !== undefined && order.cash_paid     !== null)
      push(labelVal('Tunai',     fmt(order.cash_paid),     W))
    if (order.change_amount !== undefined && order.change_amount !== null)
      push(labelVal('Kembalian', fmt(order.change_amount), W))
  }
  blank()

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (order.notes && order.notes !== 'POS Order') {
    push(div)
    wordWrap(`Catatan: ${order.notes}`, W).forEach(l => push(exact(l, W)))
  }

  // ── QR PLACEHOLDER ────────────────────────────────────────────────────────
  // if (L.showQRPlaceholder) {
  //   push(div)
  //   push(center('[QR]', W))
  //   blank()
  // }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  if (L.footerText) {
    push(div)
    wordWrap(L.footerText, W).forEach(l => push(center(l, W)))
  }

  // Every line is padded to exactly W characters
  return lines.map(l => exact(l, W))
}
