import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantContext } from './TenantContext'

const CategoriesContext = createContext()

const DEFAULT_CATEGORIES = ['Jus Segar', 'Smoothies', 'Mocktails']

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
                if (import.meta.env.DEV) console.log('Seeding default categories...')
                const { error: insertError } = await supabase
                    .from('categories')
                    .insert(DEFAULT_CATEGORIES.map(name => ({ name, tenant_id: tenantId })))
                setCategories(DEFAULT_CATEGORIES)
                if (insertError) console.error('Error seeding defaults:', insertError)
            }
        } catch (err) {
            console.error('Error fetching categories:', err)
            const stored = localStorage.getItem('kareeem_categories')
            setCategories(stored ? JSON.parse(stored) : DEFAULT_CATEGORIES)
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

        setCategories(prev => [...prev, trimmed])

        try {
            const { error } = await supabase
                .from('categories')
                .insert([{ name: trimmed, tenant_id: tenantId }])
            if (error) throw error
            return { success: true }
        } catch (err) {
            console.error('Error adding category:', err)
            fetchCategories()
            return { success: false, error: 'Gagal menyimpan kategori ke server' }
        }
    }, [categories, fetchCategories])

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
