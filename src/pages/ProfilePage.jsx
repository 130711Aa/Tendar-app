import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantContext } from '../context/TenantContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import VerificationCriteriaModal from '../components/VerificationCriteriaModal'

export default function ProfilePage() {
    const { user, isAuthenticated, logout } = useAuth()
    const { slug } = useTenantContext()
    const [resetLoading, setResetLoading] = useState(false)
    const [isCriteriaOpen, setIsCriteriaOpen] = useState(false)

    if (!isAuthenticated) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    const handleResetPassword = async () => {
        if (!user?.email) return

        setResetLoading(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/auth`
            })
            if (error) throw error
            toast.success('Link reset password telah dikirim ke email Anda!', { duration: 5000 })
        } catch (err) {
            console.error(err)
            toast.error('Gagal mengirim link reset: ' + err.message)
        } finally {
            setResetLoading(false)
        }
    }

    const metadata = user?.user_metadata || {}

    return (
        <div className="min-h-screen bg-[#faf8f5] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#ff8c00]/10 px-4 py-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <Link to={`/${slug}`} className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold">Profil Saya</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-8 space-y-6">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center">
                    <div className="size-20 bg-gradient-to-br from-[#ff8c00] to-[#e67e00] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#ff8c00]/20 mb-4">
                        <span className="material-symbols-outlined text-4xl">person</span>
                    </div>
                    <h2 className="text-xl font-bold text-neutral-800">
                        {metadata.name || 'Pengguna'}
                    </h2>
                    <p className="text-sm text-neutral-500">{user.email}</p>
                    
                    <button 
                        onClick={() => setIsCriteriaOpen(true)}
                        className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Cek Kriteria Website
                    </button>
                </div>

                {/* Info Cards */}
                <div className="bg-white rounded-2xl border border-[#ff8c00]/10 shadow-sm divide-y divide-neutral-100">
                    <div className="p-4 flex items-center gap-4">
                        <div className="size-10 bg-[#ff8c00]/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ff8c00]">email</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-400 font-medium">Email</p>
                            <p className="text-sm font-semibold text-neutral-800 truncate">{user.email}</p>
                        </div>
                    </div>

                    {metadata.name && (
                        <div className="p-4 flex items-center gap-4">
                            <div className="size-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-500">badge</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-neutral-400 font-medium">Nama</p>
                                <p className="text-sm font-semibold text-neutral-800">{metadata.name}</p>
                            </div>
                        </div>
                    )}

                    {metadata.phone && (
                        <div className="p-4 flex items-center gap-4">
                            <div className="size-10 bg-green-50 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-500">phone</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-neutral-400 font-medium flex items-center gap-1">
                                    Telepon 
                                    <span className="material-symbols-outlined text-[12px] text-orange-400 cursor-help" title="Syarat wajib untuk verifikasi Payment Gateway">info</span>
                                </p>
                                <p className="text-sm font-semibold text-neutral-800">{metadata.phone}</p>
                            </div>
                        </div>
                    )}

                    <div className="p-4 flex items-center gap-4">
                        <div className="size-10 bg-purple-50 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-purple-500">calendar_today</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-neutral-400 font-medium">Bergabung Sejak</p>
                            <p className="text-sm font-semibold text-neutral-800">
                                {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={handleResetPassword}
                        disabled={resetLoading}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-[#ff8c00]/20 text-[#ff8c00] font-bold py-3 rounded-xl hover:bg-[#ff8c00]/5 transition-colors disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-xl">lock_reset</span>
                        {resetLoading ? 'Mengirim...' : 'Reset Password'}
                    </button>

                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-100 text-red-500 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Keluar
                    </button>
                </div>
            </div>

            <VerificationCriteriaModal 
                isOpen={isCriteriaOpen} 
                onClose={() => setIsCriteriaOpen(false)} 
            />
        </div>
    )
}
