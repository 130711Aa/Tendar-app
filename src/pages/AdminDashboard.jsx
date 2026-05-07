import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../context/OrdersContext'
import { useCategories } from '../context/CategoriesContext'
import { useProducts } from '../context/ProductsContext'
import { useStoreStatus } from '../context/StoreStatusContext'
import { useTenantContext } from '../context/TenantContext'
import { formatRupiah } from '../lib/utils'
import AiInsightPanel from '../components/AiInsightPanel'

export default function AdminDashboard() {
    const { slug, tenantName, tenantId } = useTenantContext()
    const { orders } = useOrders()
    const { categories } = useCategories()
    const { products } = useProducts()
    const { isStoreOpen, toggleStore } = useStoreStatus()
    const navigate = useNavigate()


    // Real stats from orders
    const stats = useMemo(() => {
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const totalOrders = orders.length
        const pending = orders.filter(o => o.status === 'pending').length
        const processing = orders.filter(o => o.status === 'processing').length
        const completed = orders.filter(o => o.status === 'completed').length


        // Top product
        const productCounts = {}
        orders.forEach(o => {
            o.items?.forEach(item => {
                productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity
            })
        })
        const allProductsRanked = Object.entries(productCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)

        const topProduct = allProductsRanked[0]

        // Today's orders (Jakarta Time)
        const jakartaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
        const todayStr = jakartaNow.toDateString()

        const todayOrders = orders.filter(o => {
            const oDate = new Date(o.created_at)
            const oJakarta = new Date(oDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
            return oJakarta.toDateString() === todayStr
        })
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

        // Last 7 days (Jakarta Time)
        const last7 = []
        for (let i = 6; i >= 0; i--) {
            const d = new Date(jakartaNow)
            d.setDate(d.getDate() - i)
            const dayStr = d.toDateString()

            const dayOrders = orders.filter(o => {
                const oDate = new Date(o.created_at)
                const oJakarta = new Date(oDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
                return oJakarta.toDateString() === dayStr
            })

            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
            last7.push({
                label: dayNames[d.getDay()],
                revenue: dayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
                count: dayOrders.length,
            })
        }
        const maxRevenue = Math.max(...last7.map(d => d.revenue), 1)

        // Payment method breakdown
        const cashOrders = orders.filter(o => o.payment_method === 'cash').length
        const qrisOrders = orders.filter(o => o.payment_method === 'cashless').length

        return {
            totalRevenue, totalOrders, pending, processing, completed,
            topProduct: topProduct ? topProduct.name : '-',
            topProductCount: topProduct ? topProduct.count : 0,
            allProductsRanked,
            todayOrders: todayOrders.length,
            todayRevenue,
            last7, maxRevenue,
            cashOrders, qrisOrders,
        }
    }, [orders])

    // Recent orders (latest 5)
    const recentOrders = useMemo(() => {
        return [...orders]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
    }, [orders])

    const statusStyle = {
        pending: { label: 'Menunggu', class: 'bg-orange-100 text-orange-700' },
        processing: { label: 'Diproses', class: 'bg-blue-100 text-blue-700' },
        completed: { label: 'Selesai', class: 'bg-green-100 text-green-700' },
    }

    const getInitials = (name) => {
        if (!name) return '??'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    const formatTime = (iso) => {
        const d = new Date(iso)
        return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const bgColors = ['bg-slate-100', 'bg-orange-100', 'bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-pink-100']

    return (
        <main className="flex-1 flex flex-col min-w-0">
            <div className="p-8 space-y-8">
                {/* Header */}
                <div className="flex items-end justify-between flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                        <p className="text-orange-800/60 font-medium">Selamat datang, {tenantName || 'Admin'}! Berikut data terkini.</p>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Store Toggle */}
                        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${isStoreOpen
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                            }`}>
                            <div className={`size-2.5 rounded-full ${isStoreOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className={`text-sm font-bold ${isStoreOpen ? 'text-green-700' : 'text-red-700'}`}>
                                {isStoreOpen ? 'Toko Buka' : 'Toko Tutup'}
                            </span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={isStoreOpen}
                                    onChange={toggleStore}
                                />
                                <span className="toggle-slider" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white p-5 rounded-xl border border-[#ff8c00]/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="size-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                        </div>
                        <p className="text-orange-800/60 text-xs font-medium">Total Pendapatan</p>
                        <h3 className="text-xl font-bold mt-0.5">{formatRupiah(stats.totalRevenue)}</h3>
                        <p className="text-[11px] text-green-600 font-medium mt-1">Hari ini: {formatRupiah(stats.todayRevenue)}</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#ff8c00]/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="size-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">shopping_cart</span>
                            </div>
                        </div>
                        <p className="text-orange-800/60 text-xs font-medium">Total Pesanan</p>
                        <h3 className="text-xl font-bold mt-0.5">{stats.totalOrders}</h3>
                        <p className="text-[11px] text-orange-600 font-medium mt-1">Hari ini: {stats.todayOrders} pesanan</p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#ff8c00]/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="size-11 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">star</span>
                            </div>
                        </div>
                        <p className="text-orange-800/60 text-xs font-medium">Produk Terlaris</p>
                        <h3 className="text-xl font-bold mt-0.5 truncate">{stats.topProduct}</h3>
                        <p className="text-[11px] text-yellow-600 font-medium mt-1">
                            {stats.topProductCount > 0 ? `${stats.topProductCount}x dipesan` : 'Belum ada pesanan'}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-[#ff8c00]/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="size-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                        </div>
                        <p className="text-orange-800/60 text-xs font-medium">Perlu Diproses</p>
                        <h3 className="text-xl font-bold mt-0.5">{stats.pending + stats.processing}</h3>
                        <p className="text-[11px] text-blue-600 font-medium mt-1">
                            {stats.pending} menunggu · {stats.processing} diproses
                        </p>
                    </div>
                </div>

                {/* Chart + Quick Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chart - Real data */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#ff8c00]/10 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h4 className="font-bold text-lg">Penjualan 7 Hari</h4>
                                <p className="text-sm text-orange-800/60">Data real dari pesanan masuk</p>
                            </div>
                        </div>
                        <div className="h-64 relative">
                            {/* Line Chart */}
                            <div className="absolute inset-x-0 bottom-8 top-0">
                                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ff8c00" stopOpacity="0.2" />
                                            <stop offset="100%" stopColor="#ff8c00" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Area */}
                                    <path
                                        d={`M 0,100 ${stats.last7.map((d, i) => {
                                            const x = (i / (stats.last7.length - 1)) * 100
                                            const y = 100 - (d.revenue / (stats.maxRevenue || 1)) * 80
                                            return `L ${x},${y}`
                                        }).join(' ')} L 100,100 Z`}
                                        fill="url(#chartGradient)"
                                    />
                                    {/* Line */}
                                    <path
                                        d={`M 0,${100 - (stats.last7[0].revenue / (stats.maxRevenue || 1)) * 80} ${stats.last7.map((d, i) => {
                                            const x = (i / (stats.last7.length - 1)) * 100
                                            const y = 100 - (d.revenue / (stats.maxRevenue || 1)) * 80
                                            return `L ${x},${y}`
                                        }).join(' ')}`}
                                        fill="none"
                                        stroke="#ff8c00"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </svg>

                                {/* Points & Tooltips */}
                                {stats.last7.map((d, i) => {
                                    const x = (i / (stats.last7.length - 1)) * 100
                                    const y = 100 - (d.revenue / (stats.maxRevenue || 1)) * 80
                                    return (
                                        <div
                                            key={i}
                                            className="absolute group"
                                            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                                        >
                                            <div className={`size-3 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125 ${d.revenue > 0 ? 'bg-[#ff8c00]' : 'bg-neutral-300'}`} />

                                            {/* Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                <div className="font-bold">{formatRupiah(d.revenue)}</div>
                                                <div className="text-[10px] text-neutral-400">{d.count} pesanan</div>
                                                {/* Arrow */}
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-800" />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* X-Axis Labels */}
                            <div className="absolute inset-x-0 bottom-0 flex justify-between px-[1%]">
                                {stats.last7.map((day, i) => (
                                    <div key={i} className="text-center w-8">
                                        <span className="text-[10px] font-bold text-neutral-400 uppercase">
                                            {day.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white p-6 rounded-xl border border-[#ff8c00]/10 shadow-sm">
                        <h4 className="font-bold text-lg mb-4">Ringkasan</h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                    <span className="material-symbols-outlined">check_circle</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">{stats.completed} Pesanan Selesai</p>
                                    <div className="w-full bg-orange-50 h-1.5 rounded-full mt-1">
                                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${stats.totalOrders ? (stats.completed / stats.totalOrders) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">💵 Cash: {stats.cashOrders} &nbsp;·&nbsp; 💳 QRIS: {stats.qrisOrders}</p>
                                    <div className="w-full bg-orange-50 h-1.5 rounded-full mt-1 flex overflow-hidden">
                                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${stats.totalOrders ? (stats.cashOrders / stats.totalOrders) * 100 : 0}%` }} />
                                        <div className="bg-purple-500 h-full transition-all" style={{ width: `${stats.totalOrders ? (stats.qrisOrders / stats.totalOrders) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-lg bg-orange-100 flex items-center justify-center text-[#ff8c00]">
                                    <span className="material-symbols-outlined">category</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold">{categories.length} Kategori · {products.length} Produk</p>
                                </div>
                            </div>

                            {/* Active orders avatars */}
                            {stats.pending + stats.processing > 0 && (
                                <div className="pt-4 border-t border-orange-50">
                                    <p className="text-sm font-bold mb-3">Pesanan Aktif ({stats.pending + stats.processing})</p>
                                    <div className="flex -space-x-2">
                                        {orders
                                            .filter(o => o.status === 'pending' || o.status === 'processing')
                                            .slice(0, 5)
                                            .map((o, i) => (
                                                <div
                                                    key={o.id}
                                                    className={`size-8 rounded-full border-2 border-white ${bgColors[i % bgColors.length]} flex items-center justify-center text-[10px] font-bold`}
                                                    title={o.customer_name}
                                                >
                                                    {getInitials(o.customer_name)}
                                                </div>
                                            ))
                                        }
                                        {stats.pending + stats.processing > 5 && (
                                            <div className="size-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center text-[10px] font-bold">
                                                +{stats.pending + stats.processing - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Insight Panel */}
                <AiInsightPanel tenantId={tenantId} />

                {/* Recent Orders Table */}
                <div className="bg-white rounded-xl border border-[#ff8c00]/10 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-orange-50 flex items-center justify-between">
                        <h4 className="font-bold text-lg">Pesanan Terbaru</h4>
                        <button
                            onClick={() => navigate(`/${slug}/admin/orders`)}
                            className="text-[#ff8c00] font-bold text-sm hover:underline"
                        >
                            Lihat Semua
                        </button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-neutral-200 mb-2">inbox</span>
                            <p className="text-neutral-400 font-medium">Belum ada pesanan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-orange-50/50 text-orange-800/70 text-xs font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">ID Pesanan</th>
                                        <th className="px-6 py-4">Pelanggan</th>
                                        <th className="px-6 py-4">Items</th>
                                        <th className="px-6 py-4">Jumlah</th>
                                        <th className="px-6 py-4">Bayar</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Waktu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-50">
                                    {recentOrders.map((order, i) => {
                                        const s = statusStyle[order.status] || statusStyle.pending
                                        return (
                                            <tr key={order.id} className="hover:bg-orange-50/20 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium">{order.order_number}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`size-8 rounded-full ${bgColors[i % bgColors.length]} flex items-center justify-center text-[10px] font-bold`}>
                                                            {getInitials(order.customer_name)}
                                                        </div>
                                                        <span className="text-sm font-medium">{order.customer_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-neutral-600">
                                                    {order.items?.map(it => it.name).join(', ').slice(0, 40) || '-'}
                                                    {(order.items?.map(it => it.name).join(', ').length || 0) > 40 ? '...' : ''}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold">{formatRupiah(order.total_amount)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${order.payment_method === 'cashless' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                                        }`}>
                                                        {order.payment_method === 'cashless' ? 'QRIS' : 'Cash'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 ${s.class} rounded-full text-[10px] font-bold uppercase`}>
                                                        {s.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-neutral-500">{formatTime(order.created_at)}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
