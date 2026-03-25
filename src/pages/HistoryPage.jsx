import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../lib/utils'
import toast from 'react-hot-toast'

export default function HistoryPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedDate, setExpandedDate] = useState(null) // Date string or null
    const [expandedOrder, setExpandedOrder] = useState(null) // Order ID or null

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        setLoading(true)
        try {
            // Fetch 'completed' or 'cancelled' orders
            // Note: If you don't have 'cancelled' status yet, just stick to 'completed'
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                // .in('status', ['completed', 'cancelled']) // Fetch all statuses so we don't lose track of pending orders from past days
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                setOrders(data)
                // Default expand the first date group if exists
                if (data.length > 0) {
                    const firstDate = new Date(data[0].created_at).toLocaleDateString('en-CA') // YYYY-MM-DD
                    setExpandedDate(firstDate)
                }
            }
        } catch (err) {
            console.error('Error fetching history:', err)
            toast.error('Gagal memuat riwayat pesanan')
        } finally {
            setLoading(false)
        }
    }

    // Group orders by date (Jakarta Time)
    const groupedOrders = useMemo(() => {
        const groups = {}
        orders.forEach(order => {
            // Use Jakarta date string for grouping key (YYYY-MM-DD)
            const dateKey = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
            if (!groups[dateKey]) {
                groups[dateKey] = []
            }
            groups[dateKey].push(order)
        })
        return groups
    }, [orders])

    // Sort date keys descending (newest first)
    const sortedDates = useMemo(() => {
        return Object.keys(groupedOrders).sort((a, b) => new Date(b) - new Date(a))
    }, [groupedOrders])

    const formatDateHeading = (dateString) => {
        const date = new Date(dateString) // 'YYYY-MM-DD' is usually UTC
        const now = new Date()
        const jakartaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))

        // Normalize jakartaNow to YYYY-MM-DD to compare purely by date
        const todayStr = jakartaNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        const todayDate = new Date(todayStr)

        const yesterdayDate = new Date(todayDate)
        yesterdayDate.setDate(yesterdayDate.getDate() - 1)

        // Compare timestamps or date strings
        // dateString is already YYYY-MM-DD from Jakarta time
        if (dateString === todayStr) return 'Hari Ini'
        if (dateString === yesterdayDate.toLocaleDateString('en-CA')) return 'Kemarin'

        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
    }

    const getDailySummary = (dateKey) => {
        const dayOrders = groupedOrders[dateKey] || []
        const total = dayOrders.reduce((sum, o) => sum + o.total_amount, 0)
        return { count: dayOrders.length, total }
    }

    return (
        <main className="flex flex-1 flex-col px-4 md:px-10 py-8 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">Riwayat Pesanan</h1>
                <p className="text-neutral-500 text-base">Log pesanan yang telah selesai</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <span className="material-symbols-outlined animate-spin text-4xl text-[#ff8c00]">progress_activity</span>
                    <p className="text-neutral-400 text-sm mt-2">Memuat data...</p>
                </div>
            ) : sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-[#ff8c00]/20">
                    <span className="material-symbols-outlined text-6xl text-[#ff8c00]/20 mb-4">history_toggle_off</span>
                    <h3 className="text-xl font-bold text-neutral-400">Belum ada riwayat</h3>
                    <p className="text-neutral-400 text-sm mt-1">Pesanan yang selesai akan muncul di sini.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedDates.map(dateKey => {
                        const dayOrders = groupedOrders[dateKey]
                        const summary = getDailySummary(dateKey)
                        const isDateExpanded = expandedDate === dateKey

                        return (
                            <div key={dateKey} className="bg-white rounded-2xl border border-[#ff8c00]/10 overflow-hidden shadow-sm">
                                {/* Date Header (Accordion Trigger) */}
                                <button
                                    onClick={() => setExpandedDate(isDateExpanded ? null : dateKey)}
                                    className={`w-full flex flex-col md:flex-row md:items-center justify-between p-5 text-left transition-colors ${isDateExpanded ? 'bg-[#ff8c00]/5' : 'hover:bg-[#fcfaf8]'}`}
                                >
                                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                                        <div className={`size-10 rounded-xl flex items-center justify-center ${isDateExpanded ? 'bg-[#ff8c00] text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                                            <span className="material-symbols-outlined">calendar_today</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-[#181510] leading-none">
                                                {formatDateHeading(dateKey)}
                                            </h3>
                                            <p className="text-xs text-neutral-400 mt-1">{dateKey}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                        <div className="flex gap-6">
                                            <div className="text-right">
                                                <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Pesanan</p>
                                                <p className="font-bold">{summary.count}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total Omset</p>
                                                <p className="font-bold text-[#ff8c00]">{formatRupiah(summary.total)}</p>
                                            </div>
                                        </div>
                                        <span className={`material-symbols-outlined text-neutral-400 transition-transform ${isDateExpanded ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </div>
                                </button>

                                {/* Orders List */}
                                {isDateExpanded && (
                                    <div className="border-t border-[#ff8c00]/10 divide-y divide-[#ff8c00]/5 animate-fade-in-up">
                                        {dayOrders.map((order, idx) => (
                                            <div key={order.id} className="p-4 md:p-5 hover:bg-[#fcfaf8] transition-colors">
                                                <div
                                                    className="flex items-start justify-between cursor-pointer"
                                                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-1 ${order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            <span className="material-symbols-outlined text-sm">
                                                                {order.status === 'completed' ? 'check' : 'close'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-sm text-[#181510]">{order.customer_name}</span>
                                                                <span className="text-xs text-neutral-400">#{order.order_number}</span>
                                                            </div>
                                                            <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                                                                {order.items?.map(i => `${i.name} x${i.quantity}`).join(', ')}
                                                            </p>
                                                            <div className="flex gap-2 mt-1.5">
                                                                <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] rounded font-medium uppercase tracking-wide">
                                                                    {new Date(order.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className={`px-2 py-0.5 text-[10px] rounded font-medium uppercase tracking-wide ${order.payment_method === 'cashless' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                    {order.payment_method === 'cashless' ? 'QRIS' : 'Cash'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="font-bold text-[#ff8c00]">{formatRupiah(order.total_amount)}</span>
                                                        <span className="material-symbols-outlined text-neutral-300 text-lg">
                                                            {expandedOrder === order.id ? 'expand_less' : 'expand_more'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Expanded Details */}
                                                {expandedOrder === order.id && (
                                                    <div className="mt-4 pl-11 text-sm text-neutral-600 animate-fade-in-up">
                                                        <div className="space-y-1 mb-3">
                                                            {order.items?.map((item, i) => (
                                                                <div key={i} className="flex justify-between">
                                                                    <span>{item.name} <span className="text-neutral-400">x{item.quantity}</span></span>
                                                                    <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {order.notes && (
                                                            <div className="bg-yellow-50 p-2 rounded-lg text-xs text-yellow-800 mb-2">
                                                                <span className="font-bold">Catatan:</span> {order.notes}
                                                            </div>
                                                        )}
                                                        {order.customer_phone && (
                                                            <p className="text-xs text-neutral-400">Hp: {order.customer_phone}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </main>
    )
}
