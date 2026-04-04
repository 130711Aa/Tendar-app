import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantContext } from '../context/TenantContext'

/**
 * Guards admin-only routes. Uses tenant-scoped admin check (isTenantAdmin)
 * so that an admin of Tenant A cannot access Tenant B's panel.
 */
export default function ProtectedRoute({ children, allowedRoles = ['admin'] }) {
    const { user, loading: authLoading } = useAuth()
    const { slug, isTenantAdmin, isTenantStaff, tenantAdminLoading, tenantLoading } = useTenantContext()

    // Wait for BOTH auth session AND tenant fetch AND tenant role check to complete
    // before making any redirect decision.
    // Critical: tenantLoading must be included — after Google OAuth redirect (full page
    // reload), TenantContext fetches tenantId async. Without this guard, tenantAdminLoading
    // resolves to false immediately (tenantId=null) causing a premature redirect to /auth.
    if (authLoading || tenantLoading || tenantAdminLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
                <div className="flex flex-col items-center gap-3">
                    <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-4xl">progress_activity</span>
                    <p className="text-slate-400 text-sm font-medium">Memverifikasi akses...</p>
                </div>
            </div>
        )
    }

    // Only evaluate access AFTER loading is fully done
    if (!user) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    const hasAccess = 
        (allowedRoles.includes('admin') && isTenantAdmin) || 
        (allowedRoles.includes('staff') && isTenantStaff)

    if (!hasAccess) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    return children
}
