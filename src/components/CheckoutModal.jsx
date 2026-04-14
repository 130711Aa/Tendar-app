import { useState, useRef, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { useOrders } from '../context/OrdersContext'
import { useAuth } from '../context/AuthContext'
import { useStoreStatus } from '../context/StoreStatusContext'
import { useTenantContext } from '../context/TenantContext'
import { formatRupiah } from '../lib/utils'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

// Ganti path ini dengan gambar QRIS kamu
import qrisImage from '/QRIS Tendar Payment.jpeg'

const QRIS_IMAGE = qrisImage

export default function CheckoutModal({ onClose, onSuccess }) {
    const { items, totalPrice, clearCart } = useCart()
    const { addOrder } = useOrders()
    const { user } = useAuth()
    const { isStoreOpen } = useStoreStatus()
    const { tenantName } = useTenantContext()
    const [form, setForm] = useState({
        name: user?.user_metadata?.name || '',
        phone: user?.user_metadata?.phone || '',
        address: '',
        notes: ''
    })
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [paymentProof, setPaymentProof] = useState(null)
    const [proofPreview, setProofPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Hanya file gambar yang diperbolehkan!')
            return
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 5MB!')
            return
        }

        setPaymentProof(file)
        const reader = new FileReader()
        reader.onload = (ev) => setProofPreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    const removeProof = () => {
        setPaymentProof(null)
        setProofPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const uploadPaymentProof = async (file) => {
        const ext = file.name.split('.').pop()
        const fileName = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const filePath = `proofs/${fileName}`

        const { data, error } = await supabase.storage
            .from('payment-proofs')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
            })

        if (error) throw error

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(filePath)

        return {
            path: filePath,
            url: urlData.publicUrl,
        }
    }

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

        if (paymentMethod === 'cashless' && !paymentProof) {
            toast.error('Upload bukti pembayaran terlebih dahulu!')
            return
        }

        setLoading(true)

        try {
            let proofData = null

            // Upload payment proof if cashless
            if (paymentMethod === 'cashless' && paymentProof) {
                try {
                    proofData = await uploadPaymentProof(paymentProof)
                } catch (uploadErr) {
                    console.error('Upload error:', uploadErr)
                    // Fallback: store as base64 locally if Supabase bucket not set up yet
                    proofData = {
                        path: null,
                        url: proofPreview, // Use the base64 preview as fallback
                    }
                    toast('Bukti disimpan secara lokal (Supabase Storage belum disetup)', {
                        icon: '⚠️',
                        style: { borderRadius: '12px', fontFamily: 'Plus Jakarta Sans', fontSize: '13px' },
                    })
                }
            }

            addOrder({
                customer_name: form.name,
                customer_phone: form.phone,
                customer_address: form.address,
                notes: form.notes,
                total_amount: totalPrice,
                payment_method: paymentMethod,
                payment_proof: proofData?.url || null,
                payment_proof_path: proofData?.path || null,
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

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-600 mb-3">Metode Pembayaran *</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { setPaymentMethod('cash'); removeProof() }}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                                    ? 'border-[#ff8c00] bg-[#ff8c00]/5 shadow-md shadow-[#ff8c00]/10'
                                    : 'border-neutral-200 bg-white hover:border-[#ff8c00]/30'
                                    }`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center ${paymentMethod === 'cash' ? 'bg-[#ff8c00] text-white' : 'bg-neutral-100 text-neutral-500'
                                    }`}>
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <span className={`text-sm font-bold ${paymentMethod === 'cash' ? 'text-[#ff8c00]' : 'text-neutral-600'}`}>
                                    Cash
                                </span>
                                <span className="text-[10px] text-neutral-400">Bayar di tempat</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cashless')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${paymentMethod === 'cashless'
                                    ? 'border-[#ff8c00] bg-[#ff8c00]/5 shadow-md shadow-[#ff8c00]/10'
                                    : 'border-neutral-200 bg-white hover:border-[#ff8c00]/30'
                                    }`}
                            >
                                <div className={`size-10 rounded-xl flex items-center justify-center ${paymentMethod === 'cashless' ? 'bg-[#ff8c00] text-white' : 'bg-neutral-100 text-neutral-500'
                                    }`}>
                                    <span className="material-symbols-outlined">qr_code_2</span>
                                </div>
                                <span className={`text-sm font-bold ${paymentMethod === 'cashless' ? 'text-[#ff8c00]' : 'text-neutral-600'}`}>
                                    QRIS
                                </span>
                                <span className="text-[10px] text-neutral-400">Scan & bayar</span>
                            </button>
                        </div>
                    </div>

                    {/* QRIS + Upload Section */}
                    {paymentMethod === 'cashless' && (
                        <div className="space-y-4 animate-fade-in-up">
                            {/* QRIS Display */}
                            <div className="bg-[#fcfaf8] rounded-xl border border-[#ff8c00]/10 p-5 text-center">
                                <p className="text-sm font-bold text-neutral-600 mb-3">Scan QRIS untuk membayar</p>
                                <div className="flex justify-center mb-3">
                                    {QRIS_IMAGE ? (
                                        <img
                                            src={QRIS_IMAGE}
                                            alt={`QRIS ${tenantName || 'Toko Saya'}`}
                                            className="w-56 h-56 object-contain rounded-lg border border-neutral-200 bg-white p-2"
                                        />
                                    ) : (
                                        <div className="w-56 h-56 bg-white rounded-lg border-2 border-dashed border-[#ff8c00]/20 flex flex-col items-center justify-center">
                                            <span className="material-symbols-outlined text-5xl text-[#ff8c00]/30 mb-2">qr_code_2</span>
                                            <span className="text-xs text-neutral-400 font-medium">QRIS belum tersedia</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[#ff8c00]/5 rounded-lg px-4 py-2.5 inline-flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#ff8c00] text-base">info</span>
                                    <span className="text-xs text-[#ff8c00] font-medium">
                                        Total: <span className="font-extrabold">{formatRupiah(totalPrice)}</span>
                                    </span>
                                </div>
                            </div>

                            {/* Upload Bukti Bayar */}
                            <div className="bg-[#fcfaf8] rounded-xl border border-[#ff8c00]/10 p-4">
                                <label className="block text-sm font-bold text-neutral-600 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base text-[#ff8c00]">cloud_upload</span>
                                    Upload Bukti Pembayaran *
                                </label>

                                {proofPreview ? (
                                    <div className="relative">
                                        <img
                                            src={proofPreview}
                                            alt="Bukti pembayaran"
                                            className="w-full max-h-52 object-contain rounded-xl border border-neutral-200 bg-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeProof}
                                            className="absolute top-2 right-2 size-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                        <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            {paymentProof.name} ({(paymentProof.size / 1024).toFixed(0)} KB)
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-8 border-2 border-dashed border-[#ff8c00]/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-white hover:bg-[#ff8c00]/5 hover:border-[#ff8c00]/40 transition-all cursor-pointer group"
                                    >
                                        <div className="size-12 bg-[#ff8c00]/10 rounded-xl flex items-center justify-center group-hover:bg-[#ff8c00]/20 transition-colors">
                                            <span className="material-symbols-outlined text-2xl text-[#ff8c00]">add_photo_alternate</span>
                                        </div>
                                        <span className="text-sm font-semibold text-neutral-500 group-hover:text-[#ff8c00] transition-colors">
                                            Tap untuk upload screenshot
                                        </span>
                                        <span className="text-[11px] text-neutral-400">JPG, PNG — maks 5MB</span>
                                    </button>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !isStoreOpen}
                        className="w-full bg-[#ff8c00] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#e67e00] transition-all shadow-lg shadow-[#ff8c00]/20 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
                    >
                        {loading ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                {paymentMethod === 'cashless' ? 'Mengupload bukti...' : 'Memproses...'}
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
