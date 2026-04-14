-- ============================================================
-- QRIS Payment Schema for Tendar
-- NMID: ID1025424801849 | Merchant: KAREEEM JUICE
-- Run this in Supabase SQL Editor
-- ============================================================

-- Invoices: one per billing request
CREATE TABLE IF NOT EXISTS invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id       TEXT NOT NULL CHECK (plan_id IN ('starter', 'business', 'pro')),
  base_amount   INTEGER NOT NULL,           -- e.g. 50000
  unique_code   SMALLINT NOT NULL,          -- e.g. 129
  total_amount  INTEGER NOT NULL,           -- e.g. 50129 (base + unique_code)
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  deadline      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments: one per receipt upload attempt
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  receipt_url         TEXT NOT NULL,
  receipt_hash        TEXT NOT NULL UNIQUE,   -- SHA-256 for deduplication / replay protection
  ocr_raw_text        TEXT,
  extracted_amount    INTEGER,
  extracted_timestamp TIMESTAMPTZ,
  extracted_nmid      TEXT,
  extracted_ref_id    TEXT,
  confidence_score    SMALLINT,
  status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'valid', 'review_needed', 'rejected')),
  rejection_reason    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment audit log
CREATE TABLE IF NOT EXISTS payment_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity      TEXT NOT NULL,      -- 'invoice' | 'payment' | 'subscription'
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,      -- 'created' | 'ocr_processed' | 'activated' | 'rejected'
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_deadline ON invoices (deadline);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_receipt_hash ON payments (receipt_hash);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON payment_audit_logs (entity, entity_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_audit_logs ENABLE ROW LEVEL SECURITY;

-- Owners can view their own invoices
CREATE POLICY "tenant_owner_view_invoices" ON invoices
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- Owners can insert invoices
CREATE POLICY "tenant_owner_insert_invoices" ON invoices
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- Owners can view their own payments
CREATE POLICY "tenant_owner_view_payments" ON payments
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
      )
    )
  );

-- Owners can insert payments (upload receipt)
CREATE POLICY "tenant_owner_insert_payments" ON payments
  FOR INSERT WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices WHERE tenant_id IN (
        SELECT id FROM tenants WHERE owner_id = auth.uid()
      )
    )
  );

-- Service role has full access (for Edge Functions)
CREATE POLICY "service_role_all_invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_audit_logs" ON payment_audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- Storage bucket for payment receipts
-- Run in Supabase Dashboard → Storage → New bucket
-- OR run this if using SQL:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('payment-receipts', 'payment-receipts', false, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS: owners can upload
-- CREATE POLICY "tenant_upload_receipts" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'payment-receipts' AND auth.role() = 'authenticated'
--   );
-- Storage RLS: service role can read (for Edge Function)
-- CREATE POLICY "service_read_receipts" ON storage.objects
--   FOR SELECT USING (bucket_id = 'payment-receipts');
