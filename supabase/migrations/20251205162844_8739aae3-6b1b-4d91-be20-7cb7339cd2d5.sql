-- Drop and recreate product_opportunities view with full IO calculation
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
  
  -- OPPORTUNITY INDEX (IO): Higher commission * GMV / Competition
  -- Formula: (commission_percent * gmv_30d) / (creators_active + 1)
  CASE 
    WHEN COALESCE(p.creators_active_30d, 0) + 1 > 0 
    THEN ROUND((COALESCE(p.commission, 0) * COALESCE(p.gmv_30d_mxn, 0)) / (COALESCE(p.creators_active_30d, 0) + 1), 2)
    ELSE 0
  END as opportunity_index,
  
  -- HIDDEN GEM criteria:
  -- 1. Commission > 15%
  -- 2. GMV > 0 (product is selling)
  -- 3. Creators active < 50 (low competition)
  (
    COALESCE(p.commission, 0) > 15 
    AND COALESCE(p.gmv_30d_mxn, 0) > 0 
    AND COALESCE(p.creators_active_30d, 0) < 50
  ) as is_hidden_gem

FROM public.products p
WHERE p.is_hidden IS NOT TRUE
ORDER BY 
  CASE 
    WHEN COALESCE(p.creators_active_30d, 0) + 1 > 0 
    THEN (COALESCE(p.commission, 0) * COALESCE(p.gmv_30d_mxn, 0)) / (COALESCE(p.creators_active_30d, 0) + 1)
    ELSE 0
  END DESC;