import { useState, useEffect, useCallback } from 'react'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/utils'
import { Link } from 'react-router-dom'
import PrintNota from '../components/PrintNota'
import toast from 'react-hot-toast'

export default function CustomerOrdersPage() {
    const { orders, loading, deleteOrder } = useOrders()
    const { user } = useAuth()
    const [printOrder, setPrintOrder] = useState(null)
    const [queuePositions, setQueuePositions] = useState({}) // { orderId: number }

    // Only show orders belonging to the logged-in customer
    const myOrders = orders.filter(o => o.user_id === user?.id)

    // Fetch queue positions for all pending orders
    const fetchQueuePositions = useCallback(async () => {
        const pendingOrders = myOrders.filter(o => o.status === 'pending' && !o._offline)
        if (pendingOrders.length === 0) {
            setQueuePositions({})
            return
        }

        const positions = {}
        await Promise.all(
            pendingOrders.map(async (order) => {
                try {
                    const { data, error } = await supabase.rpc('get_queue_position', {
                        target_order_id: order.id
                    })
                    if (!error && data !== null) {
                        positions[order.id] = data
                    }
                } catch (err) {
                    console.warn('Failed to fetch queue position for', order.id, err)
                }
            })
        )
        setQueuePositions(positions)
    }, [orders, user])

    // Re-fetch queue positions whenever orders change (realtime updates included)
    useEffect(() => {
        if (!loading && user) {
            fetchQueuePositions()
        }
    }, [orders, loading, user])

    const handleDelete = async (order) => {
        if (!window.confirm(`Batalkan pesanan #${order.order_number || order.id}?\n\nPesanan yang dibatalkan tidak bisa dikembalikan.`)) return
        try {
            await deleteOrder(order.id)
            toast.success('Pesanan berhasil dibatalkan')
        } catch (err) {
            toast.error('Gagal membatalkan pesanan')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#faf8f5]">
                <span className="material-symbols-outlined text-4xl text-[#ff8c00] animate-spin">progress_activity</span>
            </div>
        )
    }

    if (myOrders.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f5] px-4">
                <div className="size-20 bg-[#ff8c00]/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl text-[#ff8c00]">receipt_long</span>
                </div>
                <h2 className="text-xl font-bold text-neutral-800 mb-2">Belum ada pesanan</h2>
                <p className="text-neutral-500 text-center mb-8 max-w-xs">
                    Kamu belum pernah memesan sebelumnya. Yuk, pesan minum yang segar!
                </p>
                <Link to="/" className="bg-[#ff8c00] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#e67e00] transition-colors shadow-lg shadow-[#ff8c00]/20">
                    Pesan Sekarang
                </Link>
            </div>
        )
    }

    // Status message helper — uses queue position data for pending orders
    const getQueueMessage = (order) => {
        switch (order.status) {
            case 'completed':
                return { text: 'Pesanan selesai ✅', icon: 'check_circle', color: 'text-green-600', bg: 'bg-green-50 border-green-100' }
            case 'cancelled':
                return null
            case 'processing':
                return { text: 'Pesananmu sedang diproses 👨‍🍳', icon: 'autorenew', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' }
            case 'ready':
                return { text: 'Pesanan siap diambil! 🎉', icon: 'takeout_dining', color: 'text-green-600', bg: 'bg-green-50 border-green-100' }
            case 'pending':
            default: {
                const pos = queuePositions[order.id]
                if (pos === undefined) {
                    // Still loading or RPC not available
                    return { text: 'Menunggu diproses ⏳', icon: 'hourglass_top', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
                }
                if (pos === 0) {
                    return { text: 'Menunggu diproses ⏳', icon: 'hourglass_top', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' }
                }
                return {
                    text: `Menunggu ${pos} pesanan lagi 🕐`,
                    icon: 'queue',
                    color: 'text-amber-600',
                    bg: 'bg-amber-50 border-amber-100'
                }
            }
        }
    }

    return (
        <div className="min-h-screen bg-[#faf8f5] pb-20">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#ff8c00]/10 px-4 py-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <Link to="/" className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-lg font-bold">Pesanan Saya</h1>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-4">
                {myOrders.map(order => {
                    const queueMsg = getQueueMessage(order)
                    return (
                        <div key={order.id} className="bg-white rounded-2xl p-5 border border-[#ff8c00]/10 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border ${order.status === 'completed' ? 'bg-green-50 text-green-600 border-green-200' :
                                            order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                                                'bg-blue-50 text-blue-600 border-blue-200'
                                            }`}>
                                            {order.status === 'pending' ? 'Menunggu' :
                                                order.status === 'processing' ? 'Diproses' :
                                                    order.status === 'ready' ? 'Siap Diambil' :
                                                        order.status === 'completed' ? 'Selesai' :
                                                            order.status === 'cancelled' ? 'Dibatalkan' : order.status}
                                        </span>
                                        <span className="text-xs text-neutral-400">
                                            {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-neutral-800">Order #{order.order_number || order.id.toString().slice(-4)}</h3>
                                </div>
                                <span className="font-bold text-[#ff8c00]">{formatRupiah(order.total_amount)}</span>
                            </div>

                            {/* Queue Progress Message */}
                            {queueMsg && (
                                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold mb-4 ${queueMsg.bg}`}>
                                    <span className={`material-symbols-outlined text-base ${queueMsg.color}`}>{queueMsg.icon}</span>
                                    <span className={queueMsg.color}>{queueMsg.text}</span>
                                </div>
                            )}

                            <div className="space-y-2 mb-4">
                                {order.items && order.items.length > 0 ? (
                                    <div className="bg-neutral-50 rounded-xl p-3 space-y-2">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                                <span className="text-neutral-700">
                                                    {item.name} <span className="text-neutral-400">x{item.quantity}</span>
                                                </span>
                                                <span className="font-semibold text-neutral-800">{formatRupiah((item.price || 0) * (item.quantity || 1))}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-3 bg-neutral-50 rounded-xl text-sm text-neutral-500 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-neutral-400">info</span>
                                        <span>Detail item tidak tersedia</span>
                                    </div>
                                )}
                                {order.notes && (
                                    <div className="text-xs text-neutral-500 italic bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                                        Catatan: "{order.notes}"
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                                {/* Batalkan Pesanan — only for pending orders */}
                                {order.status === 'pending' && (
                                    <button
                                        onClick={() => handleDelete(order)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                        Batalkan Pesanan
                                    </button>
                                )}

                                {/* Print Nota — only for completed orders */}
                                {order.status === 'completed' && (
                                    <button
                                        onClick={() => setPrintOrder(order)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-600 border border-green-100 rounded-xl text-sm font-bold hover:bg-green-100 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">print</span>
                                        Print Nota
                                    </button>
                                )}

                                {order.payment_method === 'cashless' && order.payment_proof_path && (
                                    <div className="flex items-center gap-1 text-xs text-blue-600">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Bukti Bayar Terupload
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

            </div>

            {/* Print Nota Modal */}
            {printOrder && (
                <PrintNota
                    order={printOrder}
                    userEmail={user?.email || '-'}
                    onClose={() => setPrintOrder(null)}
                />
            )}
        </div>
    )
}
