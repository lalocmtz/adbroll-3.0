-- Drop and recreate the product_opportunities view to include market field
DROP VIEW IF EXISTS public.product_opportunities;

CREATE OR REPLACE VIEW public.product_opportunities AS
SELECT 
  p.*,
  -- Computed fields for opportunities detection
  CASE 
    WHEN p.commission IS NOT NULL THEN 
      PERCENT_RANK() OVER (PARTITION BY p.categoria ORDER BY p.commission) * 100
    ELSE NULL 
  END AS commission_percentile,
  CASE 
    WHEN p.gmv_30d_mxn IS NOT NULL THEN 
      PERCENT_RANK() OVER (PARTITION BY p.categoria ORDER BY p.gmv_30d_mxn) * 100
    ELSE NULL 
  END AS gmv30d_percentile,
  CASE 
    WHEN p.commission IS NOT NULL AND p.precio_mxn IS NOT NULL THEN 
      PERCENT_RANK() OVER (PARTITION BY p.categoria ORDER BY (p.precio_mxn * p.commission / 100)) * 100
    ELSE NULL 
  END AS profit_percentile,
  -- Average creators in niche
  AVG(p.creators_active_30d) OVER (PARTITION BY p.categoria) AS creators_niche_avg,
  -- Average profit in niche
  AVG(p.precio_mxn * COALESCE(p.commission, 0) / 100) OVER (PARTITION BY p.categoria) AS profit_niche_avg,
  -- Earning per sale calculation
  CASE 
    WHEN p.precio_mxn IS NOT NULL AND p.commission IS NOT NULL 
    THEN p.precio_mxn * p.commission / 100
    ELSE NULL 
  END AS earning_per_sale,
  -- GMV 30d calculation (use existing or revenue_30d)
  COALESCE(p.gmv_30d_mxn, p.revenue_30d) AS gmv_30d_calc,
  -- Creators active calculation
  COALESCE(p.creators_active_30d, p.creators_count) AS creators_active_calc,
  -- Commission percent calculation
  COALESCE(p.commission, 0) AS commission_percent_calc,
  -- IO Score (Opportunity Index)
  CASE 
    WHEN p.commission >= 15 AND COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) > 10000 
         AND COALESCE(p.creators_active_30d, p.creators_count, 0) < 50
    THEN 
      (COALESCE(p.commission, 0) * 2) + 
      (LEAST(COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 10000, 10) * 5) +
      (CASE WHEN COALESCE(p.creators_active_30d, p.creators_count, 0) < 20 THEN 30 
            WHEN COALESCE(p.creators_active_30d, p.creators_count, 0) < 50 THEN 20 
            ELSE 10 END)
    ELSE 
      (COALESCE(p.commission, 0) * 1.5) + 
      (LEAST(COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 10000, 5) * 3)
  END AS io_score,
  -- Is hidden gem flag
  CASE 
    WHEN p.commission >= 20 
         AND COALESCE(p.creators_active_30d, p.creators_count, 0) < 10
         AND COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) > 5000
    THEN true
    ELSE false
  END AS is_hidden_gem,
  -- Opportunity reason JSON
  jsonb_build_object(
    'commission_high', p.commission >= 15,
    'gmv_high', COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) > 10000,
    'low_competition', COALESCE(p.creators_active_30d, p.creators_count, 0) < 50,
    'high_profit', (COALESCE(p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100) > 
                   (AVG(COALESCE(p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100) OVER (PARTITION BY p.categoria)),
    'commission_percentile', 0,
    'gmv_percentile', 0,
    'profit_percentile', 0,
    'creators_niche_avg', COALESCE(AVG(p.creators_active_30d) OVER (PARTITION BY p.categoria), 0),
    'tags', NULL::text[],
    'summary_text', NULL::text
  ) AS opportunity_reason,
  -- Opportunity index (same as io_score for compatibility)
  CASE 
    WHEN p.commission >= 15 AND COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) > 10000 
         AND COALESCE(p.creators_active_30d, p.creators_count, 0) < 50
    THEN 
      (COALESCE(p.commission, 0) * 2) + 
      (LEAST(COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 10000, 10) * 5) +
      (CASE WHEN COALESCE(p.creators_active_30d, p.creators_count, 0) < 20 THEN 30 
            WHEN COALESCE(p.creators_active_30d, p.creators_count, 0) < 50 THEN 20 
            ELSE 10 END)
    ELSE 
      (COALESCE(p.commission, 0) * 1.5) + 
      (LEAST(COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 10000, 5) * 3)
  END AS opportunity_index
FROM public.products p
WHERE p.is_hidden IS NOT TRUE;