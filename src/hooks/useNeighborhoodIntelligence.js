import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useNeighborhoodIntelligence
 * Central hook for all Neighborhood Intelligence operations.
 * Communicates with the `neighborhood-intelligence` Supabase Edge Function.
 */
export function useNeighborhoodIntelligence(tenantId, businessName, merchantCategory) {
    // ── Location state ────────────────────────────────────────────────────────
    const [myLocation, setMyLocation] = useState(null)     // { lon, lat, address_label, category }
    const [locationLoading, setLocationLoading] = useState(false)
    const [locationError, setLocationError] = useState('')

    // ── Nearby merchants ──────────────────────────────────────────────────────
    const [nearby, setNearby] = useState([])
    const [nearbyLoading, setNearbyLoading] = useState(false)

    // ── Competitive analysis ──────────────────────────────────────────────────
    const [competitiveInsight, setCompetitiveInsight] = useState('')
    const [competitiveMeta, setCompetitiveMeta] = useState(null)
    const [competitiveLoading, setCompetitiveLoading] = useState(false)
    const [competitiveError, setCompetitiveError] = useState('')
    const [competitiveCached, setCompetitiveCached] = useState(false)

    // ── Time Machine ──────────────────────────────────────────────────────────
    const [timeMachineInsight, setTimeMachineInsight] = useState('')
    const [timeMachineMeta, setTimeMachineMeta] = useState(null)
    const [timeMachineLoading, setTimeMachineLoading] = useState(false)
    const [timeMachineError, setTimeMachineError] = useState('')
    const [timeMachineCached, setTimeMachineCached] = useState(false)

    // Radius slider state
    const [radiusKm, setRadiusKm] = useState(5)

    const activeCoords = useRef(null)

    // ── Helper: invoke edge function ─────────────────────────────────────────
    const invoke = useCallback(async (actionBody) => {
        const { data, error } = await supabase.functions.invoke(
            'neighborhood-intelligence',
            { body: { tenant_id: tenantId, business_name: businessName, category: merchantCategory, ...actionBody } }
        )
        if (error) throw error
        if (data?.error) throw new Error(data.error)
        return data
    }, [tenantId, businessName, merchantCategory])

    // ── Load saved location from DB ───────────────────────────────────────────
    const loadMyLocation = useCallback(async () => {
        if (!tenantId) return null
        try {
            const data = await invoke({ action: 'get_my_location' })
            if (data.location) {
                // coordinates are returned as WKB text; parse lon/lat from metadata if stored
                setMyLocation(data.location)
                return data.location
            }
        } catch (_) { /* Silently handled — location just not set */ }
        return null
    }, [invoke, tenantId])

    // ── Request geolocation from browser & save ───────────────────────────────
    const requestAndSaveLocation = useCallback(async (opts = {}) => {
        setLocationLoading(true)
        setLocationError('')
        try {
            const pos = await new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Browser tidak mendukung geolocation'))
                    return
                }
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                })
            })

            const { longitude: lon, latitude: lat } = pos.coords
            activeCoords.current = { lon, lat }

            // Reverse geocode using browser's built-in (or just store raw coords)
            let addressLabel = opts.addressLabel || `${lat.toFixed(4)}, ${lon.toFixed(4)}`

            await invoke({
                action: 'save_location',
                lon,
                lat,
                address_label: addressLabel,
                category: opts.category || merchantCategory,
                is_visible_on_map: opts.isVisible !== false,
            })

            const newLoc = { lon, lat, address_label: addressLabel, category: opts.category || merchantCategory, is_visible_on_map: opts.isVisible !== false }
            setMyLocation(newLoc)
            return newLoc
        } catch (err) {
            const msg = err.code === 1 ? 'Izin lokasi ditolak. Aktifkan GPS di browser.' :
                err.code === 2 ? 'Lokasi tidak tersedia. Coba lagi.' :
                err.code === 3 ? 'Timeout mendapatkan lokasi. Coba lagi.' :
                (err.message || 'Gagal mendapatkan lokasi')
            setLocationError(msg)
            throw err
        } finally {
            setLocationLoading(false)
        }
    }, [invoke, merchantCategory])

    // ── Fetch nearby merchants ────────────────────────────────────────────────
    const fetchNearby = useCallback(async (coords, km = radiusKm) => {
        if (!coords) return
        setNearbyLoading(true)
        try {
            const data = await invoke({ action: 'get_nearby', lon: coords.lon, lat: coords.lat, radius_km: km })
            setNearby(data.nearby || [])
        } catch (err) {
            console.error('[useNeighborhoodIntelligence] fetchNearby error:', err)
        } finally {
            setNearbyLoading(false)
        }
    }, [invoke, radiusKm])

    // ── Generate competitive analysis ─────────────────────────────────────────
    const generateCompetitiveInsight = useCallback(async (coords) => {
        setCompetitiveLoading(true)
        setCompetitiveError('')
        setCompetitiveInsight('')
        try {
            const data = await invoke({
                action: 'competitive_analysis',
                lon: coords.lon,
                lat: coords.lat,
                radius_km: radiusKm,
            })
            setCompetitiveInsight(data.insight)
            setCompetitiveMeta(data.metadata)
            setCompetitiveCached(data.cached || false)
        } catch (err) {
            setCompetitiveError(err.message || 'Gagal generate analisis kompetitor')
        } finally {
            setCompetitiveLoading(false)
        }
    }, [invoke, radiusKm])

    // ── Generate Time Machine ─────────────────────────────────────────────────
    const generateTimeMachine = useCallback(async (coords) => {
        setTimeMachineLoading(true)
        setTimeMachineError('')
        setTimeMachineInsight('')
        try {
            const data = await invoke({
                action: 'time_machine',
                lon: coords?.lon || null,
                lat: coords?.lat || null,
            })
            setTimeMachineInsight(data.insight)
            setTimeMachineMeta(data.metadata)
            setTimeMachineCached(data.cached || false)
        } catch (err) {
            setTimeMachineError(err.message || 'Gagal generate prediksi')
        } finally {
            setTimeMachineLoading(false)
        }
    }, [invoke])

    return {
        // Location
        myLocation, setMyLocation,
        locationLoading, locationError,
        loadMyLocation, requestAndSaveLocation,

        // Nearby
        nearby, nearbyLoading,
        fetchNearby,

        // Radius
        radiusKm, setRadiusKm,

        // Competitive
        competitiveInsight, competitiveMeta, competitiveLoading, competitiveError, competitiveCached,
        generateCompetitiveInsight,

        // Time Machine
        timeMachineInsight, timeMachineMeta, timeMachineLoading, timeMachineError, timeMachineCached,
        generateTimeMachine,
    }
}
