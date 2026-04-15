import { useState, useMemo, useEffect, useRef } from 'react'
import { useOrders } from '../context/OrdersContext'
import { useStoreStatus } from '../context/StoreStatusContext'
import { formatRupiah } from '../lib/utils'
import { usePrinter } from '../context/PrinterContext'

const STATUS_CONFIG = {
    pending: {
        label: 'Menunggu',
        color: 'bg-orange-100 text-orange-700',
        icon: 'schedule',
        next: 'processing',
        nextLabel: 'Proses Pesanan',
        nextIcon: 'play_arrow',
    },
    processing: {
        label: 'Diproses',
        color: 'bg-blue-100 text-blue-700',
        icon: 'autorenew',
        next: 'completed',
        nextLabel: 'Selesaikan',
        nextIcon: 'check_circle',
    },
    completed: {
        label: 'Selesai',
        color: 'bg-green-100 text-green-700',
        icon: 'check_circle',
        next: null,
        nextLabel: null,
        nextIcon: null,
    },
}

const FILTER_TABS = [
    { key: 'active', label: 'Aktif', icon: 'playlist_play' },
    { key: 'all', label: 'Semua', icon: 'list' },
    { key: 'pending', label: 'Menunggu', icon: 'schedule' },
    { key: 'processing', label: 'Diproses', icon: 'autorenew' },
    { key: 'completed', label: 'Selesai', icon: 'check_circle' },
]

export default function OrdersPage() {
    const { orders, updateOrderStatus, deleteOrder, clearAllOrders } = useOrders()
    const { isStoreOpen } = useStoreStatus()
    const [activeFilter, setActiveFilter] = useState('active')
    const [expandedOrder, setExpandedOrder] = useState(null)
    const [proofModal, setProofModal] = useState(null) // URL of proof to preview
    
    // Web Bluetooth from global context
    const { 
        btConnected, 
        btPrinterName, 
        btConnecting, 
        lastPrinterName,
        handleConnectPrinter, 
        handleDirectPrint 
    } = usePrinter()

    const onConnectClick = async () => {
        try {
            await handleConnectPrinter()
        } catch (err) {
            alert(err.message)
        }
    }

    const todaysOrders = useMemo(() => {
        // 1. Get Current Time (WIB/Local)
        // Force 'Asia/Jakarta' timezone so we follow store hours everywhere
        const now = new Date()
        const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))

        // 2. DAILY CUTOFF RULE:
        // Use manual toggle from admin instead of time-based cutoff.
        // The user wants orders to be "submitted to history" (visually cleared) when store is manually closed.
        if (!isStoreOpen) {
            return []
        }

        // 3. Filter for TODAY only
        // effectively "Today's Session"
        const todayStr = jakartaTime.toDateString()

        return orders.filter(o => {
            const orderDate = new Date(o.created_at)
            const orderJakartaDate = new Date(orderDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
            return orderJakartaDate.toDateString() === todayStr
        })
    }, [orders])

    const counts = useMemo(() => ({
        active: todaysOrders.filter(o => o.status === 'pending' || o.status === 'processing').length,
        all: todaysOrders.length,
        pending: todaysOrders.filter(o => o.status === 'pending').length,
        processing: todaysOrders.filter(o => o.status === 'processing').length,
        completed: todaysOrders.filter(o => o.status === 'completed').length,
    }), [todaysOrders])

    const filteredOrders = useMemo(() => {
        let filtered = [...todaysOrders]

        // 4. Existing Status Filter
        if (activeFilter === 'active') {
            filtered = filtered.filter(o => o.status === 'pending' || o.status === 'processing')
        } else if (activeFilter !== 'all') {
            filtered = filtered.filter(o => o.status === activeFilter)
        }

        filtered.sort((a, b) => {
            const statusOrder = { pending: 0, processing: 0, completed: 2 }
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status]
            }
            return new Date(a.created_at) - new Date(b.created_at) // Oldest first (FIFO)
        })
        return filtered
    }, [todaysOrders, activeFilter])

    const formatDate = (iso) => {
        const d = new Date(iso)
        return d.toLocaleString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        })
    }

    const getTimeAgo = (iso) => {
        const diff = Date.now() - new Date(iso).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 1) return 'Baru saja'
        if (mins < 60) return `${mins} menit lalu`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours} jam lalu`
        const days = Math.floor(hours / 24)
        return `${days} hari lalu`
    }

    const shopIsClosed = !isStoreOpen

    return (
        <main className="flex flex-1 flex-col px-4 md:px-10 py-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Pesanan Masuk</h1>
                    <p className="text-neutral-500 text-base">Kelola pesanan dari pelanggan secara real-time</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {counts.pending > 0 && (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-4 py-2 rounded-xl animate-pulse">
                            <span className="material-symbols-outlined text-orange-500 text-lg">notification_important</span>
                            <span className="text-sm font-bold text-orange-700">{counts.pending} pesanan menunggu</span>
                        </div>
                    )}
                    {/* Connect Printer Button */}
                    <button
                        onClick={onConnectClick}
                        disabled={btConnecting}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                            btConnected
                                ? 'bg-green-50 text-green-700 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                                : 'text-blue-500 border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {btConnecting ? 'hourglass_top' : btConnected ? 'bluetooth_connected' : 'bluetooth'}
                        </span>
                        {btConnecting 
                            ? 'Menghubungkan...' 
                            : btConnected 
                                ? `✅ ${btPrinterName}` 
                                : lastPrinterName 
                                    ? `Hubungkan Kembali ke ${lastPrinterName}` 
                                    : 'Hubungkan Printer'
                        }
                    </button>
                    {orders.length > 0 && (
                        <button
                            onClick={() => { if (confirm('Hapus semua pesanan? Data tidak bisa dikembalikan.')) clearAllOrders() }}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                        >
                            <span className="material-symbols-outlined text-lg">delete_sweep</span>
                            Hapus Semua
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {FILTER_TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveFilter(tab.key)}
                        className={`p-4 rounded-xl border transition-all text-left ${activeFilter === tab.key
                            ? 'bg-[#ff8c00] text-white border-[#ff8c00] shadow-lg shadow-[#ff8c00]/20'
                            : 'bg-white border-[#ff8c00]/10 hover:border-[#ff8c00]/30'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`material-symbols-outlined text-xl ${activeFilter === tab.key ? 'text-white' : 'text-[#ff8c00]'}`}>
                                {tab.icon}
                            </span>
                            <span className={`text-2xl font-black ${activeFilter === tab.key ? 'text-white' : 'text-[#181510]'}`}>
                                {counts[tab.key]}
                            </span>
                        </div>
                        <p className={`text-xs font-semibold ${activeFilter === tab.key ? 'text-white/80' : 'text-neutral-500'}`}>
                            {tab.label}
                        </p>
                    </button>
                ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-[#ff8c00]/20">
                    <span className="material-symbols-outlined text-6xl text-[#ff8c00]/20 mb-4">
                        {shopIsClosed ? 'bedtime' : 'inbox'}
                    </span>
                    <h3 className="text-xl font-bold text-neutral-400">
                        {shopIsClosed
                            ? 'Toko Sedang Tutup'
                            : activeFilter === 'all' ? 'Belum ada pesanan hari ini' : `Tidak ada pesanan ${FILTER_TABS.find(t => t.key === activeFilter)?.label.toLowerCase()}`}
                    </h3>
                    <p className="text-neutral-400 text-sm mt-1">
                        {shopIsClosed
                            ? 'Semua pesanan sesi ini telah masuk ke Riwayat.'
                            : 'Pesanan baru hari ini akan muncul di sini.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map((order, idx) => {
                        const config = STATUS_CONFIG[order.status]
                        const isExpanded = expandedOrder === order.id

                        return (
                            <div
                                key={order.id}
                                className={`bg-white rounded-xl border overflow-hidden transition-all animate-fade-in-up ${order.status === 'pending'
                                    ? 'border-orange-200 shadow-md shadow-orange-100'
                                    : order.status === 'processing'
                                        ? 'border-blue-200 shadow-sm'
                                        : 'border-[#ff8c00]/5'
                                    }`}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                {/* Order Header */}
                                <div
                                    className="flex items-center gap-4 p-4 md:p-5 cursor-pointer hover:bg-[#fcfaf8] transition-colors"
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                >
                                    <div className={`hidden md:flex size-12 rounded-xl items-center justify-center shrink-0 ${order.status === 'pending' ? 'bg-orange-100' : order.status === 'processing' ? 'bg-blue-100' : 'bg-green-100'
                                        }`}>
                                        <span className={`material-symbols-outlined text-xl ${order.status === 'pending' ? 'text-orange-600' : order.status === 'processing' ? 'text-blue-600' : 'text-green-600'
                                            }`}>
                                            {config.icon}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-sm">{order.order_number}</span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${order.payment_method === 'cashless'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {order.payment_method === 'cashless' ? '💳 QRIS' : '💵 Cash'}
                                            </span>
                                            {/* Payment proof indicator */}
                                            {order.payment_proof && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                                                    📎 Bukti
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-sm text-[#181510] font-medium">{order.customer_name}</span>
                                            <span className="text-xs text-neutral-400">{getTimeAgo(order.created_at)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-extrabold text-[#ff8c00]">{formatRupiah(order.total_amount)}</span>
                                        <span className="material-symbols-outlined text-neutral-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                            expand_more
                                        </span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-[#ff8c00]/5 p-4 md:p-5 bg-[#fcfaf8]/50 animate-fade-in-up">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Items */}
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-[#ff8c00]">receipt</span>
                                                    Detail Pesanan
                                                </h4>
                                                <div className="space-y-2">
                                                    {order.items?.map((item, i) => (
                                                        <div key={i} className="flex justify-between items-center bg-white rounded-lg px-3 py-2 border border-[#ff8c00]/5">
                                                            <div className="flex items-center gap-3">
                                                                {item.image_url && (
                                                                    <div
                                                                        className="size-8 rounded-md bg-center bg-cover shrink-0"
                                                                        style={{ backgroundImage: `url("${item.image_url}")` }}
                                                                    />
                                                                )}
                                                                <div>
                                                                    <span className="text-sm font-medium">{item.name}</span>
                                                                    <span className="text-xs text-neutral-400 ml-2">x{item.quantity}</span>
                                                                </div>
                                                            </div>
                                                            <span className="text-sm font-bold">{formatRupiah(item.price * item.quantity)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Customer Info */}
                                            <div>
                                                <h4 className="text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-[#ff8c00]">person</span>
                                                    Info Pelanggan
                                                </h4>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base text-neutral-400">badge</span>
                                                        <span className="font-medium">{order.customer_name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base text-neutral-400">phone</span>
                                                        <span>{order.customer_phone || '-'}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="material-symbols-outlined text-base text-neutral-400 mt-0.5">location_on</span>
                                                        <span>{order.customer_address || '-'}</span>
                                                    </div>
                                                    {order.notes && (
                                                        <div className="flex items-start gap-2">
                                                            <span className="material-symbols-outlined text-base text-neutral-400 mt-0.5">sticky_note_2</span>
                                                            <span className="italic text-neutral-500">{order.notes}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base text-neutral-400">account_balance_wallet</span>
                                                        <span className="font-medium">{order.payment_method === 'cashless' ? 'QRIS (Cashless)' : 'Cash'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-2 border-t border-[#ff8c00]/5 mt-2">
                                                        <span className="material-symbols-outlined text-base text-neutral-400">calendar_today</span>
                                                        <span className="text-xs text-neutral-500">{formatDate(order.created_at)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payment Proof */}
                                        {order.payment_proof && (
                                            <div className="mt-6 pt-4 border-t border-[#ff8c00]/10">
                                                <h4 className="text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-[#ff8c00]">receipt_long</span>
                                                    Bukti Pembayaran
                                                </h4>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setProofModal(order.payment_proof) }}
                                                    className="group relative inline-block rounded-xl overflow-hidden border-2 border-[#ff8c00]/10 hover:border-[#ff8c00]/40 transition-all shadow-sm hover:shadow-md"
                                                >
                                                    <img
                                                        src={order.payment_proof}
                                                        alt="Bukti pembayaran"
                                                        className="h-32 w-auto object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                                            zoom_in
                                                        </span>
                                                    </div>
                                                </button>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#ff8c00]/10">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => deleteOrder(order.id)}
                                                    className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    Hapus
                                                </button>
                                                {order.status !== 'pending' && (
                                                <button
                                                    onClick={() => {
                                                        if (btConnected) {
                                                            handleDirectPrint(order)
                                                        } else {
                                                            onConnectClick()
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
                                                        btConnected 
                                                            ? 'text-neutral-500 hover:text-green-600 hover:bg-green-50' 
                                                            : 'text-neutral-500 hover:text-blue-600 hover:bg-blue-50'
                                                    }`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">print</span>
                                                    Print
                                                </button>
                                                )}
                                            </div>

                                            {config.next && (
                                                <button
                                                    onClick={() => {
                                                        updateOrderStatus(order.id, config.next)
                                                    }}
                                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${order.status === 'pending'
                                                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-200'
                                                        : 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'
                                                        }`}
                                                >
                                                    <span className="material-symbols-outlined text-lg">{config.nextIcon}</span>
                                                    {config.nextLabel}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Payment Proof Modal */}
            {proofModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setProofModal(null)}
                >
                    <div className="relative max-w-lg w-full animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setProofModal(null)}
                            className="absolute -top-3 -right-3 size-10 bg-white text-neutral-600 rounded-full flex items-center justify-center shadow-xl hover:bg-red-50 hover:text-red-500 transition-colors z-10"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <img
                            src={proofModal}
                            alt="Bukti pembayaran"
                            className="w-full rounded-2xl shadow-2xl border-4 border-white"
                        />
                        <div className="mt-3 text-center">
                            <span className="text-white/80 text-sm font-medium">Bukti Pembayaran</span>
                        </div>
                    </div>
                </div>
            )}

        </main>
    )
}
