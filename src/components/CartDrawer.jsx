import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useTenantContext } from '../context/TenantContext'
import { formatRupiah } from '../lib/utils'
import { useState } from 'react'
import CheckoutModal from './CheckoutModal'

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, updateQuantity, removeItem, totalPrice, clearCart } = useCart()
    const { user } = useAuth()
    const { slug } = useTenantContext()
    const navigate = useNavigate()
    const [showCheckout, setShowCheckout] = useState(false)

    const handleCheckout = () => {
        if (!user) {
            toast.error('Silakan login terlebih dahulu untuk memesan!')
            setIsOpen(false)
            navigate(`/${slug}/auth`)
            return
        }
        setShowCheckout(true)
    }

    return (
        <>
            {/* Overlay — only shown when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Drawer — always in DOM, slide in/out via CSS transform */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                aria-hidden={!isOpen}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#ff8c00]/10">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-[#ff8c00]/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ff8c00]">shopping_cart</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Keranjang Belanja</h2>
                            <p className="text-xs text-neutral-500">{items.length} produk</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="size-10 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <span className="material-symbols-outlined text-6xl text-[#ff8c00]/20 mb-4">remove_shopping_cart</span>
                            <h3 className="text-lg font-bold text-neutral-400">Keranjang Kosong</h3>
                            <p className="text-sm text-neutral-400 mt-1">Yuk, pilih menu favoritmu!</p>
                        </div>
                    ) : (
                        items.map(item => (
                            <div key={item.id} className="flex gap-4 bg-[#fcfaf8] rounded-xl p-4 border border-[#ff8c00]/5">
                                <div
                                    className="size-16 rounded-lg bg-center bg-cover shrink-0"
                                    style={{ backgroundImage: `url("${item.image_url}")` }}
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm truncate">{item.name}</h4>
                                    <p className="text-xs text-neutral-500 mb-2">{item.description}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-extrabold text-[#ff8c00]">
                                            {formatRupiah(item.price * item.quantity)}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="qty-btn"
                                            >
                                                −
                                            </button>
                                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="qty-btn"
                                            >
                                                +
                                            </button>
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="ml-1 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 border-t border-[#ff8c00]/10 space-y-4 bg-white">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-neutral-500 font-medium">Total Bayar</span>
                            <span className="text-2xl font-extrabold text-[#ff8c00]">{formatRupiah(totalPrice)}</span>
                        </div>
                        <button
                            onClick={handleCheckout}
                            className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">shopping_bag</span>
                            Checkout Sekarang
                        </button>
                        <button
                            onClick={clearCart}
                            className="w-full text-red-400 hover:text-red-600 py-2 text-sm font-medium transition-colors"
                        >
                            Kosongkan Keranjang
                        </button>
                    </div>
                )}
            </div>

            {showCheckout && (
                <CheckoutModal
                    onClose={() => setShowCheckout(false)}
                    onSuccess={() => {
                        setShowCheckout(false)
                        setIsOpen(false)
                    }}
                />
            )}
        </>
    )
}
