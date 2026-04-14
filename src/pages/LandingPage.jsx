import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'

// ── Login Modal ───────────────────────────────────────────────────────
function LoginModal({ onClose, onSuccess }) {
    const { login, loginWithGoogle } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPw, setShowPw] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        const result = await login(email, password)
        setLoading(false)
        if (!result.success) {
            toast.error(result.error || 'Email atau password salah')
        } else {
            onSuccess(result.data.user)
        }
    }

    const handleGoogle = async () => {
        await loginWithGoogle(`${window.location.origin}/auth/callback?next=/`)
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#ff8c00] to-orange-400 px-8 pt-8 pb-6 text-white text-center">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-[32px]">lock_open</span>
                    </div>
                    <h2 className="text-xl font-black">Masuk ke Tendar</h2>
                    <p className="text-orange-100 text-sm mt-1">Akses dashboard toko kamu</p>
                </div>

                {/* Body */}
                <div className="px-8 py-6 space-y-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="nama@email.com"
                                required
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/40 focus:border-[#ff8c00] transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/40 focus:border-[#ff8c00] transition-all pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    tabIndex={-1}
                                >
                                    <span className="material-symbols-outlined text-[20px]">
                                        {showPw ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#ff8c00] text-white py-3 rounded-xl font-bold hover:bg-[#e07800] disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Masuk...</>
                            ) : (
                                <><span className="material-symbols-outlined text-[18px]">login</span>Masuk</>
                            )}
                        </button>
                    </form>

                    <div className="flex items-center gap-3 text-slate-300">
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">atau</span>
                        <div className="flex-1 h-px bg-slate-100" />
                    </div>

                    <button
                        onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                    >
                        <svg viewBox="0 0 48 48" className="w-4 h-4"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
                        Masuk dengan Google
                    </button>

                    <p className="text-center text-xs text-slate-400">
                        Belum punya akun?{' '}
                        <a href="/register" className="text-[#ff8c00] font-semibold hover:underline">Daftar gratis</a>
                    </p>
                </div>
            </div>
        </div>
    )
}

// ── Profile Dropdown ──────────────────────────────────────────────────
function ProfileDropdown({ user, onLogout }) {
    const [open, setOpen] = useState(false)
    const ref = useRef()
    const displayName = user.user_metadata?.name || user.email?.split('@')[0] || 'Pengguna'
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 transition-all group"
                aria-label="Menu profil"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#ff8c00] to-orange-400 flex items-center justify-center text-white text-xs font-black">
                    {initials}
                </div>
                <span className="text-sm font-semibold text-slate-700 max-w-[120px] truncate hidden sm:block">
                    {displayName}
                </span>
                <span className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform ${open ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
                    {/* User info */}
                    <div className="px-4 py-3 bg-orange-50 border-b border-slate-100">
                        <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1.5">
                        <button
                            onClick={() => { setOpen(false); onLogout() }}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-600 font-medium hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            Keluar
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Main LandingPage ──────────────────────────────────────────────────
export default function LandingPage() {
    const navigate = useNavigate()
    const { user, isAdmin, isAuthenticated, logout, loading } = useAuth()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    // After login, check role and redirect or stay
    const handleLoginSuccess = async (loggedUser) => {
        setShowLoginModal(false)
        setRedirecting(true)

        try {
            // Check admin role
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', loggedUser.id)
                .eq('role', 'admin')
                .maybeSingle()

            if (roleData) {
                // Find their tenant slug
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('owner_id', loggedUser.id)
                    .maybeSingle()

                if (tenantData?.slug) {
                    navigate(`/${tenantData.slug}/admin`)
                    return
                }
            }
            // Not admin: stay on landing page, show profile
            toast.success(`Selamat datang, ${loggedUser.user_metadata?.name || loggedUser.email}!`)
        } finally {
            setRedirecting(false)
        }
    }

    // If already logged in as admin (e.g. refreshed page), auto-redirect
    useEffect(() => {
        if (!loading && isAuthenticated && isAdmin && user) {
            const redirect = async () => {
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('owner_id', user.id)
                    .maybeSingle()
                if (tenantData?.slug) {
                    navigate(`/${tenantData.slug}/admin`, { replace: true })
                }
            }
            redirect()
        }
    }, [loading, isAuthenticated, isAdmin, user, navigate])

    const handleLogout = async () => {
        await logout()
        toast.success('Berhasil keluar.')
    }

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
                    {redirecting ? (
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <div className="w-4 h-4 border-2 border-[#ff8c00]/30 border-t-[#ff8c00] rounded-full animate-spin" />
                            <span>Mengalihkan...</span>
                        </div>
                    ) : isAuthenticated && user ? (
                        /* ── Logged in: show profile ── */
                        <ProfileDropdown user={user} onLogout={handleLogout} />
                    ) : (
                        /* ── Not logged in: show buttons ── */
                        <>
                            <button
                                id="landing-login-btn"
                                onClick={() => setShowLoginModal(true)}
                                className="border border-slate-200 text-slate-600 px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Masuk
                            </button>
                            <button
                                onClick={() => navigate('/register')}
                                className="bg-[#ff8c00] text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-[#e07800] transition-all shadow-sm shadow-orange-200"
                            >
                                Daftar Gratis
                            </button>
                        </>
                    )}
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

            {/* Login Modal */}
            {showLoginModal && (
                <LoginModal
                    onClose={() => setShowLoginModal(false)}
                    onSuccess={handleLoginSuccess}
                />
            )}
        </div>
    )
}
