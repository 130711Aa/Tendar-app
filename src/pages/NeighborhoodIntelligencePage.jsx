import { useState, useEffect } from 'react'
import { useTenantContext } from '../context/TenantContext'
import { useNeighborhoodIntelligence } from '../hooks/useNeighborhoodIntelligence'
import InsightCard from '../components/neighborhood/InsightCard'
import MerchantMap from '../components/neighborhood/MerchantMap'

const RADIUS_OPTIONS = [1, 3, 5, 10, 25, 50]

const CATEGORY_OPTIONS = [
    'Kopi & Minuman', 'Makanan Berat', 'Snack & Jajanan',
    'Dessert & Es', 'Bakery', 'Lainnya',
]

export default function NeighborhoodIntelligencePage() {
    const { tenantId, tenantName } = useTenantContext()
    const [merchantCategory, setMerchantCategory] = useState('')
    const [setupDone, setSetupDone] = useState(false)
    const [activeTab, setActiveTab] = useState('map') // 'map' | 'competitive' | 'timemachine'

    const ni = useNeighborhoodIntelligence(tenantId, tenantName, merchantCategory)

    // On mount — try to load saved location
    useEffect(() => {
        if (!tenantId) return
        ni.loadMyLocation().then(loc => {
            if (loc) {
                setSetupDone(true)
                const coords = extractCoords(loc)
                if (coords) {
                    ni.fetchNearby(coords, ni.radiusKm)
                }
            }
        })
    }, [tenantId]) // eslint-disable-line

    function extractCoords(loc) {
        if (!loc) return null
        // Edge function returns raw row; coordinates are stored as WKB but
        // we saved lon/lat in address_label fallback — use metadata instead.
        // The `get_my_location` action returns the DB row; lon/lat come from
        // a second `get_nearby` call which already has them. So we store them
        // in state after user grants GPS.
        if (loc.lon != null && loc.lat != null) return { lon: loc.lon, lat: loc.lat }
        return null
    }

    async function handleGrantLocation() {
        try {
            const loc = await ni.requestAndSaveLocation({ category: merchantCategory })
            setSetupDone(true)
            const coords = { lon: loc.lon, lat: loc.lat }
            await ni.fetchNearby(coords, ni.radiusKm)
        } catch (_) { /* error already in ni.locationError */ }
    }

    async function handleRadiusChange(km) {
        ni.setRadiusKm(km)
        if (ni.myLocation?.lon) {
            await ni.fetchNearby({ lon: ni.myLocation.lon, lat: ni.myLocation.lat }, km)
        }
    }

    const coords = ni.myLocation?.lon ? { lon: ni.myLocation.lon, lat: ni.myLocation.lat } : null

    // ── SETUP SCREEN ──────────────────────────────────────────────────────────
    if (!setupDone && !ni.locationLoading) {
        return (
            <main className="flex-1 flex flex-col min-w-0">
                <div className="p-6 md:p-8 max-w-2xl mx-auto w-full space-y-6">
                    {/* Hero */}
                    <div className="bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-2xl p-8 text-white relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            {[...Array(20)].map((_, i) => (
                                <div key={i} className="absolute rounded-full bg-white"
                                    style={{
                                        width: Math.random() * 4 + 1, height: Math.random() * 4 + 1,
                                        top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
                                        opacity: Math.random(),
                                    }} />
                            ))}
                        </div>
                        <div className="relative">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-4xl">🏘️</span>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight">Neighborhood Intelligence</h1>
                                    <p className="text-white/60 text-sm">Powered by Google Gemini AI</p>
                                </div>
                            </div>
                            <p className="text-white/80 text-sm leading-relaxed">
                                Warung kamu kecil, tapi <strong className="text-white">intelligence-nya sekelas Fortune 500</strong>.
                                Ketahui siapa kompetitor di sekitarmu, temukan peluang pasar yang belum diisi, dan dapatkan prediksi bisnis harian berbasis AI.
                            </p>
                        </div>
                    </div>

                    {/* Category selection */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-neutral-800">1. Kategori Warungmu</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {CATEGORY_OPTIONS.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setMerchantCategory(cat)}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all border ${
                                        merchantCategory === cat
                                            ? 'bg-[#ff8c00] text-white border-[#ff8c00] shadow-md shadow-[#ff8c00]/20'
                                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-[#ff8c00]/40'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location permission */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
                        <h3 className="font-bold text-neutral-800">2. Aktifkan Lokasi</h3>
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <p className="text-sm text-amber-800 font-medium">🔒 Privacy-first</p>
                            <p className="text-xs text-amber-700 mt-1">
                                Hanya nama bisnis dan kategori yang ditampilkan ke merchant lain. Data pribadi pemilik tidak pernah dibagikan.
                            </p>
                        </div>
                        {ni.locationError && (
                            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                                ⚠️ {ni.locationError}
                            </p>
                        )}
                        <button
                            onClick={handleGrantLocation}
                            disabled={!merchantCategory || ni.locationLoading}
                            className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-[#ff8c00] to-[#e67e00] text-white font-bold rounded-xl shadow-lg shadow-[#ff8c00]/25 hover:from-[#e67e00] hover:to-[#cc7000] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined">location_on</span>
                            {!merchantCategory ? 'Pilih kategori dulu' : 'Izinkan Akses Lokasi'}
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    // ── LOADING LOCATION ──────────────────────────────────────────────────────
    if (ni.locationLoading) {
        return (
            <main className="flex-1 flex items-center justify-center min-h-screen">
                <div className="text-center space-y-3">
                    <div className="size-16 rounded-full bg-gradient-to-br from-[#ff8c00] to-[#e67e00] flex items-center justify-center mx-auto animate-pulse text-3xl">
                        📍
                    </div>
                    <p className="font-bold text-neutral-700">Mendapatkan lokasi GPS...</p>
                    <p className="text-sm text-neutral-400">Izinkan akses lokasi di browser</p>
                </div>
            </main>
        )
    }

    // ── MAIN UI ───────────────────────────────────────────────────────────────
    return (
        <main className="flex-1 flex flex-col min-w-0">
            <div className="p-6 md:p-8 space-y-6 max-w-5xl">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🏘️</span>
                            <h2 className="text-2xl font-black tracking-tight text-neutral-800">Neighborhood Intelligence</h2>
                        </div>
                        <p className="text-neutral-500 text-sm">
                            {ni.myLocation?.address_label || 'Lokasi aktif'}
                            {ni.nearby.length > 0 && ` · ${ni.nearby.length} merchant sekitar`}
                        </p>
                    </div>
                    {/* Radius selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-neutral-500 font-medium">Radius:</span>
                        {RADIUS_OPTIONS.map(km => (
                            <button
                                key={km}
                                onClick={() => handleRadiusChange(km)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    ni.radiusKm === km
                                        ? 'bg-[#ff8c00] text-white shadow-md shadow-[#ff8c00]/20'
                                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                            >
                                {km}km
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl w-fit">
                    {[
                        { key: 'map', label: '🗺️ Peta', },
                        { key: 'competitive', label: '🎯 Analisis Pasar' },
                        { key: 'timemachine', label: '⏰ Time Machine' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab.key
                                    ? 'bg-white text-neutral-800 shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── TAB: MAP ──────────────────────────────────────────────── */}
                {activeTab === 'map' && (
                    <div className="space-y-4">
                        <MerchantMap
                            myLocation={coords}
                            nearby={ni.nearby}
                            radiusKm={ni.radiusKm}
                        />

                        {/* Stats row */}
                        {ni.nearby.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Merchant Terdekat', value: ni.nearby[0]?.business_name || '-', sub: `${Math.round(ni.nearby[0]?.distance_m || 0)}m` },
                                    { label: 'Kategori Terbanyak', value: (() => {
                                        const map = {}
                                        ni.nearby.forEach(m => { map[m.category||'lainnya'] = (map[m.category||'lainnya']||0)+1 })
                                        return Object.entries(map).sort(([,a],[,b])=>b-a)[0]?.[0] || '-'
                                    })(), sub: 'di area ini' },
                                    { label: 'Total Merchant', value: ni.nearby.length, sub: `dalam ${ni.radiusKm}km` },
                                ].map(s => (
                                    <div key={s.label} className="bg-white rounded-xl border border-neutral-100 shadow-sm p-4">
                                        <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">{s.label}</p>
                                        <p className="font-bold text-neutral-800 mt-1 text-sm truncate">{s.value}</p>
                                        <p className="text-[11px] text-neutral-400 mt-0.5">{s.sub}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* CTA to analysis */}
                        <button
                            onClick={() => { setActiveTab('competitive'); if (coords) ni.generateCompetitiveInsight(coords) }}
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <span className="text-lg">🎯</span>
                            Analisis Pasar Area Ini dengan Gemini
                        </button>
                    </div>
                )}

                {/* ── TAB: COMPETITIVE ANALYSIS ─────────────────────────────── */}
                {activeTab === 'competitive' && (
                    <div className="space-y-4">
                        {!ni.competitiveInsight && !ni.competitiveLoading && !ni.competitiveError && (
                            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center space-y-4">
                                <div className="size-20 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-100 flex items-center justify-center mx-auto text-4xl">
                                    🎯
                                </div>
                                <div>
                                    <p className="font-bold text-neutral-800">Analisis Kompetitor & Peluang Pasar</p>
                                    <p className="text-sm text-neutral-400 mt-1 max-w-xs mx-auto">
                                        Gemini AI menganalisis {ni.nearby.length} merchant di radius {ni.radiusKm}km dan menemukan peluang untukmu
                                    </p>
                                </div>
                                <button
                                    onClick={() => coords && ni.generateCompetitiveInsight(coords)}
                                    disabled={!coords}
                                    className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 transition-all active:scale-95"
                                >
                                    ✨ Mulai Analisis
                                </button>
                            </div>
                        )}
                        <InsightCard
                            insight={ni.competitiveInsight}
                            loading={ni.competitiveLoading}
                            error={ni.competitiveError}
                            cached={ni.competitiveCached}
                            onRetry={() => coords && ni.generateCompetitiveInsight(coords)}
                            gradient="from-violet-600 via-purple-600 to-indigo-600"
                            icon="🎯"
                            title="Analisis Kompetitor & Peluang"
                            subtitle={`${ni.nearby.length} merchant dalam radius ${ni.radiusKm}km • Powered by Gemini`}
                        />
                        {ni.competitiveMeta && (
                            <div className="bg-white rounded-xl border border-neutral-100 p-4 space-y-2">
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Detail Analisis</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(ni.competitiveMeta.category_distribution || {}).map(([cat, count]) => (
                                        <span key={cat} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-medium">
                                            {cat}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── TAB: TIME MACHINE ─────────────────────────────────────── */}
                {activeTab === 'timemachine' && (
                    <div className="space-y-4">
                        {/* Info banner */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">⏰</span>
                                <div>
                                    <p className="font-bold text-amber-800 text-sm">Tendar Time Machine</p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Prediksi bisnis besok berdasarkan histori penjualan 4 minggu terakhir + kondisi cuaca.
                                        Diperbarui setiap 6 jam.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!ni.timeMachineInsight && !ni.timeMachineLoading && !ni.timeMachineError && (
                            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center space-y-4">
                                <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center mx-auto text-4xl">
                                    🔮
                                </div>
                                <div>
                                    <p className="font-bold text-neutral-800">Prediksi Bisnis Besok</p>
                                    <p className="text-sm text-neutral-400 mt-1">
                                        Gemini menganalisis pola penjualanmu dan kondisi cuaca untuk prediksi akurat
                                    </p>
                                </div>
                                <button
                                    onClick={() => ni.generateTimeMachine(coords)}
                                    className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95"
                                >
                                    ⏰ Lihat Prediksi Besok
                                </button>
                            </div>
                        )}

                        <InsightCard
                            insight={ni.timeMachineInsight}
                            loading={ni.timeMachineLoading}
                            error={ni.timeMachineError}
                            cached={ni.timeMachineCached}
                            onRetry={() => ni.generateTimeMachine(coords)}
                            gradient="from-amber-500 via-orange-500 to-red-500"
                            icon="🔮"
                            title="Prediksi Bisnis Besok"
                            subtitle={`Berdasarkan ${ni.timeMachineMeta?.order_count || '—'} transaksi + cuaca • Powered by Gemini`}
                        />

                        {ni.timeMachineMeta && (
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Hari Terbaik Historis', value: ni.timeMachineMeta.best_day || '-' },
                                    { label: 'Jam Paling Ramai', value: ni.timeMachineMeta.peak_hour ? `${ni.timeMachineMeta.peak_hour} WIB` : '-' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white rounded-xl border border-neutral-100 p-4">
                                        <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-wider">{s.label}</p>
                                        <p className="font-bold text-neutral-800 mt-1">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Reset location link */}
                <div className="pt-2 border-t border-neutral-100">
                    <button
                        onClick={() => { ni.setMyLocation(null); setSetupDone(false) }}
                        className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                    >
                        🔄 Reset & perbarui lokasi
                    </button>
                </div>
            </div>
        </main>
    )
}
