import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandIcon } from '../components/BrandLogo'

// Mock Data
const mockOrders = [
    { id: '1', order_number: 'ORD-001', customer_name: 'Budi Santoso', customer_phone: '08123456789', total_amount: 45000, status: 'pending', items: [{ name: 'Kopi Susu Aren', quantity: 2, price: 15000 }, { name: 'Croissant', quantity: 1, price: 15000 }], created_at: new Date().toISOString(), payment_method: 'cashless', payment_proof: 'true' },
    { id: '2', order_number: 'ORD-002', customer_name: 'Siti Aminah', customer_phone: '', total_amount: 25000, status: 'processing', items: [{ name: 'Jus Mangga', quantity: 1, price: 25000 }], created_at: new Date(Date.now() - 600000).toISOString(), payment_method: 'cash' },
    { id: '3', order_number: 'ORD-003', customer_name: 'Andi Dermawan', customer_phone: '', total_amount: 75000, status: 'completed', items: [{ name: 'Nasi Goreng Spesial', quantity: 2, price: 30000 }, { name: 'Es Teh Manis', quantity: 2, price: 7500 }], created_at: new Date(Date.now() - 3600000).toISOString(), payment_method: 'cashless' }
]

const mockProducts = [
    { id: '1', name: 'Kopi Susu Aren', price: 18000, category: 'Minuman', is_available: true, description: 'Kopi susu dengan gula aren asli' },
    { id: '2', name: 'Jus Mangga', price: 25000, category: 'Minuman', is_available: true, description: 'Jus mangga segar' },
    { id: '3', name: 'Croissant Butter', price: 15000, category: 'Makanan', is_available: true, description: 'Croissant renyah dengan butter' },
    { id: '4', name: 'Nasi Goreng Spesial', price: 30000, category: 'Makanan', is_available: false, description: 'Nasi goreng dengan telur dan ayam' }
]

export default function DemoPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('analytics')
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [orderFilter, setOrderFilter] = useState('active')
    
    const formatRp = (amount) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
    }

    // SIMULASI TAMPILAN DASHBOARD / ANALYTICS
    const renderAdminAnalytics = () => (
        <div className="max-w-7xl mx-auto w-full animate-fade-in-up pb-10">
             <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Dashboard & Analytics</h1>
                <p className="text-neutral-500 text-base">Pantau performa bisnismu secara real-time</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {[
                    { label: 'Total Pendapatan', value: formatRp(2450000), sub: 'Hari ini: Rp 450.000', icon: 'payments', color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Pesanan', value: '45', sub: 'Hari ini: 12 pesanan', icon: 'shopping_cart', color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'Produk Terlaris', value: 'Kopi Susu Aren', sub: '24x dipesan', icon: 'star', color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'Perlu Diproses', value: '2', sub: '1 menunggu · 1 diproses', icon: 'pending_actions', color: 'text-blue-600', bg: 'bg-blue-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-xl border border-[#ff8c00]/10 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className={`size-11 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                <span className="material-symbols-outlined">{stat.icon}</span>
                            </div>
                        </div>
                        <p className="text-orange-800/60 text-xs font-medium">{stat.label}</p>
                        <h3 className="text-xl font-bold mt-0.5 truncate">{stat.value}</h3>
                        <p className={`text-[11px] ${stat.color} font-medium mt-1`}>{stat.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart Mockup */}
                 <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#ff8c00]/10 shadow-sm">
                    <h4 className="font-bold text-lg mb-6">Penjualan 7 Hari Terakhir</h4>
                    <div className="h-64 relative flex items-end justify-between px-2 pb-6 pt-10 border-b border-neutral-100">
                        {/* Bar Chart Simulation */}
                        {[30, 45, 20, 60, 80, 50, 90].map((h, i) => (
                            <div key={i} className="w-[8%] relative group flex flex-col justify-end h-full">
                                <div className="w-full bg-[#ff8c00]/20 rounded-t-sm group-hover:bg-[#ff8c00] transition-colors" style={{ height: `${h}%` }}></div>
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-neutral-400 uppercase">
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Ringkasan Mockup */}
                <div className="bg-white p-6 rounded-xl border border-[#ff8c00]/10 shadow-sm">
                    <h4 className="font-bold text-lg mb-4">Ringkasan Metode Bayar</h4>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="size-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <span className="material-symbols-outlined">payments</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold">💵 Cash: 15 &nbsp;·&nbsp; 💳 QRIS: 30</p>
                                <div className="w-full bg-orange-50 h-1.5 rounded-full mt-1 flex overflow-hidden">
                                    <div className="bg-emerald-500 h-full w-1/3"></div>
                                    <div className="bg-purple-500 h-full w-2/3"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    // SIMULASI TAMPILAN KELOLA MENU
    const renderAdminMenu = () => (
         <div className="max-w-7xl mx-auto w-full animate-fade-in-up pb-10">
             <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Kelola Menu</h1>
                    <p className="text-neutral-500 text-base">Atur produk, kategori, dan ketersediaan stok</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff8c00] hover:bg-[#e67e00] text-white font-bold text-sm shadow-md transition-all active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">add</span> Tambah Produk
                </button>
            </div>

            <div className="bg-white rounded-xl border border-[#ff8c00]/10 shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-orange-50/50 text-orange-800/70 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Produk</th>
                                <th className="px-6 py-4">Kategori</th>
                                <th className="px-6 py-4">Harga</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-50">
                            {mockProducts.map((p, i) => (
                                <tr key={p.id} className="hover:bg-orange-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-neutral-100 rounded-lg flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-neutral-300">image</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#181510]">{p.name}</p>
                                                <p className="text-[10px] text-neutral-400 line-clamp-1 w-48">{p.description}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-600">{p.category}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#ff8c00]">{formatRp(p.price)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={p.is_available} readOnly />
                                                <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                            </label>
                                            <span className="text-xs font-semibold text-neutral-600">{p.is_available ? 'Tersedia' : 'Habis'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                         <button className="p-2 text-neutral-400 hover:text-[#ff8c00] hover:bg-orange-50 rounded-lg transition-colors">
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
    )

    // SIMULASI TAMPILAN MENU PELANGGAN
    const renderCustomerMenu = () => (
        <div className="max-w-7xl mx-auto w-full animate-fade-in-up pb-32"> {/* Added pb-32 to prevent overlap */}
             {/* Hero Banner */}
             <div className="rounded-2xl relative bg-gradient-to-br from-[#ff8c00] via-[#ff9b20] to-[#ff6b00] px-5 md:px-8 py-6 md:py-16 overflow-hidden mb-6 md:mb-8">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-40 md:w-64 h-40 md:h-64 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-60 md:w-96 h-60 md:h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
                </div>
                <div className="relative z-10">
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-semibold mb-2 md:mb-4">
                        🏪 Buka & Siap Melayani!
                    </span>
                    <h1 className="text-xl md:text-5xl font-black tracking-tight text-white mb-1 md:mb-3 leading-tight truncate">
                        Selamat Datang di Toko Demo
                    </h1>
                    <p className="text-white/80 text-xs md:text-lg max-w-lg leading-relaxed">
                        Pilih dan pesan menu favoritmu dengan mudah secara online. (Ini adalah simulasi tampilan pelanggan)
                    </p>
                </div>
            </div>

            <div className="mb-6">
                <div className="flex gap-2 mb-5 md:mb-8 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
                    {['Semua', 'Minuman', 'Makanan'].map(cat => (
                        <button key={cat} className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${cat === 'Semua' ? 'bg-[#ff8c00] text-white shadow-md shadow-[#ff8c00]/20' : 'bg-white text-neutral-500 border border-neutral-200'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {mockProducts.map((p, idx) => (
                     <div key={p.id} className="bg-white rounded-2xl p-3 md:p-4 border border-[#ff8c00]/10 shadow-sm flex flex-col h-full transform transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#ff8c00]/30 group">
                        <div className="relative w-full aspect-square rounded-xl bg-[#fcfaf8] mb-3 overflow-hidden flex items-center justify-center">
                            <span className="material-symbols-outlined text-5xl text-neutral-200">image</span>
                            {!p.is_available && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                                    <span className="bg-white text-red-500 font-black text-[10px] md:text-xs px-3 py-1.5 rounded-lg shadow-lg border border-red-100 uppercase tracking-widest transform -rotate-12">HABIS</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col min-h-[80px]">
                            <div className="flex items-start justify-between gap-2 mb-1">
                                <h3 className="font-bold text-[#181510] text-sm md:text-base leading-tight line-clamp-2">{p.name}</h3>
                            </div>
                            <p className="text-[10px] md:text-xs text-neutral-400 line-clamp-2 mb-3 mt-1 leading-relaxed">{p.description}</p>
                            <div className="mt-auto flex items-center justify-between">
                                <span className="font-black text-[#ff8c00] text-sm md:text-base tracking-tight">{formatRp(p.price)}</span>
                                <button disabled={!p.is_available} className={`size-8 md:size-10 rounded-xl flex items-center justify-center transition-all ${p.is_available ? 'bg-orange-50 text-[#ff8c00] hover:bg-[#ff8c00] hover:text-white' : 'bg-neutral-100 text-neutral-300'}`}>
                                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">add</span>
                                </button>
                            </div>
                        </div>
                     </div>
                ))}
            </div>
            {/* Sticky Bottom Cart Bar for Demo */}
            <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5] to-transparent lg:pl-64">
                <button className="w-full max-w-7xl mx-auto rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl bg-[#ff8c00] text-white shadow-[#ff8c00]/30 transition-transform hover:scale-[0.99]">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl flex items-center justify-center bg-white/20">
                            <span className="material-symbols-outlined">shopping_bag</span>
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-medium" style={{ opacity: 0.7 }}>2 item</p>
                            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ opacity: 0.5 }}>Lihat Keranjang</p>
                        </div>
                    </div>
                    <span className="text-lg font-black">{formatRp(33000)}</span>
                </button>
            </div>
        </div>
    )

    // SIMULASI TAMPILAN ADMIN PESANAN
    const renderAdminOrders = () => {
        const filteredOrders = orderFilter === 'active' ? mockOrders.filter(o => o.status !== 'completed') : mockOrders.filter(o => o.status === orderFilter)
        
        return (
        <div className="max-w-7xl mx-auto w-full animate-fade-in-up pb-10">
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Pesanan Masuk</h1>
                    <p className="text-neutral-500 text-base">Kelola pesanan dari pelanggan secara real-time</p>
                </div>
                <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl animate-pulse">
                        <span className="material-symbols-outlined text-orange-500 text-lg">notification_important</span>
                        <span className="text-sm font-bold text-orange-700">1 pesanan menunggu</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { key: 'active', label: 'Aktif', icon: 'playlist_play', count: 2 },
                    { key: 'pending', label: 'Menunggu', icon: 'schedule', count: 1 },
                    { key: 'processing', label: 'Diproses', icon: 'autorenew', count: 1 },
                    { key: 'completed', label: 'Selesai', icon: 'check_circle', count: 1 }
                ].map(tab => (
                     <button
                        key={tab.key}
                        onClick={() => setOrderFilter(tab.key)}
                        className={`p-4 rounded-xl border transition-all text-left ${orderFilter === tab.key ? 'bg-[#ff8c00] text-white border-[#ff8c00] shadow-lg shadow-[#ff8c00]/20' : 'bg-white border-[#ff8c00]/10 hover:border-[#ff8c00]/30'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`material-symbols-outlined text-xl ${orderFilter === tab.key ? 'text-white' : 'text-[#ff8c00]'}`}>{tab.icon}</span>
                            <span className={`text-2xl font-black ${orderFilter === tab.key ? 'text-white' : 'text-[#181510]'}`}>{tab.count}</span>
                        </div>
                        <p className={`text-xs font-semibold ${orderFilter === tab.key ? 'text-white/80' : 'text-neutral-500'}`}>{tab.label}</p>
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {filteredOrders.map((order, idx) => {
                    const isExpanded = expandedOrder === order.id
                    const config = order.status === 'pending' ? { label: 'Menunggu', color: 'bg-orange-100 text-orange-700', icon: 'schedule', nextLabel: 'Proses Pesanan', nextIcon: 'play_arrow', nextColor: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200' } :
                                   order.status === 'processing' ? { label: 'Diproses', color: 'bg-blue-100 text-blue-700', icon: 'autorenew', nextLabel: 'Selesaikan', nextIcon: 'check_circle', nextColor: 'bg-green-500 hover:bg-green-600 shadow-green-200' } :
                                   { label: 'Selesai', color: 'bg-green-100 text-green-700', icon: 'check_circle' }
                    return (
                        <div key={order.id} className={`bg-white rounded-xl border overflow-hidden transition-all ${order.status === 'pending' ? 'border-orange-200 shadow-md shadow-orange-100' : order.status === 'processing' ? 'border-blue-200 shadow-sm' : 'border-[#ff8c00]/5'}`}>
                            <div className="flex items-center gap-4 p-4 md:p-5 cursor-pointer hover:bg-[#fcfaf8]" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                                <div className={`hidden md:flex size-12 rounded-xl items-center justify-center shrink-0 ${order.status === 'pending' ? 'bg-orange-100' : order.status === 'processing' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                    <span className={`material-symbols-outlined text-xl ${order.status === 'pending' ? 'text-orange-600' : order.status === 'processing' ? 'text-blue-600' : 'text-green-600'}`}>{config.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-sm">{order.order_number}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.payment_method === 'cashless' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>{order.payment_method === 'cashless' ? '💳 QRIS' : '💵 Cash'}</span>
                                        {order.payment_proof && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">📎 Bukti</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-[#181510] font-medium">{order.customer_name}</span>
                                        <span className="text-xs text-neutral-400">Baru saja</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-base font-extrabold text-[#ff8c00]">{formatRp(order.total_amount)}</span>
                                    <span className="material-symbols-outlined text-neutral-400" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="border-t border-[#ff8c00]/5 p-4 md:p-5 bg-[#fcfaf8]/50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-base text-[#ff8c00]">receipt</span> Detail Pesanan</h4>
                                            <div className="space-y-2">
                                                {order.items.map((item, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-[#ff8c00]/5">
                                                        <div className="flex items-center gap-3">
                                                            <div>
                                                                <span className="text-sm font-medium">{item.name}</span>
                                                                <span className="text-xs text-neutral-400 ml-2">x{item.quantity}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-bold">{formatRp(item.price * item.quantity)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-base text-[#ff8c00]">person</span> Info Pelanggan</h4>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-neutral-400">badge</span> <span className="font-medium">{order.customer_name}</span></div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-neutral-400">phone</span> <span>{order.customer_phone || '-'}</span></div>
                                                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base text-neutral-400">account_balance_wallet</span> <span className="font-medium">{order.payment_method === 'cashless' ? 'QRIS (Cashless)' : 'Cash'}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#ff8c00]/10">
                                         <div className="flex items-center gap-2">
                                            <button className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-red-50">
                                                <span className="material-symbols-outlined text-lg">delete</span> Hapus
                                            </button>
                                            <button className="flex items-center gap-1.5 text-neutral-500 hover:text-blue-600 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
                                                <span className="material-symbols-outlined text-lg">print</span> Print
                                            </button>
                                         </div>
                                         {config.nextLabel && (
                                            <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all shadow-md active:scale-95 ${config.nextColor}`}>
                                                <span className="material-symbols-outlined text-lg">{config.nextIcon}</span> {config.nextLabel}
                                            </button>
                                         )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
        )
    }

    // SIMULASI TAMPILAN ADMIN RIWAYAT
    const renderAdminHistory = () => (
        <div className="max-w-5xl mx-auto w-full animate-fade-in-up pb-10">
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Riwayat Pesanan</h1>
                <p className="text-neutral-500 text-base">Log pesanan yang telah selesai</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-[#ff8c00]/10 overflow-hidden shadow-sm">
                 <button className="w-full flex flex-col md:flex-row md:items-center justify-between p-5 text-left bg-[#ff8c00]/5">
                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                        <div className="size-10 rounded-xl flex items-center justify-center bg-[#ff8c00] text-white">
                            <span className="material-symbols-outlined">calendar_today</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-[#181510] leading-none">Hari Ini</h3>
                            <p className="text-xs text-neutral-400 mt-1">{new Date().toLocaleDateString('en-CA')}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                        <div className="flex gap-6">
                            <div className="text-right">
                                <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Pesanan</p>
                                <p className="font-bold">1</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Omset</p>
                                <p className="font-bold text-[#ff8c00]">{formatRp(75000)}</p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-neutral-400 rotate-180">expand_more</span>
                    </div>
                </button>
                <div className="border-t border-[#ff8c00]/10 divide-y divide-[#ff8c00]/5">
                    {mockOrders.filter(o => o.status === 'completed').map(order => (
                         <div key={order.id} className="p-4 md:p-5 hover:bg-[#fcfaf8] transition-colors">
                            <div className="flex items-start justify-between cursor-pointer">
                                <div className="flex items-start gap-3">
                                    <div className="size-8 rounded-lg flex items-center justify-center shrink-0 mt-1 bg-green-100 text-green-600">
                                        <span className="material-symbols-outlined text-sm">check</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-[#181510]">{order.customer_name}</span>
                                            <span className="text-xs text-neutral-400">#{order.order_number}</span>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{order.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
                                        <div className="flex gap-2 mt-1.5">
                                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded font-medium uppercase tracking-wide">10:30</span>
                                            <span className="px-2 py-0.5 text-[10px] rounded font-medium uppercase tracking-wide bg-purple-100 text-purple-700">QRIS</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-bold text-[#ff8c00]">{formatRp(order.total_amount)}</span>
                                    <span className="material-symbols-outlined text-neutral-300 text-lg">expand_more</span>
                                </div>
                            </div>
                         </div>
                    ))}
                </div>
            </div>
        </div>
    )

    const navLinks = [
        { id: 'analytics', label: 'Dashboard', icon: 'dashboard', category: 'admin' },
        { id: 'orders', label: 'Pesanan Masuk', icon: 'receipt_long', category: 'admin' },
        { id: 'history', label: 'Riwayat Pesanan', icon: 'history', category: 'admin' },
        { id: 'menu', label: 'Kelola Menu', icon: 'restaurant_menu', category: 'admin' },
        { id: 'customer', label: 'Customer Menu', icon: 'storefront', category: 'customer' },
    ]

    return (
        <div className="flex h-screen bg-[#fcfaf8] font-[Manrope,sans-serif]">
            {/* Sidebar (Admin Style) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#ff8c00]/10 pt-6 pb-4 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 z-50">
                 <div className="px-6 mb-8 flex items-center gap-3">
                    <div className="size-10 bg-[#1a1a2e] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                        <BrandIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold leading-tight text-[#181510] tracking-tight truncate">Toko Demo</h1>
                        <p className="text-[10px] font-bold text-[#ff8c00] uppercase tracking-widest mt-0.5">Mode Simulasi</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    <div className="px-6 pb-2">
                        <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Tampilan Admin</p>
                    </div>
                    {navLinks.filter(l => l.category === 'admin').map(link => {
                        const isActive = activeTab === link.id
                        return (
                            <button
                                key={link.id}
                                onClick={() => setActiveTab(link.id)}
                                className={`w-full flex items-center justify-between py-3 px-6 transition-all text-left ${
                                    isActive 
                                        ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                        : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                    <span className="text-[13px]">{link.label}</span>
                                </div>
                            </button>
                        )
                    })}

                    <div className="px-6 pt-6 pb-2">
                        <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Tampilan Pelanggan</p>
                    </div>
                     {navLinks.filter(l => l.category === 'customer').map(link => {
                        const isActive = activeTab === link.id
                        return (
                            <button
                                key={link.id}
                                onClick={() => setActiveTab(link.id)}
                                className={`w-full flex items-center justify-between py-3 px-6 transition-all text-left ${
                                    isActive 
                                        ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                        : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                    <span className="text-[13px]">{link.label}</span>
                                </div>
                            </button>
                        )
                    })}
                </nav>

                <div className="pt-6 border-t border-[#ff8c00]/10 mx-6 bg-white shrink-0 mt-4 text-center">
                    <p className="text-xs text-neutral-500 mb-3 font-medium">Tertarik pakai Tendar?</p>
                    <button onClick={() => navigate('/register')} className="w-full bg-[#ff8c00] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#e07800] transition-colors shadow-lg shadow-[#ff8c00]/20">
                        Buka Toko Gratis
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                {/* Topbar */}
                <header className="flex items-center justify-between w-full px-4 md:px-8 py-3 bg-white/90 backdrop-blur-md border-b border-[#ff8c00]/10 z-40 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden flex size-10 items-center justify-center rounded-xl bg-[#fcfaf8] hover:bg-[#ff8c00]/10 text-[#181510]">
                            <span className="material-symbols-outlined text-xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                        <div className="hidden lg:flex items-center gap-3">
                            <h2 className="text-xl font-black text-[#181510] tracking-tight">{navLinks.find(l => l.id === activeTab)?.label}</h2>
                            <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>
                            <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
                                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Demo Sandbox</span>
                            </div>
                        </div>
                         <div className="lg:hidden flex items-center gap-2">
                            <div className="size-8 bg-[#1a1a2e] rounded-lg flex items-center justify-center text-white">
                                <BrandIcon className="w-5 h-5" />
                            </div>
                            <h1 className="text-base font-bold text-[#181510] leading-none">Toko Demo</h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                         <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-100 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            <span className="hidden sm:inline">Kembali</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    {activeTab === 'analytics' && renderAdminAnalytics()}
                    {activeTab === 'orders' && renderAdminOrders()}
                    {activeTab === 'history' && renderAdminHistory()}
                    {activeTab === 'menu' && renderAdminMenu()}
                    {activeTab === 'customer' && renderCustomerMenu()}
                </div>
            </div>

            {/* Mobile Menu */}
             {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-[#181510]/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute top-0 left-0 w-[80%] max-w-[320px] h-full bg-white border-r border-[#ff8c00]/10 flex flex-col pt-6 pb-4 overflow-y-auto animate-fade-in-right shadow-[4px_0_24px_rgba(0,0,0,0.1)]" onClick={e => e.stopPropagation()}>
                         <div className="px-6 mb-8 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-[#1a1a2e] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                                    <BrandIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold leading-tight text-[#181510] tracking-tight">Toko Demo</h1>
                                </div>
                            </div>
                             <button onClick={() => setIsMobileMenuOpen(false)} className="size-8 flex items-center justify-center text-[#181510]/50 hover:bg-neutral-100 rounded-full">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                        <nav className="flex-1 space-y-1">
                             <div className="px-6 pb-2">
                                <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Tampilan Admin</p>
                            </div>
                            {navLinks.filter(l => l.category === 'admin').map(link => (
                                <button
                                    key={link.id}
                                    onClick={() => { setActiveTab(link.id); setIsMobileMenuOpen(false) }}
                                    className={`w-full flex items-center gap-3 py-3 px-6 transition-all text-left ${activeTab === link.id ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold' : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'}`}
                                >
                                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                    <span className="text-[13px]">{link.label}</span>
                                </button>
                            ))}
                             <div className="px-6 pt-6 pb-2">
                                <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Tampilan Pelanggan</p>
                            </div>
                            {navLinks.filter(l => l.category === 'customer').map(link => (
                                <button
                                    key={link.id}
                                    onClick={() => { setActiveTab(link.id); setIsMobileMenuOpen(false) }}
                                    className={`w-full flex items-center gap-3 py-3 px-6 transition-all text-left ${activeTab === link.id ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold' : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'}`}
                                >
                                    <span className="material-symbols-outlined text-xl">{link.icon}</span>
                                    <span className="text-[13px]">{link.label}</span>
                                </button>
                            ))}
                        </nav>
                        <div className="pt-6 mx-6 shrink-0 mt-4 text-center">
                            <button onClick={() => navigate('/register')} className="w-full bg-[#ff8c00] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#e07800] transition-colors shadow-lg shadow-[#ff8c00]/20">
                                Buka Toko Gratis
                            </button>
                        </div>
                    </div>
                </div>
             )}
        </div>
    )
}
