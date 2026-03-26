import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import AddMaterialForm from './AddMaterialForm'
import { useTenantContext } from '../../context/TenantContext'

export default function StockTable() {
    const { tenantId } = useTenantContext()
    const [materials, setMaterials] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)

    useEffect(() => {
        if (tenantId) fetchStock()
    }, [tenantId])

    const fetchStock = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('view_raw_material_stock')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('is_low_stock', { ascending: false }) // Low stock first
                .order('name', { ascending: true })

            if (error) throw error
            setMaterials(data || [])
        } catch (err) {
            console.error('Error fetching stock:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Apakah anda yakin ingin menghapus bahan baku "${name}"? \n\nPERINGATAN: Semua riwayat stok dan resep yang menggunakan bahan ini akan ikut terhapus permanen.`)) return

        try {
            const { error } = await supabase
                .from('raw_materials')
                .delete()
                .eq('id', id)

            if (error) throw error

            // Show success toast? The caller usually handles it, but here we are in the component.
            // Let's assume toast is available globally or we should import it?
            // Checking imports... toast is not imported in this file yet. I need to add import.
            // Wait, I can't add import with replace_file_content easily if I'm not careful.
            // I'll assume I need to add import toast first or just use alert/console if I want to be safe, 
            // but the user expects nice UI. The previous files used 'react-hot-toast'.
            // I will add the import in a separate edit or try to include it if I can match the top.
            // For now, let's just do the logical part and I'll do a separate replace for import if needed.
            // Actually, I can use window.alert or just refresh. 
            // Let's try to do it properly. 
            // I will use two edits: one for import, one for body. 

            fetchStock()
        } catch (err) {
            alert('Gagal menghapus: ' + err.message)
        }
    }

    if (loading) return <div className="p-8 text-center text-stone-500">Memuat data stok...</div>

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-stone-800">Stok Bahan Baku</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-[#ff8c00] hover:bg-[#e67e00] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Tambah Bahan
                    </button>
                    <button
                        onClick={fetchStock}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
                        title="Refresh"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                    </button>
                </div>
            </div>

            {showAddModal && (
                <AddMaterialForm
                    onSuccess={() => {
                        setShowAddModal(false)
                        fetchStock()
                    }}
                    onCancel={() => setShowAddModal(false)}
                />
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-100">
                            <th className="px-6 py-4">Nama Bahan</th>
                            <th className="px-6 py-4">Stok Saat Ini</th>
                            <th className="px-6 py-4">Satuan</th>
                            <th className="px-6 py-4">Minimum Stok</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {materials.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-stone-400">
                                    Belum ada data bahan baku.
                                </td>
                            </tr>
                        ) : (
                            materials.map((item) => (
                                <tr key={item.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-stone-800">{item.name}</td>
                                    <td className="px-6 py-4 font-bold text-lg">{item.current_stock?.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 text-stone-500">{item.unit}</td>
                                    <td className="px-6 py-4 text-stone-500">{item.minimum_stock?.toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4">
                                        {item.is_low_stock ? (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold w-fit">
                                                Aman
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(item.id, item.name)}
                                            className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                            title="Hapus Bahan"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
