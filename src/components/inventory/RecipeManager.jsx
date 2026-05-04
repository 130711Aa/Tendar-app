import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { useProducts } from '../../context/ProductsContext'
import { useTenantContext } from '../../context/TenantContext'

export default function RecipeManager() {
    const { products } = useProducts()
    const { tenantId } = useTenantContext()
    const [materials, setMaterials] = useState([])
    const [selectedProductId, setSelectedProductId] = useState('')
    const [recipes, setRecipes] = useState([]) // Existing recipes for selected product
    const [loading, setLoading] = useState(false)

    // Config Form
    const [formMaterialId, setFormMaterialId] = useState('')
    const [formQuantity, setFormQuantity] = useState('')
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        if (tenantId) fetchMaterials()
    }, [tenantId])

    useEffect(() => {
        if (selectedProductId && tenantId) {
            fetchRecipes(selectedProductId)
        } else {
            setRecipes([])
        }
    }, [selectedProductId, tenantId])

    const fetchMaterials = async () => {
        const { data } = await supabase
            .from('raw_materials')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('name')
        setMaterials(data || [])
    }

    const fetchRecipes = async (productId) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('product_raw_materials')
            .select('*, raw_materials(name, unit)')
            .eq('product_id', productId)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: true })

        if (!error) setRecipes(data || [])
        setLoading(false)
    }

    const handleAddIngredient = async (e) => {
        e.preventDefault()
        if (!selectedProductId || !formMaterialId || !formQuantity || !tenantId) return

        setAdding(true)
        try {
            const existingRecipe = recipes.find(recipe => recipe.raw_material_id?.toString() === formMaterialId)
            const quantity = parseFloat(formQuantity)
            const { error } = existingRecipe
                ? await supabase
                    .from('product_raw_materials')
                    .update({ quantity_used: quantity })
                    .eq('id', existingRecipe.id)
                    .eq('tenant_id', tenantId)
                : await supabase
                    .from('product_raw_materials')
                    .insert({
                        product_id: parseInt(selectedProductId, 10),
                        raw_material_id: parseInt(formMaterialId, 10),
                        quantity_used: quantity,
                        tenant_id: tenantId
                    })

            if (error) throw error

            toast.success(existingRecipe ? 'Jumlah bahan di resep diperbarui' : 'Bahan berhasil ditambahkan ke resep')
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

    const selectedProduct = products.find(product => product.id?.toString() === selectedProductId)
    const usedMaterialIds = new Set(recipes.map(recipe => recipe.raw_material_id?.toString()))

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
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div>
                                <h4 className="font-bold text-stone-800">Resep Saat Ini</h4>
                                <p className="text-xs text-stone-500">
                                    {selectedProduct?.name || 'Menu'} memakai {recipes.length} bahan baku per porsi.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-white text-[#ff8c00] rounded-full text-xs font-bold border border-orange-100">
                                {recipes.length} bahan
                            </span>
                        </div>
                        {loading ? (
                            <p className="text-stone-400">Memuat resep...</p>
                        ) : recipes.length === 0 ? (
                            <p className="text-stone-400 italic text-sm">
                                Belum ada resep. Tambahkan beberapa bahan baku di panel kanan, misalnya mangga, SKM, dan gula untuk satu menu.
                            </p>
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
                <h3 className="text-lg font-bold text-stone-800 mb-1">Tambah Bahan Baku</h3>
                <p className="text-xs text-stone-500 mb-4">
                    Tambahkan bahan satu per satu. Satu menu bisa punya banyak bahan.
                </p>
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
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.unit}){usedMaterialIds.has(m.id.toString()) ? ' - sudah ada, jumlah akan diperbarui' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase mb-1">
                                Jumlah ({formMaterialId ? getMaterialUnit(formMaterialId) : 'Satuan'})
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="any"
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
                            {adding ? 'Menyimpan...' : '+ Simpan Bahan Resep'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
