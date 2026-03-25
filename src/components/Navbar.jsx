import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useOrders } from '../context/OrdersContext'
import { usePrinter } from '../context/PrinterContext'
import { useTenantContext } from '../context/TenantContext'

function CustomerNavbar() {
    const { user, logout } = useAuth()
    const { totalItems, setIsOpen } = useCart()
    const { slug, tenantName } = useTenantContext()

    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-[#ff8c00]/10 px-4 md:px-8 py-3 bg-white/90 backdrop-blur-md sticky top-0 z-40">
            <Link to={`/${slug}`} className="flex items-center gap-3 text-[#181510]">
                <div className="size-9 bg-[#ff8c00] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#ff8c00]/20">
                    <span className="material-symbols-outlined">local_drink</span>
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
    const { logout } = useAuth()
    const { orders } = useOrders()
    const { slug, tenantName } = useTenantContext()
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
    ]

    return (
        <header className="flex flex-col border-b border-[#ff8c00]/10 bg-white sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 md:px-10 py-3 whitespace-nowrap bg-white relative z-50">
                <Link to={`/${slug}/admin`} className="flex items-center gap-3 text-[#181510]">
                    <div className="size-9 bg-[#ff8c00] rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">local_drink</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none tracking-tight">{tenantName || 'Toko Saya'}</h1>
                        <p className="text-[10px] text-[#ff8c00]/70 font-medium">Admin Panel</p>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden lg:flex flex-1 justify-center gap-8">
                    <nav className="flex items-center gap-9">
                        {navLinks.map(link => {
                            const isActive = link.exact
                                ? location.pathname === link.to
                                : location.pathname.startsWith(link.to)
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`relative text-sm font-medium leading-normal transition-colors ${isActive
                                        ? 'text-[#ff8c00] font-bold'
                                        : 'text-[#181510]/60 hover:text-[#ff8c00]'
                                        }`}
                                >
                                    {link.label}
                                    {link.badge > 0 && (
                                        <span className="absolute -top-2 -right-4 size-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                                            {link.badge}
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                        <button
                            onClick={() => { sessionStorage.setItem('pos_mode', 'true'); navigate(`/${slug}/pos`) }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff8c00] to-[#ff6b00] text-white text-sm font-bold shadow-lg shadow-[#ff8c00]/20 hover:shadow-[#ff8c00]/40 transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base">point_of_sale</span>
                            Mode Kasir
                        </button>
                        <Link
                            to={`/${slug}`}
                            className="text-sm font-medium leading-normal text-[#181510]/60 hover:text-[#ff8c00] transition-colors"
                        >
                            Lihat Toko →
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="lg:hidden flex size-10 items-center justify-center rounded-xl bg-[#fcfaf8] text-[#181510] hover:bg-[#ff8c00]/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">
                            {isMobileMenuOpen ? 'close' : 'menu'}
                        </span>
                        {pendingCount > 0 && !isMobileMenuOpen && (
                            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full" />
                        )}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span className="hidden sm:inline">Keluar</span>
                    </button>

                    {/* Printer Status Indicator */}
                    <button 
                        onClick={() => {
                            if (!btConnected) {
                                handleConnectPrinter().catch(err => alert(err.message))
                            }
                        }}
                        className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                            btConnected 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 cursor-pointer'
                        }`}
                        title={btConnected ? `Terhubung ke: ${btPrinterName}` : lastPrinterName ? `Klik untuk hubungkan kembali ke ${lastPrinterName}` : 'Printer tidak terhubung'}
                    >
                        <span className="material-symbols-outlined text-[16px]">
                            {btConnected ? 'bluetooth_connected' : 'bluetooth'}
                        </span>
                        <span className="hidden xl:inline max-w-[100px] truncate">
                            {btConnected ? btPrinterName : 'Offline'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-[#ff8c00]/10 shadow-xl animate-fade-in-up flex flex-col p-4 gap-2">
                    {navLinks.map(link => {
                        const isActive = link.exact
                            ? location.pathname === link.to
                            : location.pathname.startsWith(link.to)
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${isActive
                                    ? 'bg-[#ff8c00]/10 text-[#ff8c00] font-bold'
                                    : 'text-[#181510]/70 hover:bg-neutral-50'
                                    }`}
                            >
                                <span>{link.label}</span>
                                {link.badge > 0 && (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        {link.badge}
                                    </span>
                                )}
                            </Link>
                        )
                    })}
                    <div className="h-px bg-neutral-100 my-1" />
                    <button
                        onClick={() => { setIsMobileMenuOpen(false); sessionStorage.setItem('pos_mode', 'true'); navigate(`/${slug}/pos`) }}
                        className="flex items-center justify-between w-full p-3 rounded-xl bg-gradient-to-r from-[#ff8c00] to-[#ff6b00] text-white font-bold transition-all active:scale-[0.98]"
                    >
                        <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">point_of_sale</span>
                            Mode Kasir
                        </span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                    <Link
                        to={`/${slug}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl text-[#181510]/70 hover:bg-neutral-50"
                    >
                        <span>Lihat Toko</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-between w-full p-3 rounded-xl text-red-500 hover:bg-red-50 font-medium transition-colors"
                    >
                        <span>Keluar</span>
                        <span className="material-symbols-outlined text-lg">logout</span>
                    </button>
                </div>
            )}
        </header>
    )
}

export default function Navbar() {
    const location = useLocation()
    const isAdmin = location.pathname.includes('/admin')

    return isAdmin ? <AdminNavbar /> : <CustomerNavbar />
}
