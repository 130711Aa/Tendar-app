import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function SADashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState(null)
    const [growth, setGrowth] = useState([])
    const [loading, setLoading] = useState(true)
    const [recentPayments, setRecentPayments] = useState([])

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        setLoading(true)
        try {
            await Promise.all([fetchStats(), fetchGrowth(), fetchRecentPayments()])
        } finally {
            setLoading(false)
        }
    }

    const fetchStats = async () => {
        const { data, error } = await supabase.rpc('get_superadmin_stats')
        if (!error && data) setStats(data)
    }

    const fetchGrowth = async () => {
        const { data, error } = await supabase.rpc('get_monthly_growth')
        if (!error && data) setGrowth(data)
    }

    const fetchRecentPayments = async () => {
        const { data } = await supabase
            .from('payments')
            .select('id, status, confidence_score, created_at, invoice_id, invoices!inner(tenant_id, plan_id, total_amount, tenants!inner(name))')
            .in('status', ['review_needed', 'valid', 'rejected'])
            .order('created_at', { ascending: false })
            .limit(5)

        if (data) setRecentPayments(data)
    }

    const formatIDR = (n) => 'Rp' + (n || 0).toLocaleString('id-ID')

    const METRIC_CARDS = [
        {
            label: 'Pendapatan Bulan Ini',
            value: stats ? formatIDR(stats.total_revenue_this_month) : '...',
            icon: 'payments',
            color: 'from-emerald-500 to-green-600',
            shadow: 'shadow-emerald-500/20',
        },
        {
            label: 'Merchant Aktif',
            value: stats?.active_merchants ?? '...',
            icon: 'store',
            color: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-500/20',
        },
        {
            label: 'Antrean Review',
            value: stats?.review_queue ?? '...',
            icon: 'pending_actions',
            color: 'from-amber-500 to-orange-600',
            shadow: 'shadow-amber-500/20',
            badge: stats?.review_queue > 0,
            onClick: () => navigate('/superadmin/payments'),
        },
        {
            label: 'Merchant Baru (Bulan Ini)',
            value: stats?.new_merchants_this_month ?? '...',
            icon: 'group_add',
            color: 'from-purple-500 to-fuchsia-600',
            shadow: 'shadow-purple-500/20',
        },
    ]

    const getStatusBadge = (status) => {
        const map = {
            valid: { label: 'Valid', style: 'bg-emerald-500/15 text-emerald-400' },
            review_needed: { label: 'Review', style: 'bg-amber-500/15 text-amber-400' },
            rejected: { label: 'Ditolak', style: 'bg-red-500/15 text-red-400' },
            processing: { label: 'Proses', style: 'bg-blue-500/15 text-blue-400' },
        }
        const s = map[status] || map.processing
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.style}`}>{s.label}</span>
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <span className="animate-spin material-symbols-outlined text-indigo-400 text-4xl">progress_activity</span>
                    <p className="text-slate-400 text-sm">Memuat dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Overview performa platform Tendar</p>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {METRIC_CARDS.map((card, i) => (
                    <div
                        key={i}
                        onClick={card.onClick}
                        className={`relative bg-[#1a1a2e] border border-white/5 rounded-2xl p-5 ${card.onClick ? 'cursor-pointer hover:border-white/10 transition-colors' : ''}`}
                    >
                        {card.badge && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-pulse shadow-lg shadow-red-500/40">
                                {stats?.review_queue}
                            </span>
                        )}
                        <div className={`w-10 h-10 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center mb-3 shadow-lg ${card.shadow}`}>
                            <span className="material-symbols-outlined text-white text-lg">{card.icon}</span>
                        </div>
                        <p className="text-2xl font-black text-white">{card.value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Chart + Recent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-[#1a1a2e] border border-white/5 rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-lg">trending_up</span>
                        Pertumbuhan Merchant (12 Bulan)
                    </h2>
                    {growth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={growth} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorMerchants" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1e1e3a',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 12,
                                        color: '#e2e8f0',
                                        fontSize: 12,
                                    }}
                                    labelStyle={{ color: '#94a3b8' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="new_merchants"
                                    stroke="#818cf8"
                                    strokeWidth={2}
                                    fill="url(#colorMerchants)"
                                    name="Merchant Baru"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[240px] text-slate-500 text-sm">
                            Belum ada data pertumbuhan
                        </div>
                    )}
                </div>

                {/* Recent Payments */}
                <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400 text-lg">receipt_long</span>
                            Pembayaran Terbaru
                        </h2>
                        <button
                            onClick={() => navigate('/superadmin/payments')}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                            Lihat Semua →
                        </button>
                    </div>
                    <div className="space-y-3">
                        {recentPayments.length === 0 ? (
                            <p className="text-center text-slate-500 text-sm py-8">Belum ada pembayaran</p>
                        ) : (
                            recentPayments.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl hover:bg-white/[0.04] transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-white truncate">
                                            {p.invoices?.tenants?.name || 'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                            {formatIDR(p.invoices?.total_amount)} · {p.invoices?.plan_id?.toUpperCase()}
                                        </p>
                                    </div>
                                    {getStatusBadge(p.status)}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Quick stat */}
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Total Revenue (All Time)</span>
                            <span className="text-white font-bold">{formatIDR(stats?.total_revenue_all_time)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
