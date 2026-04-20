import { useState, useEffect } from 'react'
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantContext } from '../context/TenantContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ProfilePage() {
    const { user, isAuthenticated, logout, updatePassword } = useAuth()
    const { slug } = useTenantContext()
    const navigate = useNavigate()

    const [activeTab, setActiveTab] = useState('profile')
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetEmailSent, setResetEmailSent] = useState(false)
    const [recentOrders, setRecentOrders] = useState([])
    const [ordersLoading, setOrdersLoading] = useState(false)

    const metadata = user?.user_metadata || {}
    const isGoogleUser = user?.app_metadata?.provider === 'google'

    const [editName, setEditName] = useState(metadata.name || '')
    const [editPhone, setEditPhone] = useState(metadata.phone || '')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showNewPw, setShowNewPw] = useState(false)
    const [showConfirmPw, setShowConfirmPw] = useState(false)

    const avatarUrl = user?.user_metadata?.avatar_url || null
    const initial = (metadata.name || user?.email || 'U').charAt(0).toUpperCase()

    useEffect(() => {
        if (user && activeTab === 'orders') fetchRecentOrders()
    }, [user, activeTab])

    const fetchRecentOrders = async () => {
        if (!user) return
        setOrdersLoading(true)
        const { data } = await supabase
            .from('orders')
            .select('id, created_at, total_amount, status, order_items(name, quantity, price)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)
        setOrdersLoading(false)
        if (data) setRecentOrders(data)
    }

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            toast.error('Nama tidak boleh kosong')
            return
        }
        setSaving(true)
        const { error } = await supabase.auth.updateUser({
            data: { name: editName.trim(), phone: editPhone.trim() }
        })
        setSaving(false)
        if (error) {
            toast.error('Gagal menyimpan: ' + error.message)
        } else {
            toast.success('Profil berhasil diperbarui!')
            setIsEditing(false)
        }
    }

    const handleSendResetEmail = async () => {
        if (!user?.email) return
        setResetLoading(true)
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/${slug}/auth`
        })
        setResetLoading(false)
        if (error) {
            toast.error('Gagal mengirim email: ' + error.message)
        } else {
            setResetEmailSent(true)
            toast.success('Link reset dikirim ke email kamu!', { duration: 5000 })
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()
        if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }
        if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return }
        setSaving(true)
        const result = await updatePassword(newPassword)
        setSaving(false)
        if (result.success) {
            toast.success('Password berhasil diperbarui!')
            setNewPassword('')
            setConfirmPassword('')
        } else {
            toast.error(result.error || 'Gagal update password')
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate(`/${slug}/auth`)
    }

    const getStatusBadge = (status) => {
        const map = {
            pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700' },
            processing: { label: 'Diproses', color: 'bg-blue-100 text-blue-700' },
            completed: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-700' },
            cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700' },
        }
        const s = map[status] || map.pending
        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.color}`}>{s.label}</span>
    }

    if (!isAuthenticated) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-stone-800 tracking-tight">Profil & Akun</h1>
                    <p className="text-stone-500 text-sm mt-1">Kelola informasi akun dan keamanan akun kamu</p>
                </div>

                {/* Profile Hero */}
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                    <div className="h-16 bg-gradient-to-r from-[#ff8c00]/80 via-[#ff8c00] to-[#e67e00]" />
                    <div className="px-6 pb-5">
                        <div className="flex items-start gap-4 mb-3">
                            <div className="-mt-8 shrink-0 relative z-10">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="avatar" className="size-16 rounded-2xl border-4 border-white object-cover shadow-md" />
                                ) : (
                                    <div className="size-16 bg-gradient-to-br from-[#ff8c00] to-[#e67e00] rounded-2xl border-4 border-white flex items-center justify-center text-white text-2xl font-black shadow-md">
                                        {initial}
                                    </div>
                                )}
                            </div>
                            <div className="pt-2 min-w-0">
                                <h2 className="text-lg font-bold text-stone-800 truncate">{metadata.name || 'Pengguna'}</h2>
                                <p className="text-sm text-stone-400 truncate">{user?.email}</p>
                                {isGoogleUser && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full mt-1.5">
                                        <span className="material-symbols-outlined text-[12px]">verified</span>
                                        Login via Google
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-stone-100 shadow-sm rounded-2xl p-1 w-fit">
                    {[
                        { key: 'profile', label: 'Informasi Profil', icon: 'person' },
                        { key: 'security', label: 'Keamanan', icon: 'shield' },
                        { key: 'orders', label: 'Pesanan', icon: 'receipt_long' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-[#ff8c00] text-white shadow-md shadow-[#ff8c00]/20'
                                    : 'text-stone-400 hover:text-stone-600'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── TAB: PROFILE ── */}
                    {activeTab === 'profile' && (
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                                <p className="font-bold text-stone-800">Informasi Akun</p>
                                {!isEditing ? (
                                    <button
                                        onClick={() => { setEditName(metadata.name || ''); setEditPhone(metadata.phone || ''); setIsEditing(true) }}
                                        className="flex items-center gap-1.5 text-xs font-bold text-[#ff8c00] bg-[#ff8c00]/5 hover:bg-[#ff8c00]/10 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span>
                                        Edit
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg transition-colors">Batal</button>
                                        <button onClick={handleSaveProfile} disabled={saving} className="text-xs font-bold text-white bg-[#ff8c00] px-3 py-1.5 rounded-lg hover:bg-[#e67e00] transition-colors disabled:opacity-60">
                                            {saving ? 'Menyimpan...' : 'Simpan'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="divide-y divide-stone-50">
                                {/* Email */}
                                <div className="flex items-center gap-4 px-6 py-4">
                                    <div className="size-10 bg-[#ff8c00]/10 rounded-xl flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-[#ff8c00] text-[20px]">email</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Email</p>
                                        <p className="text-sm font-semibold text-stone-800 truncate mt-0.5">{user?.email}</p>
                                    </div>
                                    <span className="text-[10px] bg-stone-100 text-stone-400 font-bold px-2 py-1 rounded-full">Tetap</span>
                                </div>
                                {/* Nama */}
                                <div className="flex items-center gap-4 px-6 py-4">
                                    <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-blue-500 text-[20px]">badge</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Nama Lengkap</p>
                                        {isEditing ? (
                                            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full mt-1 text-sm font-semibold bg-stone-50 border border-[#ff8c00]/20 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#ff8c00]/30 outline-none" />
                                        ) : (
                                            <p className="text-sm font-semibold text-stone-800 mt-0.5">{metadata.name || <span className="text-stone-300 italic">Belum diisi</span>}</p>
                                        )}
                                    </div>
                                </div>
                                {/* Phone */}
                                <div className="flex items-center gap-4 px-6 py-4">
                                    <div className="size-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-green-500 text-[20px]">phone</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">No. WhatsApp</p>
                                        {isEditing ? (
                                            <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="08xxxxxxxxxx" className="w-full mt-1 text-sm font-semibold bg-stone-50 border border-[#ff8c00]/20 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-[#ff8c00]/30 outline-none" />
                                        ) : (
                                            <p className="text-sm font-semibold text-stone-800 mt-0.5">{metadata.phone || <span className="text-stone-300 italic">Belum diisi</span>}</p>
                                        )}
                                    </div>
                                </div>
                                {/* Joined */}
                                <div className="flex items-center gap-4 px-6 py-4">
                                    <div className="size-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                                        <span className="material-symbols-outlined text-purple-500 text-[20px]">calendar_today</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Bergabung Sejak</p>
                                        <p className="text-sm font-semibold text-stone-800 mt-0.5">
                                            {new Date(user?.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── TAB: SECURITY ── */}
                    {activeTab === 'security' && (
                        <div className="lg:col-span-2 space-y-4">
                            <div className={`rounded-2xl border p-5 ${isGoogleUser ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-stone-100 shadow-sm'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isGoogleUser ? 'bg-blue-100' : 'bg-[#ff8c00]/10'}`}>
                                        <span className={`material-symbols-outlined text-[20px] ${isGoogleUser ? 'text-blue-500' : 'text-[#ff8c00]'}`}>{isGoogleUser ? 'account_circle' : 'lock'}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-stone-800">{isGoogleUser ? 'Akun Google' : 'Email & Password'}</p>
                                        <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
                                            {isGoogleUser ? 'Kamu login menggunakan Google. Keamanan akunmu dikelola langsung oleh Google.' : 'Kamu login menggunakan email dan password.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {isGoogleUser ? (
                                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                                    <div className="px-6 pt-5 pb-3">
                                        <p className="font-bold text-stone-800">Lupa Sandi</p>
                                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">Karena kamu login via Google, kamu tidak perlu sandi Tendar. Namun jika ingin mengaktifkan login email juga, kami bisa kirimkan link pembuatan password.</p>
                                    </div>
                                    <div className="px-6 pb-5 space-y-3">
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                                            <span className="font-bold">💡 Tips:</span> Untuk mengganti password Google, kunjungi{' '}
                                            <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="underline font-bold">myaccount.google.com</a>
                                        </div>
                                        {resetEmailSent ? (
                                            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-700">Email terkirim!</p>
                                                    <p className="text-xs text-emerald-600">Cek inbox <strong>{user?.email}</strong></p>
                                                </div>
                                            </div>
                                        ) : (
                                            <button onClick={handleSendResetEmail} disabled={resetLoading} className="w-full flex items-center justify-center gap-2 border-2 border-[#ff8c00]/20 text-[#ff8c00] font-bold py-3 rounded-xl hover:bg-[#ff8c00]/5 transition-colors disabled:opacity-60 text-sm">
                                                <span className="material-symbols-outlined text-[20px]">mail</span>
                                                {resetLoading ? 'Mengirim...' : 'Kirim Link Buat Password'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                                    <div className="px-6 pt-5 pb-3">
                                        <p className="font-bold text-stone-800">Ganti Password</p>
                                        <p className="text-xs text-stone-500 mt-1">Masukkan password baru untuk akunmu.</p>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="px-6 pb-5 space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Password Baru</label>
                                            <div className="relative mt-1">
                                                <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="minimal 6 karakter" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none pr-11" />
                                                <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#ff8c00]">
                                                    <span className="material-symbols-outlined text-lg">{showNewPw ? 'visibility_off' : 'visibility'}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Konfirmasi Password</label>
                                            <div className="relative mt-1">
                                                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="ulangi password baru" className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none pr-11" />
                                                <button type="button" onClick={() => setShowConfirmPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#ff8c00]">
                                                    <span className="material-symbols-outlined text-lg">{showConfirmPw ? 'visibility_off' : 'visibility'}</span>
                                                </button>
                                            </div>
                                        </div>
                                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">error</span>Password tidak cocok
                                            </p>
                                        )}
                                        <button type="submit" disabled={saving || !newPassword || !confirmPassword} className="w-full bg-[#ff8c00] text-white font-bold py-3 rounded-xl hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 disabled:opacity-60 text-sm">
                                            {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
                                        </button>
                                    </form>
                                    <div className="px-6 pb-5">
                                        <div className="border-t border-stone-100 pt-4">
                                            <p className="text-[10px] text-stone-400 mb-2 font-medium">Atau kirim email reset:</p>
                                            {resetEmailSent ? (
                                                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                                    <p className="text-xs text-emerald-700 font-semibold">Email terkirim ke {user?.email}</p>
                                                </div>
                                            ) : (
                                                <button onClick={handleSendResetEmail} disabled={resetLoading} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-stone-500 bg-stone-50 border border-stone-200 py-2.5 rounded-xl hover:bg-stone-100 transition-colors disabled:opacity-60">
                                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                                    {resetLoading ? 'Mengirim...' : 'Kirim Link Reset via Email'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── TAB: ORDERS ── */}
                    {activeTab === 'orders' && (
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                                <p className="font-bold text-stone-800">Riwayat Pesanan Akun Ini</p>
                            </div>
                            {ordersLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-2xl">progress_activity</span>
                                </div>
                            ) : recentOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <span className="material-symbols-outlined text-4xl text-stone-200 mb-3">receipt_long</span>
                                    <p className="text-sm font-semibold text-stone-400">Belum ada pesanan dari akun ini</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-stone-50">
                                    {recentOrders.map(order => (
                                        <div key={order.id} className="px-6 py-4 hover:bg-stone-50/50 transition-colors">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-bold text-stone-400">
                                                    {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                                {getStatusBadge(order.status)}
                                            </div>
                                            <p className="text-xs text-stone-500 mb-1">
                                                {order.order_items?.slice(0, 2).map(i => `${i.name} ×${i.quantity}`).join(', ')}
                                                {order.order_items?.length > 2 && ` +${order.order_items.length - 2} lainnya`}
                                            </p>
                                            <p className="text-sm font-bold text-stone-800">Rp {order.total_amount?.toLocaleString('id-ID')}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Right sidebar quick actions */}
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 space-y-2">
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Aksi Cepat</p>
                            <Link to={`/${slug}`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 hover:text-[#ff8c00]">
                                <span className="material-symbols-outlined text-[20px]">storefront</span>
                                <span className="text-sm font-semibold">Lihat Toko</span>
                            </Link>
                            <Link to={`/${slug}/orders`} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors text-stone-600 hover:text-[#ff8c00]">
                                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                <span className="text-sm font-semibold">Pesanan Saya</span>
                            </Link>
                            <div className="border-t border-stone-100 pt-2 mt-2">
                                <button onClick={handleLogout} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-red-50 transition-colors text-red-400 hover:text-red-500">
                                    <span className="material-symbols-outlined text-[20px]">logout</span>
                                    <span className="text-sm font-semibold">Keluar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    )
}
