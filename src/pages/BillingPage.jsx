import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantContext } from '../context/TenantContext'
import { toast } from 'react-hot-toast'

function getDaysRemaining(expiresAt) {
    if (!expiresAt) return null
    const now = new Date()
    const exp = new Date(expiresAt)
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
    return diff
}

function SubscriptionTimer({ expiresAt, plan }) {
    const days = getDaysRemaining(expiresAt)

    if (plan === 'free') return null
    if (!expiresAt) {
        return (
            <div className="flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-xl border border-orange-100 text-sm font-medium">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>Durasi langganan belum tersedia</span>
            </div>
        )
    }

    const isExpiringSoon = days !== null && days <= 7
    const isExpired = days !== null && days <= 0

    const color = isExpired
        ? 'bg-red-50 border-red-200 text-red-700'
        : isExpiringSoon
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : 'bg-emerald-50 border-emerald-200 text-emerald-700'

    const icon = isExpired ? 'warning' : isExpiringSoon ? 'alarm' : 'calendar_month'

    const expiryDate = new Date(expiresAt).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    })

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${color}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {isExpired ? (
                <span>Langganan <strong>sudah berakhir</strong> — segera perbarui!</span>
            ) : (
                <span>
                    Aktif hingga <strong>{expiryDate}</strong>
                    {' '}·{' '}
                    <span className="font-extrabold">{days} hari lagi</span>
                </span>
            )}
        </div>
    )
}

export default function BillingPage() {
    const { tenantId, tenantName, tenantPlan, slug } = useTenantContext()
    const [loading, setLoading] = useState(false)
    const [planExpiresAt, setPlanExpiresAt] = useState(null)
    const [fetchingExpiry, setFetchingExpiry] = useState(true)

    // Fetch plan_expires_at from tenants table
    useEffect(() => {
        if (!tenantId) return
        setFetchingExpiry(true)
        supabase
            .from('tenants')
            .select('plan_expires_at')
            .eq('id', tenantId)
            .single()
            .then(({ data }) => {
                if (data) setPlanExpiresAt(data.plan_expires_at)
            })
            .finally(() => setFetchingExpiry(false))
    }, [tenantId])

    // Load Midtrans Snap script on mount
    useEffect(() => {
        const script = document.createElement('script')
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
        script.setAttribute('data-client-key', 'Mid-client-_nzDGe7-el4-NvES')
        script.async = true
        document.body.appendChild(script)
        return () => { document.body.removeChild(script) }
    }, [])

    const handleUpgrade = async (planName, priceStr) => {
        if (tenantPlan === planName) {
            toast.error(`Anda sudah berlangganan paket ${planName.toUpperCase()}`)
            return
        }
        setLoading(true)
        const tid = toast.loading('Memproses pembayaran...')
        try {
            const { data, error } = await supabase.functions.invoke('create-midtrans-transaction', {
                body: { plan: planName, tenant_id: tenantId, tenant_name: tenantName }
            })
            if (error) throw new Error(error.message || 'Gagal terhubung ke server pembayaran')
            if (data?.error) throw new Error(data.error)
            const token = data.token
            if (!token) throw new Error('Token pembayaran tidak diterima')
            toast.dismiss(tid)

            window.snap.pay(token, {
                onSuccess: async function (result) {
                    toast.loading('Memperbarui paket langganan...', { id: 'update-plan' })

                    // Calculate new expiry: 30 days from now
                    const newExpiry = new Date()
                    newExpiry.setDate(newExpiry.getDate() + 30)

                    const { error: updateError } = await supabase
                        .from('tenants')
                        .update({
                            plan: planName,
                            plan_expires_at: newExpiry.toISOString()
                        })
                        .eq('id', tenantId)

                    if (updateError) {
                        toast.error('Gagal memperbarui paket: ' + updateError.message, { id: 'update-plan' })
                    } else {
                        toast.success('Berhasil upgrade paket! Silakan refresh halaman.', { id: 'update-plan' })
                        setTimeout(() => window.location.reload(), 2000)
                    }
                },
                onPending: function () { toast('Selesaikan pembayaran Anda segera.') },
                onError: function () { toast.error('Pembayaran gagal atau dibatalkan.') },
                onClose: function () { setLoading(false) }
            })
        } catch (err) {
            console.error(err)
            toast.error(err.message || 'Terjadi kesalahan sistem', { id: tid })
            setLoading(false)
        }
    }

    const plans = [
        { id: 'free', name: 'Free', price: '0', color: 'border-slate-200', badge: null, features: ['Hingga 10 produk', '1 Akses Staff', 'Online Menu'] },
        { id: 'starter', name: 'Starter', price: '25.000', color: 'border-orange-300', badge: null, features: ['Hingga 30 produk', 'Kategori & Gambar Produk', 'Online Menu'] },
        { id: 'business', name: 'Business', price: '50.000', color: 'border-[#ff8c00]/60', badge: 'Terpopuler', features: ['Produk tak terbatas', '2 Akses Staff', 'Kasir (POS)', 'Manajemen Stok & Analitik', 'Export CSV'] },
        { id: 'pro', name: 'Pro', price: '100.000', color: 'border-[#ff8c00]', badge: 'Lengkap', features: ['Resep (BoM)', 'Staff tak terbatas', 'Export Excel', 'Prioritas Support'] },
    ]

    const days = getDaysRemaining(planExpiresAt)
    const isExpired = days !== null && days <= 0
    const isExpiringSoon = days !== null && days <= 7 && !isExpired

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Langganan & Billing</h1>
                        <p className="text-slate-500 text-sm mt-1">Kelola paket berlangganan untuk toko <strong>{tenantName}</strong></p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                        {/* Active plan badge */}
                        <div className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl border border-orange-100 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">stars</span>
                            <span className="text-sm font-semibold">Paket Aktif: <span className="uppercase font-black">{tenantPlan}</span></span>
                        </div>
                        {/* Expiry timer */}
                        {!fetchingExpiry && (
                            <SubscriptionTimer expiresAt={planExpiresAt} plan={tenantPlan} />
                        )}
                    </div>
                </div>

                {/* Expiry warning bar */}
                {isExpired && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 text-red-700 text-sm">
                        <span className="material-symbols-outlined text-red-500">warning</span>
                        <p><strong>Langganan Anda sudah berakhir.</strong> Fitur premium tidak aktif. Perbarui sekarang untuk melanjutkan akses.</p>
                    </div>
                )}
                {isExpiringSoon && !isExpired && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-700 text-sm">
                        <span className="material-symbols-outlined text-amber-500">alarm</span>
                        <p><strong>Langganan hampir habis!</strong> Hanya tersisa {days} hari. Perbarui sekarang agar tidak terinterupsi.</p>
                    </div>
                )}
            </div>

            {/* Subscription Duration Card (if active paid plan) */}
            {tenantPlan !== 'free' && planExpiresAt && !fetchingExpiry && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-base font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff8c00] text-[20px]">schedule</span>
                        Durasi Langganan
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        {/* Progress bar */}
                        {(() => {
                            const totalDays = 30
                            const pct = Math.max(0, Math.min(100, Math.round((days / totalDays) * 100)))
                            const barColor = isExpired ? 'bg-red-400' : isExpiringSoon ? 'bg-amber-400' : 'bg-emerald-400'
                            return (
                                <div className="flex-1 min-w-[220px]">
                                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                                        <span>Sisa waktu</span>
                                        <span className="font-bold text-slate-700">{Math.max(0, days)} / {totalDays} hari</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${barColor}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                        <span>Berakhir: {new Date(planExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span>{pct}% tersisa</span>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Stats */}
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
                </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans.map(p => (
                    <div key={p.id} className={`relative bg-white border-2 ${p.color} ${tenantPlan === p.id ? 'bg-orange-50/40 ring-2 ring-[#ff8c00]/30' : ''} p-5 rounded-3xl flex flex-col shadow-sm hover:shadow-md transition-shadow`}>
                        {tenantPlan === p.id && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black tracking-widest flex items-center gap-1 shadow-sm">
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
                            <span className="text-3xl font-extrabold text-[#181510] tracking-tight">Rp{p.price}</span>
                            <span className="text-slate-400 text-sm font-medium">/bln</span>
                        </p>

                        <ul className="mt-4 mb-6 space-y-3 flex-1">
                            {p.features.map((f, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-600 font-medium">
                                    <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                                    <span className="leading-tight pt-0.5">{f}</span>
                                </li>
                            ))}
                        </ul>

                        {p.id !== 'free' && tenantPlan !== p.id && (
                            <button
                                onClick={() => handleUpgrade(p.id, p.price)}
                                disabled={loading}
                                className="w-full bg-[#ff8c00] disabled:bg-slate-300 text-white py-3 rounded-xl font-bold hover:bg-[#e07800] transition-colors flex justify-center items-center gap-2 shadow-lg shadow-[#ff8c00]/20 active:scale-[0.98]"
                            >
                                {loading ? 'Mohon tunggu...' : `Pilih ${p.name}`}
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

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700 text-sm mt-4">
                <span className="material-symbols-outlined text-blue-500">info</span>
                <p><strong>Mode Sandbox:</strong> Pembayaran saat ini menggunakan mode percobaan (Sandbox). Gunakan simulasi pembayaran Midtrans untuk menyelesaikannya.</p>
            </div>
        </div>
    )
}
