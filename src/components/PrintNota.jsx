import { useEffect, useRef } from 'react'
import { formatRupiah } from '../lib/utils'
import { useTenantContext } from '../context/TenantContext'

export default function PrintNota({ order, userEmail, onClose }) {
    const printRef = useRef()
    const { tenantName } = useTenantContext()

    useEffect(() => {
        // Auto-print when component mounts
        const timer = setTimeout(() => {
            window.print()
        }, 300)
        return () => clearTimeout(timer)
    }, [])

    const items = order.items || []
    const orderDate = new Date(order.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })

    const statusLabel = {
        pending: 'Menunggu',
        processing: 'Diproses',
        ready: 'Siap Diambil',
        completed: 'Selesai',
        cancelled: 'Dibatalkan'
    }

    return (
        <>
            {/* Print-only styles */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    .print-nota, .print-nota * {
                        visibility: visible !important;
                    }
                    .print-nota {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 72mm !important;
                        font-size: 12px !important;
                        padding: 4mm !important;
                        margin: 0 !important;
                        background: white !important;
                        color: black !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            {/* Overlay (screen only) */}
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 no-print" onClick={onClose}>
                <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-4 border-b no-print">
                        <h3 className="font-bold text-neutral-800">Preview Nota</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1 bg-[#ff8c00] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#e67e00] transition-colors"
                            >
                                <span className="material-symbols-outlined text-lg">print</span>
                                Print
                            </button>
                            <button
                                onClick={onClose}
                                className="size-9 rounded-xl bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Receipt Content */}
                    <div ref={printRef} className="print-nota p-5" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>🍊 {tenantName || 'Toko Saya'}</div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Fresh & Healthy</div>
                        </div>

                        {/* Order Info */}
                        <div style={{ marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>No. Order</span>
                                <span style={{ fontWeight: 'bold' }}>#{order.order_number || order.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Tanggal</span>
                                <span>{orderDate}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Customer</span>
                                <span>{userEmail}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Nama</span>
                                <span>{order.customer_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Status</span>
                                <span style={{ fontWeight: 'bold' }}>{statusLabel[order.status] || order.status}</span>
                            </div>
                        </div>

                        {/* Items */}
                        <div style={{ marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Item Pesanan:</div>
                            {items.length > 0 ? (
                                items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', gap: '8px' }}>
                                        <span style={{ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name} x{item.quantity}</span>
                                        <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{formatRupiah((item.price || 0) * (item.quantity || 1))}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#999', fontStyle: 'italic' }}>Item tidak tersedia</div>
                            )}
                        </div>

                        {/* Total */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '12px' }}>
                            <span>TOTAL</span>
                            <span>{formatRupiah(order.total_amount)}</span>
                        </div>

                        {/* Payment */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span>Pembayaran</span>
                            <span style={{ textTransform: 'capitalize' }}>{order.payment_method}</span>
                        </div>

                        {/* Footer */}
                        <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                            <div>Terima kasih telah memesan!</div>
                            <div>{tenantName || 'Toko Saya'} 🍊</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
