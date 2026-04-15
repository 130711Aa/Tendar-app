import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Route guard for Super Admin pages.
 * Redirects to landing page if user is not a superadmin.
 */
export default function SuperAdminRoute({ children }) {
    const { user, loading, isSuperAdmin, adminChecked } = useAuth()

    if (loading || !adminChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f0f23]">
                <div className="flex flex-col items-center gap-3">
                    <span className="animate-spin material-symbols-outlined text-indigo-400 text-4xl">progress_activity</span>
                    <p className="text-slate-400 text-sm font-medium">Memverifikasi akses...</p>
                </div>
            </div>
        )
    }

    if (!user || !isSuperAdmin) {
        return <Navigate to="/" replace />
    }

    return children
}
