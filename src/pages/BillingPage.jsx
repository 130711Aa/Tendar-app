import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-hot-toast'
import { useTenantContext } from '../context/TenantContext'
import { createInvoice, uploadReceiptAndProcess, formatIDR, getActiveInvoice } from '../lib/billing'
import { supabase } from '../lib/supabase'

// ── Plan definitions ──────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    color: 'border-slate-200',
    badge: null,
    features: ['Hingga 10 produk', '1 Akses Staff', 'Online Menu'],
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 25000,
    color: 'border-orange-300',
    badge: null,
    features: ['Hingga 30 produk', 'Kategori & Gambar Produk', 'Online Menu'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 50000,
    color: 'border-[#ff8c00]/60',
    badge: 'Terpopuler',
    features: ['Produk tak terbatas', '2 Akses Staff', 'Kasir (POS)', 'Manajemen Stok & Analitik', 'Export CSV'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 100000,
    color: 'border-[#ff8c00]',
    badge: 'Lengkap',
    features: ['Resep (BoM)', 'Staff tak terbatas', 'Export Excel', 'Prioritas Support'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────
function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null
  return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

function useCountdown(deadline) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    if (!deadline) return
    const tick = () => {
      const diff = new Date(deadline) - new Date()
      setRemaining(diff > 0 ? diff : 0)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  if (remaining === null) return null
  const h = Math.floor(remaining / 3600000)
  const m = Math.floor((remaining % 3600000) / 60000)
  const s = Math.floor((remaining % 60000) / 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Subscription timer ────────────────────────────────────────────────
function SubscriptionTimer({ expiresAt, plan }) {
  const days = getDaysRemaining(expiresAt)
  if (plan === 'free' || !expiresAt) return null

  const isExpired = days !== null && days <= 0
  const isExpiringSoon = days !== null && days <= 7 && !isExpired
  const color = isExpired
    ? 'bg-red-50 border-red-200 text-red-700'
    : isExpiringSoon
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
  const icon = isExpired ? 'warning' : isExpiringSoon ? 'alarm' : 'calendar_month'
  const expiryDate = new Date(expiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${color}`}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {isExpired ? (
        <span>Langganan <strong>sudah berakhir</strong> — segera perbarui!</span>
      ) : (
        <span>Aktif hingga <strong>{expiryDate}</strong> · <span className="font-extrabold">{days} hari lagi</span></span>
      )}
    </div>
  )
}

// ── QRIS Payment Modal ────────────────────────────────────────────────
function QRISModal({ invoice, planName, onClose, onSuccess, tenantId, onApplyPromo }) {
  const countdown = useCountdown(invoice?.deadline)
  const [uploadStep, setUploadStep] = useState('idle') // idle | uploading | processing | done | error
  const [resultMsg, setResultMsg] = useState('')
  const [resultStatus, setResultStatus] = useState(null) // 'valid' | 'review_needed' | 'rejected'
  const [dragOver, setDragOver] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const fileRef = useRef()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Format file harus JPG, PNG, atau WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }

    setUploadStep('uploading')
    try {
      const result = await uploadReceiptAndProcess(invoice.id, tenantId, file)
      setResultStatus(result.status)
      setResultMsg(result.message)
      setUploadStep('done')

      if (result.status === 'valid') {
        toast.success('Pembayaran terverifikasi! 🎉')
        setTimeout(() => { onSuccess(); onClose() }, 2500)
      } else if (result.status === 'review_needed') {
        toast('Sedang ditinjau tim Tendar. Kami akan konfirmasi dalam 1×24 jam.', { icon: '⏳' })
      } else {
        toast.error('Bukti tidak valid. Coba upload ulang.')
        setUploadStep('idle')
      }
    } catch (err) {
      setResultStatus('rejected')
      setResultMsg(err.message || 'Gagal memproses bukti pembayaran')
      setUploadStep('error')
      toast.error(err.message || 'Terjadi kesalahan')
    }
  }, [invoice, tenantId, onClose, onSuccess])

  const onFileChange = (e) => handleFile(e.target.files?.[0])
  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const handlePromoSubmit = async (e) => {
    e.preventDefault()
    if (!promoCode.trim()) return
    setApplyingPromo(true)
    try {
      await onApplyPromo(promoCode.trim())
      toast.success('Kode promo berhasil digunakan!')
      setPromoCode('')
    } catch (err) {
      toast.error(err.message || 'Gagal menggunakan kode promo')
    } finally {
      setApplyingPromo(false)
    }
  }

  const isExpired = countdown === '00:00:00'

  // ── If user already paid this invoice, show review status (not payment form)
  if (invoice?.status === 'review_needed') {
    return createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        style={{ zIndex: 9999 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Status Pembayaran</p>
                <h2 className="text-2xl font-black">Paket {planName}</h2>
              </div>
              <button onClick={onClose} className="text-orange-100 hover:text-white transition-colors p-1">
                <span className="material-symbols-outlined text-[28px]">close</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-8 flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-600 text-5xl">hourglass_top</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Pembayaran Sedang Diverifikasi</h3>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                Bukti transfer Anda sudah kami terima dan sedang ditinjau oleh tim Tendar.
                Proses verifikasi biasanya selesai dalam <strong>1×24 jam</strong>.
              </p>
            </div>
            <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Paket</span>
                <span className="font-bold text-slate-800 uppercase">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Dibayar</span>
                <span className="font-bold text-slate-800">{formatIDR(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <span className="font-semibold text-amber-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">pending</span>
                  Menunggu Konfirmasi
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Jika sudah lebih dari 24 jam belum dikonfirmasi, hubungi support Tendar.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  }


    return createPortal(
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        style={{ zIndex: 9999 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in bg-white max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#ff8c00] to-orange-500 p-5 text-white flex-shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 text-xs font-medium mb-0.5">Bayar via QRIS</p>
                <h2 className="text-xl font-black">Paket {planName}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-orange-100 hover:text-white transition-colors p-1"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* Amount */}
            <div className="mt-3 bg-white/20 rounded-xl px-4 py-3">
              <p className="text-orange-100 text-[11px] leading-none mb-1">Transfer tepat sebesar</p>
              {invoice.discount_amount > 0 && (
                <p className="text-orange-200 text-xs line-through">{formatIDR(invoice.base_amount)}</p>
              )}
              {invoice.total_amount === 0 ? (
                <p className="text-3xl font-black tracking-tight mt-0.5">Gratis (Rp0)</p>
              ) : (
                <>
                  <p className="text-3xl font-black tracking-tight mt-0.5 line-height-1">
                    {formatIDR(invoice.total_amount)}
                  </p>
                  <p className="text-orange-200 text-[10px] mt-1">
                    (termasuk kode unik <strong className="text-white">+{invoice.unique_code}</strong>)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {/* Promo Code Input */}
            {uploadStep === 'idle' && !isExpired && (
              <form onSubmit={handlePromoSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Punya Kode Promo?"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={applyingPromo}
                  className="flex-1 border text-sm border-slate-200 rounded-lg px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/40 focus:border-[#ff8c00]"
                />
                <button
                  type="submit"
                  disabled={!promoCode.trim() || applyingPromo}
                  className="bg-slate-800 text-white rounded-lg px-4 text-xs font-bold hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  {applyingPromo ? 'Tunggu...' : 'Apply'}
                </button>
              </form>
            )}

            {/* Timer */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold ${
              isExpired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">timer</span>
                <span className="text-xs">Berlaku hingga</span>
              </div>
              <span className="font-mono text-sm">{countdown ?? '--:--:--'}</span>
            </div>

            {/* QRIS Image only if amount > 0 */}
            {invoice.total_amount > 0 && (
              <div className="flex flex-col items-center">
                <p className="text-[11px] text-slate-400 mb-2 font-medium">Scan QR Code di bawah ini</p>
                <div className="w-40 h-40 rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-1">
                  <img
                    src="/QRIS Tendar Payment 2.jpg"
                    alt="QRIS Tendar"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.nextElementSibling.style.display = 'flex'
                    }}
                  />
                  <div
                    className="hidden w-full h-full items-center justify-center flex-col gap-1 text-slate-400 text-center p-2"
                  >
                    <span className="material-symbols-outlined text-[32px]">qr_code_2</span>
                    <p className="text-[10px]">Letakkan file <code className="font-mono bg-slate-100 px-0.5 rounded">QRIS Tendar Payment 2.jpg</code> di <code className="font-mono bg-slate-100 px-0.5 rounded">public/</code></p>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  NMID: <span className="font-mono font-bold">ID1026505497952</span> · Tendar
                </p>
              </div>
            )}

            {/* Divider */}
            {invoice.total_amount > 0 && (
              <div className="flex items-center gap-3 text-slate-300">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] font-medium text-slate-400">Sudah bayar?</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
            )}

            {/* Upload area or Start Free */}
            {uploadStep === 'idle' && !isExpired && (
              <div>
                {invoice.total_amount === 0 ? (
                  <button
                    onClick={() => {
                      setUploadStep('done')
                      setResultStatus('valid')
                      setResultMsg('Aktivasi paket gratis berhasil!')
                      toast.success('Aktivasi paket berhasil! 🎉')
                      setTimeout(() => { onSuccess(); onClose() }, 1500)
                    }}
                    className="w-full bg-[#ff8c00] text-white py-3 rounded-xl font-bold hover:bg-[#e07800] transition-colors shadow-lg shadow-[#ff8c00]/20"
                  >
                    Aktifkan Paket Sekarang
                  </button>
                ) : (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={onFileChange}
                    />
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        dragOver
                          ? 'border-[#ff8c00] bg-orange-50'
                          : 'border-slate-200 hover:border-[#ff8c00]/50 hover:bg-orange-50/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[28px] text-slate-400">upload</span>
                      <p className="text-xs font-semibold text-slate-600 mt-1">Upload Bukti Transfer</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WebP · Maks 5MB</p>
                    </div>
                  </>
                )}
              </div>
            )}

          {uploadStep === 'uploading' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 border-4 border-[#ff8c00]/20 border-t-[#ff8c00] rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-600">Mengupload bukti pembayaran...</p>
            </div>
          )}

          {uploadStep === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-600">Memverifikasi dengan OCR...</p>
              <p className="text-xs text-slate-400">Ini mungkin memerlukan waktu beberapa detik</p>
            </div>
          )}

          {uploadStep === 'done' && resultStatus === 'valid' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-500 text-[28px] mt-0.5">check_circle</span>
              <div>
                <p className="font-bold text-emerald-700 text-sm">Pembayaran Terverifikasi!</p>
                <p className="text-xs text-emerald-600 mt-1">{resultMsg}</p>
              </div>
            </div>
          )}

          {uploadStep === 'done' && resultStatus === 'review_needed' && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-500 text-[28px] mt-0.5">pending</span>
              <div>
                <p className="font-bold text-amber-700 text-sm">Sedang Ditinjau</p>
                <p className="text-xs text-amber-600 mt-1">{resultMsg}</p>
              </div>
            </div>
          )}

          {uploadStep === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-red-500 text-[28px] mt-0.5">error</span>
              <div>
                <p className="font-bold text-red-700 text-sm">Verifikasi Gagal</p>
                <p className="text-xs text-red-600 mt-1">{resultMsg}</p>
                <button
                  onClick={() => { setUploadStep('idle'); setResultMsg(''); setResultStatus(null) }}
                  className="mt-2 text-xs font-semibold text-red-600 underline"
                >
                  Coba upload ulang
                </button>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm text-center">
              <span className="material-symbols-outlined text-[24px] block mb-1">timer_off</span>
              Invoice sudah kadaluarsa. Tutup dan buat invoice baru.
            </div>
          )}

          {/* Info */}
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            Pembayaran diverifikasi otomatis via Google Cloud Vision OCR.
            Jika ada kendala, hubungi CS Tendar dengan ID invoice: <span className="font-mono font-bold">{invoice.id.slice(0, 8).toUpperCase()}</span>
          </p>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main BillingPage ──────────────────────────────────────────────────
export default function BillingPage() {
  const { tenantId, tenantName, tenantPlan, slug } = useTenantContext()
  const [planExpiresAt, setPlanExpiresAt] = useState(null)
  const [fetchingExpiry, setFetchingExpiry] = useState(true)
  const [loadingPlan, setLoadingPlan] = useState(null) // which plan is loading
  const [activeInvoice, setActiveInvoice] = useState(null)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Fetch expiry
  useEffect(() => {
    if (!tenantId) return
    setFetchingExpiry(true)
    supabase
      .from('tenants')
      .select('plan_expires_at')
      .eq('id', tenantId)
      .single()
      .then(({ data }) => { if (data) setPlanExpiresAt(data.plan_expires_at) })
      .finally(() => setFetchingExpiry(false))
  }, [tenantId])

  const days = getDaysRemaining(planExpiresAt)
  const isExpired = days !== null && days <= 0
  const isExpiringSoon = days !== null && days <= 7 && !isExpired

  const handleSelectPlan = async (plan) => {
    if (tenantPlan === plan.id) {
      toast.error(`Anda sudah berlangganan paket ${plan.name}`)
      return
    }

    setLoadingPlan(plan.id)
    const tid = toast.loading('Mengecek invoice...')

    try {
      // Check if there's already an active or under-review invoice for this plan
      let invoice = await getActiveInvoice(tenantId, plan.id)

      if (invoice?.status === 'review_needed') {
        // User already paid — block new invoice, show review status
        toast.dismiss(tid)
        toast.success('Pembayaran Anda sedang diverifikasi oleh tim kami. Harap tunggu.', { duration: 6000 })
        // Still show modal so user can see their existing invoice info
        setActiveInvoice(invoice)
        setSelectedPlan(plan)
        setShowModal(true)
        return
      }

      if (!invoice) {
        toast.loading('Membuat invoice...', { id: tid })
        invoice = await createInvoice(tenantId, plan.id)
      }

      toast.dismiss(tid)
      setActiveInvoice(invoice)
      setSelectedPlan(plan)
      setShowModal(true)
    } catch (err) {
      toast.error(err.message || 'Gagal membuat invoice', { id: tid })
    } finally {
      setLoadingPlan(null)
    }
  }

  const handlePaymentSuccess = () => {
    setTimeout(() => window.location.reload(), 1500)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Langganan & Billing</h1>
            <p className="text-slate-500 text-sm mt-1">
              Kelola paket berlangganan untuk toko <strong>{tenantName}</strong>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">stars</span>
              <span className="text-sm font-semibold">
                Paket Aktif: <span className="uppercase font-black">{tenantPlan}</span>
              </span>
            </div>
            {!fetchingExpiry && <SubscriptionTimer expiresAt={planExpiresAt} plan={tenantPlan} />}
          </div>
        </div>

        {isExpired && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700 text-sm">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <p><strong>Langganan Anda sudah berakhir.</strong> Fitur premium tidak aktif. Perbarui sekarang.</p>
          </div>
        )}
        {isExpiringSoon && !isExpired && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700 text-sm">
            <span className="material-symbols-outlined text-amber-500">alarm</span>
            <p><strong>Langganan hampir habis!</strong> Hanya tersisa {days} hari.</p>
          </div>
        )}
      </div>

      {/* Subscription duration */}
      {tenantPlan !== 'free' && planExpiresAt && !fetchingExpiry && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ff8c00] text-[20px]">schedule</span>
            Durasi Langganan
          </h2>
          {(() => {
            const totalDays = 30
            const pct = Math.max(0, Math.min(100, Math.round((days / totalDays) * 100)))
            const bar = isExpired ? 'bg-red-400' : isExpiringSoon ? 'bg-amber-400' : 'bg-emerald-400'
            return (
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[220px]">
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                    <span>Sisa waktu</span>
                    <span className="font-bold text-slate-700">{Math.max(0, days)} / {totalDays} hari</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Berakhir: {new Date(planExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{pct}% tersisa</span>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className={`text-3xl font-black ${isExpired ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {Math.max(0, days)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">Hari Tersisa</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-slate-400">{Math.max(0, 30 - days)}</p>
                    <p className="text-xs text-slate-500 font-medium">Hari Berjalan</p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(p => (
          <div
            key={p.id}
            className={`relative bg-white border-2 ${p.color} ${tenantPlan === p.id ? 'bg-orange-50/40 ring-2 ring-[#ff8c00]/30' : ''} p-5 rounded-3xl flex flex-col shadow-sm hover:shadow-md transition-shadow`}
          >
            {tenantPlan === p.id && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest shadow-sm">
                PAKET AKTIF
              </span>
            )}
            {p.badge && tenantPlan !== p.id && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff8c00] text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest shadow-sm">
                {p.badge}
              </span>
            )}
            <h3 className="font-bold text-slate-700 text-lg">{p.name}</h3>
            <p className="mt-1 border-b border-slate-100 pb-4">
              <span className="text-3xl font-extrabold text-[#181510] tracking-tight">
                {p.price === 0 ? 'Gratis' : formatIDR(p.price)}
              </span>
              {p.price > 0 && <span className="text-slate-400 text-sm font-medium">/bln</span>}
            </p>
            <ul className="mt-4 mb-6 space-y-3 flex-1">
              {p.features.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600 font-medium">
                  <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                  <span className="leading-tight pt-0.5">{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA Button */}
            {p.id !== 'free' && tenantPlan !== p.id && (
              <button
                onClick={() => handleSelectPlan(p)}
                disabled={loadingPlan !== null}
                className="w-full bg-[#ff8c00] disabled:bg-slate-300 text-white py-3 rounded-xl font-bold hover:bg-[#e07800] transition-colors flex justify-center items-center gap-2 shadow-lg shadow-[#ff8c00]/20 active:scale-[0.98]"
              >
                {loadingPlan === p.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Memuat...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                    Bayar via QRIS
                  </>
                )}
              </button>
            )}
            {p.id === 'free' && tenantPlan !== p.id && (
              <button disabled className="w-full bg-slate-50 text-slate-400 py-3 rounded-xl font-bold cursor-not-allowed border border-slate-200">
                Downgrade via CS
              </button>
            )}
            {tenantPlan === p.id && (
              <button disabled className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-3 rounded-xl font-bold cursor-not-allowed">
                Sedang Digunakan
              </button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ff8c00] text-[20px]">help_outline</span>
          Cara Pembayaran via QRIS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { icon: 'touch_app', title: 'Pilih Paket', desc: 'Klik "Bayar via QRIS" pada paket yang diinginkan' },
            { icon: 'qr_code_scanner', title: 'Scan QR', desc: 'Scan QR Code menggunakan GoPay, OVO, Dana, BRImo, atau app bank lainnya' },
            { icon: 'paid', title: 'Transfer Tepat', desc: 'Pastikan nominal transfer sesuai, termasuk kode unik 3 digit' },
            { icon: 'upload', title: 'Upload Bukti', desc: 'Upload screenshot bukti pembayaran untuk verifikasi otomatis via OCR' },
          ].map((step, i) => (
            <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex-shrink-0 w-8 h-8 bg-[#ff8c00]/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[#ff8c00] text-[18px]">{step.icon}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">{step.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-sm">
        <span className="material-symbols-outlined text-blue-500 flex-shrink-0">info</span>
        <p>
          Pembayaran diverifikasi otomatis oleh sistem OCR Tendar menggunakan Google Cloud Vision.
          Untuk bantuan, hubungi admin Tendar dengan menyebutkan <strong>ID Invoice</strong> Anda.
        </p>
      </div>

      {/* QRIS Modal */}
      {showModal && activeInvoice && selectedPlan && (
        <QRISModal
          invoice={activeInvoice}
          planName={selectedPlan.name}
          tenantId={tenantId}
          onClose={() => setShowModal(false)}
          onSuccess={handlePaymentSuccess}
          onApplyPromo={async (promoCode) => {
            const newInvoice = await createInvoice(tenantId, selectedPlan.id, promoCode)
            setActiveInvoice(newInvoice)
          }}
        />
      )}
    </div>
  )
}
