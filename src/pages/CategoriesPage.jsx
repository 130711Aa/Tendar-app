import { useState } from 'react'
import { useCategories } from '../context/CategoriesContext'
import { useProducts } from '../context/ProductsContext'
import toast from 'react-hot-toast'

export default function CategoriesPage() {
    const { categories, addCategory, deleteCategory } = useCategories()
    const { products } = useProducts()
    const [newCategory, setNewCategory] = useState('')
    const [confirmDelete, setConfirmDelete] = useState(null)

    const handleAdd = async (e) => {
        e.preventDefault()
        const result = await addCategory(newCategory)
        if (result.success) {
            toast.success(`Kategori "${newCategory.trim()}" berhasil ditambahkan!`)
            setNewCategory('')
        } else {
            toast.error(result.error)
        }
    }

    const handleDelete = (name) => {
        const productsInCategory = products.filter(p => p.category === name).length
        if (productsInCategory > 0 && confirmDelete !== name) {
            setConfirmDelete(name)
            return
        }
        deleteCategory(name)
        setConfirmDelete(null)
        toast.success(`Kategori "${name}" berhasil dihapus!`)
    }

    const getCategoryProductCount = (cat) =>
        products.filter(p => p.category === cat).length

    const CATEGORY_ICONS = {
        'Jus Segar': '🍊',
        'Smoothies': '🥤',
        'Mocktails': '🍹',
    }

    return (
        <main className="flex flex-1 flex-col px-4 md:px-10 py-8 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Kelola Kategori</h1>
                <p className="text-neutral-500 text-base">Tambah atau hapus kategori produk untuk menu</p>
            </div>

            {/* Add Category */}
            <form onSubmit={handleAdd} className="mb-8">
                <div className="bg-white rounded-xl border border-[#ff8c00]/10 p-5 shadow-sm">
                    <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff8c00]">add_circle</span>
                        Tambah Kategori Baru
                    </h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="Nama kategori baru..."
                            className="flex-1 px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00]/30 outline-none transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newCategory.trim()}
                            className="px-6 py-3 bg-[#ff8c00] text-white rounded-xl font-bold text-sm hover:bg-[#e67e00] transition-all shadow-md shadow-[#ff8c00]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Tambah
                        </button>
                    </div>
                </div>
            </form>

            {/* Categories List */}
            <div className="bg-white rounded-xl border border-[#ff8c00]/10 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-[#ff8c00]/5">
                    <h3 className="text-base font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ff8c00]">category</span>
                        Daftar Kategori
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ff8c00]/10 text-[#ff8c00] text-xs font-bold">
                            {categories.length}
                        </span>
                    </h3>
                </div>

                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <span className="material-symbols-outlined text-5xl text-neutral-200 mb-3">folder_off</span>
                        <p className="text-neutral-400 font-medium">Belum ada kategori</p>
                        <p className="text-neutral-400 text-sm">Tambahkan kategori pertamamu di atas</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[#ff8c00]/5">
                        {categories.map((cat, idx) => {
                            const productCount = getCategoryProductCount(cat)
                            const icon = CATEGORY_ICONS[cat] || '📂'

                            return (
                                <div
                                    key={cat}
                                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#fcfaf8] transition-colors animate-fade-in-up"
                                    style={{ animationDelay: `${idx * 30}ms` }}
                                >
                                    {/* Icon */}
                                    <div className="size-12 rounded-xl bg-[#ff8c00]/10 flex items-center justify-center text-2xl shrink-0">
                                        {icon}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm">{cat}</h4>
                                        <p className="text-xs text-neutral-400 mt-0.5">
                                            {productCount} produk
                                        </p>
                                    </div>

                                    {/* Delete */}
                                    {confirmDelete === cat ? (
                                        <div className="flex items-center gap-2 animate-fade-in-up">
                                            <span className="text-xs text-red-500 font-medium">
                                                {productCount > 0 ? `${productCount} produk masih pakai kategori ini!` : 'Yakin hapus?'}
                                            </span>
                                            <button
                                                onClick={() => handleDelete(cat)}
                                                className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                                            >
                                                Hapus
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete(null)}
                                                className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-bold hover:bg-neutral-200 transition-colors"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleDelete(cat)}
                                            className="size-9 rounded-lg flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </main>
    )
}
