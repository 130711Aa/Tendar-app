/**
 * MerchantMap — Real Google Maps + OSM Overpass competitor data
 * Props: myLocation ({ lon, lat }), nearby (Tendar merchants array), radiusKm (number)
 *        merchantName (string), merchantCategory (string)
 *        osmData (array), osmLoading (bool), osmError (string)
 */
import { useMemo, useState } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, CircleF, InfoWindowF } from '@react-google-maps/api'

const BRAND = '#FF8C00'
const BRAND_DARK = '#E07800'
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro']

// ── Category colors for Tendar merchants ──────────────────────────────────────
const CATEGORY_COLORS = {
    kopi: '#f59e0b',
    minuman: '#3b82f6',
    makanan: '#22c55e',
    dessert: '#ec4899',
    snack: '#f97316',
    default: '#8b5cf6',
}

// ── OSM amenity type labels ───────────────────────────────────────────────────
export const OSM_TYPE_LABEL = {
    restaurant: '🍽️ Restoran',
    cafe: '☕ Kafe',
    fast_food: '🍟 Fast Food',
    food_court: '🏪 Food Court',
    bar: '🍺 Bar',
    bakery: '🥖 Bakery',
    ice_cream: '🍦 Es Krim',
}

function getCatColor(cat) {
    if (!cat) return CATEGORY_COLORS.default
    const c = cat.toLowerCase()
    return Object.entries(CATEGORY_COLORS).find(([k]) => c.includes(k))?.[1] || CATEGORY_COLORS.default
}

const mapContainerStyle = { width: '100%', height: '360px', borderRadius: '0.75rem' }
const mapOptions = { disableDefaultUI: true, zoomControl: true }

// ── Overpass API fetch with sessionStorage caching (exported for page-level use)
export async function fetchRealFnBNearby(lat, lng, radiusMeters) {
    const cacheKey = `osm_${lat.toFixed(4)}_${lng.toFixed(4)}_${radiusMeters}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
        try {
            const { data, ts } = JSON.parse(cached)
            if (Date.now() - ts < 60 * 60 * 1000) return data // 1 hour TTL
        } catch (_) {}
    }

    const query = `
[out:json][timeout:25];
(
  node["amenity"~"restaurant|cafe|fast_food|food_court|bar|bakery|ice_cream"](around:${radiusMeters},${lat},${lng});
  way["amenity"~"restaurant|cafe|fast_food|food_court|bar|bakery|ice_cream"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim()

    const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
    })
    if (!res.ok) throw new Error(`Overpass error ${res.status}`)

    const json = await res.json()
    const data = (json.elements || [])
        .filter(el => el.tags?.amenity)
        .map(el => ({
            id: el.id,
            name: el.tags?.name || el.tags?.amenity,
            type: el.tags?.amenity,
            lat: el.lat ?? el.center?.lat,
            lng: el.lon ?? el.center?.lon,
            source: 'osm',
        }))
        .filter(el => el.lat != null && el.lng != null)

    try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() }))
    } catch (_) {}
    return data
}

// ── Gemini insight (exported for page-level use) ─────────────────────────────
export async function callGeminiInsight(apiKey, merchantName, merchantCategory, radiusKm, osmCompetitors) {
    const typeCounts = {}
    osmCompetitors.forEach(c => { typeCounts[c.type] = (typeCounts[c.type] || 0) + 1 })
    const summary = Object.entries(typeCounts)
        .map(([type, n]) => `${OSM_TYPE_LABEL[type] || type}: ${n}`)
        .join('\n')

    const systemInstruction = `Kamu adalah konsultan bisnis F&B yang memberikan analisis singkat dan actionable untuk UMKM Indonesia.
Aturan WAJIB:
- LANGSUNG ke isi analisis, JANGAN tulis salam pembuka, sapaan, atau kalimat basa-basi apapun.
- JANGAN gunakan markdown, bintang (*/**), atau bullet point (-).
- Gunakan nomor (1., 2., 3.) dan baris baru untuk memisahkan poin.
- Gunakan bahasa Indonesia santai dan lugas.
- Maksimal 160 kata total.`

    const userPrompt = `Data untuk dianalisis:
Nama warung saya: "${merchantName || 'warung saya'}"
Kategori: ${merchantCategory || 'makanan/minuman'}
Radius analisis: ${radiusKm}km

Kompetitor di area ini (dari OpenStreetMap):
Total: ${osmCompetitors.length} tempat
${summary || 'Tidak ada data kompetitor ditemukan'}

Berikan analisis:
1. Saturasi pasar di area ini (padat/sedang/jarang beserta alasannya)
2. Gap kategori F&B yang masih kurang atau belum ada di area ini
3. Satu rekomendasi konkret yang langsung bisa dieksekusi`

    let lastErr = null
    for (const model of GEMINI_MODELS) {
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: { parts: [{ text: systemInstruction }] },
                        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                        generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
                    }),
                }
            )
            if (!res.ok) {
                const e = await res.json().catch(() => ({}))
                lastErr = new Error(e?.error?.message || `HTTP ${res.status}`)
                continue
            }
            const data = await res.json()
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
        } catch (e) { lastErr = e }
    }
    throw lastErr || new Error('Semua model gagal')
}

// ── Zoom helper ───────────────────────────────────────────────────────────────
function getZoom(radius) {
    if (radius <= 1) return 15
    if (radius <= 3) return 13
    if (radius <= 5) return 12.5
    if (radius <= 10) return 11.5
    if (radius <= 25) return 10
    return 9
}



export default function MerchantMap({
    myLocation,
    nearby = [],
    radiusKm = 5,
    osmData = [],
    osmLoading = false,
    osmError = '',
}) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: 'AIzaSyBAc0xkl5phHxStCoefdp3d9C8uCXyQfVg',
    })

    const [selectedTendar, setSelectedTendar] = useState(null)
    const [selectedOsm, setSelectedOsm] = useState(null)
    const [showCompetitors, setShowCompetitors] = useState(true)

    const center = useMemo(() => {
        if (!myLocation) return { lat: -6.2, lng: 106.8167 }
        return { lat: myLocation.lat, lng: myLocation.lon }
    }, [myLocation])

    const tendarMarkers = useMemo(() =>
        nearby.map(m => ({
            ...m,
            position: { lat: m.lat, lng: m.lon },
            color: getCatColor(m.category),
        })), [nearby])

    if (!myLocation) return null

    return (
        <>
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>

            <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">

                {/* ── Header ── */}
                <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                        <h4 style={{ margin: 0, fontWeight: 700, color: '#1a1a1a', fontSize: 15 }}>
                            🗺️ Peta Kompetitor Area
                        </h4>
                        {/* Dual counter */}
                        <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 20,
                                background: `${BRAND}18`, fontSize: 11, fontWeight: 700,
                                color: BRAND_DARK,
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: BRAND, display: 'inline-block' }} />
                                {nearby.length} merchant Tendar
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 20,
                                background: '#f5f5f5', fontSize: 11, fontWeight: 700,
                                color: '#666',
                            }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#9E9E9E', display: 'inline-block' }} />
                                {osmLoading ? '...' : `${osmData.length} kompetitor di area ini`}
                            </span>
                        </div>
                    </div>

                    {/* Toggle competitors */}
                    <button
                        onClick={() => setShowCompetitors(v => !v)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '7px 14px', borderRadius: 20, border: '1.5px solid #e0e0e0',
                            background: showCompetitors ? '#1a1a1a' : '#fff',
                            color: showCompetitors ? '#fff' : '#555',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: showCompetitors ? '#9E9E9E' : '#ccc',
                            display: 'inline-block', flexShrink: 0,
                        }} />
                        {showCompetitors ? 'Sembunyikan kompetitor' : 'Tampilkan kompetitor area'}
                    </button>
                </div>

                <div style={{ padding: '0 20px 20px' }}>
                    {/* ── Map ── */}
                    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#f0f0f0', border: '1px solid #e0e0e0' }}>
                        {!isLoaded ? (
                            <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 32 }}>🗺️</div>
                                    <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>Memuat Peta...</p>
                                </div>
                            </div>
                        ) : (
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={center}
                                zoom={getZoom(radiusKm)}
                                options={mapOptions}
                            >
                                {/* My location */}
                                <MarkerF
                                    position={center}
                                    icon={{
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        scale: 11, fillColor: BRAND, fillOpacity: 1,
                                        strokeWeight: 3, strokeColor: '#fff',
                                    }}
                                    title="Lokasi Warungmu"
                                    zIndex={999}
                                />

                                {/* Radius circle */}
                                <CircleF
                                    center={center}
                                    radius={radiusKm * 1000}
                                    options={{
                                        fillColor: BRAND, fillOpacity: 0.06,
                                        strokeColor: BRAND, strokeOpacity: 0.35,
                                        strokeWeight: 1.5, clickable: false,
                                    }}
                                />

                                {/* OSM Competitor markers */}
                                {showCompetitors && osmData.map(c => (
                                    <MarkerF
                                        key={`osm-${c.id}`}
                                        position={{ lat: c.lat, lng: c.lng }}
                                        icon={{
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            scale: 6, fillColor: '#9E9E9E', fillOpacity: 0.6,
                                            strokeWeight: 1.5, strokeColor: '#fff',
                                        }}
                                        onClick={() => { setSelectedOsm(c); setSelectedTendar(null) }}
                                        zIndex={10}
                                    />
                                ))}

                                {/* Tendar merchant markers */}
                                {tendarMarkers.map(m => (
                                    <MarkerF
                                        key={m.merchant_id}
                                        position={m.position}
                                        icon={{
                                            path: window.google.maps.SymbolPath.CIRCLE,
                                            scale: 9, fillColor: m.color, fillOpacity: 0.9,
                                            strokeWeight: 2, strokeColor: '#fff',
                                        }}
                                        onClick={() => { setSelectedTendar(m); setSelectedOsm(null) }}
                                        zIndex={100}
                                    />
                                ))}

                                {/* Info Window — Tendar */}
                                {selectedTendar && (
                                    <InfoWindowF
                                        position={selectedTendar.position}
                                        onCloseClick={() => setSelectedTendar(null)}
                                    >
                                        <div style={{ padding: '2px 4px', maxWidth: 200 }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{selectedTendar.business_name}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>
                                                🟠 Merchant Tendar • {selectedTendar.category || 'Lainnya'} • {Math.round(selectedTendar.distance_m)}m
                                            </p>
                                        </div>
                                    </InfoWindowF>
                                )}

                                {/* Info Window — OSM Competitor */}
                                {selectedOsm && (
                                    <InfoWindowF
                                        position={{ lat: selectedOsm.lat, lng: selectedOsm.lng }}
                                        onCloseClick={() => setSelectedOsm(null)}
                                    >
                                        <div style={{ padding: '2px 4px', maxWidth: 200 }}>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{selectedOsm.name}</p>
                                            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>
                                                ⚔️ Kompetitor • {OSM_TYPE_LABEL[selectedOsm.type] || selectedOsm.type}
                                            </p>
                                        </div>
                                    </InfoWindowF>
                                )}
                            </GoogleMap>
                        )}
                    </div>

                    {/* ── OSM loading/error state ── */}
                    {osmLoading && (
                        <div style={{
                            marginTop: 10, padding: '10px 14px', borderRadius: 10,
                            background: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <div style={{
                                width: 14, height: 14, borderRadius: '50%',
                                border: '2px solid #ccc', borderTop: `2px solid ${BRAND}`,
                                animation: 'spin 0.8s linear infinite',
                                flexShrink: 0,
                            }} />
                            <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Memuat data kompetitor dari OpenStreetMap...</p>
                        </div>
                    )}

                    {osmError && (
                        <div style={{
                            marginTop: 10, padding: '10px 14px', borderRadius: 10,
                            background: '#fff1f0', border: '1px solid #ffc9c9',
                        }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#c53030' }}>⚠️ {osmError}</p>
                        </div>
                    )}

                    {/* ── Legend ── */}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: BRAND, display: 'inline-block' }} />
                            Warung kamu
                        </span>
                        {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'default').map(([cat, color]) => (
                            <span key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                {cat}
                            </span>
                        ))}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#9E9E9E', opacity: 0.7, display: 'inline-block' }} />
                            Kompetitor OSM
                        </span>
                    </div>


                    {/* ── Tendar nearby list ── */}
                    {nearby.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Merchant Tendar Terdekat
                            </p>
                            <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                                {nearby.slice(0, 10).map(m => (
                                    <div
                                        key={m.merchant_id}
                                        onClick={() => { setSelectedTendar(tendarMarkers.find(x => x.merchant_id === m.merchant_id)); setSelectedOsm(null) }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: getCatColor(m.category), flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {m.business_name}
                                            </p>
                                            <p style={{ margin: 0, fontSize: 11, color: '#999' }}>
                                                {m.category || 'lainnya'} · {Math.round(m.distance_m)}m
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {nearby.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <span style={{ fontSize: 36 }}>🏝️</span>
                            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#999', fontWeight: 600 }}>
                                Belum ada merchant Tendar lain dalam radius ini.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
