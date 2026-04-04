import { useState, useEffect, useRef, useCallback } from 'react'
import qrisImage from '/qrcode.jpeg'
import { useProducts } from '../context/ProductsContext'
import { useCategories } from '../context/CategoriesContext'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { formatRupiah } from '../lib/utils'
import POSLayout from '../components/pos/POSLayout'
import toast from 'react-hot-toast'
import { usePrinter } from '../context/PrinterContext'
import { useTenantContext } from '../context/TenantContext'

function SwipeableCartItem({ item, updateQuantity, removeFromCart, formatRupiah }) {
    const [translateX, setTranslateX] = useState(0)
    const [isSwiping, setIsSwiping] = useState(false)
    const startXRef = useRef(0)
    const THRESHOLD = 100

    // Touch events for mobile/tablet
    const onTouchStart = (e) => {
        startXRef.current = e.touches[0].clientX
        setIsSwiping(true)
    }
    const onTouchMove = (e) => {
        if (!isSwiping) return
        const diff = e.touches[0].clientX - startXRef.current
        if (diff > 0) setTranslateX(diff) // Only Right swipe
    }
    const onTouchEnd = () => {
        if (!isSwiping) return
        setIsSwiping(false)
        if (translateX > THRESHOLD) {
            setTranslateX(window.innerWidth) // slide out
            setTimeout(() => removeFromCart(item.id), 250)
        } else {
            setTranslateX(0) // snap back
        }
    }

    // Mouse events for desktop debugging
    const onMouseDown = (e) => {
        startXRef.current = e.clientX
        setIsSwiping(true)
    }
    const onMouseMove = (e) => {
        if (!isSwiping) return
        const diff = e.clientX - startXRef.current
        if (diff > 0) setTranslateX(diff)
    }
    const onMouseUp = () => {
        if (!isSwiping) return
        setIsSwiping(false)
        if (translateX > THRESHOLD) {
            setTranslateX(window.innerWidth)
            setTimeout(() => removeFromCart(item.id), 250)
        } else {
            setTranslateX(0)
        }
    }

    return (
        <div className="relative overflow-hidden rounded-2xl mb-2 bg-[#fee2e2]">
            {/* Delete Background / Icon under the swipeable item */}
            <div className="absolute inset-0 flex items-center justify-start px-4 text-red-600">
                <span className="material-symbols-outlined text-3xl">delete</span>
                <span className="ml-2 font-bold text-sm uppercase tracking-widest whitespace-nowrap">Hapus Item</span>
            </div>

            {/* Swipeable Surface */}
            <div
                className="relative flex items-center gap-4 bg-white p-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-transform ease-out will-change-transform z-10 select-none cursor-grab active:cursor-grabbing"
                style={{
                    transform: `translateX(${translateX}px)`,
                    transitionDuration: isSwiping ? '0ms' : '250ms'
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
            >
                {/* Thumbnail */}
                {item.image_url ? (
                    <div
                        className="w-14 h-14 rounded-xl bg-cover bg-center shadow-sm flex-shrink-0"
                        style={{ backgroundImage: `url(${item.image_url})` }}
                    />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-slate-300 text-2xl">local_drink</span>
                    </div>
                )}
                
                {/* Info */}
                <div className="flex-1 min-w-0 pointer-events-none">
                    <h4 className="text-sm font-bold text-slate-900 truncate font-display">{item.name}</h4>
                    <p className="text-xs text-slate-500 font-sans">{formatRupiah(item.price)}</p>
                </div>
                
                {/* Quantity Controls - stopPropagation so swipe doesn't interfere when tapping buttons */}
                <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}>
                    <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        <span className="text-lg font-bold leading-none">−</span>
                    </button>
                    <span className="font-bold text-sm w-6 text-center tabular-nums font-display">{item.quantity}</span>
                    <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#ff8c00]/10 text-[#ff8c00] font-bold hover:bg-[#ff8c00]/20 transition-colors"
                    >
                        <span className="text-lg leading-none">+</span>
                    </button>
                </div>
                
                {/* Subtotal */}
                <div className="text-right ml-2 min-w-[70px] pointer-events-none">
                    <p className="text-sm font-black text-slate-900 tabular-nums font-display">{formatRupiah(item.price * item.quantity)}</p>
                </div>
            </div>
        </div>
    )
}

export default function POSPage() {
    // Persist POS session
    useEffect(() => {
        sessionStorage.setItem('pos_mode', 'true')
    }, [])

    const { products } = useProducts()
    const { filterCategories } = useCategories()
    const { addOrder } = useOrders()
    const { user } = useAuth()
    const { btConnected, btPrinterName, handleConnectPrinter, handleDirectPrint } = usePrinter()
    const { tenantName, slug, planLimits } = useTenantContext()

    if (planLimits && !planLimits.posEnabled) {
        return (
            <div className="min-h-screen bg-[#fcfaf8] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">lock</span>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Fitur Kasir Terkunci</h1>
                <p className="text-slate-500 mb-6 max-w-md">Paket Anda saat ini tidak mendukung fitur Point of Sale (POS). Silakan upgrade paket untuk menggunakan fitur ini.</p>
                <button
                    onClick={() => { sessionStorage.removeItem('pos_mode'); window.location.href = `/${slug}/admin/billing` }}
                    className="bg-[#ff8c00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#e07800] transition-colors shadow-lg"
                >
                    Lihat Paket Langganan
                </button>
            </div>
        )
    }

    // POS-local cart (separate from customer CartContext)
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('Semua')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [orderNote, setOrderNote] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    // Payment-specific state
    const [cashPaidAmount, setCashPaidAmount] = useState('')
    const [changeAmount, setChangeAmount] = useState(0)
    const [isPaymentValid, setIsPaymentValid] = useState(false)
    const [isQrisGenerated, setIsQrisGenerated] = useState(false)
    const [isPaid, setIsPaid] = useState(false)

    const searchRef = useRef(null)

    // Auto-focus search on mount
    useEffect(() => {
        searchRef.current?.focus()
    }, [])


    // Reset payment-specific state when switching methods
    const handlePaymentMethodChange = (method) => {
        setPaymentMethod(method)
        setCashPaidAmount('')
        setChangeAmount(0)
        setIsQrisGenerated(false)
        setIsPaid(false)
        setIsPaymentValid(false)
    }

    // Filtered products
    const availableProducts = products.filter(p => p.stock_status)
    const outOfStockProducts = products.filter(p => !p.stock_status)

    const filtered = [...availableProducts, ...outOfStockProducts].filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
        const matchCategory = activeCategory === 'Semua' || p.category === activeCategory
        return matchSearch && matchCategory
    })

    // Cart operations
    const addToCart = useCallback((product) => {
        if (!product.stock_status) return
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                )
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }, [])

    const updateQuantity = useCallback((productId, delta) => {
        setCart(prev =>
            prev
                .map(item =>
                    item.id === productId
                        ? { ...item, quantity: item.quantity + delta }
                        : item
                )
                .filter(item => item.quantity > 0)
        )
    }, [])

    const removeFromCart = useCallback((productId) => {
        setCart(prev => prev.filter(item => item.id !== productId))
    }, [])

    const clearCart = useCallback(() => {
        setCart([])
        setOrderNote('')
        setCustomerName('')
        setPaymentMethod('')
        setCashPaidAmount('')
        setChangeAmount(0)
        setIsQrisGenerated(false)
        setIsPaid(false)
        setIsPaymentValid(false)
    }, [])

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = subtotal

    // Cash change calculation
    useEffect(() => {
        if (paymentMethod === 'cash') {
            const paid = parseInt(cashPaidAmount) || 0
            const change = paid - totalAmount
            setChangeAmount(Math.max(0, change))
            setIsPaymentValid(paid >= totalAmount && totalAmount > 0)
        } else if (paymentMethod === 'qris') {
            setIsPaymentValid(isQrisGenerated)
        } else {
            setIsPaymentValid(false)
        }
    }, [cashPaidAmount, totalAmount, paymentMethod, isQrisGenerated])

    // Currency input handler — numbers only
    const handleCashInput = (e) => {
        const raw = e.target.value.replace(/\D/g, '')
        setCashPaidAmount(raw)
    }

    // Payment
    const handlePayment = async () => {
        if (cart.length === 0) {
            toast.error('Keranjang kosong!')
            return
        }

        // QRIS first click: generate QR code
        if (paymentMethod === 'qris' && !isQrisGenerated) {
            setIsQrisGenerated(true)
            return
        }

        // QRIS second click: confirm payment
        if (paymentMethod === 'qris' && isQrisGenerated && !isPaid) {
            setIsPaid(true)
        }

        setIsProcessing(true)
        try {
            const orderData = {
                customer_name: customerName.trim() || 'Walk-in Customer',
                customer_phone: '-',
                customer_address: '',
                notes: orderNote.trim() || 'POS Order',
                total_amount: totalAmount,
                payment_method: paymentMethod,
                items: cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                })),
                // Add kembalian fields for cash payments
                ...(paymentMethod === 'cash' && {
                    cash_paid: parseInt(cashPaidAmount) || 0,
                    change_amount: changeAmount
                })
            }

            const savedOrder = await addOrder(orderData)

            // Auto-print receipt silently via Web Bluetooth
            if (btConnected && savedOrder) {
                try {
                    await handleDirectPrint(savedOrder, false)
                } catch (e) {
                    console.error('BLE Auto-print failed:', e)
                    toast.error('Gagal cetak otomatis: ' + e.message)
                }
            }

            toast.success('Pembayaran berhasil! ✅', {
                duration: 2500,
                style: { background: '#10b981', color: '#fff', fontWeight: 'bold', fontSize: '15px' },
            })

            // Reset for next transaction
            setCart([])
            setCustomerName('')
            setOrderNote('')
            setSearch('')
            setPaymentMethod('')
            setCashPaidAmount('')
            setChangeAmount(0)
            setIsQrisGenerated(false)
            setIsPaid(false)
            setIsPaymentValid(false)

            // Refocus search
            setTimeout(() => searchRef.current?.focus(), 100)
        } catch (err) {
            console.error('Payment error:', err)
            toast.error('Gagal memproses pembayaran')
        } finally {
            setIsProcessing(false)
        }
    }

    // Determine if the pay button should be disabled
    const isPayButtonDisabled = () => {
        if (cart.length === 0 || isProcessing || !paymentMethod) return true
        if (paymentMethod === 'cash') return !isPaymentValid
        if (paymentMethod === 'qris' && isQrisGenerated) return false // allow confirm click
        return false
    }

    // Get pay button label
    const getPayButtonLabel = () => {
        if (isProcessing) return null // handled separately
        if (paymentMethod === 'qris' && isQrisGenerated) return 'Konfirmasi Pembayaran'
        if (paymentMethod === 'qris') return `Bayar ${formatRupiah(totalAmount)}`
        if (cart.length > 0) return `Bayar ${formatRupiah(totalAmount)}`
        return 'Bayar'
    }

    return (
        <POSLayout>
            {/* ═══ LEFT: Product Browsing (60%) ═══ */}
            <section className="w-[60%] flex flex-col p-5 gap-3 overflow-hidden">
                {/* Search Bar */}
                <div className="relative group flex-shrink-0">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ff8c00] transition-colors">search</span>
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Cari menu (contoh: Mangga, Avocado...)"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#f3f4f5] border-none rounded-full py-4 pl-14 pr-12 text-sm font-medium focus:ring-2 focus:ring-[#ff8c00]/30 transition-all outline-none text-slate-900"
                    />
                    {search && (
                        <button
                            onClick={() => { setSearch(''); searchRef.current?.focus() }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>

                {/* Categories */}
                <div className="flex gap-3 overflow-x-auto pb-2 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {filterCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`whitespace-nowrap px-6 py-2.5 rounded-full font-semibold transition-all ${activeCategory === cat
                                ? 'bg-[#ff8c00] text-white shadow-lg shadow-[#ff8c00]/20 font-bold'
                                : 'bg-[#f3f4f5] text-slate-600 hover:bg-[#e3e4e5] border-none shadow-none'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid — scrollable */}
                <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-3">search_off</span>
                            <p className="text-base font-medium">Produk tidak ditemukan</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-4">
                            {filtered.map(product => {
                                const inCart = cart.find(c => c.id === product.id)
                                const isOutOfStock = !product.stock_status

                                return isOutOfStock ? (
                                    /* Out of Stock Card */
                                    <div
                                        key={product.id}
                                        className="flex flex-col bg-white rounded-2xl overflow-hidden opacity-60 relative border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] grayscale cursor-not-allowed"
                                    >
                                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">HABIS</span>
                                        </div>
                                        {product.image_url ? (
                                            <div
                                                className="aspect-[4/5] w-full bg-slate-100 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${product.image_url})` }}
                                            />
                                        ) : (
                                            <div className="aspect-[4/5] w-full bg-slate-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-300 text-4xl">local_drink</span>
                                            </div>
                                        )}
                                        <div className="p-4 flex flex-col gap-1">
                                            <span className="text-[#ff8c00] text-[10px] font-bold uppercase tracking-widest">{product.category}</span>
                                            <h3 className="font-bold text-slate-900 truncate font-display">{product.name}</h3>
                                            <p className="text-lg font-black text-slate-900 font-display">{formatRupiah(product.price)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Available Product Card */
                                    <button
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_16px_32px_-10px_rgba(25,28,29,0.06)] hover:-translate-y-1 transition-all duration-300 group text-left relative"
                                    >
                                        {product.image_url ? (
                                            <div
                                                className="aspect-[4/5] w-full bg-slate-100 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${product.image_url})` }}
                                            />
                                        ) : (
                                            <div className="aspect-[4/5] w-full bg-slate-100 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-300 text-4xl group-hover:text-[#ff8c00] transition-colors">local_drink</span>
                                            </div>
                                        )}
                                        <div className="p-4 flex flex-col gap-1 relative">
                                            <span className="text-[#ff8c00] text-[10px] font-bold uppercase tracking-widest">{product.category}</span>
                                            <h3 className="font-bold text-slate-900 truncate font-display">{product.name}</h3>
                                            <p className="text-lg font-black text-slate-900 font-display">{formatRupiah(product.price)}</p>
                                            {inCart && (
                                                <span className="absolute top-4 right-4 h-8 min-w-8 px-2 bg-[#ff8c00] text-white rounded-full text-sm font-black flex items-center justify-center shadow-lg shadow-[#ff8c00]/30 font-display pointer-events-none">
                                                    {inCart.quantity}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* ═══ RIGHT: Cart & Payment (40%) ═══ */}
            <aside className="w-[40%] bg-[#f3f4f5] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-20">
                {/* Cart Header */}
                <div className="px-6 py-5 flex justify-between items-center bg-white/50 backdrop-blur-md pb-4 z-10 sticky top-0">
                    <h2 className="text-xl font-display font-bold text-slate-900">Pesanan</h2>
                    <div className="flex items-center gap-2">
                        {/* Printer Status Chip */}
                        <button
                            onClick={() => { if (!btConnected) handleConnectPrinter().catch(e => alert(e.message)) }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                btConnected 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-white text-slate-500 hover:bg-slate-50 cursor-pointer shadow-sm'
                            }`}
                            title={btConnected ? `Printer: ${btPrinterName}` : 'Printer belum terhubung'}
                        >
                            <span className="material-symbols-outlined text-[14px]">
                                {btConnected ? 'bluetooth_connected' : 'bluetooth'}
                            </span>
                            {btConnected ? 'Siap' : 'Offline'}
                        </button>

                        {totalItems > 0 && (
                            <span className="text-xs bg-[#ff8c00]/10 text-[#ff8c00] px-3 py-1.5 rounded-full font-bold font-display">
                                {totalItems}
                            </span>
                        )}
                        {cart.length > 0 && (
                            <button
                                onClick={clearCart}
                                className="text-xs text-red-500 hover:text-red-600 font-bold transition-colors bg-white px-3 py-1.5 rounded-full shadow-sm"
                            >
                                Kosongkan
                            </button>
                        )}
                    </div>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto px-6 py-2 pb-6 space-y-0" style={{ scrollbarWidth: 'thin' }}>
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-4 opacity-50">shopping_bag</span>
                            <p className="text-base font-bold text-slate-500 font-sans">Belum ada pesanan</p>
                            <p className="text-sm text-slate-400 font-sans mt-1">Tap produk untuk menambahkan ke keranjang</p>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-2">
                            {cart.map(item => (
                                <SwipeableCartItem 
                                    key={item.id} 
                                    item={item} 
                                    updateQuantity={updateQuantity} 
                                    removeFromCart={removeFromCart} 
                                    formatRupiah={formatRupiah}
                                />
                            ))}

                            {/* Customer Name */}
                            <div className="mt-6">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-2">Nama Pelanggan</label>
                                <input
                                    type="text"
                                    placeholder="Opsional (Walk-in Customer)"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    className="w-full bg-white border-none rounded-2xl text-sm p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-[#904d00]/20 outline-none font-sans font-medium"
                                />
                            </div>

                            {/* Order Note */}
                            <div className="mt-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block px-2">Catatan Pesanan</label>
                                <textarea
                                    value={orderNote}
                                    onChange={e => setOrderNote(e.target.value)}
                                    className="w-full bg-white border-none rounded-2xl text-sm p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] focus:ring-2 focus:ring-[#ff8c00]/30 h-24 resize-none outline-none font-sans font-medium"
                                    placeholder="Tambahkan catatan (contoh: Tanpa gula, sedikit es...)"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Pricing Summary & Payment */}
                <div className="bg-white p-6 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.04)] space-y-5 relative z-30">
                    {/* Price Breakdown */}
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm text-slate-500 font-sans font-bold">
                            <span>Subtotal</span>
                            <span className="tabular-nums font-display">{formatRupiah(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-3xl font-black text-slate-900 pt-3 border-t border-slate-100">
                            <span className="text-base text-slate-600 font-bold self-end mb-1">Total</span>
                            <span className="text-[#ff8c00] tabular-nums font-display tracking-tight">{formatRupiah(totalAmount)}</span>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { value: 'cash', label: 'Tunai', icon: 'payments' },
                            { value: 'qris', label: 'QRIS', icon: 'qr_code_2' },
                        ].map(method => (
                            <button
                                key={method.value}
                                onClick={() => handlePaymentMethodChange(method.value)}
                                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border-[3px] font-bold transition-all ${paymentMethod === method.value
                                    ? 'border-[#ff8c00] bg-[#ff8c00]/5 text-[#ff8c00] shadow-[0_4px_12px_rgba(255,140,0,0.15)]'
                                    : 'border-slate-100 text-slate-500 hover:border-slate-200 bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-2xl">{method.icon}</span>
                                <span className="text-[11px] uppercase tracking-widest">{method.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* ── Cash Flow: Input & Change Calculation ── */}
                    {paymentMethod === 'cash' && (
                        <div className="space-y-3 animate-fade-in">
                            {/* Uang dibayar input */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Uang Dibayar</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={cashPaidAmount ? parseInt(cashPaidAmount).toLocaleString('id-ID') : ''}
                                        onChange={handleCashInput}
                                        placeholder="0"
                                        className="w-full bg-white border-2 border-slate-200 rounded-xl text-lg font-bold p-3 pl-12 focus:ring-2 focus:ring-[#ff8c00]/50 focus:border-[#ff8c00] outline-none transition-all tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* Calculation summary */}
                            {cashPaidAmount && (
                                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total Belanja</span>
                                        <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Uang Dibayar</span>
                                        <span className="font-bold text-slate-900 tabular-nums">{formatRupiah(parseInt(cashPaidAmount) || 0)}</span>
                                    </div>
                                    <div className="border-t border-slate-100 pt-2 flex justify-between">
                                        <span className="font-bold text-slate-700">Kembalian</span>
                                        <span className={`text-lg font-black tabular-nums ${isPaymentValid ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {isPaymentValid ? formatRupiah(changeAmount) : '-'}
                                        </span>
                                    </div>
                                    {/* Validation message */}
                                    {!isPaymentValid && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs font-semibold mt-1">
                                            <span className="material-symbols-outlined text-sm">error</span>
                                            Uang tidak cukup
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── QRIS Flow: Generate & Confirm ── */}
                    {paymentMethod === 'qris' && isQrisGenerated && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
                                <p className="text-sm font-bold text-slate-600 mb-3">Scan QRIS untuk membayar</p>
                                <div className="flex justify-center mb-3">
                                    <img
                                        src={qrisImage}
                                        alt={`QRIS ${tenantName || 'Toko Saya'}`}
                                        className="w-56 h-56 object-contain rounded-lg border border-slate-200 bg-white p-2"
                                    />
                                </div>
                                <div className="bg-[#ff8c00]/5 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#ff8c00] text-base">info</span>
                                    <span className="text-xs text-[#ff8c00] font-medium">
                                        Total: <span className="font-extrabold">{formatRupiah(totalAmount)}</span>
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-3">Menunggu konfirmasi pembayaran...</p>
                            </div>
                        </div>
                    )}

                    {/* Pay / Confirm Button */}
                    <button
                        onClick={handlePayment}
                        disabled={isPayButtonDisabled()}
                        className={`w-full min-h-[64px] rounded-full text-[17px] font-black transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 font-display ${isPayButtonDisabled()
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : paymentMethod === 'qris' && isQrisGenerated
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.4)] hover:-translate-y-0.5'
                                : 'bg-[#ff8c00] hover:bg-[#e67e00] text-white shadow-[0_12px_40px_rgba(255,140,0,0.25)] hover:shadow-[0_16px_50px_rgba(255,140,0,0.35)] hover:-translate-y-0.5'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">
                                    {paymentMethod === 'qris' && isQrisGenerated ? 'verified' : 'arrow_forward'}
                                </span>
                                {getPayButtonLabel()}
                            </>
                        )}
                    </button>
                </div>
            </aside>
        </POSLayout>
    )
}
