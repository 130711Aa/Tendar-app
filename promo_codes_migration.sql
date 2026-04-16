-- 1. Create promo_codes table
CREATE TABLE public.promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_amount NUMERIC NOT NULL, -- The nominal discount in IDR
    max_uses INT NULL,              -- Null means unlimited
    current_uses INT NOT NULL DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE NULL, -- Null means no expiration
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active promo codes (needed for validation during checkout)
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
    FOR SELECT USING (is_active = true);

-- Allow superadmins to manage all promo codes
CREATE POLICY "Superadmins can manage promo codes" ON public.promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'superadmin'
        )
    );

-- 2. Alter invoices table to support promo codes
ALTER TABLE public.invoices ADD COLUMN promo_code_id UUID REFERENCES public.promo_codes(id);
ALTER TABLE public.invoices ADD COLUMN discount_amount NUMERIC DEFAULT 0;

-- 3. (Optional) Create some initial dummy promo codes for testing
INSERT INTO public.promo_codes (code, discount_amount, max_uses, is_active)
VALUES ('TENDAR10K', 10000, 100, true);
