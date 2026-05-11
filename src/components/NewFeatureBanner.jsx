import { useState, useEffect } from 'react'

const BANNER_KEY = 'tendar_ai_feature_banner_v2'

/**
 * One-time banner that announces the new AI features to existing users.
 * Shown once per browser, dismissed permanently after clicking.
 */
export default function NewFeatureBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(BANNER_KEY)
        if (!dismissed) {
            // Short delay so it doesn't pop immediately on page load
            const t = setTimeout(() => setVisible(true), 1500)
            return () => clearTimeout(t)
        }
    }, [])

    const dismiss = () => {
        localStorage.setItem(BANNER_KEY, '1')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-xl animate-[slideUp_0.4s_ease-out]"
            style={{ animationFillMode: 'both' }}
        >
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl shadow-purple-900/30 p-4 text-white border border-white/10">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xl">✨</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-sm">Fitur AI Baru Tersedia!</p>
                            <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                Powered by Gemini
                            </span>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed space-y-1">
                            <span className="block">🧠 <strong>AI Sales Insight</strong> di Dashboard — analisis penjualan otomatis.</span>
                            <span className="block">✍️ <strong>AI Menu Copywriter</strong> di Kelola Menu — bikin deskripsi menu.</span>
                            <span className="block">📍 <strong>Neighborhood Intelligence</strong> — intip tren & prediksi pasar di sekitarmu.</span>
                        </p>
                    </div>

                    {/* Close */}
                    <button
                        onClick={dismiss}
                        className="size-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors mt-0.5"
                        aria-label="Tutup"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                    <p className="text-[10px] text-white/60">Fitur ini gratis untuk semua pengguna Tendar</p>
                    <button
                        onClick={dismiss}
                        className="text-xs font-bold text-white/90 hover:text-white transition-colors"
                    >
                        Mengerti →
                    </button>
                </div>
            </div>
        </div>
    )
}
