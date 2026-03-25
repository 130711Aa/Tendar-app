import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

export default function AddMaterialForm({ onSuccess, onCancel }) {
    const [name, setName] = useState('')
    const [minStock, setMinStock] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!name || !minStock) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('raw_materials')
                .insert({
                    name: name,
                    unit: 'pcs', // Fixed as per user request
                    minimum_stock: parseInt(minStock)
                })

            if (error) throw error

            toast.success('Bahan baku berhasil ditambahkan!')
            if (onSuccess) onSuccess()
            setName('')
            setMinStock('')
        } catch (err) {
            console.error(err)
            toast.error('Gagal menambahkan bahan: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-stone-800">Tambah Bahan Baku Baru</h3>
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
                                value="pcs"
                                disabled
                                className="w-full p-3 bg-stone-100 border border-stone-200 rounded-xl text-stone-500 font-medium cursor-not-allowed"
                            />
                            <p className="text-[10px] text-stone-400 mt-1">Satuan dikunci ke 'pcs'</p>
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
