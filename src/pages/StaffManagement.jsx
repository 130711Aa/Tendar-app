import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTenantContext } from '../context/TenantContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function StaffManagement() {
    const { tenantId, tenantOwnerId, planLimits, tenantPlan } = useTenantContext()
    const { user } = useAuth()
    const isOwner = user?.id === tenantOwnerId

    const [staffList, setStaffList] = useState([])
    const [loading, setLoading] = useState(true)
    const [inviting, setInviting] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', password: '' })

    const fetchStaff = async () => {
        if (!tenantId) return
        setLoading(true)
        // Fetch all user_roles for this tenant along with user details if possible
        // Since we can't easily join auth.users without admin rights, we might only have user_id and role.
        // Wait, 'isOwner' has admin rights? Owner is just an admin.
        // Let's call an RPC or just fetch user_roles (we might not have emails in user_roles table)
        // Hmm, user_roles doesn't have email. We only see user_id and role.
        // Let's just fetch them anyway to count.
        const { data, error } = await supabase
            .from('user_roles')
            .select('id, user_id, role, created_at')
            .eq('tenant_id', tenantId)
            
        if (!error && data) {
            setStaffList(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (isOwner) fetchStaff()
    }, [tenantId, isOwner])

    const handleInvite = async (e) => {
        e.preventDefault()
        if (staffList.length >= planLimits.maxStaff) {
            toast.error(`Batas maksimal staff (${planLimits.maxStaff}) untuk paket ${tenantPlan.toUpperCase()} telah tercapai.`)
            return
        }

        setInviting(true)
        const loadingToast = toast.loading('Menambahkan staff...')

        try {
            const { data, error } = await supabase.functions.invoke('create-staff', {
                body: {
                    tenant_id: tenantId,
                    name: form.name,
                    email: form.email,
                    password: form.password
                }
            })

            if (error) throw new Error(error.message)
            if (data?.error) throw new Error(data.error)

            toast.success('Staff berhasil ditambahkan!', { id: loadingToast })
            setForm({ name: '', email: '', password: '' })
            fetchStaff()
        } catch (err) {
            console.error(err)
            toast.error(err.message || 'Gagal menambahkan staff', { id: loadingToast })
        } finally {
            setInviting(false)
        }
    }

    const handleRemoveStaff = async (roleId, roleType) => {
        if (roleType === 'admin') {
            toast.error('Tidak bisa menghapus akses admin utama.')
            return
        }
        if (!window.confirm('Yakin ingin mencabut akses staff ini?')) return
        
        const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', roleId)

        if (error) {
            toast.error('Gagal menghapus staff')
        } else {
            toast.success('Akses staff berhasil dicabut')
            fetchStaff()
        }
    }

    if (!isOwner) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center p-8 bg-white min-h-[50vh]">
                <span className="material-symbols-outlined text-6xl text-red-100 mb-4">gpp_maybe</span>
                <h1 className="text-xl font-bold text-slate-700">Akses Ditolak</h1>
                <p className="text-slate-500 mt-2">Halaman Kelola Staff hanya dapat diakses oleh pemilik toko.</p>
            </div>
        )
    }

    return (
        <main className="flex flex-1 flex-col px-4 md:px-10 py-8 max-w-4xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Kelola Staff</h1>
                <p className="text-neutral-500 text-base mt-2">Atur akses tim dan kasir ke dashboard toko Anda.</p>
            </div>

            {/* Quota Notice */}
            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-2xl">group</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Paket <span className="uppercase text-[#ff8c00]">{tenantPlan}</span></h3>
                        <p className="text-sm text-slate-600">Batas maksimal: {planLimits.maxStaff === Infinity ? 'Tak Terbatas' : `${planLimits.maxStaff} Orang (Termasuk Owner)`}</p>
                    </div>
                </div>
                <div className="bg-white px-5 py-2.5 rounded-xl font-bold text-slate-700 border border-orange-100 shadow-sm">
                    Terpakai: <span className={staffList.length >= planLimits.maxStaff && planLimits.maxStaff !== Infinity ? 'text-red-500' : 'text-emerald-500'}>{staffList.length}</span> / {planLimits.maxStaff === Infinity ? '∞' : planLimits.maxStaff}
                </div>
            </div>

            {/* Content Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Staff List */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff8c00]">list_alt</span>
                        Daftar Akses
                    </h2>
                    {loading ? (
                        <div className="p-8 text-center text-slate-400">Memuat data...</div>
                    ) : (
                        <div className="space-y-3">
                            {staffList.map(staff => (
                                <div key={staff.id} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={`size-10 rounded-lg flex items-center justify-center text-white font-bold ${staff.role === 'admin' ? 'bg-[#ff8c00]' : 'bg-slate-300'}`}>
                                            {staff.role === 'admin' ? 'A' : 'S'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-700">{staff.user_id === tenantOwnerId ? 'Anda (Owner)' : 'Anggota Staff'}</p>
                                            <p className="text-[11px] text-slate-400 font-mono uppercase bg-slate-50 px-1 py-0.5 rounded mt-0.5 inline-block">Role: {staff.role}</p>
                                        </div>
                                    </div>
                                    {staff.user_id !== tenantOwnerId && (
                                        <button 
                                            onClick={() => handleRemoveStaff(staff.id, staff.role)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-lg"
                                            title="Cabut Akses"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">person_remove</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Invite Form */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <span className="material-symbols-outlined text-[#ff8c00]">person_add</span>
                        Tambah Staff Baru
                    </h2>
                    
                    <form onSubmit={handleInvite} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Nama Panggilan</label>
                            <input 
                                type="text" required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                                className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                placeholder="Budi Kasir"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Email Login</label>
                            <input 
                                type="email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                                className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                placeholder="budi@toko.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">Password Sementara</label>
                            <input 
                                type="password" required value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))}
                                className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                placeholder="Minimal 6 karakter"
                                minLength={6}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={inviting || staffList.length >= planLimits.maxStaff}
                            className="w-full mt-2 bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold hover:bg-[#e67e00] transition-colors disabled:opacity-50 flex justify-center shadow-lg shadow-[#ff8c00]/20"
                        >
                            {inviting ? 'Memproses...' : 'Buat Akun Staff'}
                        </button>
                    </form>
                </div>

            </div>
        </main>
    )
}
