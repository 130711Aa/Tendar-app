import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useTenantContext } from '../context/TenantContext'

export default function AuthPage() {
    const [mode, setMode] = useState('login') // 'login', 'register', 'update-password', or 'forgot-password'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const { login, signup, loading, updatePassword, isRecovering, setIsRecovering } = useAuth()
    const navigate = useNavigate()
    const { slug } = useParams()

    // Listen for password recovery
    useEffect(() => {
        if (isRecovering) {
            setMode('update-password')
        }
    }, [isRecovering])

    // Initial Fragment Check (just in case)
    useEffect(() => {
        if (window.location.hash.includes('type=recovery')) {
            setMode('update-password')
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (mode === 'forgot-password' && !email.trim()) {
            toast.error('Email wajib diisi!')
            return
        }

        if (mode !== 'forgot-password' && mode !== 'update-password' && !password.trim()) {
            toast.error('Password wajib diisi!')
            return
        }

        if (mode === 'register' && (!name.trim() || !phone.trim())) {
            toast.error('Nama dan No. HP wajib diisi!')
            return
        }

        let result
        if (mode === 'login') {
            result = await login(email, password)
        } else if (mode === 'register') {
            result = await signup(email, password, { name, phone })
        } else if (mode === 'update-password') {
            result = await updatePassword(password)
        } else if (mode === 'forgot-password') {
            const { error } = await supabase.auth.resetPasswordForEmail(email)
            if (error) {
                result = { success: false, error: error.message }
            } else {
                result = { success: true }
            }
        }

        if (result.success) {
            if (result.data?.session) {
                toast.success(mode === 'update-password' ? 'Password berhasil diperbarui!' : 'Berhasil masuk!')
                // Check user role — admins go to /:slug/admin, customers go to /:slug
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', result.data.session.user.id)
                    .eq('tenant_id', tenantId)
                    .limit(1)
                    .single()
                if (roleData?.role === 'admin') {
                    navigate(`/${slug}/admin`)
                } else {
                    navigate(`/${slug}`)
                }
            } else {
                let successMsg = ''
                if (mode === 'login') successMsg = 'Berhasil masuk!'
                else if (mode === 'register') successMsg = 'Registrasi berhasil! Silakan cek email untuk verifikasi.'
                else if (mode === 'update-password') successMsg = 'Password berhasil diperbarui!'
                else if (mode === 'forgot-password') successMsg = 'Link reset password telah dikirim ke email kamu!'

                toast.success(successMsg)

                if (mode === 'login' || mode === 'update-password') {
                    if (mode === 'update-password') setIsRecovering(false)
                    // Try to detect role even without auto-confirmed session
                    const { data: { session } } = await supabase.auth.getSession()
                    const userId = session?.user?.id
                    if (userId) {
                        const { data: roleData } = await supabase
                            .from('user_roles')
                            .select('role')
                            .eq('user_id', userId)
                            .eq('tenant_id', tenantId)
                            .limit(1)
                            .single()
                        if (roleData?.role === 'admin') navigate(`/${slug}/admin`)
                        else navigate(`/${slug}`)
                    } else {
                        navigate(`/${slug}`)
                    }
                } else if (mode === 'forgot-password') {
                    setMode('login')
                }
            }
        } else {
            toast.error(result.error || 'Terjadi kesalahan')
        }
    }

    const { tenantName, tenantId } = useTenantContext()

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fcfaf8] to-[#fff3e6] px-4 py-10">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6">
                    <button onClick={() => navigate(`/${slug}`)} className="inline-flex size-14 bg-[#ff8c00] rounded-2xl items-center justify-center text-white shadow-xl shadow-[#ff8c00]/25 mb-4 hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-3xl">local_drink</span>
                    </button>
                    <h1 className="text-2xl font-black tracking-tight text-[#181510]">{tenantName || 'Login Toko'}</h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        {mode === 'update-password' ? 'Silakan masukkan password baru kamu' :
                            mode === 'forgot-password' ? 'Masukkan email untuk menerima link reset' :
                                'Nikmati kesegaran jus terbaik!'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-xl shadow-black/5 overflow-hidden">
                    {/* Tabs - Hidden in special modes */}
                    {(mode !== 'update-password' && mode !== 'forgot-password') && (
                        <div className="flex border-b border-[#ff8c00]/10">
                            <button
                                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-[#ff8c00]/5 text-[#ff8c00]' : 'text-neutral-400 hover:text-neutral-600'}`}
                                onClick={() => setMode('login')}
                            >
                                Masuk
                            </button>
                            <button
                                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-[#ff8c00]/5 text-[#ff8c00]' : 'text-neutral-400 hover:text-neutral-600'}`}
                                onClick={() => setMode('register')}
                            >
                                Daftar
                            </button>
                        </div>
                    )}

                    {mode === 'update-password' && (
                        <div className="bg-[#ff8c00]/5 p-4 border-b border-[#ff8c00]/10">
                            <p className="text-xs font-bold text-[#ff8c00] text-center uppercase tracking-wider">Ganti Password</p>
                        </div>
                    )}

                    {mode === 'forgot-password' && (
                        <div className="bg-[#ff8c00]/5 p-4 border-b border-[#ff8c00]/10">
                            <p className="text-xs font-bold text-[#ff8c00] text-center uppercase tracking-wider">Lupa Password</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8 space-y-4">
                        {mode === 'register' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-600">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                        placeholder="Nama kamu"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-600">No. WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                        placeholder="08xxxxxxxx"
                                    />
                                </div>
                            </>
                        )}

                        {mode !== 'update-password' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                    placeholder="nama@email.com"
                                />
                            </div>
                        )}

                        {(mode !== 'forgot-password' && mode !== 'update-password') && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none pr-10"
                                        placeholder="minimal 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#ff8c00]"
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'update-password' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-600">Password Baru</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none pr-10"
                                        placeholder="minimal 6 karakter"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#ff8c00]"
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'login' && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setMode('forgot-password')}
                                    className="text-xs font-bold text-[#ff8c00] hover:underline"
                                >
                                    Lupa Password?
                                </button>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 mt-4 disabled:opacity-60"
                        >
                            {loading ? 'Memproses...' : (
                                mode === 'login' ? 'Masuk Sekarang' :
                                    mode === 'register' ? 'Daftar Sekarang' :
                                        mode === 'forgot-password' ? 'Kirim Link Reset' :
                                            'Simpan Password Baru'
                            )}
                        </button>

                        {mode === 'update-password' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('login')
                                    setIsRecovering(false)
                                }}
                                className="w-full text-neutral-400 text-xs font-bold py-2 hover:text-neutral-600 transition-colors"
                            >
                                Batal
                            </button>
                        )}

                        {mode === 'forgot-password' && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-neutral-400 text-xs font-bold py-2 hover:text-neutral-600 transition-colors"
                            >
                                Batal
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    )
}
