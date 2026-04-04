import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Handles both:
 * 1. Supabase email confirmation redirects
 * 2. Google OAuth redirects
 *
 * Flow:
 * - Get session from URL hash/code
 * - Check if user has a tenant via user_roles
 * - If yes → redirect to /{slug}/admin
 * - If no + came from register page → redirect to /register (for store setup)
 * - If no + came from tenant auth → user is new customer, redirect to store
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('Menghubungkan akun...')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Allow Supabase to exchange the code/token from URL
                await new Promise(resolve => setTimeout(resolve, 500))

                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error

                if (!session) {
                    // Retry once after a short delay
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (!retrySession) {
                        setStatus('Gagal verifikasi. Silakan login manual.')
                        setTimeout(() => navigate('/'), 3000)
                        return
                    }
                }

                const user = session?.user
                setStatus('Akun terhubung! Mencari toko Anda...')

                // Check for Google OAuth new-user pending store data
                const pendingStore = sessionStorage.getItem('tendar_pending_store')

                // Check if user has a tenant via user_roles
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role, tenants(slug)')
                    .eq('user_id', user.id)
                    .eq('role', 'admin')
                    .limit(1)
                    .maybeSingle()

                if (roleData?.tenants?.slug) {
                    // Existing user with a tenant
                    const slug = roleData.tenants.slug
                    setStatus(`Selamat datang! Mengarahkan ke toko ${slug}...`)
                    navigate(`/${slug}/admin`)
                    return
                }

                // No tenant found — check if we have a slug from the URL params (tenant login)
                const urlParams = new URLSearchParams(window.location.search)
                const slugFromUrl = urlParams.get('slug')
                if (slugFromUrl) {
                    // User was logging in to a specific store as a customer/staff
                    setStatus(`Mengarahkan ke toko...`)
                    navigate(`/${slugFromUrl}`)
                    return
                }

                // Try user_metadata for slug (set during email registration)
                const tenantSlugFromMeta = user?.user_metadata?.tenant_slug
                if (tenantSlugFromMeta) {
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    navigate(`/${tenantSlugFromMeta}/admin`)
                    return
                }

                // New user via Google — send to register with pending data flag
                if (pendingStore) {
                    setStatus('Akun baru! Melanjutkan pengaturan toko...')
                    navigate('/register?google=1')
                    return
                }

                // Completely new user, no store — redirect to register
                setStatus('Buat toko pertamamu!')
                setTimeout(() => navigate('/register'), 1500)

            } catch (err) {
                console.error('Auth callback error:', err)
                setStatus('Terjadi kesalahan verifikasi.')
                setTimeout(() => navigate('/'), 3000)
            }
        }

        handleCallback()
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
