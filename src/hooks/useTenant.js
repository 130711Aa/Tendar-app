import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// In-memory cache: slug → { id, name, whatsapp }
const tenantCache = {}

/**
 * Resolve a slug to a tenant object { id, name, whatsapp, owner_id, plan }.
 */
export async function resolveTenantId(slug) {
    if (!slug) throw new Error('[Tendar] No slug provided to resolveTenantId()')
    if (tenantCache[slug]) return tenantCache[slug]

    // Fetch from tenants table directly since RLS allows select
    const { data, error } = await supabase
        .from('tenants')
        .select('id, name, plan, owner_id, whatsapp')
        .eq('slug', slug)
        .single()

    if (error || !data) {
        throw new Error(`[Tendar] Tenant "${slug}" not found. Error: ${error?.message || 'Unknown'}`)
    }

    // Cache the object
    tenantCache[slug] = data
    return data
}

/**
 * Hook that reads :slug from the current URL and resolves it to a tenant_id.
 * Returns { slug, tenantId, tenantName, tenantWhatsapp, loading, error }
 */
export function useTenant() {
    const { slug } = useParams()
    const cached = slug ? tenantCache[slug] ?? null : null
    const [tenantId, setTenantId] = useState(cached?.id || null)
    const [tenantName, setTenantName] = useState(cached?.name || null)
    const [tenantWhatsapp, setTenantWhatsapp] = useState(cached?.whatsapp || null)
    const [loading, setLoading] = useState(!tenantId)
    const [error, setError] = useState(null)
    const prevSlugRef = useRef(null)

    useEffect(() => {
        if (!slug) return
        if (slug === prevSlugRef.current && tenantId) return

        prevSlugRef.current = slug
        setLoading(true)
        setError(null)

        resolveTenantId(slug)
            .then(data => {
                setTenantId(data.id)
                setTenantName(data.name)
                setTenantWhatsapp(data.whatsapp)
                setLoading(false)
            })
            .catch(err => { setError(err.message); setLoading(false) })
    }, [slug, tenantId])

    return { slug, tenantId, tenantName, tenantWhatsapp, loading, error }
}
