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
    const [tenantAdminLoading, setTenantAdminLoading] = useState(true)
    const prevKeyRef = useRef(null)

    useEffect(() => {
        const key = `${user?.id ?? 'anon'}_${tenantId ?? 'none'}`

        // Skip if nothing changed
        if (key === prevKeyRef.current) return
        prevKeyRef.current = key

        if (!user || !tenantId) {
            setIsTenantAdmin(false)
            setTenantAdminLoading(false)
            return
        }

        setTenantAdminLoading(true)

        supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('tenant_id', tenantId)
            .eq('role', 'admin')
            .maybeSingle()
            .then(({ data, error }) => {
                if (error) {
                    console.error('[useTenantAdmin] Error checking role:', error)
                    setIsTenantAdmin(false)
                } else {
                    setIsTenantAdmin(!!data)
                }
                setTenantAdminLoading(false)
            })
    }, [user, tenantId])

    return { isTenantAdmin, tenantAdminLoading }
}
