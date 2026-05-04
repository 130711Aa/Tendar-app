import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useTenantContext } from '../../context/TenantContext'

export default function AddMaterialForm({ material, onSuccess, onCancel }) {
    const [name, setName] = useState(material?.name || '')
    const [unit, setUnit] = useState(material?.unit || '')
    const [minStock, setMinStock] = useState(material?.minimum_stock?.toString() || '')
    const [loading, setLoading] = useState(false)
    const { tenantId } = useTenantContext()
    const isEditing = Boolean(material?.id)

    const handleSubmit = async (e) => {
        e.preventDefault()
        const cleanName = name.trim()
        const cleanUnit = unit.trim()
        if (!cleanName || !cleanUnit || !minStock || !tenantId) return

        setLoading(true)
        try {
            const payload = {
                name: cleanName,
                unit: cleanUnit,
                minimum_stock: parseInt(minStock, 10),
                tenant_id: tenantId
            }

            const { error } = isEditing
                ? await supabase
                    .from('raw_materials')
                    .update({
                        name: payload.name,
                        unit: payload.unit,
                        minimum_stock: payload.minimum_stock
                    })
                    .eq('id', material.id)
                    .eq('tenant_id', tenantId)
                : await supabase
                    .from('raw_materials')
                    .insert(payload)

            if (error) throw error

            toast.success(isEditing ? 'Bahan baku berhasil diperbarui!' : 'Bahan baku berhasil ditambahkan!')
            if (onSuccess) onSuccess()
            setName('')
            setUnit('')
            setMinStock('')
        } catch (err) {
            console.error(err)
            toast.error(`${isEditing ? 'Gagal memperbarui' : 'Gagal menambahkan'} bahan: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-stone-800">
                        {isEditing ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
                    </h3>
                    <button onClick={onCancel} className="text-stone-400 hover:text-stone-600">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-stone-700 mb-2">Nama Bahan</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00]"
                            placeholder="Contoh: Sedotan, Cup, dll"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Satuan</label>
                            <input
                                type="text"
                                value={unit}
                                onChange={e => setUnit(e.target.value)}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00]"
                                placeholder="pcs, kg, liter"
                                required
                            />
                            <p className="text-[10px] text-stone-400 mt-1">Isi bebas sesuai kebutuhan toko</p>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Minimum Stok</label>
                            <input
                                type="number"
                                value={minStock}
                                onChange={e => setMinStock(e.target.value)}
                                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00]"
                                placeholder="10"
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-[#ff8c00] text-white font-bold rounded-xl hover:bg-[#e67e00] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
