-- ============================================================================
-- RPC FUNCTION: get_queue_position
-- ============================================================================
-- Returns the number of PENDING orders created BEFORE a given order (today only).
-- Uses SECURITY DEFINER to bypass RLS so customers can see their queue position
-- without accessing other users' order data.
--
-- Usage from frontend:
--   const { data } = await supabase.rpc('get_queue_position', { target_order_id: '...' })
--
-- Returns INTEGER:
--   0 = no orders ahead (next to be processed)
--   N = N orders ahead in the queue
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_queue_position(target_order_id BIGINT)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.orders
  WHERE status = 'pending'
    AND created_at < (SELECT created_at FROM public.orders WHERE id = target_order_id)
    AND created_at >= CURRENT_DATE
    AND id != target_order_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_queue_position(BIGINT) TO authenticated;
