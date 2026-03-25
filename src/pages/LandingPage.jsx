import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const navigate = useNavigate()

    const features = [
        { icon: 'restaurant_menu', title: 'Menu Digital', desc: 'Manajemen menu produk lengkap dengan foto, harga, dan kategori.' },
        { icon: 'receipt_long', title: 'Manajemen Pesanan', desc: 'Terima dan kelola pesanan real-time dari pelanggan.' },
        { icon: 'point_of_sale', title: 'Mode Kasir (POS)', desc: 'Antarmuka kasir khusus untuk transaksi langsung di tempat.' },
        { icon: 'analytics', title: 'Laporan & Analitik', desc: 'Dashboard data penjualan, performa produk, dan insight pelanggan.' },
        { icon: 'inventory_2', title: 'Manajemen Stok', desc: 'Pantau bahan baku dan deduct stok otomatis setiap transaksi.' },
        { icon: 'devices', title: 'Akses Multi-Device', desc: 'Akses dari HP, tablet, atau laptop tanpa instal aplikasi.' },
    ]

    const plans = [
        { name: 'Free', price: '0', color: 'border-slate-200', badge: '', features: ['Hingga 20 produk', 'Manajemen pesanan', 'Laporan dasar'] },
        { name: 'Basic', price: '99K', color: 'border-orange-300', badge: 'Populer', features: ['Produk tak terbatas', 'Mode Kasir (POS)', 'Analitik lengkap', 'Manajemen stok'] },
        { name: 'Pro', price: '199K', color: 'border-amber-400', badge: 'Terbaik', features: ['Semua fitur Basic', 'Laporan ekspor Excel', 'Multi-kasir', 'Prioritas support'] },
    ]

    return (
        <div className="min-h-screen bg-[#fcfaf8] font-[Manrope,sans-serif]">

            {/* === NAV === */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <span className="text-xl font-extrabold text-[#ff8c00] tracking-tight">Tendar</span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-[#ff8c00] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#e07800] transition-all"
                    >
                        Daftar Gratis
                    </button>
                </div>
            </nav>

            {/* === HERO === */}
            <section className="text-center px-6 pt-20 pb-16">
                <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-5 tracking-wide uppercase">
                    Platform SaaS untuk Bisnis F&B
                </span>
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-800 leading-tight max-w-3xl mx-auto">
                    Kelola Tokomu <span className="text-[#ff8c00]">Online</span>,<br />Tanpa Ribet.
                </h1>
                <p className="mt-5 text-slate-500 text-lg max-w-xl mx-auto leading-relaxed">
                    Tendar adalah platform all-in-one untuk bisnis F&B. Dari manajemen menu, pesanan, kasir,
                    hingga analitik — semua dalam satu dashboard.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-[#ff8c00] text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-[#e07800] transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300"
                    >
                        Buka Toko Gratis →
                    </button>
                    <button
                        onClick={() => navigate('/kareem-juice')}
                        className="border-2 border-slate-200 text-slate-600 px-8 py-3.5 rounded-full font-semibold text-base hover:border-slate-300 transition-all"
                    >
                        Lihat Demo
                    </button>
                </div>
                <p className="mt-4 text-slate-400 text-sm">Gratis selamanya. Tidak perlu kartu kredit.</p>
            </section>

            {/* === FEATURES === */}
            <section className="px-6 pb-20 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-700 text-center mb-10">Semua yang Kamu Butuhkan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {features.map(f => (
                        <div key={f.title} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <span className="material-symbols-outlined text-3xl text-[#ff8c00]">{f.icon}</span>
                            <h3 className="mt-3 font-bold text-slate-700">{f.title}</h3>
                            <p className="mt-1 text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* === PRICING === */}
            <section className="bg-white px-6 py-20">
                <h2 className="text-2xl font-bold text-slate-700 text-center mb-10">Harga Transparan</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    {plans.map(p => (
                        <div key={p.name} className={`relative bg-white border-2 ${p.color} p-6 rounded-2xl`}>
                            {p.badge && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff8c00] text-white text-xs px-3 py-1 rounded-full font-semibold">
                                    {p.badge}
                                </span>
                            )}
                            <p className="font-bold text-slate-700 text-lg">{p.name}</p>
                            <p className="mt-1">
                                <span className="text-3xl font-extrabold text-slate-800">Rp{p.price}</span>
                                <span className="text-slate-400 text-sm">/bln</span>
                            </p>
                            <ul className="mt-4 space-y-2">
                                {p.features.map(f => (
                                    <li key={f} className="flex gap-2 text-sm text-slate-600">
                                        <span className="material-symbols-outlined text-green-500 text-base">check_circle</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => navigate('/register')}
                                className="mt-6 w-full bg-[#ff8c00] text-white py-2.5 rounded-full font-semibold text-sm hover:bg-[#e07800] transition-all"
                            >
                                Mulai Sekarang
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* === CTA FOOTER === */}
            <section className="text-center px-6 py-16 bg-[#ff8c00]">
                <h2 className="text-3xl font-extrabold text-white">Siap Buka Tokomu?</h2>
                <p className="mt-3 text-orange-100 text-base">Daftar dalam 2 menit. Gratis, tanpa ribet.</p>
                <button
                    onClick={() => navigate('/register')}
                    className="mt-6 bg-white text-[#ff8c00] px-8 py-3.5 rounded-full font-bold hover:bg-orange-50 transition-all shadow-lg"
                >
                    Buka Toko Gratis →
                </button>
            </section>

            <footer className="text-center py-6 text-slate-400 text-sm bg-[#fcfaf8]">
                © {new Date().getFullYear()} Tendar. Dibuat dengan ❤️ untuk UMKM Indonesia.
            </footer>
        </div>
    )
}
