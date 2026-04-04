import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BrandLogo } from '../components/BrandLogo'

function SlugPreview({ slug }) {
    return (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
            <span className="material-symbols-outlined text-xs">link</span>
            tendar-app.netlify.app/<strong className="text-orange-500">{slug || 'nama-tokomu'}</strong>
        </div>
    )
}

function toSlug(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

export default function RegisterTenantPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [step, setStep] = useState(1) // 1: account info, 2: store info, 3: email sent
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isGoogleFlow, setIsGoogleFlow] = useState(false)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [storeName, setStoreName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

    // If returned from Google OAuth, jump to step 2 (store setup)
    useEffect(() => {
        if (searchParams.get('google') === '1') {
            const pending = sessionStorage.getItem('tendar_pending_store')
            if (pending) {
                const { storeName: sn, slug: sl } = JSON.parse(pending)
                if (sn) setStoreName(sn)
                if (sl) setSlug(sl)
            }
            setIsGoogleFlow(true)
            setStep(2)
        }
    }, [searchParams])

    const handleStoreNameChange = (val) => {
        setStoreName(val)
        if (!slugManuallyEdited) {
            setSlug(toSlug(val))
        }
    }

    const handleSlugChange = (val) => {
        setSlugManuallyEdited(true)
        setSlug(toSlug(val))
    }

    const handleNext = (e) => {
        e.preventDefault()
        if (!email || !password) { setError('Email dan password wajib diisi.'); return }
        if (password.length < 8) { setError('Password minimal 8 karakter.'); return }
        setError('')
        setStep(2)
    }

    const handleGoogleRegister = async () => {
        // Save pending store data so AuthCallbackPage can pick it up
        sessionStorage.setItem('tendar_pending_store', JSON.stringify({ storeName, slug }))
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) setError('Gagal login dengan Google: ' + error.message)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!storeName || !slug) { setError('Nama toko dan slug wajib diisi.'); return }
        if (slug.length < 3) { setError('Slug minimal 3 karakter.'); return }

        setLoading(true)
        setError('')

        try {
            let session = null

            if (isGoogleFlow) {
                // User already authenticated via Google — just create the tenant
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                if (!currentSession) throw new Error('Sesi Google tidak ditemukan. Silakan coba lagi.')
                session = currentSession

                const { error: tenantError } = await supabase
                    .rpc('register_new_tenant', { p_name: storeName, p_slug: slug })
                if (tenantError && !tenantError.message.includes('sudah digunakan')) throw tenantError

                // Clean up sessionStorage
                sessionStorage.removeItem('tendar_pending_store')

                await new Promise(resolve => setTimeout(resolve, 1500))
                navigate(`/${slug}/admin`)
                return
            }
            let isNewRegistration = false
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
                email, 
                password,
                options: {
                    data: {
                        tenant_name: storeName,
                        tenant_slug: slug
                    }
                }
            })

            if (signUpError) {
                if (signUpError.message.toLowerCase().includes('already registered') ||
                    signUpError.message.toLowerCase().includes('already been registered')) {
                    // User already exists in auth — try signing them in
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
                    if (signInError) throw new Error('Email sudah terdaftar. Gunakan email lain atau login dulu.')
                    session = signInData.session
                } else {
                    throw signUpError
                }
            } else {
                session = signUpData.session
                isNewRegistration = true
            }

            // Step 2: If no session (email confirmation required), show step 3
            if (isNewRegistration && !session) {
                setStep(3)
                setLoading(false)
                return
            }

            // Step 3: If user already existed, create the tenant manually
            if (!isNewRegistration) {
                const { error: tenantError } = await supabase
                    .rpc('register_new_tenant', { p_name: storeName, p_slug: slug })
                if (tenantError && !tenantError.message.includes('sudah digunakan')) throw tenantError
            }

            // Step 4: Wait briefly for DB trigger to finish creating tenant, then navigate
            await new Promise(resolve => setTimeout(resolve, 1500))
            // If we still have a session, go directly to admin panel
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            if (currentSession) {
                navigate(`/${slug}/admin`)
            } else {
                navigate(`/${slug}/auth`)
            }
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan. Coba lagi.')
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4 font-[Manrope,sans-serif]">
            <div className="w-full max-w-md">
                {/* Branding */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <a href="/" className="inline-block mb-1">
                        <BrandLogo className="flex flex-col items-center gap-1" iconSize="w-12 h-12" textSize="text-3xl" />
                    </a>
                    <p className="mt-2 text-slate-500 text-sm">Buat toko digital kamu dalam 2 menit</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">

                    {/* === STEP 3: email confirmation === */}
                    {step === 3 && (
                        <div className="text-center py-6">
                            <span className="material-symbols-outlined text-5xl text-green-500">mark_email_read</span>
                            <h2 className="mt-4 text-xl font-bold text-slate-700">Cek Email Kamu!</h2>
                            <p className="mt-2 text-slate-500 text-sm">
                                Kami mengirim link konfirmasi ke <strong>{email}</strong>.
                                Setelah konfirmasi, login dan tokomu akan aktif di:
                            </p>
                            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                                <p className="font-bold text-orange-600">tendar-app.netlify.app/{slug}</p>
                            </div>
                            <button
                                onClick={() => navigate(`/${slug}/auth`)}
                                className="mt-6 w-full bg-[#ff8c00] text-white py-3 rounded-xl font-semibold hover:bg-[#e07800]"
                            >
                                Login ke Dashboard
                            </button>
                        </div>
                    )}

                    {/* === STEP 1: Account Info === */}
                    {step === 1 && (
                        <form onSubmit={handleNext} className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-700">Buat Akun</h2>
                                <p className="text-sm text-slate-400 mt-1">Langkah 1 dari 2</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Email</label>
                                <input
                                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="kamu@email.com"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Password</label>
                                <input
                                    type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 8 karakter"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button type="submit"
                                className="w-full bg-[#ff8c00] text-white py-3 rounded-xl font-semibold hover:bg-[#e07800] transition-all">
                                Lanjut →
                            </button>

                            {/* Google OAuth option */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-xs text-slate-400 font-medium">atau</span>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>
                            <button
                                type="button"
                                onClick={handleGoogleRegister}
                                className="w-full flex items-center justify-center gap-3 border-2 border-slate-200 bg-white text-slate-700 py-3 rounded-xl font-semibold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                                    <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
                                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                                </svg>
                                Daftar dengan Google
                            </button>
                        </form>
                    )}

                    {/* === STEP 2: Store Info === */}
                    {step === 2 && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-700">Detail Toko</h2>
                                <p className="text-sm text-slate-400 mt-1">Langkah 2 dari 2</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">Nama Toko</label>
                                <input
                                    type="text" required value={storeName}
                                    onChange={e => handleStoreNameChange(e.target.value)}
                                    placeholder="mis. Boba Mantap, Kopi Nusantara"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-1">
                                    Alamat Toko (slug)
                                </label>
                                <input
                                    type="text" required value={slug}
                                    onChange={e => handleSlugChange(e.target.value)}
                                    placeholder="boba-mantap"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                                />
                                <SlugPreview slug={slug} />
                                <p className="mt-1 text-xs text-slate-400">Hanya huruf kecil, angka, dan tanda hubung. Tidak bisa diubah nanti.</p>
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <button type="submit" disabled={loading}
                                className="w-full bg-[#ff8c00] text-white py-3 rounded-xl font-semibold hover:bg-[#e07800] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading && <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>}
                                {loading ? 'Membuat toko...' : 'Buka Toko Sekarang 🎉'}
                            </button>
                            <button type="button" onClick={() => setStep(1)}
                                className="w-full text-slate-400 text-sm hover:text-slate-600">
                                ← Kembali
                            </button>
                        </form>
                    )}
                </div>

                <div className="text-center mt-5 text-slate-400 text-xs space-y-1">
                    <p>Sudah punya toko? Login di: <strong>tendar-app.netlify.app/<span className="text-orange-500">slug-tokomu</span>/auth</strong></p>
                    <p>Contoh: <a href="/kareem-juice/auth" className="text-orange-500 hover:underline">kareem-juice/auth</a></p>
                </div>
            </div>
        </div>
    )
}
