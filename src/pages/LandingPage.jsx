import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'

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
        { name: 'Free', price: '0', color: 'border-slate-200', badge: '', features: ['Hingga 10 produk', '1 Akses Staff', 'Online Menu'] },
        { name: 'Starter', price: '25K', color: 'border-orange-300', badge: 'Terjangkau', features: ['Hingga 30 produk', 'Kategori & Gambar Produk', 'Online Menu'] },
        { name: 'Business', price: '50K', color: 'border-orange-400', badge: 'Populer', features: ['Produk Tak Terbatas', 'Kasir (POS) & Analitik', 'Manajemen Stok Dasar', 'Export CSV Data'] },
        { name: 'Pro', price: '100K', color: 'border-[#ff8c00] border-[3px]', badge: 'Terbaik', features: ['Resep & BoM', 'Staff Tak Terbatas', 'Export Laporan Excel', 'Prioritas Dukungan'] },
    ]

    return (
        <div className="min-h-screen bg-[#fcfaf8] font-[Manrope,sans-serif]">

            {/* === NAV === */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <BrandLogo />
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
                    hingga analitik semua dalam satu dashboard.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                    {plans.map(p => (
                        <div key={p.name} className={`relative bg-white border-2 ${p.color} p-6 rounded-2xl`}>
                            {p.badge && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff8c00] text-white text-xs px-3 py-1 rounded-full font-semibold">
                                    {p.badge}
                                </span>
                            )}
                            <p className="font-bold text-slate-700 text-lg">{p.name}</p>
                            <p className="mt-1">
                                <span className="text-3xl font-extrabold text-[#181510] tracking-tight">Rp{p.price}</span>
                                <span className="text-slate-400 text-sm font-medium">/bln</span>
                            </p>
                            <ul className="mt-4 space-y-2">
                                {p.features.map(f => (
                                    <li key={f} className="flex gap-2 text-sm text-slate-600 font-medium tracking-tight">
                                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                                        <span className="leading-tight pt-0.5">{f}</span>
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

            {/* === CONTACT === */}
            <section className="bg-[#fcfaf8] px-6 py-12 border-t border-slate-100">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-xl font-bold text-slate-700 mb-2">Hubungi Kami</h2>
                    <p className="text-slate-500 text-sm mb-6">Ada pertanyaan atau butuh bantuan? Tim kami siap membantu kamu.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="https://wa.me/6285771640544"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-[#25D366] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#1ebe5d] transition-all shadow-md"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp: 0857-7164-0544
                        </a>
                    </div>
                    <p className="mt-4 text-slate-400 text-xs">
                        Contact Person: <strong className="text-slate-500">Tim Tendar</strong> — tersedia Senin–Sabtu, 09.00–17.00 WIB
                    </p>
                </div>
            </section>

            <footer className="text-center py-6 text-slate-400 text-sm bg-[#f5f3f0] border-t border-slate-100">
                <p>© {new Date().getFullYear()} Tendar. Dibuat dengan ❤️ untuk UMKM Indonesia.</p>
                <p className="mt-1">
                    <a href="https://wa.me/6285771640544" target="_blank" rel="noopener noreferrer" className="text-[#ff8c00] hover:underline font-medium">
                        Hubungi Kami via WhatsApp
                    </a>
                </p>
            </footer>
        </div>
    )
}
