import { useState } from 'react'
import { useCart } from '../context/CartContext'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { useStoreStatus } from '../context/StoreStatusContext'
import { useTenantContext } from '../context/TenantContext'
import { formatRupiah } from '../lib/utils'
import { canUseOrderPushNotifications, subscribeToOrderPushNotifications } from '../lib/orderPushNotifications'
import toast from 'react-hot-toast'

export default function CheckoutModal({ onClose, onSuccess }) {
    const { items, totalPrice, clearCart } = useCart()
    const { addOrder } = useOrders()
    const { user } = useAuth()
    const { isStoreOpen } = useStoreStatus()
    const { tenantId, slug } = useTenantContext()
    const [form, setForm] = useState({
        name: user?.user_metadata?.name || '',
        phone: user?.user_metadata?.phone || '',
        address: '',
        notes: ''
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (loading) return
        if (!form.name.trim() || !form.phone.trim()) {
            toast.error('Nama dan nomor HP wajib diisi!')
            return
        }

        if (!isStoreOpen) {
            toast.error('Maaf, toko sedang tutup!')
            return
        }

        setLoading(true)

        try {
            const savedOrder = await addOrder({
                customer_name: form.name,
                customer_phone: form.phone,
                customer_address: form.address,
                notes: form.notes,
                total_amount: totalPrice,
                payment_method: 'cash',
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    image_url: item.image_url,
                })),
            })

            toast.success('🎉 Pesanan berhasil dibuat! Kami akan segera memprosesnya.', {
                duration: 5000,
                style: { borderRadius: '12px', fontFamily: 'Plus Jakarta Sans', fontWeight: 600 },
            })
            // Push notification subscribe — verbose untuk debug
            if (!savedOrder._offline) {
                if (!canUseOrderPushNotifications()) {
                    console.warn('[PushNotif] Tidak bisa subscribe: browser tidak support atau VAPID key tidak ada.')
                    toast('Browser kamu tidak mendukung notifikasi push. Cek status pesanan secara manual ya.', {
                        icon: 'ℹ️', duration: 5000
                    })
                } else {
                    try {
                        const result = await subscribeToOrderPushNotifications({
                            order: savedOrder,
                            tenantId,
                            slug
                        })

                        if (result.ok) {
                            toast.success('🔔 Notifikasi aktif! Kamu akan diberitahu saat pesanan selesai.', {
                                duration: 5000
                            })
                        } else if (result.reason === 'denied') {
                            toast('Notifikasi diblokir oleh browser. Izinkan notifikasi di settings browser untuk fitur ini.', {
                                icon: '🔕', duration: 6000
                            })
                        } else if (result.reason === 'dismissed') {
                            toast('Notifikasi tidak diaktifkan. Kamu bisa cek status pesanan di halaman "Pesanan Saya".', {
                                icon: '🔕', duration: 5000
                            })
                        } else {
                            console.warn('[PushNotif] Subscribe gagal dengan reason:', result.reason)
                        }
                    } catch (pushError) {
                        console.error('[PushNotif] Error saat subscribe:', pushError)
                        toast.error(`Gagal aktifkan notifikasi: ${pushError?.message || 'Unknown error'}`, {
                            duration: 6000
                        })
                    }
                }
            }

            clearCart()
            onSuccess()
        } catch (err) {
            console.error('Order error:', err)
            toast.error('Gagal membuat pesanan. Coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 60 }} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-[#ff8c00]/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#ff8c00]">receipt_long</span>
                        </div>
                        <h2 className="text-xl font-bold">Checkout</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Order Summary */}
                <div className="bg-[#fcfaf8] rounded-xl p-4 mb-6 border border-[#ff8c00]/5">
                    <h3 className="text-sm font-bold mb-3 text-neutral-600">Ringkasan Pesanan</h3>
                    <div className="space-y-2">
                        {items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-neutral-600">
                                    {item.name} <span className="text-neutral-400">x{item.quantity}</span>
                                </span>
                                <span className="font-bold">{formatRupiah(item.price * item.quantity)}</span>
                            </div>
                        ))}
                        <div className="border-t border-[#ff8c00]/10 pt-2 mt-2 flex justify-between">
                            <span className="font-bold">Total</span>
                            <span className="text-lg font-extrabold text-[#ff8c00]">{formatRupiah(totalPrice)}</span>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-neutral-600 mb-1.5">Nama Lengkap *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00]/30 outline-none transition-all"
                            placeholder="Masukkan nama lengkap"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-neutral-600 mb-1.5">Nomor HP *</label>
                        <input
                            type="tel"
                            required
                            value={form.phone}
                            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00]/30 outline-none transition-all"
                            placeholder="08xxxxxxxxxx"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-neutral-600 mb-1.5">Catatan</label>
                        <input
                            type="text"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full px-4 py-3 bg-[#fcfaf8] border border-[#ff8c00]/10 rounded-xl text-sm focus:ring-2 focus:ring-[#ff8c00]/30 focus:border-[#ff8c00]/30 outline-none transition-all"
                            placeholder="Mis: kurang gula, extra es, dll"
                        />
                    </div>

                    {/* Payment Method — Cash only (QRIS dihapus dari order menu) */}
                    <div className="bg-[#ff8c00]/5 border border-[#ff8c00]/15 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-[#ff8c00] text-white flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[18px]">payments</span>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-[#ff8c00]">Cash</p>
                            <p className="text-[11px] text-neutral-500">Bayar di tempat saat pesanan tiba</p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isStoreOpen}
                        className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">check_circle</span>
                                Konfirmasi Pesanan
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
