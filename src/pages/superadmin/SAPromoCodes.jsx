import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function SAPromoCodes() {
    const [promos, setPromos] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        code: '',
        discount_amount: '',
        max_uses: '',
        valid_until: ''
    })

    useEffect(() => {
        fetchPromos()
    }, [])

    const fetchPromos = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (error) {
            console.error("Error fetching promo codes:", error)
            toast.error("Gagal memuat data kode promo, harap cek tabel Supabase.")
        } else {
            setPromos(data || [])
        }
        setLoading(false)
    }

    const formatIDR = (n) => 'Rp' + (n || 0).toLocaleString('id-ID')

    const handleSubmit = async (e) => {
        e.preventDefault()
        const payload = {
            code: formData.code.toUpperCase().trim(),
            discount_amount: Number(formData.discount_amount),
            max_uses: formData.max_uses ? Number(formData.max_uses) : null,
            valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
        }

        const { error } = await supabase.from('promo_codes').insert(payload)
        if (error) {
            toast.error(error.message)
        } else {
            toast.success("Kode promo berhasil ditambahkan!")
            setShowModal(false)
            setFormData({ code: '', discount_amount: '', max_uses: '', valid_until: '' })
            fetchPromos()
        }
    }

    const toggleStatus = async (id, currentStatus) => {
        const { error } = await supabase.from('promo_codes').update({ is_active: !currentStatus }).eq('id', id)
        if (error) toast.error("Gagal mengubah status")
        else fetchPromos()
    }

    const deletePromo = async (id) => {
        if (!window.confirm("Yakin ingin menghapus kode promo ini?")) return
        const { error } = await supabase.from('promo_codes').delete().eq('id', id)
        if (error) {
            if (error.code === '23503' || error.message?.toLowerCase().includes('violates foreign key')) {
                toast.error("Gagal! Promo tidak bisa dihapus karena sudah dipakai dalam histori tagihan. Silakan ubah statusnya menjadi 'Nonaktif'.", { duration: 5000 })
            } else {
                toast.error("Gagal menghapus kode promo: " + error.message)
            }
        }
        else {
            toast.success("Promo berhasil dihapus")
            fetchPromos()
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Kode Promo</h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola diskon paket untuk pengguna</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Tambah Promo
                </button>
            </div>

            {/* List */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-white/[0.02] text-slate-400 font-semibold border-b border-white/5">
                            <tr>
                                <th className="px-5 py-4">Kode Promo</th>
                                <th className="px-5 py-4">Diskon</th>
                                <th className="px-5 py-4">Pemakaian</th>
                                <th className="px-5 py-4">Kedaluwarsa</th>
                                <th className="px-5 py-4">Status</th>
                                <th className="px-5 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Memuat data...</td>
                                </tr>
                            ) : promos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Belum ada kode promo.</td>
                                </tr>
                            ) : promos.map((promo) => (
                                <tr key={promo.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-5 py-4 font-mono font-bold text-emerald-400 uppercase">
                                        {promo.code}
                                    </td>
                                    <td className="px-5 py-4 font-semibold text-white">
                                        {formatIDR(promo.discount_amount)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-white">{promo.current_uses}</span>
                                        <span className="text-slate-500"> / {promo.max_uses || '∞'}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : 'Tanpa Batas'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => toggleStatus(promo.id, promo.is_active)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                                promo.is_active ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                        >
                                            {promo.is_active ? 'Aktif' : 'Nonaktif'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button
                                            onClick={() => deletePromo(promo.id)}
                                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                            title="Hapus Promo"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Tambah Promo */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4 animate-fade-in text-slate-800">
                    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Tambah Promo Promo</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Kode Unik</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full uppercase font-mono px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Misal: DISKON50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nominal Diskon (Rp)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.discount_amount}
                                    onChange={e => setFormData({ ...formData, discount_amount: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    placeholder="Contoh: 15000"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Batas Klaim</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.max_uses}
                                        onChange={e => setFormData({ ...formData, max_uses: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                        placeholder="Kosongkan jika ∞"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Berlaku Sampai</label>
                                    <input
                                        type="date"
                                        value={formData.valid_until}
                                        onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/30 mt-2"
                            >
                                Simpan Promo
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
