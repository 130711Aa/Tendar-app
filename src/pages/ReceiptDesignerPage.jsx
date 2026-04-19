/**
 * ReceiptDesignerPage — Layout & Visibility Config ONLY
 *
 * This page allows admins to configure HOW a receipt is formatted.
 * It does NOT allow editing any business data (store name, prices, items, etc.).
 * All business data comes from the order API at print time.
 *
 * The preview renders a fixed DEMO_ORDER through the live layout config
 * so changes are visible immediately.
 */

import { useState, useMemo } from 'react'
import { useTenantContext } from '../context/TenantContext'
import { useReceiptConfig, DEFAULT_LAYOUT_CONFIG } from '../hooks/useReceiptConfig'
import { connectPrinter as btConnect, isConnected as btIsConnected, sendRawBytes } from '../lib/webBluetoothPrint'
import { buildReceiptBytes } from '../lib/escpos'
import { buildReceiptLines } from '../lib/receiptTextRenderer'

// ─────────────────────────────────────────────────────────────────────────────
// DEMO_ORDER — fixed sample business data for preview only.
// Uses the EXACT SAME field names as the real order API so the shared
// renderer produces identical output here and at print time.
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_ORDER = {
  // These come from tenant profile in real usage
  storeName:    'Warung Nasi Padang Bu Siti',
  // storeAddress and storePhone come from the layout config in real usage
  // (DEMO_ORDER leaves them undefined so the preview uses config values)
  order_number:    'ORD-20260419-0042',
  created_at:      '2026-04-19T09:17:00+07:00',
  cashier_name:    'Dewi Rahayu',
  items: [
    { name: 'Nasi Putih',                   quantity: 3, price: 5000  },
    { name: 'Rendang Sapi Premium Spesial', quantity: 2, price: 35000 },
    { name: 'Sayur Nangka',                 quantity: 1, price: 8000  },
    { name: 'Es Teh Manis',                 quantity: 3, price: 5000  },
    { name: 'Kerupuk Merah',                quantity: 1, price: 2000  },
  ],
  subtotal:        110000,
  discount_amount: 5000,
  total_amount:    116000,
  payment_method:  'cash',
  cash_paid:       150000,
  change_amount:   34000,
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable UI components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="size-9 rounded-xl bg-orange-50 text-[#ff8c00] flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="font-bold text-sm leading-none">{title}</p>
        {subtitle && <p className="text-[11px] text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange, description, disabled, badge }) {
  return (
    <label className={`flex items-center justify-between py-2.5 group gap-4 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 group-hover:text-neutral-900 transition-colors select-none">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#ff8c00]/10 text-[#ff8c00] text-[10px] font-bold">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-[11px] text-neutral-400 mt-0.5">{description}</p>}
      </div>
      <label className={`toggle-switch flex-shrink-0 ${disabled ? 'cursor-not-allowed' : ''}`}>
        <input type="checkbox" checked={disabled ? false : checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled} />
        <span className="toggle-slider" />
      </label>
    </label>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  )
}

function GroupLabel({ children }) {
  return <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 mt-4 first:mt-0">{children}</p>
}

// ─────────────────────────────────────────────────────────────────────────────
// Width presets
// ─────────────────────────────────────────────────────────────────────────────
const WIDTH_PRESETS = [
  { label: '58mm', chars: 32, sub: '32 chars' },
  { label: '76mm', chars: 42, sub: '42 chars' },
  { label: '80mm', chars: 48, sub: '48 chars' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptDesignerPage() {
  const { tenantName, slug } = useTenantContext()
  const { config: savedConfig, saveConfig, resetConfig } = useReceiptConfig(slug)

  // Local working copy — only layout/visibility fields
  const [layout, setLayoutState] = useState(() => ({ ...DEFAULT_LAYOUT_CONFIG, ...savedConfig }))
  const [saved,    setSaved]    = useState(false)
  const [printing, setPrinting] = useState(false)
  const [btConnected, setBtConnected] = useState(() => btIsConnected())

  // Preview uses the SHARED renderer (same code path as actual print)
  const preview = useMemo(
    () => buildReceiptLines(DEMO_ORDER, layout).join('\n'),
    [layout]
  )

  // ── Layout update helper ───────────────────────────────────────────────
  const set = (key, val) => setLayoutState(prev => ({ ...prev, [key]: val }))

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = () => {
    saveConfig(layout)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = () => {
    resetConfig()
    setLayoutState(DEFAULT_LAYOUT_CONFIG)
  }

  // ── Test print (Bluetooth) — uses CURRENT LIVE layout, not saved ────────
  const handleTestPrint = async () => {
    if (!btIsConnected()) {
      try { await btConnect(); setBtConnected(true) }
      catch (e) { alert(e.message); return }
    }
    setPrinting(true)
    try {
      // DEMO_ORDER already uses real API field names — pass it directly.
      // buildReceiptBytes calls buildReceiptLines (same as preview).
      const bytes = buildReceiptBytes(DEMO_ORDER, tenantName, layout)
      await sendRawBytes(bytes)
    } catch (e) {
      alert('Gagal cetak: ' + e.message)
    } finally {
      setPrinting(false)
    }
  }

  // ── Paper width label ───────────────────────────────────────────────────
  const paperLabel = useMemo(() => {
    const w = layout.maxCharsPerLine
    if (w <= 32) return '58mm'
    if (w <= 42) return '76mm'
    if (w <= 48) return '80mm'
    return 'Custom'
  }, [layout.maxCharsPerLine])

  const previewFontPx = useMemo(() => {
    const w = layout.maxCharsPerLine
    if (w <= 32) return 13
    if (w <= 42) return 11.5
    if (w <= 48) return 10.5
    return 9.5
  }, [layout.maxCharsPerLine])

  const TABS = [
    { id: 'paper',    icon: 'straighten',   label: 'Kertas'     },
    { id: 'sections', icon: 'toggle_on',    label: 'Bagian'     },
    { id: 'items',    icon: 'receipt_long', label: 'Tabel Item' },
    { id: 'footer',   icon: 'format_quote', label: 'Footer'     },
  ]
  const [activeTab, setActiveTab] = useState('paper')

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#fafaf8]">
      {/* ── Page header ── */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Desain Struk</h2>
          <p className="text-orange-800/50 font-medium text-sm mt-0.5">
            Format &amp; layout struk thermal printer · {tenantName || 'Toko Anda'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-neutral-600 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Reset
          </button>
          <button
            onClick={handleTestPrint}
            disabled={printing}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">
              {printing ? 'hourglass_top' : btIsConnected() ? 'print' : 'bluetooth'}
            </span>
            {printing ? 'Mencetak...' : btIsConnected() ? 'Test Print' : 'Hubungkan & Test'}
          </button>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-all active:scale-95 ${
              saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#ff8c00] hover:bg-[#e07800]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{saved ? 'check' : 'save'}</span>
            {saved ? 'Tersimpan!' : 'Simpan Config'}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col xl:flex-row gap-6 px-6 pb-10 flex-1">

        {/* ── LEFT: Controls ── */}
        <div className="xl:w-[400px] flex-shrink-0 space-y-4">

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3 items-start">
            <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
            <p className="text-xs text-blue-700 leading-relaxed">
              Halaman ini hanya mengatur <strong>format dan tampilan</strong> struk.
              Data order (nama toko, harga, item) diambil otomatis dari sistem saat cetak.
            </p>
          </div>

          {/* Tab Nav */}
          <div className="flex bg-white rounded-2xl border border-neutral-100 shadow-sm p-1 gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${
                  activeTab === t.id
                    ? 'bg-[#ff8c00] text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Kertas (paper width + formatting) ── */}
          {activeTab === 'paper' && (
            <div className="space-y-4 animate-fade-in-up">
              <Card>
                <SectionHeader icon="straighten" title="Lebar Kertas" subtitle="Pilih preset lebar printer Anda" />

                {/* ⚠ Width warning — most important setting */}
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex gap-2.5 items-start">
                  <span className="material-symbols-outlined text-red-500 text-[18px] mt-0.5 flex-shrink-0">warning</span>
                  <div>
                    <p className="text-xs font-bold text-red-700">Wajib disesuaikan dengan printer fisik</p>
                    <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
                      Jika salah → teks <strong>terpotong / wrap acak</strong>.<br/>
                      Printer 58mm = <strong>32</strong> · 76mm = <strong>42</strong> · 80mm = <strong>48</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {WIDTH_PRESETS.map(p => (
                    <button
                      key={p.chars}
                      onClick={() => set('maxCharsPerLine', p.chars)}
                      className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                        layout.maxCharsPerLine === p.chars
                          ? 'bg-[#ff8c00] text-white border-[#ff8c00] shadow-sm'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#ff8c00]/40'
                      }`}
                    >
                      <div>{p.label}</div>
                      <div className={`text-[10px] font-normal ${layout.maxCharsPerLine === p.chars ? 'text-white/70' : 'text-neutral-400'}`}>{p.sub}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Karakter per Baris</label>
                    <span className="text-sm font-black text-[#ff8c00]">{layout.maxCharsPerLine}</span>
                  </div>
                  <input
                    type="range" min={24} max={64} step={1}
                    value={layout.maxCharsPerLine}
                    onChange={e => set('maxCharsPerLine', Number(e.target.value))}
                    className="w-full h-2 accent-[#ff8c00] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>24 (min)</span><span>64 (max)</span>
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader icon="format_align_left" title="Format Tampilan" />
                <div className="space-y-3">
                  <ToggleRow
                    label="Mode Kompak"
                    description="Kurangi baris kosong antar bagian"
                    checked={layout.compactMode}
                    onChange={v => set('compactMode', v)}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Karakter Pemisah</label>
                    <div className="flex gap-2 flex-wrap">
                      {['-', '=', '*', '~', '_', '·'].map(c => (
                        <button
                          key={c}
                          onClick={() => set('dividerChar', c)}
                          className={`w-10 h-10 rounded-xl border font-mono text-base font-bold transition-all ${
                            layout.dividerChar === c
                              ? 'bg-[#ff8c00] text-white border-[#ff8c00] shadow-sm'
                              : 'bg-white text-neutral-600 border-neutral-200 hover:border-[#ff8c00]/40'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Simbol Mata Uang</label>
                    <input
                      type="text"
                      value={layout.currencySymbol}
                      onChange={e => set('currencySymbol', e.target.value)}
                      className="w-32 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00]"
                      placeholder="Rp"
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab: Bagian (section visibility) ── */}
          {activeTab === 'sections' && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Store profile inputs */}
              <Card>
                <SectionHeader icon="store" title="Profil Toko" subtitle="Ditampilkan di bagian atas struk" />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Alamat Toko</label>
                    <textarea
                      value={layout.storeAddress ?? ''}
                      onChange={e => set('storeAddress', e.target.value)}
                      rows={2}
                      placeholder="Jl. Sudirman No. 1, Jakarta (kosongkan jika tidak ingin tampil)"
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00] transition-all resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">Nomor Telepon</label>
                    <input
                      type="tel"
                      value={layout.storePhone ?? ''}
                      onChange={e => set('storePhone', e.target.value)}
                      placeholder="08123456789 (kosongkan jika tidak ingin tampil)"
                      className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00] transition-all"
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <SectionHeader icon="storefront" title="Header Toko" subtitle="Bagian atas struk" />
                <div className="divide-y divide-neutral-50">
                  <ToggleRow label="Logo [LOGO]"   checked={layout.showLogo}      onChange={v => set('showLogo', v)} disabled={true} badge="Dalam pengembangan" />
                  <ToggleRow label="Nama Toko"      checked={layout.showStoreName} onChange={v => set('showStoreName', v)} />
                  <ToggleRow label="Alamat"         checked={layout.showAddress}   onChange={v => set('showAddress', v)} />
                  <ToggleRow label="Nomor Telepon"  checked={layout.showPhone}     onChange={v => set('showPhone', v)} />
                </div>
              </Card>

              <Card>
                <SectionHeader icon="receipt" title="Info Order" subtitle="Metadata transaksi" />
                <div className="divide-y divide-neutral-50">
                  <ToggleRow label="Nomor Order"    checked={layout.showOrderId}  onChange={v => set('showOrderId', v)} />
                  <ToggleRow label="Tanggal & Waktu" checked={layout.showDateTime} onChange={v => set('showDateTime', v)} />
                  <ToggleRow label="Nama Kasir"     checked={layout.showCashier}  onChange={v => set('showCashier', v)} />
                </div>
              </Card>

              <Card>
                <SectionHeader icon="calculate" title="Ringkasan Harga" />
                <div className="divide-y divide-neutral-50">
                  <ToggleRow label="Subtotal"  checked={layout.showSubtotal} onChange={v => set('showSubtotal', v)} />
                  <ToggleRow label="Diskon"    checked={layout.showDiscount} onChange={v => set('showDiscount', v)} />
                  <ToggleRow label="Total"     checked={layout.showTotal}    onChange={v => set('showTotal', v)} />
                </div>
              </Card>

              <Card>
                <SectionHeader icon="point_of_sale" title="Pembayaran" />
                <div className="divide-y divide-neutral-50">
                  <ToggleRow label="Metode Pembayaran"   checked={layout.showPaymentMethod} onChange={v => set('showPaymentMethod', v)} />
                  <ToggleRow
                    label="Tunai & Kembalian"
                    checked={layout.showCashChange}
                    onChange={v => set('showCashChange', v)}
                    description="Hanya tampil untuk transaksi Cash (bukan QRIS)"
                  />
                </div>
              </Card>
            </div>
          )}

          {/* ── Tab: Tabel Item ── */}
          {activeTab === 'items' && (
            <div className="space-y-4 animate-fade-in-up">
              <Card>
                <SectionHeader icon="receipt_long" title="Kolom Item" subtitle="Apa yang ditampilkan per baris item" />
                <div className="divide-y divide-neutral-50">
                  <ToggleRow
                    label="Word-wrap nama panjang"
                    description="Nama item yang panjang dilanjutkan ke baris berikutnya"
                    checked={layout.wrapItemName}
                    onChange={v => set('wrapItemName', v)}
                  />
                  <ToggleRow label="Qty (x3)"            checked={layout.showQty}       onChange={v => set('showQty', v)} />
                  <ToggleRow
                    label="Harga satuan sub-baris"
                    description="Tampilkan @ Rp... di bawah nama item"
                    checked={layout.showUnitPrice}
                    onChange={v => set('showUnitPrice', v)}
                  />
                  <ToggleRow label="Total per item"       checked={layout.showItemTotal} onChange={v => set('showItemTotal', v)} />
                </div>
              </Card>

              <Card>
                <SectionHeader icon="table_chart" title="Lebar Kolom" subtitle="Dalam satuan karakter" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                      Kolom Harga
                      <span className="font-normal ml-1 text-neutral-400">({layout.priceColWidth} char)</span>
                    </label>
                    <input
                      type="range" min={6} max={16} step={1}
                      value={layout.priceColWidth}
                      onChange={e => set('priceColWidth', Number(e.target.value))}
                      className="w-full h-2 accent-[#ff8c00] cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                      Kolom Qty
                      <span className="font-normal ml-1 text-neutral-400">({layout.qtyColWidth} char)</span>
                    </label>
                    <input
                      type="range" min={2} max={8} step={1}
                      value={layout.qtyColWidth}
                      onChange={e => set('qtyColWidth', Number(e.target.value))}
                      className="w-full h-2 accent-[#ff8c00] cursor-pointer"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400 mt-3">
                  Kolom nama = {layout.maxCharsPerLine} − {layout.qtyColWidth} − {layout.priceColWidth} = <strong>{Math.max(layout.maxCharsPerLine - layout.qtyColWidth - layout.priceColWidth, 4)} char</strong>
                </p>
              </Card>
            </div>
          )}

          {/* ── Tab: Footer ── */}
          {activeTab === 'footer' && (
            <div className="space-y-4 animate-fade-in-up">
              <Card>
                <SectionHeader icon="format_quote" title="Teks Footer" subtitle="Pesan penutup di bawah struk" />
                <textarea
                  value={layout.footerText}
                  onChange={e => set('footerText', e.target.value)}
                  rows={3}
                  placeholder="Terima kasih! Selamat datang kembali."
                  className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00] transition-all resize-none"
                />
              </Card>
              <Card>
                <SectionHeader icon="qr_code" title="QR Code" />
                <ToggleRow
                  label="Area QR Code"
                  description="Sisipkan area QR code di bagian bawah struk"
                  checked={layout.showQRPlaceholder}
                  onChange={v => set('showQRPlaceholder', v)}
                  disabled={true}
                  badge="Dalam pengembangan"
                />
              </Card>
            </div>
          )}
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Preview header bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">print</span>
              </div>
              <div>
                <p className="font-bold text-sm">Preview Struk</p>
                <p className="text-[11px] text-neutral-400">
                  {layout.maxCharsPerLine} char/baris · ~{paperLabel} · Data contoh
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-full border border-emerald-200">
                ✓ ESC/POS Compatible
              </span>
              <span className="px-2.5 py-1 bg-neutral-100 text-neutral-500 text-[11px] font-bold rounded-full">
                Monospace
              </span>
            </div>
          </div>

          {/* Thermal paper simulation */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-2xl">
              {/* Paper top tear */}
              <div className="h-4 bg-gradient-to-b from-neutral-100 to-white rounded-t-2xl border-t border-x border-neutral-200 relative overflow-hidden">
                <div
                  className="absolute inset-x-0 top-0 h-4"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, #e5e7eb 6px, #e5e7eb 7px)' }}
                />
              </div>

              {/* Receipt body */}
              <div className="bg-white border-x border-neutral-200 shadow-xl shadow-neutral-100/60 px-5 py-3" style={{ minHeight: 400 }}>
                {/* Char ruler */}
                <div
                  className="mb-2 pb-2 border-b border-dashed border-neutral-100 overflow-hidden"
                  style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 8, color: '#d1d5db', letterSpacing: 0 }}
                >
                  {Array.from({ length: layout.maxCharsPerLine }, (_, i) =>
                    (i + 1) % 10 === 0 ? String((i + 1) / 10) : '·'
                  ).join('')}
                </div>

                {/* Receipt text */}
                <pre
                  style={{
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: previewFontPx,
                    lineHeight: 1.55,
                    whiteSpace: 'pre',
                    color: '#1a1a1a',
                    overflow: 'hidden',
                  }}
                >
                  {preview}
                </pre>

                {/* Char ruler bottom */}
                <div
                  className="mt-2 pt-2 border-t border-dashed border-neutral-100 overflow-hidden"
                  style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 8, color: '#d1d5db' }}
                >
                  {Array.from({ length: layout.maxCharsPerLine }, (_, i) =>
                    (i + 1) % 10 === 0 ? String((i + 1) / 10) : '·'
                  ).join('')}
                </div>
              </div>

              {/* Paper bottom tear */}
              <div className="h-6 bg-white border-x border-b border-neutral-200 rounded-b-2xl relative overflow-hidden">
                <div
                  className="absolute inset-x-0 bottom-0 h-6"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 6px, #e5e7eb 6px, #e5e7eb 7px)' }}
                />
              </div>

              {/* Stats bar */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { icon: 'format_list_numbered', label: 'Baris',       val: preview.split('\n').length },
                  { icon: 'straighten',           label: 'Char/Baris',  val: layout.maxCharsPerLine },
                  { icon: 'inventory_2',           label: 'Item (demo)', val: DEMO_ORDER.items.length },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-neutral-100 px-4 py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px] text-neutral-300">{s.icon}</span>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-medium">{s.label}</p>
                      <p className="font-bold text-sm">{s.val}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Demo data notice */}
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex gap-2 items-center">
                <span className="material-symbols-outlined text-amber-500 text-[16px]">visibility</span>
                <p className="text-xs text-amber-700">
                  Preview menggunakan <strong>data contoh</strong>. Struk nyata menggunakan data order dari sistem.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toggle switch CSS */}
      <style>{`
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #e5e7eb; border-radius: 24px; transition: .2s; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; border-radius: 50%; transition: .2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        input:checked + .toggle-slider { background-color: #ff8c00; }
        input:checked + .toggle-slider:before { transform: translateX(20px); }
      `}</style>
    </main>
  )
}
