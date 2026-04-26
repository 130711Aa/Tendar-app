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
            setEmail('')
            setPassword('')
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

// ── UI Mockups for Landing Page ───────────────────────────────────────
function MockupCustomerCatalog() {
    return (
        <div className="bg-[#fcfaf8] rounded-[2rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] border-[6px] border-slate-800 overflow-hidden text-left flex flex-col h-[380px] w-[220px] mx-auto transform transition-transform hover:-translate-y-2 relative">
            {/* Mobile Status Bar area */}
            <div className="w-full h-5 bg-slate-800 flex justify-center items-start pt-1">
                <div className="w-16 h-1 bg-black/50 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="bg-white p-3 border-b border-slate-100 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#ff8c00] rounded-md text-white flex items-center justify-center font-black text-[10px] shadow-sm">FJ</div>
                    <span className="text-xs font-black text-slate-800 tracking-tight">Fresh Juice Bar</span>
                </div>
                <div className="relative">
                    <span className="material-symbols-outlined text-slate-600 text-[18px]">shopping_bag</span>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white flex items-center justify-center text-[8px] font-bold border border-white">2</div>
                </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 p-3 overflow-hidden border-b border-slate-50 bg-white">
                <div className="bg-[#ff8c00] text-white text-[9px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-sm">Semua</div>
                <div className="bg-slate-100 text-slate-500 text-[9px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Minuman</div>
                <div className="bg-slate-100 text-slate-500 text-[9px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">Snack</div>
            </div>

            {/* Products */}
            <div className="p-3 flex-1 overflow-hidden space-y-3 bg-[#fcfaf8]">
                {[
                    { name: 'Jus Mangga Manis', price: 'Rp15.000', icon: 'blender', color: 'bg-amber-100 text-amber-500' },
                    { name: 'Avocado Float', price: 'Rp18.000', icon: 'icecream', color: 'bg-emerald-100 text-emerald-500' },
                    { name: 'Strawberry Berry', price: 'Rp16.000', icon: 'local_drink', color: 'bg-rose-100 text-rose-500' },
                ].map((item, i) => (
                    <div key={i} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 flex gap-2.5 items-center relative overflow-hidden group">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-slate-700 leading-tight">{item.name}</p>
                            <p className="text-[9px] font-black text-[#ff8c00] mt-0.5">{item.price}</p>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-orange-50 text-[#ff8c00] flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[14px]">add</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom floating button */}
            <div className="absolute bottom-3 left-3 right-3 bg-slate-800 text-white rounded-xl p-3 flex justify-between items-center shadow-lg">
                <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 font-medium">2 pesanan</span>
                    <span className="text-[11px] font-black tracking-tight">Rp 33.000</span>
                </div>
                <div className="text-[9px] font-bold bg-[#ff8c00] px-3 py-1.5 rounded-lg flex items-center gap-1">
                    Checkout <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                </div>
            </div>
        </div>
    )
}

function MockupMenu() {
    return (
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden text-left flex flex-col h-full transform transition-transform hover:-translate-y-1">
            <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">Manajemen Menu</div>
            </div>
            <div className="p-5 flex-1 bg-[#fcfaf8] space-y-3">
                {[
                    { name: 'Kopi Susu Aren', price: 'Rp22.000', icon: 'local_cafe', active: true },
                    { name: 'Jus Mangga Manis', price: 'Rp15.000', icon: 'blender', active: true },
                    { name: 'Croissant Butter', price: 'Rp18.000', icon: 'bakery_dining', active: false },
                ].map((item, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
                                <span className="material-symbols-outlined text-orange-500 text-[20px]">{item.icon}</span>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 leading-tight">{item.name}</p>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">{item.price}</p>
                            </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-300 ${item.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${item.active ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function MockupPOS() {
    return (
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden text-left flex h-[280px] transform transition-transform hover:-translate-y-1">
            {/* Left: Products */}
            <div className="w-3/5 p-4 bg-slate-50 border-r border-slate-100 grid grid-cols-2 gap-3 overflow-hidden">
                {[
                    { color: 'bg-amber-100', text: 'text-amber-600', icon: 'local_pizza' },
                    { color: 'bg-emerald-100', text: 'text-emerald-600', icon: 'local_drink' },
                    { color: 'bg-rose-100', text: 'text-rose-600', icon: 'icecream' },
                    { color: 'bg-blue-100', text: 'text-blue-600', icon: 'restaurant' },
                ].map((item, i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                        <div className={`w-10 h-10 rounded-full ${item.color} mb-3 flex items-center justify-center`}>
                            <span className={`material-symbols-outlined ${item.text} text-[18px]`}>{item.icon}</span>
                        </div>
                        <div className="w-16 h-2 bg-slate-200 rounded-full mb-2"></div>
                        <div className="w-10 h-2 bg-slate-100 rounded-full"></div>
                    </div>
                ))}
            </div>
            {/* Right: Cart */}
            <div className="w-2/5 flex flex-col bg-white">
                <div className="p-3 bg-white border-b border-slate-100 shadow-sm z-10 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">Pesanan</span>
                    <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Meja 4</span>
                </div>
                <div className="p-3 flex-1 space-y-3 bg-[#fcfaf8]">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="w-16 h-2 bg-slate-400 rounded-full mb-1.5"></div>
                            <div className="w-10 h-1.5 bg-slate-300 rounded-full"></div>
                        </div>
                        <div className="w-5 h-5 bg-white border border-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 shadow-sm">x2</div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="w-20 h-2 bg-slate-400 rounded-full mb-1.5"></div>
                            <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                        </div>
                        <div className="w-5 h-5 bg-white border border-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 shadow-sm">x1</div>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-500">Total</span>
                        <span className="text-sm font-black text-slate-800">Rp 45.000</span>
                    </div>
                    <div className="w-full bg-[#ff8c00] text-white text-xs font-bold py-2.5 rounded-xl text-center shadow-md shadow-orange-200 flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        Bayar
                    </div>
                </div>
            </div>
        </div>
    )
}

function MockupAnalytics() {
    return (
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden text-left flex flex-col h-full transform transition-transform hover:-translate-y-1 p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Pendapatan Hari Ini</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight">Rp 2.450.000</p>
                    <div className="flex items-center gap-1 mt-1 text-emerald-500 text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">trending_up</span>
                        +15.2% dari kemarin
                    </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-500">monitoring</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pesanan</p>
                    <p className="text-lg font-black text-slate-700">42</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pelanggan</p>
                    <p className="text-lg font-black text-slate-700">38</p>
                </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-24 mt-auto border-b border-slate-100 pb-2">
                {[30, 45, 25, 65, 85, 55, 95].map((h, i) => (
                    <div key={i} className="w-full relative group">
                        <div className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {h}k
                        </div>
                        <div className={`w-full rounded-t-sm transition-all duration-500 hover:opacity-80 ${i === 6 ? 'bg-gradient-to-t from-[#ff8c00] to-orange-400' : 'bg-slate-200'}`} style={{ height: `${h}%` }}></div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 uppercase">
                <span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span><span className="text-[#ff8c00]">Min</span>
            </div>
        </div>
    )
}

// ── Main LandingPage ──────────────────────────────────────────────────
export default function LandingPage() {
    const navigate = useNavigate()
    const { user, isAdmin, isSuperAdmin, isAuthenticated, logout, loading } = useAuth()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    // After login, check role and redirect or stay
    const handleLoginSuccess = async (loggedUser) => {
        setShowLoginModal(false)
        setRedirecting(true)

        try {
            // Check superadmin first
            const { data: saData, error: saError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', loggedUser.id)
                .eq('role', 'superadmin')
                .limit(1)
                .maybeSingle()

            if (saError) console.error("Error checking superadmin:", saError);

            if (saData) {
                navigate('/superadmin')
                return
            }

            // Find any store they manage (admin or staff)
            const { data: roleData } = await supabase
                .from('user_roles')
                .select('role, tenant_id')
                .eq('user_id', loggedUser.id)
                .in('role', ['admin', 'staff'])
                .limit(1)
                .maybeSingle()

            if (roleData?.tenant_id) {
                // Get the tenant slug
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('slug')
                    .eq('id', roleData.tenant_id)
                    .maybeSingle()

                if (tenantData?.slug) {
                    const dest = roleData.role === 'admin'
                        ? `/${tenantData.slug}/admin`
                        : `/${tenantData.slug}/pos`
                    navigate(dest)
                    return
                }
            }
            
            // Not admin/staff: stay on landing page, show profile
            toast.success(`Selamat datang, ${loggedUser.user_metadata?.name || loggedUser.email}!`)
        } finally {
            setRedirecting(false)
        }
    }

    // If already logged in (e.g. refreshed page), auto-redirect
    useEffect(() => {
        if (!loading && isAuthenticated && user) {
            const redirect = async () => {
                // Check superadmin first
                const { data: saData, error: saError } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .eq('role', 'superadmin')
                    .limit(1)
                    .maybeSingle()

                if (saError) console.error("Error auto-redirect superadmin:", saError)

                if (saData) {
                    navigate('/superadmin', { replace: true })
                    return
                }

                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role, tenant_id')
                    .eq('user_id', user.id)
                    .in('role', ['admin', 'staff'])
                    .limit(1)
                    .maybeSingle()

                if (roleData?.tenant_id) {
                    const { data: tenantData } = await supabase
                        .from('tenants')
                        .select('slug')
                        .eq('id', roleData.tenant_id)
                        .maybeSingle()

                    if (tenantData?.slug) {
                        const dest = roleData.role === 'admin'
                            ? `/${tenantData.slug}/admin`
                            : `/${tenantData.slug}/pos`
                        navigate(dest, { replace: true })
                    }
                }
            }
            redirect()
        }
    }, [loading, isAuthenticated, user, navigate])

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
        { name: 'Starter', price: '15K', color: 'border-orange-300', badge: 'Terjangkau', features: ['Hingga 30 produk', 'Kategori & Gambar Produk', 'Online Menu'] },
        { name: 'Business', price: '35K', color: 'border-orange-400', badge: 'Populer', features: ['Produk Tak Terbatas', 'Kasir (POS) & Analitik', 'Manajemen Stok Dasar', 'Export Transaksi (Excel)'] },
        { name: 'Pro', price: '50K', color: 'border-[#ff8c00] border-[3px]', badge: 'Terbaik', features: ['Resep & BoM', 'Staff Tak Terbatas', 'Export Laporan Excel', 'Prioritas Dukungan'] },
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
                        onClick={() => navigate('/dummy')}
                        className="border-2 border-slate-200 text-slate-600 px-8 py-3.5 rounded-full font-semibold text-base hover:border-slate-300 transition-all"
                    >
                        Lihat Demo
                    </button>
                </div>
                <p className="mt-4 text-slate-400 text-sm">Gratis selamanya. Tidak perlu kartu kredit.</p>
            </section>

            {/* === FEATURE SHOWCASE (TIMELINE) === */}
            <section className="px-6 py-20 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Semua yang Kamu Butuhkan</h2>
                        <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto">Desain antarmuka yang sangat mudah digunakan, bahkan untuk pemula sekalipun. Buktikan sendiri.</p>
                    </div>

                    <div className="space-y-24">
                        {/* Feature 0: Customer Catalog */}
                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                            <div className="w-full md:w-1/2">
                                <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-2xl">storefront</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">Katalog Menu Online Pelanggan</h3>
                                <p className="text-slate-500 text-lg leading-relaxed mb-6">Pelanggan tidak perlu repot mengunduh aplikasi tambahan. Cukup bagikan link toko Anda, dan mereka bisa langsung melihat menu lengkap dengan foto menarik serta melakukan pemesanan dari HP masing-masing.</p>
                                <ul className="space-y-3">
                                    {['Tanpa perlu install aplikasi', 'Tampilan responsif dan elegan ala mobile app', 'Keranjang belanja yang otomatis menghitung total'].map((item, i) => (
                                        <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="w-full md:w-1/2 relative">
                                <div className="absolute inset-0 bg-gradient-to-tl from-pink-50 to-rose-50 transform rotate-3 rounded-3xl"></div>
                                <div className="relative p-6 md:p-8 flex justify-center">
                                    <MockupCustomerCatalog />
                                </div>
                            </div>
                        </div>

                        {/* Feature 1: Menu */}
                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                            <div className="w-full md:w-1/2 order-2 md:order-1 relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-amber-50 transform -rotate-3 rounded-3xl"></div>
                                <div className="relative p-6 md:p-8">
                                    <MockupMenu />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 order-1 md:order-2">
                                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">Manajemen Menu Digital</h3>
                                <p className="text-slate-500 text-lg leading-relaxed mb-6">Atur kategori, harga, dan ketersediaan stok hanya dengan beberapa klik. Pelanggan bisa langsung melihat perubahan di katalog online toko Anda tanpa perlu refresh halaman.</p>
                                <ul className="space-y-3">
                                    {['Katalog responsif untuk HP pelanggan', 'On/Off produk jika stok habis', 'Foto produk tak terbatas'].map((item, i) => (
                                        <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Feature 2: POS */}
                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                            <div className="w-full md:w-1/2">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">Aplikasi Kasir (POS) Cepat</h3>
                                <p className="text-slate-500 text-lg leading-relaxed mb-6">Dirancang khusus untuk melayani pesanan di tempat dengan kecepatan tinggi. Mendukung pembayaran tunai, QRIS, dan terintegrasi langsung dengan printer thermal bluetooth.</p>
                                <ul className="space-y-3">
                                    {['Perhitungan uang kembalian otomatis', 'Cetak struk dari browser tanpa aplikasi', 'Split kategori untuk navigasi cepat'].map((item, i) => (
                                        <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="w-full md:w-1/2 relative">
                                <div className="absolute inset-0 bg-gradient-to-tl from-blue-50 to-indigo-50 transform rotate-3 rounded-3xl"></div>
                                <div className="relative p-6 md:p-8">
                                    <MockupPOS />
                                </div>
                            </div>
                        </div>

                        {/* Feature 3: Analytics */}
                        <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
                            <div className="w-full md:w-1/2 order-2 md:order-1 relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 transform -rotate-3 rounded-3xl"></div>
                                <div className="relative p-6 md:p-8">
                                    <MockupAnalytics />
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 order-1 md:order-2">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                                    <span className="material-symbols-outlined text-2xl">analytics</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">Laporan & Analitik Cerdas</h3>
                                <p className="text-slate-500 text-lg leading-relaxed mb-6">Pantau performa bisnis Anda secara real-time. Tendar menyajikan data rumit menjadi grafik yang mudah dipahami agar Anda bisa membuat keputusan bisnis dengan tepat.</p>
                                <ul className="space-y-3">
                                    {['Ringkasan penjualan harian/mingguan', 'Mencatat produk paling laris (Best Seller)', 'Eksport laporan ke format Excel'].map((item, i) => (
                                        <li key={i} className="flex gap-3 text-slate-600 font-medium">
                                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
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

            {/* === CTA & FOOTER === */}
            <section className="relative pt-24 pb-10 px-6 bg-[#fcfaf8] overflow-hidden border-t border-slate-100">
                {/* Background decorative elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-100/50 rounded-full blur-3xl"></div>
                </div>

                {/* Floating CTA Card */}
                <div className="max-w-5xl mx-auto relative z-10 bg-gradient-to-br from-[#ff8c00] to-orange-500 rounded-[2.5rem] p-10 md:p-16 text-center shadow-[0_20px_40px_-15px_rgba(255,140,0,0.4)] mb-24 overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl"></div>
                    
                    <h2 className="relative z-10 text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight">Siap Buka Tokomu?</h2>
                    <p className="relative z-10 text-orange-100 text-lg mb-8 max-w-xl mx-auto font-medium">Gabung dengan ribuan UMKM lainnya yang sudah beralih ke sistem digital. Gratis, tanpa ribet.</p>
                    <button
                        onClick={() => navigate('/register')}
                        className="relative z-10 bg-white text-[#ff8c00] px-10 py-4 rounded-full font-bold text-lg hover:bg-orange-50 hover:scale-105 hover:shadow-xl transition-all duration-300"
                    >
                        Buka Toko Gratis Sekarang
                    </button>
                </div>

                {/* Footer Content */}
                <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6 border-t border-slate-200 pt-16">
                    {/* Brand */}
                    <div className="md:col-span-2 pr-0 md:pr-10">
                        <BrandLogo />
                        <p className="mt-5 text-slate-500 text-sm leading-relaxed font-medium">
                            Tendar adalah platform manajemen F&B modern yang dirancang khusus untuk membantu UMKM kuliner di Indonesia bertumbuh lebih cepat dengan teknologi tepat guna.
                        </p>
                    </div>

                    {/* Links */}
                    <div className="md:col-span-1">
                        <h4 className="font-bold text-slate-800 mb-5">Tautan Berguna</h4>
                        <ul className="space-y-3 text-sm font-medium text-slate-500">
                            <li><a href="/register" className="hover:text-[#ff8c00] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Daftar Baru</a></li>
                            <li><button onClick={() => setShowLoginModal(true)} className="hover:text-[#ff8c00] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Masuk (Login)</button></li>
                            <li><a href="/docs" className="hover:text-[#ff8c00] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Dokumentasi</a></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="md:col-span-1">
                        <h4 className="font-bold text-slate-800 mb-5">Hubungi Kami</h4>
                        <div className="space-y-4 text-sm font-medium text-slate-500">
                            <p className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[20px] text-slate-400">schedule</span>
                                <span>Senin–Sabtu<br/>09.00–17.00 WIB</span>
                            </p>
                            <a
                                href="https://wa.me/6285771640544"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-[#25D366]/10 text-[#25D366] px-4 py-2.5 rounded-xl font-bold hover:bg-[#25D366] hover:text-white transition-all mt-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Chat WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto border-t border-slate-200 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs font-semibold text-slate-400">
                    <p>© {new Date().getFullYear()} Tendar. Dibuat dengan ❤️ untuk UMKM Indonesia.</p>
                    <div className="flex gap-5 mt-4 md:mt-0">
                        <a href="#" className="hover:text-[#ff8c00] transition-colors">Syarat Ketentuan</a>
                        <a href="#" className="hover:text-[#ff8c00] transition-colors">Kebijakan Privasi</a>
                    </div>
                </div>
            </section>

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
