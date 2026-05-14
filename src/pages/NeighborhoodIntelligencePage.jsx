import { useState, useEffect, useRef, useCallback } from 'react'
import { useTenantContext } from '../context/TenantContext'
import { useNeighborhoodIntelligence } from '../hooks/useNeighborhoodIntelligence'
import InsightCard from '../components/neighborhood/InsightCard'
import MerchantMap, { fetchRealFnBNearby, callGeminiInsight, OSM_TYPE_LABEL } from '../components/neighborhood/MerchantMap'

const RADIUS_OPTIONS = [1, 3, 5, 10, 25, 50]

const CATEGORY_OPTIONS = [
    { id: 'kopi', label: 'Kopi & Minuman', icon: '☕' },
    { id: 'makanan_berat', label: 'Makanan Berat', icon: '🍲' },
    { id: 'snack', label: 'Snack & Jajanan', icon: '🍘' },
    { id: 'dessert', label: 'Dessert & Es', icon: '🍨' },
    { id: 'bakery', label: 'Bakery', icon: '🍞' },
    { id: 'lainnya', label: 'Lainnya', icon: '📚', isCustom: true },
]

export default function NeighborhoodIntelligencePage() {
    const { tenantId, tenantName } = useTenantContext()
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [customCategoryText, setCustomCategoryText] = useState('')
    
    // Effective category is either the selected label or the custom text
    const merchantCategory = selectedCategory?.isCustom 
        ? customCategoryText 
        : selectedCategory?.label || ''

    const [setupDone, setSetupDone] = useState(false)
    const [activeTab, setActiveTab] = useState('map') // 'map' | 'competitive' | 'timemachine'

    const ni = useNeighborhoodIntelligence(tenantId, tenantName, merchantCategory)
    const prevCategory = useRef(merchantCategory)

    // OSM state (lifted here so competitive tab can share the data)
    const [osmData, setOsmData] = useState([])
    const [osmLoading, setOsmLoading] = useState(false)
    const [osmError, setOsmError] = useState('')
    const [osmInsight, setOsmInsight] = useState('')
    const [osmInsightLoading, setOsmInsightLoading] = useState(false)
    const [osmInsightError, setOsmInsightError] = useState('')

    // Clear analisis saat kategori berubah
    useEffect(() => {
        if (prevCategory.current !== merchantCategory) {
            prevCategory.current = merchantCategory
            ni.clearInsights()
        }
    }, [merchantCategory]) // eslint-disable-line

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
        
        // 1. Check direct properties
        if (loc.lon != null && loc.lat != null) return { lon: loc.lon, lat: loc.lat }
        
        // 2. Check Supabase PostgREST GeoJSON format
        if (loc.coordinates && loc.coordinates.type === 'Point' && Array.isArray(loc.coordinates.coordinates)) {
            return { 
                lon: loc.coordinates.coordinates[0], 
                lat: loc.coordinates.coordinates[1] 
            }
        }
        
        // 3. Fallback parsing from address_label if it's "lat, lon"
        if (loc.address_label) {
            const parts = loc.address_label.split(',')
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) }
            }
        }

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

    // Fetch OSM whenever coords or radius changes
    useEffect(() => {
        if (!coords?.lat) return
        setOsmLoading(true)
        setOsmError('')
        setOsmInsight('')
        const radiusMeters = Math.min(ni.radiusKm * 1000, 50000)
        fetchRealFnBNearby(coords.lat, coords.lon, radiusMeters)
            .then(data => setOsmData(data))
            .catch(() => setOsmError('Gagal memuat data kompetitor. Cek koneksi.'))
            .finally(() => setOsmLoading(false))
    }, [coords?.lat, coords?.lon, ni.radiusKm]) // eslint-disable-line

    async function handleOsmInsight() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY
        if (!apiKey) { setOsmInsightError('VITE_GEMINI_API_KEY belum dikonfigurasi.'); return }
        setOsmInsightLoading(true)
        setOsmInsightError('')
        try {
            const text = await callGeminiInsight(apiKey, tenantName, merchantCategory, ni.radiusKm, osmData)
            setOsmInsight(text)
        } catch (err) {
            setOsmInsightError(err.message || 'Gagal generate analisis.')
        } finally {
            setOsmInsightLoading(false)
        }
    }

    // ── SETUP SCREEN ──────────────────────────────────────────────────────────
    if (!setupDone && !ni.locationLoading) {
        return (
            <main className="flex-1 flex flex-col min-w-0 bg-[#f8f9fa]">
                <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
                    {/* Hero */}
                    <div className="bg-[#111827] rounded-2xl p-8 text-white relative overflow-hidden shadow-lg border border-neutral-800"
                        style={{ backgroundImage: 'radial-gradient(#ffffff15 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                    >
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-neutral-800/80 border border-neutral-700 flex items-center justify-center text-xl shadow-inner">
                                        🏪
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black tracking-tight text-white">Tendar Sixth Sense</h1>
                                        <p className="text-[#ff8c00] font-semibold text-sm">Powered by Google Gemini AI</p>
                                    </div>
                                </div>
                                <p className="text-neutral-300 text-sm leading-relaxed mt-4 max-w-lg">
                                    Warung kamu kecil, tapi <strong className="text-white">intelligence-nya sekelas Fortune 500</strong>.
                                    Ketahui siapa kompetitor di sekitarmu, temukan peluang pasar yang belum diisi, dan dapatkan prediksi bisnis harian berbasis AI.
                                </p>
                            </div>
                            
                            {/* Illustration Mockup */}
                            <div className="hidden md:flex flex-col bg-[#1e293b]/80 border border-neutral-700 rounded-xl p-4 w-64 shadow-2xl backdrop-blur-sm">
                                <div className="flex items-end gap-2 h-24 mb-4 relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-neutral-800 border border-neutral-600 text-[10px] px-2 py-0.5 rounded text-neutral-300 font-mono">Trend</div>
                                    <div className="w-full bg-[#3b82f6]/40 rounded-t-sm h-[30%]"></div>
                                    <div className="w-full bg-[#3b82f6]/60 rounded-t-sm h-[60%]"></div>
                                    <div className="w-full bg-[#ff8c00] rounded-t-sm h-[90%] shadow-[0_0_15px_rgba(255,140,0,0.5)]"></div>
                                    <div className="w-full bg-[#3b82f6]/80 rounded-t-sm h-[70%]"></div>
                                    <div className="w-full bg-[#3b82f6]/40 rounded-t-sm h-[20%]"></div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                                    <span className="text-[#ff8c00] animate-pulse">🤖</span> AI Analyzing Market...
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Category selection */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">1</div>
                            <h3 className="font-bold text-neutral-800 text-lg">Kategori Warungmu</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {CATEGORY_OPTIONS.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all border ${
                                        selectedCategory?.id === cat.id
                                            ? 'bg-white text-neutral-800 border-[#ff8c00] shadow-[0_0_0_1px_#ff8c00] shadow-[#ff8c00]/10'
                                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:border-[#ff8c00]/40'
                                    }`}
                                >
                                    <span className="text-xl opacity-80">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {/* Custom Category Input */}
                        {selectedCategory?.isCustom && (
                            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium text-neutral-700 mb-1.5 ml-1">Ketik Kategori Bisnismu</label>
                                <input
                                    type="text"
                                    value={customCategoryText}
                                    onChange={(e) => setCustomCategoryText(e.target.value)}
                                    placeholder="Contoh: Warteg, Seblak, Angkringan..."
                                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff8c00]/50 focus:border-[#ff8c00] transition-all"
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    {/* Location permission */}
                    <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')]">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 -m-2 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm">2</div>
                                <h3 className="font-bold text-neutral-800 text-lg">Aktifkan Lokasi</h3>
                            </div>
                            
                            <div className="bg-[#fff9e6] rounded-xl p-5 border border-[#ffe082]">
                                <p className="text-sm text-[#b28200] font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">lock</span>
                                    Privacy-first
                                </p>
                                <p className="text-sm text-[#997000] mt-1.5 ml-6">
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
                                className="w-full flex items-center justify-center gap-2 py-4 bg-[#e5b373] text-white font-bold rounded-xl shadow-sm hover:bg-[#d49f5c] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-base"
                            >
                                <span className="material-symbols-outlined text-xl">location_on</span>
                                {!merchantCategory ? 'Pilih kategori dulu' : 'Aktifkan Sixth Sense'}
                            </button>
                        </div>
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
                            <h2 className="text-2xl font-black tracking-tight text-neutral-800">Tendar Sixth Sense</h2>
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
                            osmData={osmData}
                            osmLoading={osmLoading}
                            osmError={osmError}
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
                    </div>
                )}

                {/* ── TAB: COMPETITIVE ANALYSIS ─────────────────────────────── */}
                {activeTab === 'competitive' && (
                    <div className="space-y-4">
                        {/* Header card with OSM stats + trigger button */}
                        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <p className="font-bold text-neutral-800">🎯 Analisis Kompetitor Real</p>
                                    <p className="text-sm text-neutral-400 mt-0.5">
                                        {osmLoading
                                            ? 'Memuat data dari OpenStreetMap...'
                                            : `${osmData.length} kompetitor F&B ditemukan dalam radius ${ni.radiusKm}km`
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={handleOsmInsight}
                                    disabled={osmInsightLoading || osmData.length === 0 || osmLoading}
                                    className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                    {osmInsightLoading ? '⏳ Menganalisis...' : osmInsight ? '🔄 Perbarui Analisis' : '✨ Mulai Analisis'}
                                </button>
                            </div>

                            {/* OSM type breakdown badges */}
                            {osmData.length > 0 && !osmLoading && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {Object.entries(
                                        osmData.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc }, {})
                                    ).map(([type, count]) => (
                                        <span key={type} className="px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-lg text-xs font-medium">
                                            {OSM_TYPE_LABEL[type] || type}: {count}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {osmLoading && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-neutral-400">
                                    <div className="w-4 h-4 rounded-full border-2 border-neutral-200 border-t-violet-500 animate-spin flex-shrink-0" />
                                    Fetching data kompetitor dari OpenStreetMap...
                                </div>
                            )}

                            {osmError && (
                                <p className="mt-3 text-sm text-red-500">⚠️ {osmError}</p>
                            )}
                        </div>

                        {/* Gemini Insight loading skeleton */}
                        {osmInsightLoading && (
                            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5 space-y-3">
                                {[85, 95, 70, 60, 80].map((w, i) => (
                                    <div key={i} className="h-3 rounded-full bg-neutral-100 animate-pulse" style={{ width: `${w}%` }} />
                                ))}
                            </div>
                        )}

                        {/* Gemini Insight result */}
                        {!osmInsightLoading && osmInsight && (
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-5">
                                <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-3">Analisis Gemini AI • Data OpenStreetMap</p>
                                <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">{osmInsight}</p>
                            </div>
                        )}

                        {/* Error */}
                        {osmInsightError && (
                            <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                                <p className="text-sm text-red-600">⚠️ {osmInsightError}</p>
                            </div>
                        )}

                        {/* Empty state — no OSM data */}
                        {osmData.length === 0 && !osmLoading && !osmError && (
                            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-8 text-center">
                                <span className="text-4xl">🏝️</span>
                                <p className="mt-3 font-semibold text-neutral-600">Tidak ada data kompetitor di area ini</p>
                                <p className="text-sm text-neutral-400 mt-1">OpenStreetMap tidak menemukan F&B dalam radius {ni.radiusKm}km</p>
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
                        onClick={() => { ni.resetAll(); setSetupDone(false) }}
                        className="text-xs text-neutral-400 hover:text-red-400 transition-colors"
                    >
                        🔄 Reset &amp; perbarui lokasi
                    </button>
                </div>
            </div>
        </main>
    )
}
