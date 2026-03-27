import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
    const [step, setStep] = useState(1) // 1: account info, 2: store info
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [storeName, setStoreName] = useState('')
    const [slug, setSlug] = useState('')
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!storeName || !slug) { setError('Nama toko dan slug wajib diisi.'); return }
        if (slug.length < 3) { setError('Slug minimal 3 karakter.'); return }

        setLoading(true)
        setError('')

        try {
            // Step 1: Sign up and pass tenant data in metadata for the Database Trigger
            let session = null
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
                <div className="text-center mb-8">
                    <a href="/" className="text-2xl font-extrabold text-[#ff8c00] tracking-tight">Tendar</a>
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
