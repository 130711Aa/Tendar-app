/**
 * Receipt System — Public API & Example Configs
 * ============================================================
 * Re-exports everything needed to use the receipt system.
 * Import from this file in application code.
 * ============================================================
 */

export {
  renderReceipt,
} from "./receiptRenderer";

export type {
  ReceiptConfig,
  ReceiptLayout,
  ReceiptItem,
  ReceiptTotals,
  ReceiptPayment,
  ReceiptStore,
  ReceiptTransaction,
  ReceiptToggles,
} from "./receiptSchema";

export {
  RECEIPT_CONFIG_JSON_SCHEMA,
} from "./receiptSchema";

// ---------------------------------------------------------------------------
// Example configs (import anywhere for testing / seeding a PoS flow)
// ---------------------------------------------------------------------------

import type { ReceiptConfig } from "./receiptSchema";

// ---- Shared transaction data -----------------------------------------------

const COMMON_STORE = {
  name:    "Warung Nasi Padang Bu Siti & Keluarga Besar",
  address: "Jl. Kebon Sirih No. 45, Jakarta Pusat",
  phone:   "(021) 3100-9988",
};

const COMMON_ITEMS = [
  { name: "Nasi Putih",                  qty: 3, unitPrice: 5000,  totalPrice: 15000  },
  { name: "Rendang Sapi Premium Spesial", qty: 2, unitPrice: 35000, totalPrice: 70000  },
  { name: "Sayur Nangka",                qty: 1, unitPrice: 8000,  totalPrice: 8000   },
  { name: "Es Teh Manis",               qty: 3, unitPrice: 5000,  totalPrice: 15000  },
  { name: "Kerupuk Merah",              qty: 1, unitPrice: 2000,  totalPrice: 2000   },
];

const COMMON_TOTALS = {
  subtotal: 110000,
  tax:      11000,
  discount: 5000,
  total:    116000,
};

const COMMON_TRANSACTION = {
  orderId: "ORD-20260419-0042",
  date:    "19 Apr 2026 09:17",
  cashier: "Dewi Rahayu",
};

const COMMON_PAYMENT = {
  method:     "Cash",
  amountPaid: 150000,
  change:     34000,
};

// ---- 58mm config (32 chars) ------------------------------------------------

/**
 * Configuration for a typical 58mm thermal printer (32 chars per line).
 *
 * Compact mode enabled to fit more on short paper rolls.
 * Price column reduced to 9 chars to maximize item name space.
 */
export const config32: ReceiptConfig = {
  layout: {
    maxCharsPerLine: 32,
    priceColWidth:   9,
    qtyColWidth:     3,
    compactMode:     true,
    currencySymbol:  "Rp",
    locale:          "id-ID",
    dividerChar:     "-",
  },
  toggles: {
    logo:          true,
    storeName:     true,
    address:       true,
    phone:         true,
    orderId:       true,
    date:          true,
    cashier:       true,
    items:         true,
    subtotal:      true,
    tax:           true,
    discount:      true,
    total:         true,
    paymentMethod: true,
    qrCode:        false,
    footerText:    true,
  },
  store:       COMMON_STORE,
  transaction: COMMON_TRANSACTION,
  items:       COMMON_ITEMS,
  totals:      COMMON_TOTALS,
  payment:     COMMON_PAYMENT,
  footerText:  "Terima kasih! Selamat makan.",
};

// ---- 80mm config (48 chars) ------------------------------------------------

/**
 * Configuration for a typical 80mm thermal printer (48 chars per line).
 *
 * Wider layout gives more breathing room — compact mode off,
 * larger price column, QR code enabled.
 */
export const config48: ReceiptConfig = {
  layout: {
    maxCharsPerLine: 48,
    priceColWidth:   12,
    qtyColWidth:     5,
    compactMode:     false,
    currencySymbol:  "Rp",
    locale:          "id-ID",
    dividerChar:     "=",
  },
  toggles: {
    logo:          true,
    storeName:     true,
    address:       true,
    phone:         true,
    orderId:       true,
    date:          true,
    cashier:       true,
    items:         true,
    subtotal:      true,
    tax:           true,
    discount:      true,
    total:         true,
    paymentMethod: true,
    qrCode:        true,
    footerText:    true,
  },
  store:       COMMON_STORE,
  transaction: COMMON_TRANSACTION,
  items:       COMMON_ITEMS,
  totals:      COMMON_TOTALS,
  payment:     COMMON_PAYMENT,
  footerText:  "Terima kasih! Kunjungi kami lagi. Selamat makan.",
};
