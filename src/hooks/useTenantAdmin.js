import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook that checks if the currently logged-in user is an admin
 * of a SPECIFIC tenant. This is the tenant-scoped version of isAdmin.
 *
 * @param {string|null} tenantId - The tenant to check admin access for
 * @returns {{ isTenantAdmin: boolean, isTenantStaff: boolean, tenantAdminLoading: boolean }}
 */
export function useTenantAdmin(tenantId) {
    const { user } = useAuth()
    const [isTenantAdmin, setIsTenantAdmin] = useState(false)
    const [isTenantStaff, setIsTenantStaff] = useState(false)

    // IMPORTANT: Start as loading=true when user is authenticated.
    // This prevents a one-frame window where tenantLoading just became false
    // but tenantAdminLoading hasn't been set to true yet (React renders before
    // effects run), causing ProtectedRoute to see isTenantAdmin=false and
    // redirect to /auth — especially visible after Google OAuth full-page redirect.
    const [tenantAdminLoading, setTenantAdminLoading] = useState(() => !!user)
    const prevKeyRef = useRef(null)

    useEffect(() => {
        const key = `${user?.id ?? 'anon'}_${tenantId ?? 'none'}`

        // Skip if nothing changed
        if (key === prevKeyRef.current) return
        prevKeyRef.current = key

        if (!user) {
            // Not authenticated — definitively not admin
            setIsTenantAdmin(false)
            setIsTenantStaff(false)
            setTenantAdminLoading(false)
            return
        }

        if (!tenantId) {
            // User is authenticated but tenantId is not yet resolved.
            // Keep loading=true so ProtectedRoute doesn't prematurely deny access.
            setTenantAdminLoading(true)
            return
        }

        // Both user and tenantId are available — query the role
        setTenantAdminLoading(true)

        supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId)
            .in('role', ['admin', 'staff'])
            .maybeSingle()
            .then(({ data, error }) => {
                if (error || !data) {
                    console.error('[useTenantAdmin] Error checking role:', error)
                    setIsTenantAdmin(false)
                    setIsTenantStaff(false)
                } else {
                    setIsTenantAdmin(data.role === 'admin')
                    setIsTenantStaff(data.role === 'staff')
                }
                setTenantAdminLoading(false)
            })
    }, [user, tenantId])

    return { isTenantAdmin, isTenantStaff, tenantAdminLoading }
}
