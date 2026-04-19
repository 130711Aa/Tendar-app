/**
 * ============================================================
 *  Receipt Layout Config Schema
 *
 *  IMPORTANT: This schema describes LAYOUT PREFERENCES only.
 *  It MUST NOT contain any business / transaction data.
 *
 *  All business data (store name, items, prices, totals, etc.)
 *  comes from the order API and is passed separately as OrderData.
 * ============================================================
 */

// ── Order Data (from API — READ-ONLY for the renderer) ──────────────────────

export interface OrderItem {
  name:      string
  quantity:  number
  price:     number          // unit price
}

export interface OrderData {
  // Store identity (from tenant settings)
  storeName?:    string
  storeAddress?: string
  storePhone?:   string

  // Transaction
  orderId?:       string
  createdAt?:     string     // ISO 8601
  cashierName?:   string

  // Items
  items: OrderItem[]

  // Financials (all amounts are numeric, no formatting)
  subtotal?:       number
  discountAmount?: number
  taxAmount?:      number    // absolute value, e.g. 11000
  totalAmount:     number
  paymentMethod?:  string    // 'cash' | 'cashless' | 'qris' | 'kartu' | ...
  cashPaid?:       number
  changeAmount?:   number

  // Optional
  notes?: string
}

// ── Layout Config (LAYOUT PREFERENCES ONLY) ──────────────────────────────────

export interface LayoutConfig {
  // ── Paper / character width ──────────────────────────────────────────────
  /** Characters per line. 32 = 58mm, 42 = 76mm, 48 = 80mm */
  maxCharsPerLine: number

  // ── Spacing ──────────────────────────────────────────────────────────────
  /** Compact mode: suppress blank separator lines */
  compactMode: boolean

  // ── Number formatting ────────────────────────────────────────────────────
  currencySymbol: string    // e.g. 'Rp'
  locale:         string    // e.g. 'id-ID'

  // ── Divider character ────────────────────────────────────────────────────
  dividerChar: string       // e.g. '-' | '=' | '~'

  // ── Item table column widths (in chars) ──────────────────────────────────
  priceColWidth: number     // width of the total-price column
  qtyColWidth:   number     // width of the quantity column

  // ── Header visibility ────────────────────────────────────────────────────
  showLogo:      boolean
  showStoreName: boolean
  showAddress:   boolean
  showPhone:     boolean

  // ── Order info visibility ────────────────────────────────────────────────
  showOrderId:  boolean
  showDateTime: boolean
  showCashier:  boolean

  // ── Item table options ───────────────────────────────────────────────────
  wrapItemName:  boolean    // word-wrap long item names (vs truncate)
  showQty:       boolean
  showUnitPrice: boolean    // show unit price sub-line under item name
  showItemTotal: boolean    // show per-item total in price column

  // ── Summary visibility ───────────────────────────────────────────────────
  showSubtotal: boolean
  showDiscount: boolean
  showTax:      boolean
  showTotal:    boolean

  // ── Payment visibility ───────────────────────────────────────────────────
  showPaymentMethod: boolean
  showCashChange:    boolean   // show cash paid / change lines

  // ── Footer ───────────────────────────────────────────────────────────────
  footerText:      string
  showQRPlaceholder: boolean
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  maxCharsPerLine: 42,
  compactMode:     false,
  currencySymbol:  'Rp',
  locale:          'id-ID',
  dividerChar:     '-',
  priceColWidth:   10,
  qtyColWidth:     4,

  showLogo:      false,
  showStoreName: true,
  showAddress:   true,
  showPhone:     true,

  showOrderId:  true,
  showDateTime: true,
  showCashier:  false,

  wrapItemName:  true,
  showQty:       true,
  showUnitPrice: false,
  showItemTotal: true,

  showSubtotal: true,
  showDiscount: true,
  showTax:      false,
  showTotal:    true,

  showPaymentMethod: true,
  showCashChange:    true,

  footerText:       'Terima kasih! Selamat datang kembali.',
  showQRPlaceholder: false,
}
