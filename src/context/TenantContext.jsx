import { createContext, useContext, useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { resolveTenantId } from '../hooks/useTenant'
import { useTenantAdmin } from '../hooks/useTenantAdmin'
import { PLAN_LIMITS } from '../lib/planLimits'

const TenantContext = createContext(null)

/**
 * Reads :slug from URL, resolves to tenant_id, and provides it to all child contexts.
 * Also exposes isTenantAdmin – the ONLY correct way to check admin status in multi-tenant.
 */
export function TenantProvider({ children }) {
    const { slug } = useParams()
    const [tenantId, setTenantId] = useState(null)
    const [tenantName, setTenantName] = useState(null)
    const [tenantWhatsapp, setTenantWhatsapp] = useState(null)
    const [tenantPlan, setTenantPlan] = useState('free')
    const [tenantOwnerId, setTenantOwnerId] = useState(null)
    const [tenantLoading, setTenantLoading] = useState(true)
    const [tenantError, setTenantError] = useState(null)

    useEffect(() => {
        if (!slug) return
        setTenantLoading(true)
        setTenantError(null)
        resolveTenantId(slug)
            .then(data => {
                setTenantId(data.id)
                setTenantName(data.name)
                setTenantWhatsapp(data.whatsapp)
                setTenantPlan(data.plan)
                setTenantOwnerId(data.owner_id)
                setTenantLoading(false)
            })
            .catch(err => { setTenantError(err.message); setTenantLoading(false) })
    }, [slug])

    // Tenant-scoped admin check — safe for multi-tenant
    const { isTenantAdmin, isTenantStaff, tenantAdminLoading } = useTenantAdmin(tenantId)

    const planLimits = PLAN_LIMITS[tenantPlan] || PLAN_LIMITS.free

    return (
        <TenantContext.Provider value={{
            tenantId, tenantName, tenantWhatsapp, tenantPlan, tenantOwnerId, planLimits, slug,
            tenantLoading, tenantError,
            isTenantAdmin, isTenantStaff, tenantAdminLoading,
        }}>
            {children}
        </TenantContext.Provider>
    )
}

export function useTenantContext() {
    const ctx = useContext(TenantContext)
    if (!ctx) throw new Error('useTenantContext must be used within TenantProvider')
    return ctx
}
