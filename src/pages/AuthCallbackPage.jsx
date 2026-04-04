import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Handles both:
 * 1. Supabase email confirmation redirects
 * 2. Google OAuth redirects
 *
 * Uses onAuthStateChange for reliable session detection (PKCE flow safe).
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('Menghubungkan akun...')

    useEffect(() => {
        let handled = false

        const handleUser = async (user) => {
            if (handled) return
            handled = true

            setStatus('Akun terhubung! Mencari toko Anda...')

            // Check for slug from URL (came from tenant auth page e.g. /tendar/auth)
            const urlParams = new URLSearchParams(window.location.search)
            const slugFromUrl = urlParams.get('slug')

            // Check for Google OAuth new-user pending store data
            const pendingStore = sessionStorage.getItem('tendar_pending_store')

            try {
                // Check if user is admin of any tenant
                const { data: adminRole } = await supabase
                    .from('user_roles')
                    .select('role, tenants(slug)')
                    .eq('user_id', user.id)
                    .eq('role', 'admin')
                    .limit(1)
                    .maybeSingle()

                if (adminRole?.tenants?.slug) {
                    const slug = adminRole.tenants.slug
                    setStatus(`Selamat datang! Mengarahkan ke dashboard...`)
                    navigate(`/${slug}/admin`, { replace: true })
                    return
                }

                // Check if user is staff of any tenant
                const { data: staffRole } = await supabase
                    .from('user_roles')
                    .select('role, tenants(slug)')
                    .eq('user_id', user.id)
                    .eq('role', 'staff')
                    .limit(1)
                    .maybeSingle()

                if (staffRole?.tenants?.slug) {
                    const slug = staffRole.tenants.slug
                    setStatus('Mengarahkan ke kasir...')
                    navigate(`/${staffRole.tenants.slug}/pos`, { replace: true })
                    return
                }

                // Try user_metadata for slug (from email registration flow)
                const tenantSlugFromMeta = user?.user_metadata?.tenant_slug
                if (tenantSlugFromMeta) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    navigate(`/${tenantSlugFromMeta}/admin`, { replace: true })
                    return
                }

                // New user via Google OAuth with pending store setup
                if (pendingStore) {
                    setStatus('Akun baru! Melanjutkan pengaturan toko...')
                    navigate('/register?google=1', { replace: true })
                    return
                }

                // Came from a store auth page but has no role — redirect to store menu
                if (slugFromUrl) {
                    setStatus('Mengarahkan ke toko...')
                    navigate(`/${slugFromUrl}`, { replace: true })
                    return
                }

                // Completely new user — go register
                setStatus('Buat toko pertamamu!')
                setTimeout(() => navigate('/register', { replace: true }), 1500)

            } catch (err) {
                console.error('Role lookup error:', err)
                if (slugFromUrl) {
                    navigate(`/${slugFromUrl}`, { replace: true })
                } else {
                    navigate('/', { replace: true })
                }
            }
        }

        // Primary: listen for auth state change (reliable for PKCE OAuth flow)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                subscription.unsubscribe()
                handleUser(session.user)
            }
        })

        // Fallback: check existing session (for email confirmation flow)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user && !handled) {
                subscription.unsubscribe()
                handleUser(session.user)
            }
        })

        // Safety timeout — if nothing happens in 10s, redirect home
        const timeout = setTimeout(() => {
            if (!handled) {
                setStatus('Waktu habis. Silakan login manual.')
                navigate('/', { replace: true })
            }
        }, 10000)

        return () => {
            subscription.unsubscribe()
            clearTimeout(timeout)
        }
    }, [navigate])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
            <div className="text-center space-y-4 px-6">
                <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full bg-[#ff8c00]/10 animate-ping" />
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-lg shadow-orange-100 border border-orange-100">
                        <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-3xl">
                            progress_activity
                        </span>
                    </div>
                </div>
                <p className="text-slate-700 font-semibold text-lg">{status}</p>
                <p className="text-slate-400 text-sm">Mohon tunggu sebentar...</p>
            </div>
        </div>
    )
}
