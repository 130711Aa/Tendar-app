import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/**
 * Handles Supabase email confirmation redirect.
 * Supabase sends users here after they click the confirmation link in their email.
 * We read their session, get their tenant slug from metadata or user_roles, then redirect.
 */
export default function AuthCallbackPage() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('Memverifikasi akun...')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase will auto-exchange the token from the URL hash
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error

                if (!session) {
                    // Wait a moment for Supabase to process the token
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    const { data: { session: retrySession } } = await supabase.auth.getSession()
                    if (!retrySession) {
                        setStatus('Gagal verifikasi. Silakan login manual.')
                        setTimeout(() => navigate('/'), 3000)
                        return
                    }
                }

                const user = session?.user
                setStatus('Akun terverifikasi! Mencari toko Anda...')

                // Try to find tenant slug from user metadata (set during registration)
                const tenantSlug = user?.user_metadata?.tenant_slug

                if (tenantSlug) {
                    // Wait for DB trigger to create tenant if needed
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    setStatus(`Mengarahkan ke toko ${tenantSlug}...`)
                    navigate(`/${tenantSlug}/admin`)
                    return
                }

                // Fallback: lookup tenant from user_roles
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('tenant_id, tenants(slug)')
                    .eq('user_id', user.id)
                    .eq('role', 'admin')
                    .limit(1)
                    .single()

                if (roleData?.tenants?.slug) {
                    navigate(`/${roleData.tenants.slug}/admin`)
                } else {
                    // No tenant found — go to home to register
                    setStatus('Toko tidak ditemukan. Silakan buat toko.')
                    setTimeout(() => navigate('/register'), 2000)
                }
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
            <div className="text-center space-y-4">
                <span className="animate-spin material-symbols-outlined text-[#ff8c00] text-5xl block mx-auto">
                    progress_activity
                </span>
                <p className="text-slate-600 font-semibold text-lg">{status}</p>
                <p className="text-slate-400 text-sm">Mohon tunggu...</p>
            </div>
        </div>
    )
}
