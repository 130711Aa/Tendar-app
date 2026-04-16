import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { useTenantContext } from '../context/TenantContext'
import { BrandIcon } from '../components/BrandLogo'

export default function AuthPage() {
    const [mode, setMode] = useState('login') // 'login', 'register', 'update-password', or 'forgot-password'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const { login, signup, loading, updatePassword, isRecovering, setIsRecovering, loginWithGoogle } = useAuth()
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

    const { tenantName, tenantId } = useTenantContext()

    // Helper: check if user has a role in the CURRENT tenant (by slug).
    // Uses a 2-step approach (resolve slug → check role) to avoid PostgREST
    // foreign-table join issues that could return roles from the wrong tenant.
    const checkUserRoleBySlug = async (userId) => {
        try {
            // Step 1: Resolve slug to tenant_id
            const resolvedTenantId = tenantId || (await (async () => {
                const { data } = await supabase
                    .from('tenants')
                    .select('id')
                    .eq('slug', slug)
                    .maybeSingle()
                return data?.id
            })())

            if (!resolvedTenantId) return 'customer'

            // Step 2: Check role for THIS specific tenant only
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', userId)
                .eq('tenant_id', resolvedTenantId)
                .maybeSingle()

            if (error) {
                console.error('Role check error:', error)
                return 'customer'
            }
            return data?.role || 'customer'
        } catch (err) {
            console.error('Role check exception:', err)
            return 'customer'
        }
    }

    const handleGoogleLogin = async () => {
        // Save slug to sessionStorage as fallback (in case query params get stripped)
        sessionStorage.setItem('tendar_login_slug', slug)
        const redirectTo = `${window.location.origin}/auth/callback?slug=${slug}`
        const result = await loginWithGoogle(redirectTo)
        if (!result.success) {
            toast.error(result.error || 'Gagal login dengan Google')
        }
        // On success, browser will redirect automatically to Google OAuth
    }

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
                const userId = result.data.session.user.id
                const role = await checkUserRoleBySlug(userId)
                if (role === 'admin') navigate(`/${slug}/admin`)
                else if (role === 'staff') navigate(`/${slug}/pos`)
                else navigate(`/${slug}`)
            } else {
                let successMsg = ''
                if (mode === 'login') successMsg = 'Berhasil masuk!'
                else if (mode === 'register') successMsg = 'Registrasi berhasil! Silakan cek email untuk verifikasi.'
                else if (mode === 'update-password') successMsg = 'Password berhasil diperbarui!'
                else if (mode === 'forgot-password') successMsg = 'Link reset password telah dikirim ke email kamu!'

                toast.success(successMsg)

                if (mode === 'login' || mode === 'update-password') {
                    if (mode === 'update-password') setIsRecovering(false)
                    const { data: { session } } = await supabase.auth.getSession()
                    const userId = session?.user?.id
                    if (userId) {
                        const role = await checkUserRoleBySlug(userId)
                        if (role === 'admin') navigate(`/${slug}/admin`)
                        else if (role === 'staff') navigate(`/${slug}/pos`)
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
            // Reset input so user can try again easily
            setPassword('')
            if (mode === 'login') setEmail('')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fcfaf8] to-[#fff3e6] px-4 py-10">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-6">
                    <button onClick={() => navigate(`/${slug}`)} className="inline-flex size-14 rounded-2xl items-center justify-center text-white shadow-xl shadow-[#ff8c00]/25 mb-4 hover:scale-105 transition-transform">
                        <BrandIcon className="w-8 h-8" />
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

                        {/* Google OAuth — hanya tampil di mode login & register */}
                        {(mode === 'login' || mode === 'register') && (
                            <>
                                <div className="flex items-center gap-3 my-1">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs text-slate-400 font-medium">atau</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 bg-white text-slate-700 py-3 rounded-xl font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-60"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                                        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                                        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                                        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                                    </svg>
                                    Lanjutkan dengan Google
                                </button>
                            </>
                        )}

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
