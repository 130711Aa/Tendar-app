-- ============================================================
-- Tendar Neighborhood Intelligence — Database Migration
-- Run this in Supabase SQL Editor (once)
-- ============================================================

-- 1. Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 2. merchant_locations table
-- Stores opt-in merchant coordinates for the community map.
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  coordinates    GEOGRAPHY(POINT, 4326) NOT NULL,   -- (lon, lat)
  is_visible_on_map BOOLEAN DEFAULT true,
  address_label  TEXT,                               -- Human-readable label, e.g. "Depok, Jawa Barat"
  category       TEXT,                               -- F&B category: kopi, makanan, minuman, dll
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Spatial index for fast radius queries
CREATE INDEX IF NOT EXISTS idx_merchant_locations_geo
  ON merchant_locations USING GIST (coordinates);

-- Index for merchant_id lookups
CREATE INDEX IF NOT EXISTS idx_merchant_locations_merchant
  ON merchant_locations (merchant_id);

-- ============================================================
-- 3. neighborhood_insights table
-- Caches Gemini-generated insights per tenant (24-hour TTL).
-- ============================================================
CREATE TABLE IF NOT EXISTS neighborhood_insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('competitive', 'time_machine')),
  content      TEXT NOT NULL,                        -- Gemini-generated markdown text
  metadata     JSONB,                                -- radius_km, competitor_count, weather data, etc.
  generated_at TIMESTAMPTZ DEFAULT now(),
  is_actioned  BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_neighborhood_insights_merchant
  ON neighborhood_insights (merchant_id, insight_type, generated_at DESC);

-- ============================================================
-- 4. Row-Level Security
-- ============================================================

-- merchant_locations: any authenticated user can read visible entries
-- only the owning merchant can write their own row
ALTER TABLE merchant_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read visible merchant locations" ON merchant_locations;
CREATE POLICY "Anyone can read visible merchant locations"
  ON merchant_locations FOR SELECT
  USING (is_visible_on_map = true);

DROP POLICY IF EXISTS "Merchant can manage own location" ON merchant_locations;
CREATE POLICY "Merchant can manage own location"
  ON merchant_locations FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM tenants
      WHERE owner_id = auth.uid()
    )
  );

-- neighborhood_insights: only owner can read/write their insights
ALTER TABLE neighborhood_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchant can manage own insights" ON neighborhood_insights;
CREATE POLICY "Merchant can manage own insights"
  ON neighborhood_insights FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM tenants
      WHERE owner_id = auth.uid()
    )
  );

-- ============================================================
-- 5. RPC: get_nearby_merchants
-- Returns merchants within a given radius around a coordinate.
-- Usage: SELECT * FROM get_nearby_merchants(lon, lat, radius_meters)
-- ============================================================
CREATE OR REPLACE FUNCTION get_nearby_merchants(
  p_lon     DOUBLE PRECISION,
  p_lat     DOUBLE PRECISION,
  p_radius  DOUBLE PRECISION DEFAULT 5000  -- meters
)
RETURNS TABLE (
  merchant_id   UUID,
  business_name TEXT,
  category      TEXT,
  address_label TEXT,
  distance_m    DOUBLE PRECISION,
  lon           DOUBLE PRECISION,
  lat           DOUBLE PRECISION
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ml.merchant_id,
    t.name AS business_name,
    ml.category,
    ml.address_label,
    ST_Distance(
      ml.coordinates,
      ST_MakePoint(p_lon, p_lat)::geography
    ) AS distance_m,
    ST_X(ml.coordinates::geometry) AS lon,
    ST_Y(ml.coordinates::geometry) AS lat
  FROM merchant_locations ml
  JOIN tenants t ON t.id = ml.merchant_id
  WHERE
    ml.is_visible_on_map = true
    AND ST_DWithin(
      ml.coordinates,
      ST_MakePoint(p_lon, p_lat)::geography,
      p_radius
    )
  ORDER BY distance_m ASC
  LIMIT 50;
$$;
