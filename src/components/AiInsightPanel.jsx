import { useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * AI Sales Insight panel for AdminDashboard.
 * Fetches order analytics from Gemini via Edge Function.
 * Props:
 *   tenantId — string — the tenant's UUID
 */
export default function AiInsightPanel({ tenantId }) {
    const [loading, setLoading] = useState(false)
    const [insight, setInsight] = useState('')
    const [stats, setStats] = useState(null)
    const [error, setError] = useState('')
    const [generated, setGenerated] = useState(false)

    const generate = async () => {
        setLoading(true)
        setError('')
        setInsight('')
        setStats(null)

        try {
            const { data, error: fnError } = await supabase.functions.invoke(
                'ai-sales-insight',
                { body: { tenant_id: tenantId } }
            )
            if (fnError) throw fnError
            if (data?.error) throw new Error(data.error)
            setInsight(data.insight)
            setStats(data.stats)
            setGenerated(true)
        } catch (err) {
            setError(err.message || 'Gagal menghubungi Gemini AI')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl border border-[#ff8c00]/10 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-xl">🔮</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-base">AI Sales Insight</h4>
                            <p className="text-xs text-white/70">Analisis bisnis cerdas • Powered by Gemini</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-white/15 rounded-lg">
                        <span className="size-1.5 rounded-full bg-green-300 animate-pulse" />
                        <span className="text-[10px] text-white/80 font-medium">Google AI</span>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="p-5">
                {!generated && !loading && !error && (
                    <div className="flex flex-col items-center text-center gap-4 py-4">
                        <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-100 flex items-center justify-center">
                            <span className="text-3xl">📊</span>
                        </div>
                        <div>
                            <p className="font-bold text-neutral-700">Dapatkan Insight Bisnis AI</p>
                            <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">
                                Gemini akan menganalisis data penjualan 30 hari terakhirmu dan memberikan rekomendasi konkret
                            </p>
                        </div>
                        <button
                            onClick={generate}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-600 hover:to-purple-700 transition-all active:scale-95"
                        >
                            <span className="text-base">✨</span>
                            Analisa dengan AI
                        </button>
                    </div>
                )}

                {loading && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="size-16 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 flex items-center justify-center animate-pulse">
                            <span className="text-2xl">🔮</span>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-neutral-700">Gemini sedang menganalisis...</p>
                            <p className="text-xs text-neutral-400 mt-1">Memproses data transaksi 30 hari terakhir</p>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
                        </div>
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
                    <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <span className="text-3xl">😕</span>
                        <p className="font-bold text-red-500">Gagal generate insight</p>
                        <p className="text-sm text-neutral-400">{error}</p>
                        <button
                            onClick={generate}
                            className="px-4 py-2 bg-violet-500 text-white rounded-xl text-sm font-bold hover:bg-violet-600 transition-colors"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {insight && !loading && (
                    <div className="space-y-4">
                        {/* Stats mini chips */}
                        {stats && (
                            <div className="grid grid-cols-2 gap-2">
                                <div className="px-3 py-2 bg-violet-50 rounded-lg">
                                    <p className="text-[10px] text-violet-500 font-medium uppercase tracking-wider">Pesanan Selesai</p>
                                    <p className="font-bold text-violet-700 text-lg">{stats.totalOrders}</p>
                                </div>
                                <div className="px-3 py-2 bg-purple-50 rounded-lg">
                                    <p className="text-[10px] text-purple-500 font-medium uppercase tracking-wider">Jam Tersibuk</p>
                                    <p className="font-bold text-purple-700 text-sm leading-tight">{stats.peakHour || '-'}</p>
                                </div>
                            </div>
                        )}

                        {/* Insight text */}
                        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                            <div className="prose prose-sm max-w-none">
                                {insight.split('\n').filter(line => line.trim()).map((line, i) => (
                                    <p key={i} className="text-neutral-700 text-sm leading-relaxed mb-2 last:mb-0">
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                                <span>✨</span>
                                Generated by Google Gemini · Data 30 hari terakhir
                            </p>
                            <button
                                onClick={generate}
                                className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-semibold transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
