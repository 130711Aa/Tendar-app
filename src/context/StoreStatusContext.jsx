import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantContext } from './TenantContext'

const StoreStatusContext = createContext()

export function StoreStatusProvider({ children }) {
    const { tenantId } = useTenantContext()
    const [isStoreOpen, setIsStoreOpen] = useState(true)
    const [loading, setLoading] = useState(true)

    // Fetch initial store status
    useEffect(() => {
        if (!tenantId) return
        const fetchStatus = async () => {
            try {
                const { data, error } = await supabase
                    .from('store_settings')
                    .select('is_open')
                    .eq('tenant_id', tenantId)
                    .single()

                if (error) throw error
                if (data) setIsStoreOpen(data.is_open)
            } catch (err) {
                console.warn('Could not fetch store status:', err)
                setIsStoreOpen(true)
            } finally {
                setLoading(false)
            }
        }

        fetchStatus()

        // Subscribe to realtime changes — channel name is unique per tenant
        const channel = supabase
            .channel(`store_${tenantId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'store_settings', filter: `tenant_id=eq.${tenantId}` },
                (payload) => {
                    if (payload.new && typeof payload.new.is_open === 'boolean') {
                        setIsStoreOpen(payload.new.is_open)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tenantId])

    const toggleStore = useCallback(async () => {
        const newStatus = !isStoreOpen
        setIsStoreOpen(newStatus)
        try {
            const { error } = await supabase
                .from('store_settings')
                .update({ is_open: newStatus, updated_at: new Date().toISOString() })
                .eq('tenant_id', tenantId)

            if (error) throw error
        } catch (err) {
            console.error('Failed to toggle store status:', err)
            setIsStoreOpen(!newStatus)
        }
    }, [isStoreOpen])

    return (
        <StoreStatusContext.Provider value={{ isStoreOpen, toggleStore, loading }}>
            {children}
        </StoreStatusContext.Provider>
    )
}

export function useStoreStatus() {
    const ctx = useContext(StoreStatusContext)
    if (!ctx) throw new Error('useStoreStatus must be used within StoreStatusProvider')
    return ctx
}
