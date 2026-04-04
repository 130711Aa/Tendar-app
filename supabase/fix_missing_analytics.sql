-- ============================================================================
-- FIX MISSING ANALYTICS VIEWS FOR MULTI-TENANT (TENDAR)
-- ============================================================================
-- Jalankan file ini di Supabase > SQL Editor 
-- untuk memperbaiki error 404 pada view_analytics_product_matrix dan view_analytics_forecast

-- 1. Product Matrix / BCG Matrix (Per Tenant)
CREATE OR REPLACE VIEW view_analytics_product_matrix AS
WITH product_stats AS (
    SELECT 
        tenant_id, product_id, name, total_quantity, total_revenue
    FROM view_analytics_product_performance
),
averages AS (
    SELECT tenant_id, AVG(total_quantity) as avg_qty, AVG(total_revenue) as avg_rev
    FROM product_stats
    GROUP BY tenant_id
)
SELECT 
    p.tenant_id, p.product_id, p.name, p.total_quantity, p.total_revenue,
    CASE 
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Star'
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue < a.avg_rev THEN 'Fasilitas Arus Kas (Volume)'
        WHEN p.total_quantity < a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Premium'
        ELSE 'Perlu Evaluasi (Dead Weight)'
    END as classification
FROM product_stats p
JOIN averages a ON p.tenant_id = a.tenant_id;

-- 2. Forecast / Prediksi Omset (Per Tenant)
CREATE OR REPLACE VIEW view_analytics_forecast AS
WITH daily_sales AS (
    SELECT 
        tenant_id, 
        DATE(created_at) as sale_date, 
        SUM(total_amount) as daily_rev, 
        COUNT(id) as daily_tx
    FROM orders 
    WHERE status != 'cancelled' 
    GROUP BY tenant_id, DATE(created_at)
),
recent_sales AS (
    SELECT 
        tenant_id, 
        daily_rev, 
        daily_tx,
        ROW_NUMBER() OVER(PARTITION BY tenant_id ORDER BY sale_date DESC) as rn
    FROM daily_sales
)
SELECT 
    tenant_id,
    'Moving Average (7 Days)' as metric,
    AVG(daily_rev) as predicted_revenue_tomorrow,
    AVG(daily_tx) as predicted_transactions_tomorrow
FROM recent_sales
WHERE rn <= 7
GROUP BY tenant_id;

-- Done!
