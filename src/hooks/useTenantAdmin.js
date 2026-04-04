import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook that checks if the currently logged-in user is an admin
 * of a SPECIFIC tenant. This is the tenant-scoped version of isAdmin.
 *
 * @param {string|null} tenantId - The tenant to check admin access for
 * @returns {{ isTenantAdmin: boolean, tenantAdminLoading: boolean }}
 */
export function useTenantAdmin(tenantId) {
    const { user } = useAuth()
    const [isTenantAdmin, setIsTenantAdmin] = useState(false)
    const [isTenantStaff, setIsTenantStaff] = useState(false)
    // Start loading only if we already have both user and tenantId — otherwise
    // the effect will immediately set loading=false anyway, causing a flicker.
    const [tenantAdminLoading, setTenantAdminLoading] = useState(() => !!(user && tenantId))
    const prevKeyRef = useRef(null)

    useEffect(() => {
        const key = `${user?.id ?? 'anon'}_${tenantId ?? 'none'}`

        // Skip if nothing changed
        if (key === prevKeyRef.current) return
        prevKeyRef.current = key

        if (!user || !tenantId) {
            setIsTenantAdmin(false)
            setIsTenantStaff(false)
            setTenantAdminLoading(false)
            return
        }

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
