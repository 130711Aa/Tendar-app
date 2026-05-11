/**
 * MerchantMap — SVG-based visual map of nearby merchants.
 * Uses a simple relative coordinate projection (no external map library).
 * Props: myLocation ({ lon, lat }), nearby (array), radiusKm (number)
 */
import { useMemo } from 'react'

const CATEGORY_COLORS = {
    kopi: '#f59e0b',
    minuman: '#3b82f6',
    makanan: '#22c55e',
    dessert: '#ec4899',
    snack: '#f97316',
    default: '#8b5cf6',
}

function getCatColor(cat) {
    if (!cat) return CATEGORY_COLORS.default
    const c = cat.toLowerCase()
    return Object.entries(CATEGORY_COLORS).find(([k]) => c.includes(k))?.[1] || CATEGORY_COLORS.default
}

export default function MerchantMap({ myLocation, nearby, radiusKm = 5 }) {
    const SIZE = 320 // SVG canvas

    const projected = useMemo(() => {
        if (!myLocation || !nearby.length) return []
        const scale = (SIZE / 2 - 30) / radiusKm / 1000 // pixels per meter
        return nearby.map(m => {
            // Simple flat-earth projection (accurate enough for <50km)
            const R = 6371000
            const dx = (m.lon - myLocation.lon) * (Math.PI / 180) * R * Math.cos(myLocation.lat * Math.PI / 180)
            const dy = -(m.lat - myLocation.lat) * (Math.PI / 180) * R
            const cx = SIZE / 2 + dx * scale
            const cy = SIZE / 2 + dy * scale
            return { ...m, cx, cy }
        }).filter(m => m.cx > 0 && m.cx < SIZE && m.cy > 0 && m.cy < SIZE)
    }, [myLocation, nearby, radiusKm])

    if (!myLocation) return null

    return (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                    <h4 className="font-bold text-neutral-800">🗺️ Peta Merchant Sekitar</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Radius {radiusKm}km • {nearby.length} merchant ditemukan</p>
                </div>
            </div>

            <div className="px-5 pb-5">
                <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                    <svg width="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
                        {/* Radius rings */}
                        {[0.25, 0.5, 0.75, 1].map(f => (
                            <circle key={f} cx={SIZE/2} cy={SIZE/2} r={(SIZE/2 - 30) * f}
                                fill="none" stroke="#10b98120" strokeWidth="1" strokeDasharray="4 4" />
                        ))}
                        {/* Grid lines */}
                        <line x1={SIZE/2} y1={0} x2={SIZE/2} y2={SIZE} stroke="#10b98115" strokeWidth="1" />
                        <line x1={0} y1={SIZE/2} x2={SIZE} y2={SIZE/2} stroke="#10b98115" strokeWidth="1" />

                        {/* Nearby merchants */}
                        {projected.map((m, i) => (
                            <g key={m.merchant_id || i}>
                                <circle cx={m.cx} cy={m.cy} r="8" fill={getCatColor(m.category)} opacity="0.85" />
                                <circle cx={m.cx} cy={m.cy} r="4" fill="white" opacity="0.6" />
                                <title>{m.business_name} — {m.category} ({Math.round(m.distance_m)}m)</title>
                            </g>
                        ))}

                        {/* My location pin */}
                        <circle cx={SIZE/2} cy={SIZE/2} r="16" fill="#ff8c0030" />
                        <circle cx={SIZE/2} cy={SIZE/2} r="10" fill="#ff8c00" />
                        <circle cx={SIZE/2} cy={SIZE/2} r="4" fill="white" />

                        {/* Distance label */}
                        <text x={SIZE/2 + 2} y={SIZE - 8} textAnchor="middle" fontSize="10" fill="#6b7280">
                            ← {radiusKm}km →
                        </text>
                    </svg>
                </div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(CATEGORY_COLORS).filter(([k]) => k !== 'default').map(([cat, color]) => (
                        <span key={cat} className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <span className="size-2.5 rounded-full inline-block" style={{ background: color }} />
                            {cat}
                        </span>
                    ))}
                    <span className="flex items-center gap-1 text-[11px] text-neutral-500">
                        <span className="size-2.5 rounded-full inline-block bg-[#ff8c00]" />
                        Warung kamu
                    </span>
                </div>

                {/* Nearby list */}
                {projected.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                        {nearby.slice(0, 10).map(m => (
                            <div key={m.merchant_id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-neutral-50 transition-colors">
                                <span className="size-3 rounded-full flex-shrink-0" style={{ background: getCatColor(m.category) }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-neutral-700 truncate">{m.business_name}</p>
                                    <p className="text-xs text-neutral-400">{m.category || 'lainnya'} · {Math.round(m.distance_m)}m</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {nearby.length === 0 && (
                    <div className="text-center py-6">
                        <span className="text-4xl">🏝️</span>
                        <p className="text-sm text-neutral-500 mt-2 font-medium">Belum ada merchant Tendar lain dalam radius ini.</p>
                        <p className="text-xs text-neutral-400 mt-1">Jaringan akan berkembang seiring lebih banyak warung bergabung!</p>
                    </div>
                )}
            </div>
        </div>
    )
}
