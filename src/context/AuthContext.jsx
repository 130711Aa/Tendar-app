import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const [adminChecked, setAdminChecked] = useState(false)
    const [isRecovering, setIsRecovering] = useState(false)

    useEffect(() => {
        // Check active session
        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession()
                if (error) throw error

                const session = data?.session ?? null
                setSession(session)
                setUser(session?.user ?? null)
                await checkAdmin(session?.user)
                await checkSuperAdmin(session?.user)
            } catch (err) {
                console.error('Auth initialization error:', err)
                // Start with no user if error
                setSession(null)
                setUser(null)
            } finally {
                setAdminChecked(true)
                setLoading(false)
            }
        }
        initSession()

        // Listen for changes (callback must NOT be async — Supabase SDK doesn't support it)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (import.meta.env.DEV) console.log("Global Auth Event:", event)

            if (event === 'PASSWORD_RECOVERY') {
                setIsRecovering(true)
            }

            setSession(session)
            setUser(session?.user ?? null)
            // Don't call checkAdmin here — it's handled by login() and initSession()
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const checkAdmin = async (user) => {
        if (!user) {
            setIsAdmin(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'admin')
                .maybeSingle()

            if (error) throw error
            setIsAdmin(!!data)
        } catch (err) {
            console.error('Error checking admin role:', err)
            // Fallback: deny admin access on error
            setIsAdmin(false)
        }
    }

    const checkSuperAdmin = async (user) => {
        if (!user) {
            setIsSuperAdmin(false)
            return
        }
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', user.id)
                .eq('role', 'superadmin')
                .limit(1)
                .maybeSingle()

            if (error) {
                console.error("Supabase error checking superadmin:", error)
            }
            // Even if there's an error, data might be null, so !!data evaluates to false. 
            // In case of error but we think they should be superadmin, we still need to be secure.
            setIsSuperAdmin(!!data)
        } catch (err) {
            console.error('Error checking superadmin role:', err)
            setIsSuperAdmin(false)
        }
    }

    const login = async (email, password) => {
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            setLoading(false)
            return { success: false, error: error.message }
        }
        // Wait for admin check to complete before setting loading to false
        // This prevents ProtectedRoute from redirecting before isAdmin is set
        await checkAdmin(data.user)
        await checkSuperAdmin(data.user)
        setAdminChecked(true)
        setLoading(false)
        return { success: true, data }
    }

    const signup = async (email, password, metaData) => {
        setLoading(true)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metaData // { name: '...', phone: '...' }
            }
        })
        setLoading(false)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
    }

    const logout = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signOut()
        if (error) console.error('Error signing out:', error)
        setUser(null)
        setSession(null)
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setLoading(false)
    }

    const updatePassword = async (newPassword) => {
        setLoading(true)
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        })
        setLoading(false)
        if (error) return { success: false, error: error.message }
        return { success: true, data }
    }

    const loginWithGoogle = async (redirectTo) => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
            },
        })
        if (error) return { success: false, error: error.message }
        return { success: true }
    }

    const value = {
        user,
        session,
        loading,
        isAdmin,
        isSuperAdmin,
        adminChecked,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        loginWithGoogle,
        updatePassword,
        isRecovering,
        setIsRecovering
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
