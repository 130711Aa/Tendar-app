-- Move inventory deduction from order creation to order completion.
-- Run this in Supabase SQL editor after deploying the app changes.

DROP VIEW IF EXISTS public.view_raw_material_stock;

ALTER TABLE public.product_raw_materials
    ALTER COLUMN quantity_used TYPE NUMERIC USING quantity_used::numeric;

ALTER TABLE public.raw_material_movements
    ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;

CREATE OR REPLACE VIEW public.view_raw_material_stock AS
SELECT
    rm.tenant_id,
    rm.id,
    rm.name,
    rm.unit,
    rm.minimum_stock,
    COALESCE(SUM(rmm.quantity), 0) AS current_stock,
    CASE
        WHEN COALESCE(SUM(rmm.quantity), 0) <= rm.minimum_stock THEN true
        ELSE false
    END AS is_low_stock
FROM public.raw_materials rm
LEFT JOIN public.raw_material_movements rmm
    ON rm.id = rmm.raw_material_id
   AND rm.tenant_id = rmm.tenant_id
GROUP BY rm.tenant_id, rm.id, rm.name, rm.unit, rm.minimum_stock;

CREATE OR REPLACE FUNCTION public.handle_completed_order_inventory()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed'
        AND OLD.status IS DISTINCT FROM 'completed'
        AND NOT EXISTS (
            SELECT 1
            FROM public.raw_material_movements rmm
            WHERE rmm.reference_type = 'SALE'
              AND rmm.reference_id = NEW.order_number
        )
    THEN
        INSERT INTO public.raw_material_movements
            (raw_material_id, tenant_id, movement_type, quantity, reference_type, reference_id, notes)
        WITH completed_items AS (
            SELECT
                oi.product_id,
                oi.quantity::numeric AS quantity
            FROM public.order_items oi
            WHERE oi.order_id = NEW.id
              AND oi.tenant_id = NEW.tenant_id

            UNION ALL

            SELECT
                p.id AS product_id,
                (item->>'quantity')::numeric AS quantity
            FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) AS item
            JOIN public.products p
                ON p.tenant_id = NEW.tenant_id
               AND (
                    p.id = COALESCE(NULLIF(item->>'id', '')::bigint, NULL)
                    OR p.name = item->>'name'
                )
            WHERE NEW.items IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM public.order_items oi
                  WHERE oi.order_id = NEW.id
                    AND oi.tenant_id = NEW.tenant_id
              )
        )
        SELECT
            prm.raw_material_id,
            NEW.tenant_id,
            'OUT',
            -1 * (completed_items.quantity * prm.quantity_used),
            'SALE',
            NEW.order_number,
            'Auto-deduction for completed Order #' || NEW.order_number
        FROM completed_items
        JOIN public.product_raw_materials prm
            ON prm.product_id = completed_items.product_id
           AND prm.tenant_id = NEW.tenant_id
        WHERE NEW.tenant_id IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON public.orders;
DROP TRIGGER IF EXISTS trg_deduct_inventory_on_completed_order ON public.orders;

CREATE TRIGGER trg_deduct_inventory_on_completed_order
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_completed_order_inventory();
