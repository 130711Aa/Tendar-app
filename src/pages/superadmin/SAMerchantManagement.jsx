import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const PLAN_OPTIONS = [
    { value: 'free', label: 'Free', color: 'bg-slate-500/15 text-slate-400' },
    { value: 'starter', label: 'Starter', color: 'bg-orange-500/15 text-orange-400' },
    { value: 'business', label: 'Business', color: 'bg-blue-500/15 text-blue-400' },
    { value: 'pro', label: 'Pro', color: 'bg-purple-500/15 text-purple-400' },
]

const formatIDR = (n) => 'Rp' + (n || 0).toLocaleString('id-ID')

function getDaysRemaining(expiresAt) {
    if (!expiresAt) return null
    return Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
}

function getStatusInfo(tenant) {
    if (!tenant.is_active) return { label: 'Suspended', style: 'bg-red-500/15 text-red-400', icon: 'block' }
    if (tenant.plan === 'free') return { label: 'Free', style: 'bg-slate-500/15 text-slate-400', icon: 'token' }
    const days = getDaysRemaining(tenant.plan_expires_at)
    if (days !== null && days <= 0) return { label: 'Expired', style: 'bg-red-500/15 text-red-400', icon: 'timer_off' }
    if (days !== null && days <= 7) return { label: `${days}d Left`, style: 'bg-amber-500/15 text-amber-400', icon: 'alarm' }
    return { label: 'Aktif', style: 'bg-emerald-500/15 text-emerald-400', icon: 'check_circle' }
}

export default function SAMerchantManagement() {
    const [merchants, setMerchants] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [overrideModal, setOverrideModal] = useState(null) // tenant object
    const [suspendModal, setSuspendModal] = useState(null) // tenant object
    const [overrideForm, setOverrideForm] = useState({ plan: 'business', days: 30, reason: '' })
    const [actionLoading, setActionLoading] = useState(false)

    const fetchMerchants = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch tenants with owner info
            const { data: tenants, error } = await supabase
                .from('tenants')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Fetch order counts per tenant
            const tenantIds = (tenants || []).map(t => t.id)
            let orderCounts = {}

            if (tenantIds.length > 0) {
                // Get revenue per tenant from paid invoices
                const { data: invoiceData } = await supabase
                    .from('invoices')
                    .select('tenant_id, total_amount')
                    .eq('status', 'paid')
                    .in('tenant_id', tenantIds)

                if (invoiceData) {
                    // Group by tenant_id
                    invoiceData.forEach(inv => {
                        if (!orderCounts[inv.tenant_id]) orderCounts[inv.tenant_id] = { revenue: 0, count: 0 }
                        orderCounts[inv.tenant_id].revenue += inv.total_amount
                        orderCounts[inv.tenant_id].count += 1
                    })
                }
            }

            // Merge
            const enriched = (tenants || []).map(t => ({
                ...t,
                total_revenue: orderCounts[t.id]?.revenue || 0,
                total_invoices: orderCounts[t.id]?.count || 0,
            }))

            setMerchants(enriched)
        } catch (err) {
            console.error('Fetch error:', err)
            toast.error('Gagal memuat data merchant')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchMerchants()
    }, [fetchMerchants])

    const filteredMerchants = merchants.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.slug.toLowerCase().includes(search.toLowerCase())
    )

    const handleOverride = async () => {
        if (!overrideModal) return
        setActionLoading(true)
        try {
            const { data, error } = await supabase.rpc('override_tenant_plan', {
                p_tenant_id: overrideModal.id,
                p_plan: overrideForm.plan,
                p_days: overrideForm.days,
                p_reason: overrideForm.reason || null,
            })

            if (error) throw error
            const expiryStr = data.new_expiry
                ? new Date(data.new_expiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'N/A'
            toast.success(`Plan ${overrideModal.name} diupdate ke ${overrideForm.plan.toUpperCase()} hingga ${expiryStr}`)
            setOverrideModal(null)
            setOverrideForm({ plan: 'business', days: 30, reason: '' })
            fetchMerchants()
        } catch (err) {
            toast.error(err.message || 'Gagal update plan')
        } finally {
            setActionLoading(false)
        }
    }

    const handleSuspend = async () => {
        if (!suspendModal) return
        const isSuspending = suspendModal.is_active // if currently active → we're suspending
        setActionLoading(true)
        try {
            const { error } = await supabase.rpc('suspend_tenant', {
                p_tenant_id: suspendModal.id,
                p_suspend: isSuspending,
            })

            if (error) throw error
            toast.success(isSuspending
                ? `${suspendModal.name} telah di-suspend`
                : `${suspendModal.name} telah diaktifkan kembali`
            )
            setSuspendModal(null)
            fetchMerchants()
        } catch (err) {
            toast.error(err.message || 'Gagal mengubah status')
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Manajemen Merchant</h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola seluruh toko yang terdaftar di platform Tendar</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari toko..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
                        />
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-300 px-4 py-2.5 rounded-xl text-sm font-bold">
                        {merchants.length} Merchant
                    </div>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <span className="animate-spin material-symbols-outlined text-indigo-400 text-3xl">progress_activity</span>
                </div>
            ) : filteredMerchants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#1a1a2e] rounded-2xl border border-white/5">
                    <span className="material-symbols-outlined text-5xl text-slate-600 mb-3">store</span>
                    <p className="text-slate-400 font-medium">{search ? 'Tidak ada hasil pencarian' : 'Belum ada merchant'}</p>
                </div>
            ) : (
                <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden">
                    {/* Desktop header */}
                    <div className="hidden lg:grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.6fr] gap-4 px-5 py-3 border-b border-white/5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                        <span>Toko</span>
                        <span>Owner</span>
                        <span>Plan</span>
                        <span>Status</span>
                        <span>Revenue</span>
                        <span>Expiry</span>
                        <span>Aksi</span>
                    </div>

                    {filteredMerchants.map(m => {
                        const status = getStatusInfo(m)
                        const days = getDaysRemaining(m.plan_expires_at)
                        const planStyle = PLAN_OPTIONS.find(p => p.value === m.plan)?.color || 'bg-slate-500/15 text-slate-400'

                        return (
                            <div
                                key={m.id}
                                className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.6fr] gap-2 lg:gap-4 px-5 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors items-center"
                            >
                                {/* Toko */}
                                <div>
                                    <p className="text-sm text-white font-bold">{m.name}</p>
                                    <p className="text-[11px] text-slate-500 font-mono">/{m.slug}</p>
                                </div>

                                {/* Owner */}
                                <div>
                                    <p className="text-xs text-slate-300 truncate">{m.whatsapp || '-'}</p>
                                </div>

                                {/* Plan */}
                                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit ${planStyle}`}>
                                    {m.plan}
                                </span>

                                {/* Status */}
                                <div className="flex items-center gap-1.5">
                                    <span className={`material-symbols-outlined text-[14px] ${status.style.split(' ')[1]}`}>{status.icon}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.style}`}>
                                        {status.label}
                                    </span>
                                </div>

                                {/* Revenue */}
                                <span className="text-xs text-white font-semibold">
                                    {m.total_revenue > 0 ? formatIDR(m.total_revenue) : '-'}
                                </span>

                                {/* Expiry */}
                                <div>
                                    {m.plan_expires_at ? (
                                        <div>
                                            <p className="text-[11px] text-slate-400">
                                                {new Date(m.plan_expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                            {days !== null && (
                                                <p className={`text-[10px] font-bold ${days <= 0 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {days <= 0 ? 'Expired' : `${days} hari lagi`}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[11px] text-slate-600">-</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { setOverrideModal(m); setOverrideForm({ plan: m.plan, days: 30, reason: '' }) }}
                                        title="Override Plan"
                                        className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button
                                        onClick={() => setSuspendModal(m)}
                                        title={m.is_active ? 'Suspend' : 'Reactivate'}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            m.is_active
                                                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                                : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">
                                            {m.is_active ? 'block' : 'play_circle'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Override Modal */}
            {overrideModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => e.target === e.currentTarget && setOverrideModal(null)}
                >
                    <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl w-full max-w-md animate-fade-in">
                        <div className="p-6 border-b border-white/5">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-400">tune</span>
                                Override Plan
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Manual override untuk <strong className="text-white">{overrideModal.name}</strong>
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Plan select */}
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Plan Baru</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {PLAN_OPTIONS.map(p => (
                                        <button
                                            key={p.value}
                                            onClick={() => setOverrideForm(f => ({ ...f, plan: p.value }))}
                                            className={`py-2.5 rounded-xl text-xs font-bold uppercase transition-all ${
                                                overrideForm.plan === p.value
                                                    ? 'bg-indigo-500 text-white ring-2 ring-indigo-400/50'
                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Duration */}
                            {overrideForm.plan !== 'free' && (
                                <div>
                                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Durasi (Hari)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="365"
                                        value={overrideForm.days}
                                        onChange={(e) => setOverrideForm(f => ({ ...f, days: parseInt(e.target.value) || 30 }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            )}

                            {/* Reason */}
                            <div>
                                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 block">Catatan (opsional)</label>
                                <textarea
                                    value={overrideForm.reason}
                                    onChange={(e) => setOverrideForm(f => ({ ...f, reason: e.target.value }))}
                                    placeholder="e.g. Toko tester, gratisan buat nyokap..."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end p-6 pt-0">
                            <button
                                onClick={() => setOverrideModal(null)}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleOverride}
                                disabled={actionLoading}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {actionLoading ? (
                                    <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">save</span>
                                )}
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Suspend Modal */}
            {suspendModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={(e) => e.target === e.currentTarget && setSuspendModal(null)}
                >
                    <div className="bg-[#1a1a2e] rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm animate-fade-in p-6 text-center">
                        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                            suspendModal.is_active ? 'bg-red-500/15' : 'bg-emerald-500/15'
                        }`}>
                            <span className={`material-symbols-outlined text-3xl ${
                                suspendModal.is_active ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                                {suspendModal.is_active ? 'block' : 'play_circle'}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">
                            {suspendModal.is_active ? 'Suspend Toko?' : 'Aktifkan Kembali?'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-2">
                            {suspendModal.is_active
                                ? <>Toko <strong className="text-white">{suspendModal.name}</strong> akan di-suspend. Customer tidak bisa mengakses toko ini.</>
                                : <>Toko <strong className="text-white">{suspendModal.name}</strong> akan diaktifkan kembali.</>
                            }
                        </p>
                        <div className="flex gap-3 justify-center mt-6">
                            <button
                                onClick={() => setSuspendModal(null)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSuspend}
                                disabled={actionLoading}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-colors flex items-center gap-2 shadow-lg ${
                                    suspendModal.is_active
                                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                        : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                                }`}
                            >
                                {actionLoading && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
                                {suspendModal.is_active ? 'Suspend' : 'Aktifkan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
