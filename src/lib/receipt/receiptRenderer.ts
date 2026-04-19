/**
 * ============================================================
 *  Receipt Renderer
 *
 *  renderReceipt(orderData, layoutConfig) => string
 *
 *  - orderData   : API response (business data — never mutated here)
 *  - layoutConfig: layout/visibility preferences only (no business fields)
 *
 *  Output is a plain-text string where every line is exactly
 *  layoutConfig.maxCharsPerLine characters wide (padded with spaces).
 *  Compatible with ESC/POS text printing.
 * ============================================================
 */

import type { OrderData, LayoutConfig } from './receiptSchema'
import { DEFAULT_LAYOUT_CONFIG } from './receiptSchema'

// ── String utilities ─────────────────────────────────────────────────────────

function exact(s: string, w: number, align: 'left' | 'right' = 'left'): string {
  const str = String(s)
  if (str.length > w) return str.slice(0, w)
  const pad = ' '.repeat(w - str.length)
  return align === 'right' ? pad + str : str + pad
}

function centerStr(s: string, w: number): string {
  if (s.length >= w) return s.slice(0, w)
  const total = w - s.length
  const left  = Math.floor(total / 2)
  return ' '.repeat(left) + s + ' '.repeat(total - left)
}

function wordWrap(text: string, max: number): string[] {
  if (max <= 0) return [text.slice(0, 1) || '']
  const words = text.split(' ')
  const lines: string[] = []
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
    if (candidate.length <= max) { cur = candidate } else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

function fmtCur(n: number, sym: string, loc: string): string {
  try {
    return sym + n.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  } catch {
    return sym + n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

/** Right-aligned label:value pair that fills exactly w characters */
function labelVal(label: string, val: string, w: number): string {
  const available = w - val.length - 1
  if (available <= 0) return exact(val, w, 'right')
  return exact(label, available, 'left') + exact(val, w - available, 'right')
}

// ── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Render a receipt as a plain-text string.
 *
 * @param orderData    Business data from the order API. Never modified.
 * @param layoutConfig Layout and visibility preferences only. No business fields.
 * @returns            Multi-line string, each line exactly maxCharsPerLine wide.
 */
export function renderReceipt(
  orderData: OrderData,
  layoutConfig: Partial<LayoutConfig> = {}
): string {
  // Merge with defaults so callers can pass partial configs
  const L: LayoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...layoutConfig }

  const W   = L.maxCharsPerLine
  const fmt = (n: number) => fmtCur(n, L.currencySymbol, L.locale)
  const div = L.dividerChar.repeat(W)

  const lines: string[] = []
  const push  = (...ls: string[]) => lines.push(...ls)
  const blank = () => { if (!L.compactMode) push('') }

  // ── HEADER ────────────────────────────────────────────────────────────────
  if (L.showLogo)      push(centerStr('[LOGO]', W))
  if (L.showStoreName && orderData.storeName)
    wordWrap(orderData.storeName, W).forEach(l => push(centerStr(l, W)))
  if (L.showAddress && orderData.storeAddress)
    wordWrap(orderData.storeAddress, W).forEach(l => push(centerStr(l, W)))
  if (L.showPhone && orderData.storePhone)
    push(centerStr(orderData.storePhone, W))
  blank()

  // ── ORDER META ────────────────────────────────────────────────────────────
  let hasMeta = false
  if (L.showOrderId  && orderData.orderId)    { push(labelVal('Order #',  orderData.orderId,           W)); hasMeta = true }
  if (L.showDateTime && orderData.createdAt)  { push(labelVal('Tanggal',  fmtDate(orderData.createdAt), W)); hasMeta = true }
  if (L.showCashier  && orderData.cashierName){ push(labelVal('Kasir',    orderData.cashierName,        W)); hasMeta = true }
  if (hasMeta) push(div)

  // ── ITEMS ─────────────────────────────────────────────────────────────────
  const items = orderData.items ?? []
  if (items.length > 0) {
    // Name column takes whatever is left after qty and price columns
    const effectiveQtyW   = L.showQty       ? L.qtyColWidth   : 0
    const effectivePriceW = L.showItemTotal ? L.priceColWidth : 0
    const nameW = Math.max(W - effectiveQtyW - effectivePriceW, 4)

    for (const item of items) {
      const qtyStr   = L.showQty       ? `x${item.quantity}`.slice(0, L.qtyColWidth) : ''
      const priceStr = L.showItemTotal ? fmt(item.price * item.quantity).slice(0, L.priceColWidth) : ''

      // Item name – wrap or truncate
      const nameLines = L.wrapItemName
        ? wordWrap(item.name, nameW)
        : [item.name.length > nameW ? item.name.slice(0, nameW - 1) + '~' : item.name]

      nameLines.forEach((nameLine, i) => {
        if (i === 0) {
          push(
            exact(nameLine, nameW) +
            (L.showQty       ? exact(qtyStr,   effectiveQtyW)                : '') +
            (L.showItemTotal ? exact(priceStr, effectivePriceW, 'right')     : '')
          )
        } else {
          push(exact(nameLine, nameW))
        }
      })

      // Optional unit price sub-line
      if (L.showUnitPrice) {
        push(exact(`  @ ${fmt(item.price)}`, nameW))
      }
    }
    push(div)
  }

  // ── TOTALS ────────────────────────────────────────────────────────────────
  const sub = orderData.subtotal ?? orderData.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? orderData.totalAmount
  if (L.showSubtotal)                                       push(labelVal('Subtotal', fmt(sub), W))
  if (L.showDiscount && (orderData.discountAmount ?? 0) > 0) push(labelVal('Diskon',  `-${fmt(orderData.discountAmount!)}`, W))
  if (L.showTax      && (orderData.taxAmount      ?? 0) > 0) push(labelVal('Pajak',   fmt(orderData.taxAmount!), W))

  if (L.showTotal) {
    push(div)
    push(labelVal('TOTAL', fmt(orderData.totalAmount), W))
    push(div)
  }
  blank()

  // ── PAYMENT ───────────────────────────────────────────────────────────────
  if (L.showPaymentMethod && orderData.paymentMethod) {
    const method = orderData.paymentMethod === 'cashless' ? 'QRIS'
                 : orderData.paymentMethod === 'qris'     ? 'QRIS'
                 : orderData.paymentMethod === 'kartu'    ? 'Kartu'
                 : 'Cash'
    push(labelVal('Bayar', method, W))
  }
  if (L.showCashChange) {
    if (orderData.cashPaid    !== undefined) push(labelVal('Tunai',     fmt(orderData.cashPaid),    W))
    if (orderData.changeAmount !== undefined) push(labelVal('Kembalian', fmt(orderData.changeAmount), W))
  }
  blank()

  // ── NOTES ─────────────────────────────────────────────────────────────────
  if (orderData.notes && orderData.notes !== 'POS Order') {
    push(div)
    wordWrap(`Catatan: ${orderData.notes}`, W).forEach(l => push(exact(l, W)))
  }

  // ── QR PLACEHOLDER ────────────────────────────────────────────────────────
  if (L.showQRPlaceholder) {
    push(div)
    push(centerStr('[QR]', W))
    blank()
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  if (L.footerText) {
    push(div)
    wordWrap(L.footerText, W).forEach(l => push(centerStr(l, W)))
  }

  // Pad every line to exactly W characters
  return lines.map(l => exact(l, W)).join('\n')
}
