import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useTenantContext } from '../../context/TenantContext'

export default function StockOpnameForm({ onSuccess }) {
    const { tenantId } = useTenantContext()
    const [materials, setMaterials] = useState([])
    const [selectedMaterialId, setSelectedMaterialId] = useState('')
    const [currentSystemStock, setCurrentSystemStock] = useState(0)
    const [addQuantity, setAddQuantity] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (tenantId) fetchMaterials()
    }, [tenantId])

    const fetchMaterials = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('view_raw_material_stock')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('name')

            if (error) throw error
            setMaterials(data || [])
        } catch (err) {
            console.error(err)
            toast.error('Gagal memuat data bahan baku')
        } finally {
            setLoading(false)
        }
    }

    const handleMaterialChange = (e) => {
        const id = e.target.value
        setSelectedMaterialId(id)
        if (id) {
            const material = materials.find(m => m.id.toString() === id)
            setCurrentSystemStock(material ? material.current_stock : 0)
        } else {
            setCurrentSystemStock(0)
        }
        setAddQuantity('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!selectedMaterialId || addQuantity === '' || parseInt(addQuantity) <= 0 || !tenantId) {
            toast.error('Jumlah harus lebih dari 0')
            return
        }

        setSubmitting(true)
        try {
            const qty = parseInt(addQuantity)

            // Insert IN movement (addition only)
            const { error } = await supabase
                .from('raw_material_movements')
                .insert({
                    raw_material_id: parseInt(selectedMaterialId),
                    movement_type: 'IN',
                    quantity: qty,
                    reference_type: 'PURCHASE',
                    notes: `Input Bahan Baku: +${qty} (Stok sebelumnya: ${currentSystemStock})`,
                    tenant_id: tenantId
                })

            if (error) throw error

            toast.success(`Berhasil menambah ${qty} ${selectedMaterial?.unit || ''} bahan baku!`)

            // Reset form
            setSelectedMaterialId('')
            setAddQuantity('')
            setCurrentSystemStock(0)

            // Refresh parent and local data
            fetchMaterials()
            if (onSuccess) onSuccess()

        } catch (err) {
            console.error(err)
            toast.error('Gagal menyimpan: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const selectedMaterial = materials.find(m => m.id.toString() === selectedMaterialId)

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-stone-800 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ff8c00]">add_circle</span>
                Input Bahan Baku
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Pilih Bahan Baku</label>
                    <select
                        value={selectedMaterialId}
                        onChange={handleMaterialChange}
                        className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00] transition-shadow appearance-none"
                        required
                    >
                        <option value="">-- Pilih Bahan --</option>
                        {materials.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.name} (Satuan: {m.unit})
                            </option>
                        ))}
                    </select>
                </div>

                {selectedMaterialId && (
                    <div className="bg-orange-50 p-4 rounded-xl border border-[#ff8c00]/20 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-stone-500 font-medium">Stok Saat Ini</p>
                            <p className="text-2xl font-bold text-[#ff8c00]">{currentSystemStock} <span className="text-sm font-normal text-stone-600">{selectedMaterial?.unit}</span></p>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedMaterial?.is_low_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {selectedMaterial?.is_low_stock ? 'Low Stock' : 'Aman'}
                            </span>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Jumlah yang Ditambahkan</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="1"
                            value={addQuantity}
                            onChange={e => setAddQuantity(e.target.value)}
                            className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00] transition-shadow pl-4 pr-12"
                            placeholder="Contoh: 500"
                            required
                        />
                        {selectedMaterial && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">
                                {selectedMaterial.unit}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Masukan jumlah bahan baku yang masuk/dibeli.</p>
                </div>

                {addQuantity !== '' && selectedMaterialId && parseInt(addQuantity) > 0 && (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <p className="text-sm font-bold text-stone-700 mb-1">Preview Penambahan:</p>
                        <div className="flex items-center gap-3">
                            <span className="text-stone-600">{currentSystemStock} {selectedMaterial?.unit}</span>
                            <span className="material-symbols-outlined text-green-600">arrow_forward</span>
                            <span className="text-lg font-bold text-green-600">
                                {currentSystemStock + parseInt(addQuantity)} {selectedMaterial?.unit}
                            </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1 font-medium">+{addQuantity} {selectedMaterial?.unit} akan ditambahkan</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={submitting || !selectedMaterialId || !addQuantity || parseInt(addQuantity) <= 0}
                    className="w-full bg-[#ff8c00] text-white font-bold py-3 rounded-xl hover:bg-[#e67e00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#ff8c00]/20"
                >
                    {submitting ? 'Menyimpan...' : 'Tambah Bahan Baku'}
                </button>
            </form>
        </div>
    )
}
