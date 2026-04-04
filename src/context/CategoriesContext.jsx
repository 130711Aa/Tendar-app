import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantContext } from './TenantContext'

const CategoriesContext = createContext()

export function CategoriesProvider({ children }) {
    const { tenantId } = useTenantContext()
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchCategories = useCallback(async () => {
        if (!tenantId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('name')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: true })
            if (error) throw error
            if (data && data.length > 0) {
                setCategories(data.map(c => c.name))
            } else {
                setCategories([]) // Tidak ada lagi default seeding, toko baru mulai dari nol
            }
        } catch (err) {
            console.error('Error fetching categories:', err)
            const stored = localStorage.getItem('kareeem_categories')
            setCategories(stored ? JSON.parse(stored) : [])
        } finally {
            setLoading(false)
        }
    }, [tenantId])

    useEffect(() => {
        if (tenantId) fetchCategories()
    }, [fetchCategories, tenantId])

    const addCategory = useCallback(async (name) => {
        const trimmed = name.trim()
        if (!trimmed) return { success: false, error: 'Nama tidak boleh kosong' }

        if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            return { success: false, error: 'Kategori sudah ada' }
        }

        try {
            const { error } = await supabase
                .from('categories')
                .insert([{ name: trimmed, tenant_id: tenantId }])
            if (error) throw error
            
            setCategories(prev => [...prev, trimmed])
            return { success: true }
        } catch (err) {
            console.error('Error adding category:', err)
            fetchCategories()
            return { success: false, error: 'Gagal menyimpan kategori ke server' }
        }
    }, [categories, fetchCategories, tenantId])

    const deleteCategory = useCallback(async (name) => {
        setCategories(prev => prev.filter(c => c !== name))

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('name', name)
                .eq('tenant_id', tenantId)

            if (error) throw error
        } catch (err) {
            console.error('Error deleting category:', err)
            fetchCategories()
        }
    }, [fetchCategories])

    // Categories with "Semua" prepended for filter UI
    const filterCategories = ['Semua', ...categories]

    return (
        <CategoriesContext.Provider value={{ categories, filterCategories, addCategory, deleteCategory, loading }}>
            {children}
        </CategoriesContext.Provider>
    )
}

export function useCategories() {
    const ctx = useContext(CategoriesContext)
    if (!ctx) throw new Error('useCategories must be used within CategoriesProvider')
    return ctx
}
