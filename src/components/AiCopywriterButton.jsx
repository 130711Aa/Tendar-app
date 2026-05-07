import { useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

/**
 * Floating AI button + modal to generate menu descriptions using Gemini.
 * Props:
 *   productName  — string  — nama produk (pre-filled)
 *   price        — number  — harga produk
 *   category     — string  — kategori produk
 *   onApply      — fn(desc) — dipanggil ketika user klik "Pakai Deskripsi Ini"
 */
export default function AiCopywriterButton({ productName, price, category, onApply }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState('')
    const [error, setError] = useState('')

    const generate = async () => {
        if (!productName?.trim()) {
            toast.error('Isi nama menu dulu sebelum generate deskripsi AI!')
            return
        }
        setLoading(true)
        setError('')
        setResult('')
        setOpen(true)

        try {
            const { data, error: fnError } = await supabase.functions.invoke(
                'generate-menu-description',
                { body: { name: productName, price, category } }
            )
            if (fnError) throw fnError
            if (data?.error) throw new Error(data.error)
            setResult(data.description)
        } catch (err) {
            const msg = err.message || ''
            if (msg.includes('429') || msg.includes('quota') || msg.toLowerCase().includes('rate')) {
                setError('Kuota Gemini AI sedang penuh. Coba lagi dalam beberapa menit ya! ☕')
            } else if (msg.includes('500') || msg.includes('Internal')) {
                setError('Server AI sedang sibuk. Silakan coba beberapa saat lagi.')
            } else {
                setError(msg || 'Gagal menghubungi Gemini AI')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleApply = () => {
        if (result) {
            onApply(result)
            setOpen(false)
            toast.success('Deskripsi AI berhasil diterapkan! ✨')
        }
    }

    return (
        <>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold shadow-sm hover:from-violet-600 hover:to-purple-700 transition-all active:scale-95"
                title="Generate deskripsi dengan Gemini AI"
            >
                <span className="text-sm">✨</span>
                <span>Tulis dengan AI</span>
                <span className="text-[9px] opacity-75 font-medium">Gemini</span>
            </button>

            {/* Modal */}
            {open && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => !loading && setOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-5 text-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">✨</span>
                                    <div>
                                        <h3 className="font-bold text-base">AI Menu Copywriter</h3>
                                        <p className="text-xs text-white/80">Powered by Google Gemini</p>
                                    </div>
                                </div>
                                {!loading && (
                                    <button
                                        onClick={() => setOpen(false)}
                                        className="size-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                )}
                            </div>
                            {productName && (
                                <div className="mt-3 px-3 py-2 bg-white/15 rounded-lg">
                                    <p className="text-xs text-white/80">Untuk produk:</p>
                                    <p className="font-bold text-sm">{productName}</p>
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="p-5">
                            {loading && (
                                <div className="flex flex-col items-center gap-4 py-8">
                                    <div className="relative">
                                        <div className="size-14 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 animate-pulse flex items-center justify-center">
                                            <span className="text-2xl">✨</span>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-neutral-700">Gemini sedang menulis...</p>
                                        <p className="text-xs text-neutral-400 mt-1">Membuat deskripsi yang menggugah selera</p>
                                    </div>
                                    {/* Animated dots */}
                                    <div className="flex gap-1.5">
                                        {[0, 1, 2].map(i => (
                                            <div
                                                key={i}
                                                className="size-2 rounded-full bg-violet-400 animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {error && !loading && (
                                <div className="flex flex-col items-center gap-3 py-6 text-center">
                                    <span className="text-3xl">😕</span>
                                    <p className="font-bold text-red-600">Gagal generate</p>
                                    <p className="text-sm text-neutral-500">{error}</p>
                                    <button
                                        onClick={generate}
                                        className="mt-2 px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition-colors"
                                    >
                                        Coba Lagi
                                    </button>
                                </div>
                            )}

                            {result && !loading && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <div className="absolute -top-2 -left-1 text-violet-400 text-4xl leading-none font-serif opacity-40">"</div>
                                        <div className="px-6 py-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                                            <p className="text-neutral-700 leading-relaxed text-sm italic">{result}</p>
                                        </div>
                                        <div className="absolute -bottom-2 -right-1 text-violet-400 text-4xl leading-none font-serif opacity-40 rotate-180">"</div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={generate}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-semibold hover:bg-neutral-50 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">refresh</span>
                                            Coba Lagi
                                        </button>
                                        <button
                                            onClick={handleApply}
                                            className="flex-2 flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-200"
                                        >
                                            <span className="material-symbols-outlined text-base">check_circle</span>
                                            Pakai Deskripsi Ini
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
