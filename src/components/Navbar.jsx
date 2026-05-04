import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { usePrinter } from '../context/PrinterContext'
import { useTenantContext } from '../context/TenantContext'
import { BrandIcon } from './BrandLogo'
import toast from 'react-hot-toast'

const ADMIN_UPDATE_NOTICE_KEY = 'tendar_admin_update_notice_inventory_analytics_v1'

function CustomerNavbar() {
    const { user, logout } = useAuth()
    const { totalItems, setIsOpen } = useCart()
    const { slug, tenantName, isTenantAdmin, isTenantStaff } = useTenantContext()
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const firstName = user?.user_metadata?.name?.split(' ')[0] || 'Akun'
    const avatarUrl = user?.user_metadata?.avatar_url || null
    const initial = (user?.user_metadata?.name || user?.email || 'A').charAt(0).toUpperCase()

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-[#ff8c00]/10 px-4 md:px-8 py-3 bg-white/90 backdrop-blur-md sticky top-0 z-40">
            <Link to={`/${slug}`} className="flex items-center gap-3 text-[#181510]">
                <div className="size-9 bg-[#1a1a2e] rounded-lg flex items-center justify-center text-white shadow-lg shadow-black/20">
                    <BrandIcon className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold leading-none tracking-tight">{tenantName || 'Toko Saya'}</h1>
                    <p className="text-[10px] text-[#ff8c00]/70 font-medium">Pesan Online</p>
                </div>
            </Link>

            <div className="flex items-center gap-2 relative">
                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className="flex items-center gap-2 bg-white border border-neutral-200 pl-1 pr-3 py-1 rounded-xl group hover:border-[#ff8c00]/30 hover:bg-[#ff8c00]/5 transition-all outline-none focus:ring-2 focus:ring-[#ff8c00]/20"
                            title="Menu Akun"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="avatar" className="size-8 rounded-lg object-cover" />
                            ) : (
                                <div className="size-8 bg-gradient-to-br from-[#ff8c00] to-[#e67e00] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">
                                    {initial}
                                </div>
                            )}
                            <span className="hidden sm:block text-xs font-bold text-neutral-600 group-hover:text-[#ff8c00] transition-colors max-w-[80px] truncate">
                                {firstName}
                            </span>
                            <span className="material-symbols-outlined text-[16px] text-neutral-400 group-hover:text-[#ff8c00] transition-colors">
                                expand_more
                            </span>
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-fade-in-up origin-top-right">
                                <div className="px-4 py-3 border-b border-neutral-100 mb-2">
                                    <p className="text-sm font-bold text-neutral-800 truncate">{user?.user_metadata?.name || 'Pelanggan'}</p>
                                    <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                                </div>
                                
                                <Link 
                                    to={`/${slug}/profile`}
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-[#ff8c00] hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                                    Pengaturan Profil
                                </Link>

                                <Link 
                                    to={`/${slug}/orders`}
                                    onClick={() => setIsProfileOpen(false)}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-[#ff8c00] hover:bg-neutral-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                    Pesanan Saya
                                </Link>

                                {(isTenantAdmin || isTenantStaff) && (
                                    <Link 
                                        to={`/${slug}/admin`}
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:text-[#ff8c00] hover:bg-neutral-50 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">dashboard</span>
                                        Masuk ke Admin
                                    </Link>
                                )}

                                <div className="h-px bg-neutral-100 my-2"></div>

                                <button 
                                    onClick={() => {
                                        setIsProfileOpen(false)
                                        logout()
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                    Keluar Akun
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link
                        to={`/${slug}/auth`}
                        className="text-sm font-bold text-[#ff8c00] hover:bg-[#ff8c00]/5 px-4 py-2 rounded-xl transition-colors"
                    >
                        Masuk
                    </Link>
                )}

                <button
                    onClick={() => setIsOpen(true)}
                    className="relative flex items-center gap-2 bg-[#ff8c00] hover:bg-[#e67e00] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#ff8c00]/20 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                    <span className="hidden md:inline">Keranjang</span>
                    {totalItems > 0 && (
                        <span className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full text-[11px] font-bold flex items-center justify-center badge-pulse shadow-md">
                            {totalItems}
                        </span>
                    )}
                </button>
            </div>
        </header>
    )
}

function AdminNavbar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout, user } = useAuth()
    const { orders } = useOrders()
    const { slug, tenantName, tenantOwnerId } = useTenantContext()
    const pendingCount = orders.filter(o => o.status === 'pending').length
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const { btConnected, btPrinterName, lastPrinterName, handleConnectPrinter } = usePrinter()

    const handleLogout = () => {
        logout()
        navigate(`/${slug}/auth`)
    }

    const navLinks = [
        { to: `/${slug}/admin`, label: 'Dashboard', exact: true },
        { to: `/${slug}/admin/orders`, label: 'Pesanan', badge: pendingCount },
        { to: `/${slug}/admin/history`, label: 'Riwayat' },
        { to: `/${slug}/admin/menu`, label: 'Kelola Menu' },
        { to: `/${slug}/admin/categories`, label: 'Kategori' },
        { to: `/${slug}/admin/inventory`, label: 'Stok Bahan' },
        { to: `/${slug}/admin/analytics`, label: 'Analytics' },
        { to: `/${slug}/admin/share`, label: 'Bagikan Toko' },
        { to: `/${slug}/admin/receipt`, label: 'Desain Struk' },
    ]

    const isOwner = user?.id === tenantOwnerId
    if (isOwner) {
        navLinks.push({ to: `/${slug}/admin/staff`, label: 'Kelola Staff' })
        navLinks.push({ to: `/${slug}/admin/billing`, label: 'Langganan' })
    }

    const avatarUrl = user?.user_metadata?.avatar_url || null
    const initial = (user?.user_metadata?.name || user?.email || 'A').charAt(0).toUpperCase()
    const firstName = user?.user_metadata?.name?.split(' ')[0] || 'Admin'

    useEffect(() => {
        if (localStorage.getItem(ADMIN_UPDATE_NOTICE_KEY)) return

        localStorage.setItem(ADMIN_UPDATE_NOTICE_KEY, 'shown')
        toast.custom((t) => (
            <div className={`w-[min(92vw,420px)] rounded-2xl bg-white shadow-2xl border border-orange-100 overflow-hidden transition-all ${t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                <div className="px-5 py-4 bg-[#fff7ed] border-b border-orange-100 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#ff8c00] mt-0.5">campaign</span>
                    <div className="min-w-0">
                        <p className="text-sm font-black text-stone-900">Pembaruan aplikasi tersedia</p>
                        <p className="text-xs text-stone-500 mt-0.5">Beberapa fitur admin sudah diperbarui.</p>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-auto text-stone-400 hover:text-stone-700"
                        aria-label="Tutup notifikasi"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
                <div className="px-5 py-4 text-sm text-stone-700 space-y-2">
                    <p>Ringkasan perubahan:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Analytics kini bisa dilihat per hari, per minggu, dan per bulan.</li>
                        <li>Grafik trend penjualan dihitung dari data transaksi asli.</li>
                        <li>Stok bahan mendukung edit nama bahan dan satuan bebas.</li>
                        <li>Resep produk mendukung banyak bahan per menu.</li>
                        <li>Stok bahan otomatis berkurang saat pesanan berstatus selesai.</li>
                    </ul>
                    <p className="pt-2 text-xs text-stone-500">
                        Jika menemukan kendala atau aplikasi error, silakan hubungi pengembang agar bisa segera dibantu.
                    </p>
                </div>
                <div className="px-5 pb-4">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full rounded-xl bg-[#ff8c00] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e67e00] transition-colors"
                    >
                        Saya mengerti
                    </button>
                </div>
            </div>
        ), {
            id: ADMIN_UPDATE_NOTICE_KEY,
            duration: 14000,
            position: 'top-right'
        })
    }, [])

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 z-50 h-[100dvh] w-64 bg-white border-r border-[#ff8c00]/10 flex-col pt-6 pb-4 overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                <Link to={`/${slug}/admin`} className="px-6 mb-8 flex items-center gap-3">
                    <div className="size-10 bg-[#1a1a2e] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                        <BrandIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold leading-tight text-[#181510] tracking-tight truncate max-w-[140px]">{tenantName || 'Toko Saya'}</h1>
                        <p className="text-[10px] font-bold text-[#ff8c00] uppercase tracking-widest mt-0.5">Admin Panel</p>
                    </div>
                </Link>

                <nav className="flex-1 space-y-1">
                    <div className="px-6 pb-2">
                        <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Menu Utama</p>
                    </div>
                    {navLinks.map(link => {
                        const isActive = link.exact
                            ? location.pathname === link.to
                            : location.pathname.startsWith(link.to)

                        if (link.label === 'Kelola Staff' || link.label === 'Langganan' || link.label === 'Analytics' || link.label === 'Bagikan Toko' || link.label === 'Desain Struk') return null;

                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center justify-between py-3 px-6 transition-all ${
                                    isActive 
                                        ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                        : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">
                                        {link.label === 'Dashboard' ? 'dashboard' :
                                         link.label === 'Pesanan' ? 'receipt_long' :
                                         link.label === 'Riwayat' ? 'history' :
                                         link.label === 'Kelola Menu' ? 'restaurant_menu' :
                                         link.label === 'Kategori' ? 'category' :
                                         link.label === 'Stok Bahan' ? 'inventory_2' : 'circle'}
                                    </span>
                                    <span className="text-[13px]">{link.label}</span>
                                </div>
                                {link.badge > 0 && (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                                        {link.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}

                    <div className="px-6 pt-6 pb-2">
                        <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Management</p>
                    </div>
                            {navLinks.filter(l => l.label === 'Kelola Staff' || l.label === 'Langganan' || l.label === 'Analytics' || l.label === 'Bagikan Toko' || l.label === 'Desain Struk').map(link => {
                        const isActive = link.exact
                            ? location.pathname === link.to
                            : location.pathname.startsWith(link.to)
                        
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={`flex items-center justify-between py-3 px-6 transition-all ${
                                    isActive 
                                        ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                        : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-xl">
                                        {link.label === 'Kelola Staff' ? 'badge' : 
                                         link.label === 'Analytics' ? 'analytics' : 
                                         link.label === 'Bagikan Toko' ? 'qr_code_2' :
                                         link.label === 'Desain Struk' ? 'print' : 'card_membership'}
                                    </span>
                                    <span className="text-[13px]">{link.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="pt-6 border-t border-[#ff8c00]/10 mx-6 bg-white shrink-0 mt-4">
                    {/* Profile shortcut */}
                    <Link
                        to={`/${slug}/admin/profile`}
                        className="flex items-center gap-3 py-2.5 px-3 hover:bg-[#ff8c00]/5 rounded-xl transition-all group mb-1"
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="avatar" className="size-8 rounded-lg object-cover shrink-0" />
                        ) : (
                            <div className="size-8 bg-gradient-to-br from-[#ff8c00] to-[#e67e00] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0">
                                {initial}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#181510] group-hover:text-[#ff8c00] transition-colors truncate">{firstName}</p>
                            <p className="text-[10px] text-neutral-400 truncate">{user?.email}</p>
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-neutral-300 group-hover:text-[#ff8c00] transition-colors">chevron_right</span>
                    </Link>
                    <Link to={`/${slug}`} className="flex items-center gap-3 py-2.5 px-3 text-[#181510] hover:text-[#ff8c00] hover:bg-neutral-50 rounded-xl transition-all">
                        <span className="material-symbols-outlined text-[20px] text-[#181510]/60">storefront</span>
                        <span className="text-[13px] font-bold">Lihat Toko</span>
                    </Link>
                    <button onClick={handleLogout} className="flex items-center w-full gap-3 py-2.5 px-3 text-red-500/80 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mt-1">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        <span className="text-[13px] font-bold">Keluar</span>
                    </button>
                </div>
            </aside>

            {/* Top Bar */}
            <header className="flex items-center justify-between w-full px-4 md:px-8 py-3 bg-white/90 backdrop-blur-md border-b border-[#ff8c00]/10 z-40 sticky top-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden flex size-10 items-center justify-center rounded-xl bg-[#fcfaf8] hover:bg-[#ff8c00]/10 text-[#181510] transition-colors relative"
                    >
                        <span className="material-symbols-outlined text-xl">
                            {isMobileMenuOpen ? 'close' : 'menu'}
                        </span>
                        {pendingCount > 0 && !isMobileMenuOpen && (
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    <div className="hidden lg:flex items-center gap-3">
                        <h2 className="text-xl font-black text-[#181510] tracking-tight truncate max-w-[200px]">
                            {navLinks.find(l => location.pathname === l.to || location.pathname.startsWith(l.to) && l.to !== `/${slug}/admin`)?.label || 'Dashboard'}
                        </h2>
                        <div className="h-5 w-[1px] bg-slate-200 mx-1"></div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Online</span>
                        </div>
                    </div>

                    <div className="lg:hidden flex items-center gap-2">
                        <div className="size-8 bg-[#1a1a2e] rounded-lg flex items-center justify-center text-white">
                            <BrandIcon className="w-5 h-5" />
                        </div>
                        <h1 className="text-base font-bold text-[#181510] leading-none truncate max-w-[120px]">{tenantName}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Notifications Placeholder (from design) */}
                    <button className="hidden md:flex p-2 text-[#181510]/50 hover:text-[#ff8c00] transition-colors relative">
                        <span className="material-symbols-outlined">notifications</span>
                        {pendingCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>

                    {/* Printer Status */}
                    <button 
                        onClick={() => {
                            if (!btConnected) {
                                handleConnectPrinter().catch(err => alert(err.message))
                            }
                        }}
                        className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            btConnected 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                                : 'bg-[#fcfaf8] text-[#181510]/50 border-slate-200 hover:bg-neutral-50'
                        }`}
                        title={btConnected ? `Terhubung ke: ${btPrinterName}` : lastPrinterName ? `Klik untuk hubungkan kembali ke ${lastPrinterName}` : 'Printer tidak terhubung'}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {btConnected ? 'print' : 'print_disabled'}
                        </span>
                        <span className="hidden xl:inline max-w-[120px] truncate">
                            {btConnected ? btPrinterName : 'Printer Offline'}
                        </span>
                    </button>

                    <button
                        onClick={() => { sessionStorage.setItem('pos_mode', 'true'); navigate(`/${slug}/pos`) }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ff8c00] hover:bg-[#e67e00] text-white font-bold text-sm shadow-lg shadow-[#ff8c00]/20 hover:shadow-[#ff8c00]/40 transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                        <span className="hidden sm:inline">Mode Kasir</span>
                    </button>
                </div>
            </header>

            {/* Mobile Menu Open State */}
            {isMobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-50 bg-[#181510]/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div 
                        className="absolute top-0 left-0 w-[80%] max-w-[320px] h-[100dvh] bg-white border-r border-[#ff8c00]/10 flex flex-col pt-6 pb-4 overflow-y-auto animate-fade-in-right shadow-[4px_0_24px_rgba(0,0,0,0.1)]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 mb-8 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-[#1a1a2e] rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20">
                                    <BrandIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold leading-tight text-[#181510] tracking-tight">{tenantName || 'Toko Saya'}</h1>
                                    <p className="text-[10px] font-bold text-[#ff8c00] uppercase tracking-widest mt-0.5">Admin Panel</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="size-8 flex items-center justify-center text-[#181510]/50 hover:bg-neutral-100 rounded-full">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
        
                        <nav className="flex-1 space-y-1">
                            <div className="px-6 pb-2">
                                <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Menu Utama</p>
                            </div>
                            {navLinks.map(link => {
                                const isActive = link.exact
                                    ? location.pathname === link.to
                                    : location.pathname.startsWith(link.to)

                                if (link.label === 'Kelola Staff' || link.label === 'Langganan' || link.label === 'Analytics' || link.label === 'Bagikan Toko' || link.label === 'Desain Struk') return null;

                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center justify-between py-3 px-6 transition-all ${
                                            isActive 
                                                ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                                : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-xl">
                                                {link.label === 'Dashboard' ? 'dashboard' :
                                                 link.label === 'Pesanan' ? 'receipt_long' :
                                                 link.label === 'Riwayat' ? 'history' :
                                                 link.label === 'Kelola Menu' ? 'restaurant_menu' :
                                                 link.label === 'Kategori' ? 'category' :
                                                 link.label === 'Stok Bahan' ? 'inventory_2' : 'circle'}
                                            </span>
                                            <span className="text-[13px]">{link.label}</span>
                                        </div>
                                        {link.badge > 0 && (
                                            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                                                {link.badge}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}

                            <div className="px-6 pt-6 pb-2">
                                <p className="text-[10px] font-bold text-[#181510]/40 uppercase tracking-widest">Management</p>
                            </div>
                                    {navLinks.filter(l => l.label === 'Kelola Staff' || l.label === 'Langganan' || l.label === 'Analytics' || l.label === 'Bagikan Toko' || l.label === 'Desain Struk').map(link => {
                                const isActive = link.exact
                                    ? location.pathname === link.to
                                    : location.pathname.startsWith(link.to)
                                
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center justify-between py-3 px-6 transition-all ${
                                            isActive 
                                                ? 'border-l-4 border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] font-bold'
                                                : 'border-l-4 border-transparent text-[#181510]/70 hover:bg-neutral-50 hover:text-[#ff8c00] font-medium'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-xl">
                                            {link.label === 'Kelola Staff' ? 'badge' : 
                                             link.label === 'Analytics' ? 'analytics' : 
                                             link.label === 'Bagikan Toko' ? 'qr_code_2' :
                                             link.label === 'Desain Struk' ? 'print' : 'card_membership'}
                                            </span>
                                            <span className="text-[13px]">{link.label}</span>
                                        </div>
                                    </Link>
                                )
                            })}
                        </nav>
        
                        <div className="pt-6 border-t border-[#ff8c00]/10 mx-6 bg-white shrink-0 mt-4">
                            <Link to={`/${slug}`} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 py-2.5 px-3 text-[#181510] hover:text-[#ff8c00] hover:bg-neutral-50 rounded-xl transition-all">
                                <span className="material-symbols-outlined text-[20px] text-[#181510]/60">storefront</span>
                                <span className="text-[13px] font-bold">Lihat Toko</span>
                            </Link>
                            <button onClick={handleLogout} className="flex items-center w-full gap-3 py-2.5 px-3 text-red-500/80 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all mt-1">
                                <span className="material-symbols-outlined text-[20px]">logout</span>
                                <span className="text-[13px] font-bold">Keluar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default function Navbar() {
    const location = useLocation()
    const isAdmin = location.pathname.includes('/admin')

    return isAdmin ? <AdminNavbar /> : <CustomerNavbar />
}
