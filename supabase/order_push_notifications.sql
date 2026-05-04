-- Web Push subscriptions for customer order status notifications.
-- Requires VAPID keys on frontend and Supabase Edge Function.

CREATE TABLE IF NOT EXISTS public.order_push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    subscription JSONB NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    target_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    notified_completed_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_push_subscriptions_order_id
    ON public.order_push_subscriptions(order_id);

CREATE INDEX IF NOT EXISTS idx_order_push_subscriptions_tenant_id
    ON public.order_push_subscriptions(tenant_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_push_subscriptions_order_endpoint
    ON public.order_push_subscriptions(order_id, endpoint);

ALTER TABLE public.order_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can register order push subscriptions" ON public.order_push_subscriptions;
CREATE POLICY "Customers can register order push subscriptions"
    ON public.order_push_subscriptions
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Tenant admins can read order push subscriptions" ON public.order_push_subscriptions;
CREATE POLICY "Tenant admins can read order push subscriptions"
    ON public.order_push_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = order_push_subscriptions.tenant_id
              AND ur.role IN ('admin', 'staff')
        )
    );
