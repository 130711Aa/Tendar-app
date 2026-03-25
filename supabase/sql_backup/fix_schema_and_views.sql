-- FIX SCRIPT: Schema Repair & Analytics Views (UPDATED)
-- Run this in Supabase SQL Editor.

-- WARNING: This will drop 'order_items' and recreate it from the 'orders' backup.
-- This is necessary because your current 'order_items' table is missing the 'product_id' column.

-- 1. Drop old views and table to ensure clean slate
DROP VIEW IF EXISTS view_analytics_product_performance CASCADE;
DROP VIEW IF EXISTS view_analytics_product_matrix CASCADE;
DROP VIEW IF EXISTS view_analytics_sales_time;
DROP VIEW IF EXISTS view_analytics_customer_insights;
DROP VIEW IF EXISTS view_analytics_summary;
DROP VIEW IF EXISTS view_analytics_forecast;

DROP TABLE IF EXISTS order_items CASCADE;

-- 2. Create 'order_items' table with CORRECT schema
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT, 
    name TEXT,
    quantity INTEGER DEFAULT 1,
    price INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Backfill Data from 'orders' JSONB column
-- This restores all your item history!
INSERT INTO order_items (order_id, product_id, name, quantity, price)
SELECT 
    o.id as order_id,
    (item->>'id')::BIGINT as product_id,
    item->>'name' as name,
    (item->>'quantity')::INTEGER as quantity,
    (item->>'price')::INTEGER as price
FROM orders o,
     jsonb_array_elements(o.items) as item;

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 5. Re-create Analytics Views

-- View 1: Product Performance
CREATE OR REPLACE VIEW view_analytics_product_performance AS
SELECT 
    oi.product_id,
    oi.name,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.price * oi.quantity) as total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY oi.product_id, oi.name;

-- View 2: Product Matrix
CREATE OR REPLACE VIEW view_analytics_product_matrix AS
WITH product_stats AS (
    SELECT 
        product_id,
        name,
        total_quantity,
        total_revenue
    FROM view_analytics_product_performance
),
averages AS (
    SELECT 
        AVG(total_quantity) as avg_qty,
        AVG(total_revenue) as avg_rev
    FROM product_stats
)
SELECT 
    p.product_id,
    p.name,
    p.total_quantity,
    p.total_revenue,
    CASE 
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Star'
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue < a.avg_rev THEN 'Fasilitas Arus Kas (Volume)'
        WHEN p.total_quantity < a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Premium'
        ELSE 'Perlu Evaluasi (Dead Weight)'
    END as classification
FROM product_stats p, averages a;

-- View 3: Sales Time Analysis
CREATE OR REPLACE VIEW view_analytics_sales_time AS
SELECT 
    TO_CHAR(created_at, 'Day') as day_name,
    EXTRACT(ISODOW FROM created_at) as day_of_week,
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY day_name, day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;

-- View 4: Customer Insights
CREATE OR REPLACE VIEW view_analytics_customer_insights AS
SELECT 
    customer_phone,
    MAX(customer_name) as customer_name,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_spent,
    MAX(created_at) as last_order_date,
    CASE 
        WHEN COUNT(id) > 1 THEN 'Returning' 
        ELSE 'New' 
    END as customer_type
FROM orders
WHERE status != 'cancelled' AND customer_phone IS NOT NULL AND customer_phone != ''
GROUP BY customer_phone
ORDER BY total_spent DESC;

-- View 5: Summary
CREATE OR REPLACE VIEW view_analytics_summary AS
SELECT 
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE 
        WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) 
        ELSE 0 
    END as overall_aov
FROM orders
WHERE status != 'cancelled';

-- View 6: Forecast
CREATE OR REPLACE VIEW view_analytics_forecast AS
WITH daily_sales AS (
    SELECT 
        DATE(created_at) as sale_date,
        SUM(total_amount) as daily_rev,
        COUNT(id) as daily_tx
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY DATE(created_at)
)
SELECT 
    'Moving Average (7 Days)' as metric,
    AVG(daily_rev) as predicted_revenue_tomorrow,
    AVG(daily_tx) as predicted_transactions_tomorrow
FROM (
    SELECT daily_rev, daily_tx 
    FROM daily_sales 
    ORDER BY sale_date DESC 
    LIMIT 7
) last_7_days;
