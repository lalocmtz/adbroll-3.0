-- Fix update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Recreate product_opportunities view with security_invoker (in case previous migration didn't apply)
DROP VIEW IF EXISTS public.product_opportunities;

CREATE VIEW public.product_opportunities
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.producto_nombre,
  p.producto_url,
  p.categoria,
  p.imagen_url,
  p.descripcion,
  p.precio_mxn,
  p.total_ingresos_mxn,
  p.total_ventas,
  p.promedio_roas,
  p.created_at,
  p.updated_at,
  p.last_import,
  p.tiktok_product_id,
  p.currency,
  p.gmv_7d_mxn,
  p.gmv_30d_mxn,
  p.creators_active_30d,
  p.last_imported_from_kalodata_at,
  p.commission_amount,
  p.rating,
  p.creators_count,
  p.revenue_30d,
  p.revenue_7d,
  p.sales_7d,
  p.rank,
  p.commission,
  p.is_opportunity,
  p.price,
  p.is_hidden,
  -- Calculated fields for opportunity scoring
  COALESCE(p.gmv_30d_mxn, 0) as gmv_30d_calc,
  COALESCE(p.creators_active_30d, 0) as creators_active_calc,
  COALESCE(p.commission, 0) as commission_percent_calc,
  -- Opportunity index: high GMV + low creators = opportunity
  CASE 
    WHEN COALESCE(p.creators_active_30d, 0) > 0 
    THEN COALESCE(p.gmv_30d_mxn, 0) / NULLIF(p.creators_active_30d, 0)
    ELSE COALESCE(p.gmv_30d_mxn, 0)
  END as opportunity_index,
  -- Hidden gem: good commission, low competition
  (COALESCE(p.commission, 0) >= 10 AND COALESCE(p.creators_active_30d, 0) < 50) as is_hidden_gem
FROM public.products p
WHERE p.is_hidden IS NOT TRUE;