import { formatRupiah } from '../lib/utils'
import { useCart } from '../context/CartContext'
import toast from 'react-hot-toast'

export default function ProductCard({ product, index }) {
    const { addItem } = useCart()

    const handleAdd = () => {
        addItem(product)
        toast.success(`${product.name} ditambahkan!`, {
            icon: '🧃',
            style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#181510',
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 600,
            },
        })
    }

    return (
        <div
            className="bg-white rounded-2xl border border-[#ff8c00]/8 shadow-sm active:scale-[0.97] transition-all duration-300 overflow-hidden group animate-fade-in-up"
            style={{ animationDelay: `${index * 60}ms` }}
        >
            {/* Image */}
            <div className="relative overflow-hidden">
                <div
                    className="h-36 sm:h-44 lg:h-48 bg-center bg-cover transition-transform duration-500"
                    style={{ backgroundImage: `url("${product.image_url}")` }}
                />
                {/* Category badge — hidden on mobile for cleaner look */}
                <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                    <span className="hidden sm:inline bg-white/90 backdrop-blur-sm text-[#ff8c00] px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                        {product.category}
                    </span>
                </div>
                {!product.stock_status && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                        <span className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold">
                            Stok Habis
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 sm:p-5">
                <h3 className="font-bold text-sm sm:text-base text-[#181510] leading-tight mb-0.5">{product.name}</h3>
                <p className="text-[11px] sm:text-xs text-neutral-400 mb-2 sm:mb-4 line-clamp-1">{product.description}</p>

                <div className="flex items-center justify-between">
                    <span className="text-sm sm:text-lg font-extrabold text-[#ff8c00]">
                        {formatRupiah(product.price)}
                    </span>
                    {/* Mobile: circle + button, Desktop: full button */}
                    <button
                        onClick={handleAdd}
                        disabled={!product.stock_status}
                        className="sm:hidden size-9 rounded-full bg-[#ff8c00] text-white flex items-center justify-center shadow-lg shadow-[#ff8c00]/25 active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!product.stock_status}
                        className="hidden sm:flex items-center gap-1.5 bg-[#ff8c00] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                        <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                        Pesan
                    </button>
                </div>
            </div>
        </div>
    )
}
