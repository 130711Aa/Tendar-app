import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTenantContext } from '../context/TenantContext'

/**
 * Guards admin-only routes. Uses tenant-scoped admin check (isTenantAdmin)
 * so that an admin of Tenant A cannot access Tenant B's panel.
 */
export default function ProtectedRoute({ children }) {
    const { user, loading: authLoading } = useAuth()
    const { slug, isTenantAdmin, tenantAdminLoading } = useTenantContext()

    // Wait for both auth session and tenant-scoped admin check
    if (authLoading || tenantAdminLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fcfaf8]">
                <div className="flex flex-col items-center gap-3">
                    <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-4xl">progress_activity</span>
                    <p className="text-slate-400 text-sm font-medium">Memverifikasi akses...</p>
                </div>
            </div>
        )
    }

    // Must be logged in AND be an admin of THIS specific tenant
    if (!user || !isTenantAdmin) {
        return <Navigate to={`/${slug}/auth`} replace />
    }

    return children
}
