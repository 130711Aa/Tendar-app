import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Toaster } from 'react-hot-toast'

const NAV_ITEMS = [
    { to: '/superadmin', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/superadmin/payments', label: 'Verifikasi Pembayaran', icon: 'receipt_long', end: false },
    { to: '/superadmin/merchants', label: 'Manajemen Merchant', icon: 'store', end: false },
]

export default function SuperAdminLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const handleLogout = async () => {
        await logout()
        navigate('/')
    }

    return (
        <div className="flex min-h-screen bg-[#0f0f23]">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a2e] border-r border-white/5 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="material-symbols-outlined text-white text-lg">shield_person</span>
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-sm tracking-tight">Tendar</h1>
                            <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-widest">Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-indigo-500/15 text-indigo-300 shadow-sm'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                                }`
                            }
                        >
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                                {user?.email?.charAt(0).toUpperCase() || 'S'}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold truncate">{user?.email || 'Super Admin'}</p>
                            <p className="text-indigo-400 text-[10px] font-medium">Superadmin</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 lg:ml-64 flex flex-col">
                {/* Top bar (mobile) */}
                <header className="lg:hidden sticky top-0 z-30 bg-[#0f0f23]/95 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-2xl">menu</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-sm">shield_person</span>
                        </div>
                        <span className="text-white text-sm font-bold">Super Admin</span>
                    </div>
                    <div className="w-8" /> {/* spacer */}
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 md:p-8">
                    <Outlet />
                </main>
            </div>

            <Toaster
                position="top-center"
                toastOptions={{
                    style: { background: '#1e1e3a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
                    duration: 3000,
                }}
            />
        </div>
    )
}
