import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SESSION_KEY = 'sa_verified'

/**
 * Checks if superadmin has re-authenticated in this browser session.
 * sessionStorage is cleared when the tab/browser is closed.
 */
export function isSuperAdminVerified() {
    return sessionStorage.getItem(SESSION_KEY) === '1'
}

export function clearSuperAdminVerification() {
    sessionStorage.removeItem(SESSION_KEY)
}

/**
 * Full-screen re-authentication wall.
 * Shown whenever the superadmin opens a new browser session.
 * On success, sets sessionStorage flag so it won't re-prompt until tab is closed.
 */
export default function SuperAdminAuthWall({ onVerified }) {
    const { user } = useAuth()
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPw, setShowPw] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!password) return
        setLoading(true)
        setError('')

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password,
            })

            if (signInError) {
                setError('Password salah. Coba lagi.')
                setLoading(false)
                return
            }

            // Mark as verified for this browser session only
            sessionStorage.setItem(SESSION_KEY, '1')
            onVerified()
        } catch (err) {
            setError('Terjadi kesalahan. Coba lagi.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f0f23] px-4">
            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative w-full max-w-sm">
                {/* Card */}
                <div className="bg-[#1a1a3e] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-8 pt-8 pb-6 text-center">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                            <span className="material-symbols-outlined text-white text-4xl">
                                shield_lock
                            </span>
                        </div>
                        <h1 className="text-xl font-black text-white">Verifikasi Identitas</h1>
                        <p className="text-indigo-200 text-sm mt-1">Sesi baru terdeteksi. Masukkan password untuk melanjutkan.</p>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-6">
                        <div className="mb-5 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-[18px]">person</span>
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-slate-400">Masuk sebagai</p>
                                <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                                    Password Super Admin
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                                        placeholder="Masukkan password..."
                                        required
                                        autoFocus
                                        className="w-full bg-[#0f0f23] border border-indigo-500/30 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all pr-11"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPw ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                {error && (
                                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">error</span>
                                        {error}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !password}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {loading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                        Memverifikasi...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">lock_open</span>
                                        Masuk ke Panel
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="text-center text-xs text-slate-500 mt-4">
                            <span className="material-symbols-outlined text-[12px] align-middle mr-1">info</span>
                            Verifikasi dibutuhkan setiap sesi browser baru untuk keamanan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
