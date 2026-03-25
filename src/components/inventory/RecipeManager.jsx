import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useProducts } from '../../context/ProductsContext'

export default function RecipeManager() {
    const { products } = useProducts()
    const [materials, setMaterials] = useState([])
    const [selectedProductId, setSelectedProductId] = useState('')
    const [recipes, setRecipes] = useState([]) // Existing recipes for selected product
    const [loading, setLoading] = useState(false)

    // Config Form
    const [formMaterialId, setFormMaterialId] = useState('')
    const [formQuantity, setFormQuantity] = useState('')
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        fetchMaterials()
    }, [])

    useEffect(() => {
        if (selectedProductId) {
            fetchRecipes(selectedProductId)
        } else {
            setRecipes([])
        }
    }, [selectedProductId])

    const fetchMaterials = async () => {
        const { data } = await supabase.from('raw_materials').select('*').order('name')
        setMaterials(data || [])
    }

    const fetchRecipes = async (productId) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('product_raw_materials')
            .select('*, raw_materials(name, unit)')
            .eq('product_id', productId)

        if (!error) setRecipes(data || [])
        setLoading(false)
    }

    const handleAddIngredient = async (e) => {
        e.preventDefault()
        if (!selectedProductId || !formMaterialId || !formQuantity) return

        setAdding(true)
        try {
            const { error } = await supabase.from('product_raw_materials').insert({
                product_id: parseInt(selectedProductId),
                raw_material_id: parseInt(formMaterialId),
                quantity_used: parseInt(formQuantity)
            })

            if (error) throw error

            toast.success('Bahan berhasil ditambahkan ke resep')
            fetchRecipes(selectedProductId)
            setFormMaterialId('')
            setFormQuantity('')
        } catch (err) {
            toast.error('Gagal menambahkan: ' + err.message)
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus bahan ini dari resep?')) return
        try {
            await supabase.from('product_raw_materials').delete().eq('id', id)
            toast.success('Dihapus')
            fetchRecipes(selectedProductId)
        } catch (err) {
            toast.error('Gagal menghapus')
        }
    }

    // Helper: Material Unit
    const getMaterialUnit = (id) => {
        const m = materials.find(x => x.id.toString() === id.toString())
        return m ? m.unit : ''
    }

    return (
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Product Selection & Recipe List */}
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-2">Pilih Produk (Menu)</label>
                    <select
                        value={selectedProductId}
                        onChange={e => setSelectedProductId(e.target.value)}
                        className="w-full p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff8c00]"
                    >
                        <option value="">-- Pilih Produk --</option>
                        {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {selectedProductId && (
                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                        <h4 className="font-bold text-stone-800 mb-4">Resep Saat Ini</h4>
                        {loading ? (
                            <p className="text-stone-400">Memuat resep...</p>
                        ) : recipes.length === 0 ? (
                            <p className="text-stone-400 italic text-sm">Belum ada resep. Tambahkan bahan baku di panel kanan.</p>
                        ) : (
                            <div className="space-y-2">
                                {recipes.map(recipe => (
                                    <div key={recipe.id} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                                        <div>
                                            <p className="font-bold text-stone-800">{recipe.raw_materials?.name}</p>
                                            <p className="text-xs text-stone-500">
                                                {recipe.quantity_used} {recipe.raw_materials?.unit} per porsi
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(recipe.id)}
                                            className="text-red-400 hover:text-red-600"
                                            title="Hapus"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                    </div>
                )}
            </div>

            {/* Right: Add Ingredient Form */}
            <div className="bg-white p-6 rounded-xl border border-stone-100 shadow-sm h-fit">
                <h3 className="text-lg font-bold text-stone-800 mb-4">Tambah Bahan Baku</h3>
                {!selectedProductId ? (
                    <p className="text-stone-400 text-sm">Pilih produk di sebelah kiri terlebih dahulu.</p>
                ) : (
                    <form onSubmit={handleAddIngredient} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Bahan Baku</label>
                            <select
                                value={formMaterialId}
                                onChange={e => setFormMaterialId(e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
                                required
                            >
                                <option value="">-- Pilih Bahan --</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                                Jumlah ({formMaterialId ? getMaterialUnit(formMaterialId) : 'Satuan'})
                            </label>
                            <input
                                type="number"
                                value={formQuantity}
                                onChange={e => setFormQuantity(e.target.value)}
                                className="w-full p-2 bg-white border border-stone-200 rounded-lg text-sm"
                                placeholder="0"
                                required
                            />
                            <p className="text-[10px] text-stone-400 mt-1">Jumlah yang dipakai untuk 1 porsi produk ini.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full bg-[#ff8c00] text-white font-bold py-2 rounded-lg hover:bg-[#e67e00] transition-colors text-sm"
                        >
                            {adding ? 'Menambahkan...' : '+ Tambahkan ke Resep'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
