import { useState, useMemo, useRef } from 'react'
import { useCategories } from '../context/CategoriesContext'
import { useProducts } from '../context/ProductsContext'
import { formatRupiah } from '../lib/utils'
import toast from 'react-hot-toast'
import { useTenantContext } from '../context/TenantContext'

export default function MenuManagement() {
    const { products, toggleStock, deleteProduct, updateProduct, addProduct } = useProducts()
    const { slug, planLimits } = useTenantContext()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Semua')
    const [sortBy, setSortBy] = useState('default')
    const [showAddModal, setShowAddModal] = useState(false)
    const { filterCategories, categories } = useCategories()
    const [imagePreview, setImagePreview] = useState(null)
    const [imageFile, setImageFile] = useState(null)
    const fileInputRef = useRef(null)
    const [addForm, setAddForm] = useState({ name: '', description: '', price: '', category: '' })

    const handleAddSubmit = async (e) => {
        e.preventDefault()
        if (products.length >= planLimits.maxProducts) {
            toast.error(`Batas maksimal produk (${planLimits.maxProducts}) tercapai. Silakan upgrade paket.`)
            return
        }
        if (!addForm.name.trim() || !addForm.price || !addForm.category) return
        const result = await addProduct({
            name: addForm.name.trim(),
            description: addForm.description.trim(),
            price: Number(addForm.price),
            category: addForm.category,
            image_url: imagePreview || '',
            stock_status: true, // Default menu baru selalu tersedia
        })
        if (result) {
            toast.success(`"${addForm.name}" berhasil ditambahkan!`)
            setAddForm({ name: '', description: '', price: '', category: '', stock: '' })
            clearImage()
            setShowAddModal(false)
        } else {
            toast.error('Gagal menyimpan menu. Coba lagi.')
        }
    }

    // Edit modal state
    const [editProduct, setEditProduct] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', description: '', price: '', category: '', image_url: '' })
    const [editImagePreview, setEditImagePreview] = useState(null)
    const editFileInputRef = useRef(null)

    const openEditModal = (product) => {
        setEditProduct(product)
        setEditForm({
            name: product.name,
            description: product.description || '',
            price: product.price,
            category: product.category,
            image_url: product.image_url || '',
        })
        setEditImagePreview(product.image_url || null)
    }

    const closeEditModal = () => {
        setEditProduct(null)
        setEditForm({ name: '', description: '', price: '', category: '', image_url: '' })
        setEditImagePreview(null)
        if (editFileInputRef.current) editFileInputRef.current.value = ''
    }

    const handleEditImage = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { alert('File harus berupa gambar'); return }
        if (file.size > 5 * 1024 * 1024) { alert('Ukuran file maksimal 5MB'); return }
        const reader = new FileReader()
        reader.onload = (ev) => {
            setEditImagePreview(ev.target.result)
            setEditForm(f => ({ ...f, image_url: ev.target.result }))
        }
        reader.readAsDataURL(file)
    }

    const handleEditSubmit = (e) => {
        e.preventDefault()
        updateProduct(editProduct.id, {
            name: editForm.name,
            description: editForm.description,
            price: Number(editForm.price),
            category: editForm.category,
            image_url: editForm.image_url,
        })
        toast.success(`"${editForm.name}" berhasil diperbarui!`)
        closeEditModal()
    }

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, PNG, WebP)')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB')
            return
        }
        setImageFile(file)
        const reader = new FileReader()
        reader.onload = (ev) => setImagePreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    const clearImage = () => {
        setImageFile(null)
        setImagePreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const filtered = useMemo(() => {
        let result = products.filter(p => {
            const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory
            const matchSearch = !searchQuery.trim() ||
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
            return matchCat && matchSearch
        })

        // Sort
        switch (sortBy) {
            case 'price-asc':
                result = [...result].sort((a, b) => a.price - b.price)
                break
            case 'price-desc':
                result = [...result].sort((a, b) => b.price - a.price)
                break
            case 'az':
                result = [...result].sort((a, b) => a.name.localeCompare(b.name))
                break
            default:
                result = [...result].sort((a, b) => b.id - a.id)
                break
        }
        return result
    }, [products, selectedCategory, searchQuery, sortBy])

    return (
        <main className="flex flex-1 flex-col px-4 md:px-10 py-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div className="flex flex-col gap-1">
                    <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">Kelola Menu</h1>
                    <p className="text-neutral-500 text-base">Atur dan perbarui katalog minuman kamu</p>
                </div>
                <button
                    onClick={() => {
                        if (products.length >= planLimits.maxProducts) {
                            toast.error(`Batas maksimal produk (${planLimits.maxProducts}) tercapai. Silakan upgrade paket di menu Langganan.`)
                        } else {
                            setShowAddModal(true)
                        }
                    }}
                    className="flex items-center justify-center gap-2 bg-[#ff8c00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    <span>Tambah Menu Baru</span>
                </button>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="md:col-span-6 lg:col-span-8">
                    <div className="relative h-12">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400">
                            <span className="material-symbols-outlined">search</span>
                        </span>
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="block w-full h-full bg-white border border-[#ff8c00]/10 rounded-xl pl-12 pr-4 text-[#181510] placeholder:text-neutral-400 focus:ring-2 focus:ring-[#ff8c00]/30 text-sm outline-none transition-all"
                            placeholder="Cari jus, smoothies, atau mocktails..."
                        />
                    </div>
                </div>
                <div className="md:col-span-3 lg:col-span-2">
                    <select
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                        className="w-full h-12 bg-white border border-[#ff8c00]/10 rounded-xl px-4 text-[#181510] text-sm font-medium focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                    >
                        {filterCategories.map(cat => (
                            <option key={cat} value={cat}>{cat === 'Semua' ? 'Semua Kategori' : cat}</option>
                        ))}
                    </select>
                </div>
                <div className="md:col-span-3 lg:col-span-2">
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className="w-full h-12 bg-white border border-[#ff8c00]/10 rounded-xl px-4 text-[#181510] text-sm font-medium focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                    >
                        <option value="default">Urutkan: Terbaru</option>
                        <option value="price-asc">Harga: Rendah ke Tinggi</option>
                        <option value="price-desc">Harga: Tinggi ke Rendah</option>
                        <option value="az">A-Z</option>
                    </select>
                </div>
            </div>

            {/* Quick Filter Pills */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
                {filterCategories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat
                            ? 'bg-[#ff8c00] text-white'
                            : 'bg-white text-neutral-600 hover:bg-[#ff8c00]/10 border border-[#ff8c00]/10'
                            }`}
                    >
                        {cat === 'Semua' ? `Semua (${products.length})` : `${cat} (${products.filter(p => p.category === cat).length})`}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-[#ff8c00]/10 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#fcfaf8]/50 border-b border-[#ff8c00]/10">
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600">Gambar</th>
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600">Nama Menu</th>
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600">Kategori</th>
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600">Harga</th>
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600">Status Stok</th>
                                <th className="px-6 py-4 text-sm font-bold text-neutral-600 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ff8c00]/5">
                            {filtered.map(product => {
                                const catColors = {
                                    'Jus Segar': 'bg-orange-100 text-orange-600',
                                    'Smoothies': 'bg-emerald-100 text-emerald-600',
                                    'Mocktails': 'bg-indigo-100 text-indigo-600',
                                }
                                return (
                                    <tr key={product.id} className="hover:bg-[#ff8c00]/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div
                                                className="size-14 bg-center bg-cover rounded-lg border border-[#ff8c00]/10 group-hover:scale-105 transition-transform"
                                                style={{ backgroundImage: `url("${product.image_url}")` }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#181510]">{product.name}</span>
                                                <span className="text-xs text-neutral-500">{product.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`${catColors[product.category] || 'bg-gray-100 text-gray-600'} px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider`}>
                                                {product.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-[#ff8c00]">{formatRupiah(product.price)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={product.stock_status}
                                                        onChange={() => toggleStock(product.id)}
                                                    />
                                                    <div className="toggle-slider" />
                                                </label>
                                                <span className={`text-xs font-semibold ${product.stock_status ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {product.stock_status ? 'Tersedia' : 'Habis'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditModal(product)} className="p-2 text-neutral-400 hover:text-[#ff8c00] transition-colors">
                                                    <span className="material-symbols-outlined text-xl">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (window.confirm(`Hapus "${product.name}"?`)) {
                                                            deleteProduct(product.id)
                                                            toast.success(`"${product.name}" berhasil dihapus`)
                                                        }
                                                    }}
                                                    className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-[#fcfaf8]/30 border-t border-[#ff8c00]/10 flex items-center justify-between">
                    <span className="text-sm text-neutral-500">Menampilkan {filtered.length} dari {products.length} produk</span>
                    <div className="flex gap-2">
                        <button className="size-8 flex items-center justify-center rounded-lg border border-[#ff8c00]/10 hover:bg-[#ff8c00] hover:text-white transition-all">
                            <span className="material-symbols-outlined text-base">chevron_left</span>
                        </button>
                        <button className="size-8 flex items-center justify-center rounded-lg bg-[#ff8c00] text-white font-bold text-sm">1</button>
                        <button className="size-8 flex items-center justify-center rounded-lg border border-[#ff8c00]/10 hover:bg-[#ff8c00] hover:text-white transition-all">
                            <span className="material-symbols-outlined text-base">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-[#ff8c00]/20 mt-4">
                    <span className="material-symbols-outlined text-6xl text-[#ff8c00]/20 mb-4">search_off</span>
                    <h3 className="text-xl font-bold">Produk tidak ditemukan</h3>
                    <p className="text-neutral-500">Coba ubah pencarian atau filter kamu.</p>
                </div>
            )}

            {/* Add Menu Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Tambah Menu Baru</h2>
                            <button onClick={() => setShowAddModal(false)} className="size-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={handleAddSubmit}>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Nama Menu *</label>
                                <input type="text" required value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none" placeholder="Nama minuman" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Deskripsi</label>
                                <input type="text" value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none" placeholder="Bahan-bahan utama" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-1.5">Harga (Rp) *</label>
                                    <input type="number" required value={addForm.price} onChange={e => setAddForm(f => ({ ...f, price: e.target.value }))} className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none" placeholder="15000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-1.5">Kategori *</label>
                                    <select required value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none">
                                        <option value="">Pilih Kategori</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Gambar Produk</label>
                                {planLimits.productImages ? (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                        />
                                        {imagePreview ? (
                                            <div className="relative group">
                                                <img
                                                    src={imagePreview}
                                                    alt="Preview"
                                                    className="w-full h-40 object-cover rounded-xl border border-[#ff8c00]/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={clearImage}
                                                    className="absolute top-2 right-2 size-8 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                                <p className="text-xs text-neutral-400 mt-1.5">{imageFile?.name} ({(imageFile?.size / 1024).toFixed(0)} KB)</p>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-32 border-2 border-dashed border-[#ff8c00]/20 rounded-xl bg-[#fcfaf8] hover:bg-[#ff8c00]/5 hover:border-[#ff8c00]/40 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                                            >
                                                <span className="material-symbols-outlined text-3xl text-[#ff8c00]/30 group-hover:text-[#ff8c00]/60 transition-colors">add_photo_alternate</span>
                                                <span className="text-xs text-neutral-400 group-hover:text-neutral-600 font-medium transition-colors">Klik untuk upload gambar</span>
                                                <span className="text-[10px] text-neutral-300">JPG, PNG, WebP · Maks 5MB</span>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full text-center py-6 px-4 bg-[#fcfaf8] border border-slate-200 rounded-xl">
                                        <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">lock</span>
                                        <p className="text-sm text-slate-500 font-medium">Fitur Gambar Produk terkunci.</p>
                                        <p className="text-xs text-slate-400 mt-1">Upgrade ke paket Starter untuk mengunggah gambar.</p>
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">add_circle</span>
                                Simpan Menu
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Menu Modal */}
            {editProduct && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">Edit Menu</h2>
                            <button onClick={closeEditModal} className="size-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <form className="space-y-4" onSubmit={handleEditSubmit}>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Nama Menu *</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Deskripsi</label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                    className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-1.5">Harga (Rp) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={editForm.price}
                                        onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-neutral-600 mb-1.5">Kategori *</label>
                                    <select
                                        required
                                        value={editForm.category}
                                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                                        className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 outline-none"
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-600 mb-1.5">Gambar Produk</label>
                                {planLimits.productImages ? (
                                    <>
                                        <input
                                            ref={editFileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEditImage}
                                            className="hidden"
                                        />
                                        {editImagePreview ? (
                                            <div className="relative group">
                                                <img
                                                    src={editImagePreview}
                                                    alt="Preview"
                                                    className="w-full h-40 object-cover rounded-xl border border-[#ff8c00]/10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => editFileInputRef.current?.click()}
                                                    className="absolute top-2 right-2 size-8 bg-[#ff8c00] text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => editFileInputRef.current?.click()}
                                                className="w-full h-32 border-2 border-dashed border-[#ff8c00]/20 rounded-xl bg-[#fcfaf8] hover:bg-[#ff8c00]/5 hover:border-[#ff8c00]/40 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                                            >
                                                <span className="material-symbols-outlined text-3xl text-[#ff8c00]/30 group-hover:text-[#ff8c00]/60 transition-colors">add_photo_alternate</span>
                                                <span className="text-xs text-neutral-400 group-hover:text-neutral-600 font-medium">Klik untuk upload gambar</span>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full text-center py-6 px-4 bg-[#fcfaf8] border border-slate-200 rounded-xl mt-2">
                                        <span className="material-symbols-outlined text-slate-300 text-3xl mb-1">lock</span>
                                        <p className="text-sm text-slate-500 font-medium">Fitur Gambar Produk terkunci.</p>
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">save</span>
                                Simpan Perubahan
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}
