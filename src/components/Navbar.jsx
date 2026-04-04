import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { usePrinter } from '../context/PrinterContext'
import { useTenantContext } from '../context/TenantContext'
import { BrandIcon } from './BrandLogo'

function CustomerNavbar() {
    const { user, logout } = useAuth()
    const { totalItems, setIsOpen } = useCart()
    const { slug, tenantName } = useTenantContext()

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

            <div className="flex items-center gap-2">
                {user ? (
                    <div className="flex items-center gap-1.5">
                        <span className="hidden md:inline text-sm font-medium text-neutral-600 mr-1">
                            Hi, {user.user_metadata?.name?.split(' ')[0] || 'Kak'}
                        </span>
                        <Link to={`/${slug}/orders`} className="size-10 flex items-center justify-center bg-[#ff8c00]/10 hover:bg-[#ff8c00]/20 text-[#ff8c00] rounded-xl transition-colors" title="Pesanan Saya">
                            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                        </Link>
                        <Link to={`/${slug}/profile`} className="size-10 flex items-center justify-center bg-purple-50 hover:bg-purple-100 text-purple-500 rounded-xl transition-colors" title="Profil Saya">
                            <span className="material-symbols-outlined text-[20px]">person</span>
                        </Link>
                        <button
                            onClick={logout}
                            className="size-10 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors"
                            title="Keluar"
                        >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        </button>
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
                    <span className="hidden sm:inline">Keranjang</span>
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
    ]

    const isOwner = user?.id === tenantOwnerId
    if (isOwner) {
        navLinks.push({ to: `/${slug}/admin/staff`, label: 'Kelola Staff' })
        navLinks.push({ to: `/${slug}/admin/billing`, label: 'Langganan' })
    }

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

                        if (link.label === 'Kelola Staff' || link.label === 'Langganan' || link.label === 'Analytics' || link.label === 'Bagikan Toko') return null;

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
                    {navLinks.filter(l => l.label === 'Kelola Staff' || l.label === 'Langganan' || l.label === 'Analytics' || l.label === 'Bagikan Toko').map(link => {
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
                                         link.label === 'Bagikan Toko' ? 'qr_code_2' : 'card_membership'}
                                    </span>
                                    <span className="text-[13px]">{link.label}</span>
                                </div>
                            </Link>
                        )
                    })}
                </nav>

                <div className="pt-6 border-t border-[#ff8c00]/10 mx-6 bg-white shrink-0 mt-4">
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
                    
                    <div className="hidden lg:flex w-10 h-10 rounded-full bg-[#fcfaf8] border border-[#ff8c00]/20 items-center justify-center text-[#ff8c00] font-bold ml-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                        {user?.user_metadata?.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
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

                                if (link.label === 'Kelola Staff' || link.label === 'Langganan' || link.label === 'Analytics' || link.label === 'Bagikan Toko') return null;

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
                            {navLinks.filter(l => l.label === 'Kelola Staff' || l.label === 'Langganan' || l.label === 'Analytics' || l.label === 'Bagikan Toko').map(link => {
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
                                             link.label === 'Bagikan Toko' ? 'qr_code_2' : 'card_membership'}
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
