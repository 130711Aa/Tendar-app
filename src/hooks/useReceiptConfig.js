/**
 * useReceiptConfig — persists LayoutConfig to localStorage per-tenant.
 *
 * Key: `receipt_layout_{slug}` — one entry per tenant.
 *
 * IMPORTANT: LayoutConfig contains ONLY layout/visibility preferences.
 * It NEVER stores business data (store name, prices, items, etc.).
 * All business data comes from the order API at print time.
 */

import { useState, useCallback, useEffect } from 'react'

// ── Default LayoutConfig ──────────────────────────────────────────────────────
// (mirrors DEFAULT_LAYOUT_CONFIG from receiptSchema.ts)

export const DEFAULT_LAYOUT_CONFIG = {
  // Paper / character width
  maxCharsPerLine: 32,   // default = 58mm printer (most common)

  // Spacing
  compactMode: false,

  // Number formatting
  currencySymbol: 'Rp',
  locale:         'id-ID',

  // Divider character
  dividerChar: '-',

  // Item table column widths (chars)
  priceColWidth: 10,
  qtyColWidth:   4,

  // Store profile (static branding — set once, appears on every receipt)
  storeAddress: '',    // e.g. 'Jl. Sudirman No. 1, Jakarta'
  storePhone:   '',    // e.g. '08123456789'

  // Header visibility
  showLogo:      false,
  showStoreName: true,
  showAddress:   true,
  showPhone:     true,

  // Order info visibility
  showOrderId:  true,
  showDateTime: true,
  showCashier:  false,

  // Item table options
  wrapItemName:  true,
  showQty:       true,
  showUnitPrice: false,
  showItemTotal: true,

  // Summary visibility
  showSubtotal: true,
  showDiscount: true,
  showTotal:    true,

  // Payment visibility
  showPaymentMethod: true,
  showCashChange:    true,   // hanya muncul jika payment_method = 'cash'

  // Footer
  footerText:       'Terima kasih! Selamat datang kembali.',
  showQRPlaceholder: false,
}

// ── Storage key ───────────────────────────────────────────────────────────────

function lsKey(slug) {
  return `receipt_layout_${slug || 'default'}`
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function loadFromStorage(slug) {
  // Remove any stale config from the previous key format (receipt_config_*)
  try { localStorage.removeItem(`receipt_config_${slug || 'default'}`) } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(lsKey(slug))
    if (!raw) return DEFAULT_LAYOUT_CONFIG
    const parsed = JSON.parse(raw)
    // Deep merge: future new fields from DEFAULT are always present
    return { ...DEFAULT_LAYOUT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_LAYOUT_CONFIG
  }
}

export function useReceiptConfig(slug) {
  const [config, setConfigState] = useState(() => loadFromStorage(slug))

  // Re-read when tenant slug changes (e.g. admin switches store)
  useEffect(() => {
    setConfigState(loadFromStorage(slug))
  }, [slug])

  /** Replace config and persist to localStorage */
  const saveConfig = useCallback((newConfig) => {
    const merged = { ...DEFAULT_LAYOUT_CONFIG, ...newConfig }
    try { localStorage.setItem(lsKey(slug), JSON.stringify(merged)) } catch { /* quota */ }
    setConfigState(merged)
  }, [slug])

  /** Partial update — merges with current config */
  const updateConfig = useCallback((partial) => {
    setConfigState(prev => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(lsKey(slug), JSON.stringify(next)) } catch { /* quota */ }
      return next
    })
  }, [slug])

  /** Clear saved config and revert to defaults */
  const resetConfig = useCallback(() => {
    try { localStorage.removeItem(lsKey(slug)) } catch { /* ignore */ }
    setConfigState(DEFAULT_LAYOUT_CONFIG)
  }, [slug])

  return { config, saveConfig, updateConfig, resetConfig }
}
