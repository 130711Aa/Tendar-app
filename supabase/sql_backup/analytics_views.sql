-- Analytics Dashboard Views for Kareem Juice
-- Run this script in the Supabase SQL Editor

-- 1. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 2. View: Product Performance (Revenue & Quantity)
-- Excludes cancelled orders
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

-- 3. View: Product Matrix (Classification)
-- Classifies products based on performance relative to averages
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
        WHEN p.total_quantity >= a.avg_qty AND p.total_revenue < a.avg_rev THEN 'Fasilitas Arus Kas (Volume)' -- Cash Cow/Volume Driver
        WHEN p.total_quantity < a.avg_qty AND p.total_revenue >= a.avg_rev THEN 'Premium'
        ELSE 'Perlu Evaluasi (Dead Weight)'
    END as classification
FROM product_stats p, averages a;

-- 4. View: Average Order Value (Daily)
CREATE OR REPLACE VIEW view_analytics_aov AS
SELECT 
    DATE(created_at) as order_date,
    COUNT(id) as total_orders,
    SUM(total_amount) as total_revenue,
    CASE 
        WHEN COUNT(id) > 0 THEN SUM(total_amount) / COUNT(id) 
        ELSE 0 
    END as avg_order_value
FROM orders
WHERE status != 'cancelled'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;

-- 5. View: Sales Time Analysis
CREATE OR REPLACE VIEW view_analytics_sales_time AS
SELECT 
    TO_CHAR(created_at, 'Day') as day_name,
    EXTRACT(ISODOW FROM created_at) as day_of_week, -- 1=Monday, 7=Sunday
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(id) as total_transactions,
    SUM(total_amount) as total_revenue
FROM orders
WHERE status != 'cancelled'
GROUP BY day_name, day_of_week, hour_of_day
ORDER BY day_of_week, hour_of_day;

-- 6. View: Customer Insights
-- Grouping by phone number as a unique identifier
CREATE OR REPLACE VIEW view_analytics_customer_insights AS
SELECT 
    customer_phone,
    MAX(customer_name) as customer_name, -- Take the most recent name used
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

-- 7. View: Summary KPIs
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

-- 8. View: Forecast (Simple 7-day moving average)
-- Note: This is a bit complex for a view without a calendar table, 
-- but we can approximate by averaging the last 7 distinct days recorded.
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
