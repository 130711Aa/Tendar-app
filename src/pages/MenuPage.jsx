import { useState, useMemo } from 'react'
import ProductCard from '../components/ProductCard'
import { useCategories } from '../context/CategoriesContext'
import { useProducts } from '../context/ProductsContext'
import { useCart } from '../context/CartContext'
import { useStoreStatus } from '../context/StoreStatusContext'
import { useTenantContext } from '../context/TenantContext'
import { formatRupiah } from '../lib/utils'
import TendarAIOrdering from '../components/TendarAIOrdering'

export default function MenuPage() {
    const { tenantName } = useTenantContext()
    const { filterCategories, loading: catLoading } = useCategories()
    const { availableProducts, loading: prodLoading } = useProducts()
    const { totalItems, totalPrice, isOpen, setIsOpen, addItem } = useCart()
    const { isStoreOpen } = useStoreStatus()
    const [selectedCategory, setSelectedCategory] = useState('Semua')
    const [searchQuery, setSearchQuery] = useState('')

    const isLoading = catLoading || prodLoading

    const filteredProducts = useMemo(() => {
        let products = availableProducts
        if (selectedCategory !== 'Semua') {
            products = products.filter(p => p.category === selectedCategory)
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            products = products.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
            )
        }
        return products
    }, [selectedCategory, searchQuery, availableProducts])

    // Loading Skeletons for categories and products
    if (isLoading) {
        return (
            <main className="flex flex-1 flex-col min-h-screen bg-[#faf8f5]">
                <div className="px-4 md:px-8 pt-4">
                    <div className="h-40 md:h-64 rounded-2xl bg-slate-200 animate-pulse" />
                </div>
                <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
                    <div className="flex gap-2 mb-8 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-10 w-24 bg-slate-200 rounded-full animate-pulse" />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="flex flex-1 flex-col min-h-screen bg-[#faf8f5]">
            {/* Hero Banner — compact on mobile, full on desktop */}
            <div className="px-4 md:px-8 pt-4 md:pt-0">
                <div className="rounded-2xl relative bg-gradient-to-br from-[#ff8c00] via-[#ff9b20] to-[#ff6b00] px-5 md:px-8 py-6 md:py-16 overflow-hidden">
                    {/* Decorative */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 -right-10 w-40 md:w-64 h-40 md:h-64 bg-white/5 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-60 md:w-96 h-60 md:h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>
                        <div className="absolute top-4 right-4 md:top-8 md:right-12 text-5xl md:text-9xl opacity-[0.07] select-none material-symbols-outlined blur-sm">restaurant</div>
                        <div className="absolute bottom-2 left-4 md:bottom-8 md:left-16 text-5xl md:text-9xl opacity-[0.07] select-none material-symbols-outlined blur-[2px]">shopping_bag</div>
                    </div>
                    <div className="relative z-10">
                        <span className="inline-block bg-white/20 backdrop-blur-sm text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full text-xs md:text-sm font-semibold mb-2 md:mb-4">
                            🏪 Buka & Siap Melayani!
                        </span>
                        <h1 className="text-xl md:text-5xl font-black tracking-tight text-white mb-1 md:mb-3 leading-tight truncate">
                            Selamat Datang{tenantName ? ` di ${tenantName}` : '!'}
                        </h1>
                        <p className="text-white/80 text-xs md:text-lg max-w-lg leading-relaxed">
                            Pilih dan pesan menu favoritmu dengan mudah secara online.
                        </p>
                    </div>
                </div>
            </div>

            {/* Store Closed Banner */}
            {!isStoreOpen && (
                <div className="mx-4 md:mx-8 mt-3">
                    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500 text-2xl">store</span>
                        <div>
                            <p className="text-sm font-bold text-red-700">Toko sedang tutup</p>
                            <p className="text-xs text-red-500">Pesanan tidak dapat dilakukan saat ini. Silakan kembali nanti.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-4 md:py-8 pb-28 md:pb-8">
                {/* Search */}
                <div className="mb-4 md:mb-6">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 md:pl-4 text-neutral-400">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </span>
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="block w-full h-10 md:h-12 bg-white border border-[#ff8c00]/10 rounded-xl pl-10 md:pl-12 pr-4 text-[#181510] placeholder:text-neutral-400 focus:ring-2 focus:ring-[#ff8c00]/30 text-sm outline-none transition-all shadow-sm"
                            placeholder="Cari minuman..."
                        />
                    </div>
                </div>

                {/* Category Pills */}
                <div className="flex gap-2 mb-5 md:mb-8 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
                    {filterCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-[#ff8c00] text-white shadow-md shadow-[#ff8c00]/20'
                                : 'bg-white text-neutral-500 hover:bg-[#ff8c00]/10 border border-neutral-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid — 2 cols mobile, 3-4 cols desktop */}
                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 md:py-20 bg-white rounded-2xl border-2 border-dashed border-[#ff8c00]/20">
                        <span className="material-symbols-outlined text-5xl md:text-6xl text-[#ff8c00]/20 mb-3">search_off</span>
                        <h3 className="text-lg md:text-xl font-bold text-neutral-400">Produk tidak ditemukan</h3>
                        <p className="text-neutral-400 text-xs md:text-sm mt-1">Coba ubah pencarian atau filter kamu.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                        {filteredProducts.map((product, idx) => (
                            <ProductCard key={product.id} product={product} index={idx} />
                        ))}
                    </div>
                )}

                {/* Footer Info — desktop only */}
                <div className="hidden md:block mt-16 mb-8 text-center">
                    <div className="bg-white rounded-2xl border border-[#ff8c00]/10 p-8 shadow-sm">
                        <div className="flex items-center justify-center gap-3">
                            <div className="size-12 rounded-xl bg-[#ff8c00]/10 text-[#ff8c00] flex items-center justify-center">
                                <span className="material-symbols-outlined">thumb_up</span>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold">Layanan Terbaik</p>
                                <p className="text-xs text-neutral-500">Kualitas terjamin untuk setiap pesanan</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Bottom Cart Bar — mobile only */}
            {totalItems > 0 && (
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-[#faf8f5] via-[#faf8f5] to-transparent">
                    <button
                        onClick={() => isStoreOpen && setIsOpen(true)}
                        disabled={!isStoreOpen}
                        className={`w-full rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl active:scale-[0.98] transition-transform ${isStoreOpen
                                ? 'bg-[#ff8c00] text-white shadow-[#ff8c00]/30'
                                : 'bg-neutral-300 text-neutral-500 shadow-neutral-200 cursor-not-allowed'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-xl flex items-center justify-center ${isStoreOpen ? 'bg-white/20' : 'bg-white/30'}`}>
                                <span className="material-symbols-outlined">{isStoreOpen ? 'shopping_bag' : 'block'}</span>
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-medium" style={{ opacity: 0.7 }}>
                                    {isStoreOpen ? `${totalItems} item` : 'Toko Tutup'}
                                </p>
                                <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ opacity: 0.5 }}>
                                    {isStoreOpen ? 'Lihat Keranjang' : 'Tidak bisa pesan'}
                                </p>
                            </div>
                        </div>
                        <span className="text-lg font-black">{formatRupiah(totalPrice)}</span>
                    </button>
                </div>
            )}

            {/* AI Ordering Widget */}
            {isStoreOpen && (
                <TendarAIOrdering
                    menuItems={availableProducts}
                    onAddToCart={(item, qty) => {
                        for (let i = 0; i < qty; i++) addItem(item)
                    }}
                    merchantName={tenantName || 'Warung'}
                    cartIsOpen={isOpen}
                />
            )}
        </main>
    )
}
