import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const TABS = [
    { key: 'review_needed', label: 'Perlu Review', icon: 'pending_actions', color: 'text-amber-400' },
    { key: 'valid', label: 'Disetujui', icon: 'check_circle', color: 'text-emerald-400' },
    { key: 'rejected', label: 'Ditolak', icon: 'cancel', color: 'text-red-400' },
]

const formatIDR = (n) => 'Rp' + (n || 0).toLocaleString('id-ID')
const formatDate = (iso) => new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
})

export default function SAPaymentVerification() {
    const [activeTab, setActiveTab] = useState('review_needed')
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [counts, setCounts] = useState({ review_needed: 0, valid: 0, rejected: 0 })
    const [selectedPayment, setSelectedPayment] = useState(null)
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectInput, setShowRejectInput] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)

    const fetchPayments = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    id, status, confidence_score, created_at, receipt_url,
                    ocr_raw_text, extracted_amount, extracted_nmid, extracted_ref_id,
                    rejection_reason,
                    invoices!inner(
                        id, tenant_id, plan_id, total_amount, base_amount, unique_code, created_at,
                        tenants!inner(name, slug)
                    )
                `)
                .eq('status', activeTab)
                .order('created_at', { ascending: activeTab === 'review_needed' })

            if (error) throw error
            setPayments(data || [])
        } catch (err) {
            console.error('Fetch error:', err)
            toast.error('Gagal memuat data pembayaran')
        } finally {
            setLoading(false)
        }
    }, [activeTab])

    const fetchCounts = useCallback(async () => {
        try {
            const results = await Promise.all(
                TABS.map(async (tab) => {
                    const { count } = await supabase
                        .from('payments')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', tab.key)
                    return { key: tab.key, count: count || 0 }
                })
            )
            const c = {}
            results.forEach(r => { c[r.key] = r.count })
            setCounts(c)
        } catch (err) {
            console.error('Count error:', err)
        }
    }, [])

    useEffect(() => {
        fetchPayments()
        fetchCounts()
    }, [activeTab, fetchPayments, fetchCounts])

    // Get receipt image URL
    const getReceiptUrl = (payment) => {
        if (!payment.receipt_url) return null
        // If it's already a full URL, use it
        if (payment.receipt_url.startsWith('http')) return payment.receipt_url
        // Otherwise construct from storage
        const { data } = supabase.storage.from('payment-receipts').getPublicUrl(payment.receipt_url)
        return data?.publicUrl
    }

    const handleApprove = async (payment) => {
        if (!confirm(`Approve pembayaran ${formatIDR(payment.invoices.total_amount)} dari ${payment.invoices.tenants.name}?`)) return

        setActionLoading(true)
        try {
            const { data, error } = await supabase.rpc('approve_payment', {
                p_payment_id: payment.id,
                p_invoice_id: payment.invoices.id,
                p_tenant_id: payment.invoices.tenant_id,
            })

            if (error) throw error
            toast.success(`Pembayaran disetujui! Plan aktif hingga ${new Date(data.new_expiry).toLocaleDateString('id-ID')}`)
            setSelectedPayment(null)
            fetchPayments()
            fetchCounts()
        } catch (err) {
            toast.error(err.message || 'Gagal approve pembayaran')
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async (payment) => {
        if (!rejectReason.trim()) {
            toast.error('Masukkan alasan penolakan')
            return
        }

        setActionLoading(true)
        try {
            const { error } = await supabase.rpc('reject_payment', {
                p_payment_id: payment.id,
                p_reason: rejectReason.trim(),
            })

            if (error) throw error
            toast.success('Pembayaran ditolak')
            setSelectedPayment(null)
            setShowRejectInput(false)
            setRejectReason('')
            fetchPayments()
            fetchCounts()
        } catch (err) {
            toast.error(err.message || 'Gagal reject pembayaran')
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Verifikasi Pembayaran</h1>
                <p className="text-slate-400 text-sm mt-1">Review dan approve/reject bukti pembayaran merchant</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                            activeTab === tab.key
                                ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                                : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-300'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.key ? tab.color : ''}`}>{tab.icon}</span>
                        {tab.label}
                        {counts[tab.key] > 0 && (
                            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                                tab.key === 'review_needed' ? 'bg-amber-500 text-white' :
                                tab.key === 'valid' ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-red-500/20 text-red-400'
                            }`}>
                                {counts[tab.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin material-symbols-outlined text-indigo-400 text-3xl">progress_activity</span>
                </div>
            ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a2e] rounded-2xl border border-white/5">
                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-3">
                        {activeTab === 'review_needed' ? 'task_alt' : activeTab === 'valid' ? 'check_circle' : 'block'}
                    </span>
                    <p className="text-slate-400 font-medium">
                        {activeTab === 'review_needed' ? 'Tidak ada pembayaran yang perlu direview' :
                         activeTab === 'valid' ? 'Belum ada pembayaran yang disetujui' :
                         'Tidak ada pembayaran yang ditolak'}
                    </p>
                </div>
            ) : (
                <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden">
                    {/* Header row */}
                    <div className="hidden md:grid grid-cols-[1fr_1.5fr_0.8fr_1fr_0.6fr_0.8fr_0.5fr] gap-4 px-5 py-3 border-b border-white/5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        <span>ID Transaksi</span>
                        <span>Nama Toko</span>
                        <span>Plan</span>
                        <span>Nominal</span>
                        <span>OCR Score</span>
                        <span>Waktu</span>
                        <span>Aksi</span>
                    </div>

                    {/* Rows */}
                    {payments.map(p => (
                        <div
                            key={p.id}
                            className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_0.8fr_1fr_0.6fr_0.8fr_0.5fr] gap-2 md:gap-4 px-5 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
                            onClick={() => { setSelectedPayment(p); setShowRejectInput(false); setRejectReason('') }}
                        >
                            <span className="font-mono text-xs text-indigo-300 font-semibold">
                                {p.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className="text-sm text-white font-medium truncate">
                                {p.invoices?.tenants?.name || 'Unknown'}
                            </span>
                            <span className="text-xs">
                                <span className="px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-300 font-bold uppercase text-[10px]">
                                    {p.invoices?.plan_id}
                                </span>
                            </span>
                            <div className="text-sm">
                                <span className="text-white font-bold">{formatIDR(p.invoices?.total_amount)}</span>
                                <span className="text-slate-500 text-[10px] ml-1.5">
                                    (+{p.invoices?.unique_code})
                                </span>
                            </div>
                            <div>
                                <span className={`text-xs font-bold ${
                                    p.confidence_score >= 70 ? 'text-emerald-400' :
                                    p.confidence_score >= 40 ? 'text-amber-400' :
                                    'text-red-400'
                                }`}>
                                    {p.confidence_score ?? '-'}
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">{formatDate(p.created_at)}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSelectedPayment(p); setShowRejectInput(false) }}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">visibility</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedPayment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => e.target === e.currentTarget && setSelectedPayment(null)}
                >
                    <div className="bg-[#1a1a2e] rounded-3xl border border-white/10 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white">Detail Pembayaran</h2>
                                <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {selectedPayment.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <button
                                onClick={() => setSelectedPayment(null)}
                                className="text-slate-400 hover:text-white transition-colors p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left: Receipt Image */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-400 text-lg">image</span>
                                        Bukti Pembayaran
                                    </h3>
                                    <div className="bg-black/30 rounded-2xl border border-white/5 p-2 flex items-center justify-center min-h-[300px]">
                                        {getReceiptUrl(selectedPayment) ? (
                                            <img
                                                src={getReceiptUrl(selectedPayment)}
                                                alt="Receipt"
                                                className="max-w-full max-h-[500px] object-contain rounded-xl"
                                                onError={(e) => { e.target.style.display = 'none' }}
                                            />
                                        ) : (
                                            <div className="text-center text-slate-500">
                                                <span className="material-symbols-outlined text-4xl mb-2 block">broken_image</span>
                                                <p className="text-sm">Gambar tidak tersedia</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-400 text-lg">info</span>
                                        Data Transaksi
                                    </h3>

                                    {/* Info grid */}
                                    <div className="space-y-3">
                                        {[
                                            { label: 'Toko', value: selectedPayment.invoices?.tenants?.name, icon: 'store' },
                                            { label: 'Plan', value: selectedPayment.invoices?.plan_id?.toUpperCase(), icon: 'workspace_premium' },
                                            { label: 'Expected Amount', value: formatIDR(selectedPayment.invoices?.total_amount), icon: 'paid', highlight: true },
                                            { label: 'Kode Unik', value: `+${selectedPayment.invoices?.unique_code}`, icon: 'tag' },
                                            { label: 'OCR Extracted Amount', value: selectedPayment.extracted_amount ? formatIDR(selectedPayment.extracted_amount) : 'N/A', icon: 'document_scanner',
                                                match: selectedPayment.extracted_amount === selectedPayment.invoices?.total_amount },
                                            { label: 'NMID Terdeteksi', value: selectedPayment.extracted_nmid || 'N/A', icon: 'qr_code' },
                                            { label: 'Ref ID', value: selectedPayment.extracted_ref_id || 'N/A', icon: 'receipt' },
                                            { label: 'Confidence Score', value: `${selectedPayment.confidence_score ?? 'N/A'} / 100`, icon: 'speed' },
                                            { label: 'Waktu Upload', value: formatDate(selectedPayment.created_at), icon: 'schedule' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                                                <span className="material-symbols-outlined text-slate-500 text-[18px]">{item.icon}</span>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{item.label}</p>
                                                    <p className={`text-sm font-semibold mt-0.5 ${
                                                        item.highlight ? 'text-amber-300' :
                                                        item.match === true ? 'text-emerald-400' :
                                                        item.match === false ? 'text-red-400' :
                                                        'text-white'
                                                    }`}>
                                                        {item.value}
                                                        {item.match === true && <span className="ml-2 text-[10px]">✅ Match</span>}
                                                        {item.match === false && <span className="ml-2 text-[10px]">❌ Mismatch</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Rejection reason (if rejected) */}
                                    {selectedPayment.rejection_reason && (
                                        <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                            <p className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mb-1">Alasan Penolakan</p>
                                            <p className="text-sm text-red-300">{selectedPayment.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer: Actions */}
                        {activeTab === 'review_needed' && (
                            <div className="px-6 py-4 border-t border-white/5 bg-[#0f0f23]/50">
                                {showRejectInput ? (
                                    <div className="space-y-3">
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Alasan penolakan (wajib)..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                                            rows={2}
                                            autoFocus
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                                                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                onClick={() => handleReject(selectedPayment)}
                                                disabled={actionLoading || !rejectReason.trim()}
                                                className="px-5 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            >
                                                {actionLoading ? (
                                                    <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-sm">cancel</span>
                                                )}
                                                Konfirmasi Tolak
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setShowRejectInput(true)}
                                            disabled={actionLoading}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleApprove(selectedPayment)}
                                            disabled={actionLoading}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                                        >
                                            {actionLoading ? (
                                                <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                            )}
                                            Approve
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
