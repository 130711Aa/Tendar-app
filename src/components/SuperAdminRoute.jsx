import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SuperAdminAuthWall, { isSuperAdminVerified } from './SuperAdminAuthWall'

/**
 * Route guard for Super Admin pages.
 * Two layers of security:
 *   1. isSuperAdmin — checks Supabase role (persists via localStorage)
 *   2. sessionStorage flag — requires password re-entry every new browser session
 *      (sessionStorage is cleared when tab/browser is closed)
 */
export default function SuperAdminRoute({ children }) {
    const { user, loading, isSuperAdmin, adminChecked } = useAuth()
    const [sessionVerified, setSessionVerified] = useState(isSuperAdminVerified)

    // Still loading auth
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

    // Not a superadmin at all → back to landing
    if (!user || !isSuperAdmin) {
        return <Navigate to="/" replace />
    }

    // Is superadmin but hasn't re-authenticated this browser session
    if (!sessionVerified) {
        return <SuperAdminAuthWall onVerified={() => setSessionVerified(true)} />
    }

    return children
}
