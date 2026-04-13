-- Drop existing view
DROP VIEW IF EXISTS product_opportunities;

-- Create the enhanced product_opportunities view with percentile-based algorithm
CREATE OR REPLACE VIEW product_opportunities AS
WITH category_stats AS (
  -- Calculate percentiles and averages by category
  SELECT 
    categoria,
    PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY COALESCE(commission, 0)) as commission_p60,
    PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY COALESCE(gmv_30d_mxn, revenue_30d, 0)) as gmv_p70,
    AVG(COALESCE(commission, 0)) as avg_commission,
    AVG(COALESCE(gmv_30d_mxn, revenue_30d, 0)) as avg_gmv,
    AVG(COALESCE(creators_active_30d, creators_count, 0)) as avg_creators,
    AVG(COALESCE(commission_amount, 0)) as avg_earning_per_sale
  FROM products
  WHERE is_hidden = false OR is_hidden IS NULL
  GROUP BY categoria
),
global_stats AS (
  -- Global fallback stats for products without category
  SELECT 
    PERCENTILE_CONT(0.60) WITHIN GROUP (ORDER BY COALESCE(commission, 0)) as commission_p60,
    PERCENTILE_CONT(0.70) WITHIN GROUP (ORDER BY COALESCE(gmv_30d_mxn, revenue_30d, 0)) as gmv_p70,
    AVG(COALESCE(commission, 0)) as avg_commission,
    AVG(COALESCE(gmv_30d_mxn, revenue_30d, 0)) as avg_gmv,
    AVG(COALESCE(creators_active_30d, creators_count, 0)) as avg_creators,
    AVG(COALESCE(commission_amount, 0)) as avg_earning_per_sale
  FROM products
  WHERE is_hidden = false OR is_hidden IS NULL
),
video_counts AS (
  -- Count recent videos per product for creator estimation
  SELECT 
    product_id,
    COUNT(*) as video_count
  FROM videos
  WHERE imported_at >= NOW() - INTERVAL '30 days'
  GROUP BY product_id
),
product_percentiles AS (
  SELECT 
    p.*,
    -- Use category stats or fall back to global stats
    COALESCE(cs.commission_p60, gs.commission_p60, 10) as niche_commission_p60,
    COALESCE(cs.gmv_p70, gs.gmv_p70, 50000) as niche_gmv_p70,
    COALESCE(cs.avg_creators, gs.avg_creators, 30) as niche_avg_creators,
    COALESCE(cs.avg_earning_per_sale, gs.avg_earning_per_sale, 50) as niche_avg_earning,
    -- Estimate creators if not available: video_count * 0.35
    CASE 
      WHEN COALESCE(p.creators_active_30d, p.creators_count, 0) > 0 
      THEN COALESCE(p.creators_active_30d, p.creators_count)
      ELSE GREATEST(1, ROUND(COALESCE(vc.video_count, 0) * 0.35))::integer
    END as creators_calc,
    -- Calculate percentile rank for commission (0-100)
    PERCENT_RANK() OVER (
      PARTITION BY COALESCE(p.categoria, 'General')
      ORDER BY COALESCE(p.commission, 0)
    ) * 100 as commission_percentile,
    -- Calculate percentile rank for GMV (0-100)
    PERCENT_RANK() OVER (
      PARTITION BY COALESCE(p.categoria, 'General')
      ORDER BY COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0)
    ) * 100 as gmv30d_percentile,
    -- Calculate percentile rank for earning per sale (0-100)
    PERCENT_RANK() OVER (
      PARTITION BY COALESCE(p.categoria, 'General')
      ORDER BY COALESCE(p.commission_amount, p.price * COALESCE(p.commission, 6) / 100, 0)
    ) * 100 as profit_percentile
  FROM products p
  LEFT JOIN category_stats cs ON p.categoria = cs.categoria
  CROSS JOIN global_stats gs
  LEFT JOIN video_counts vc ON p.id = vc.product_id
  WHERE p.is_hidden = false OR p.is_hidden IS NULL
)
SELECT 
  pp.id,
  pp.producto_nombre,
  pp.producto_url,
  pp.categoria,
  pp.imagen_url,
  pp.descripcion,
  pp.precio_mxn,
  pp.price,
  pp.currency,
  pp.commission,
  pp.commission_amount,
  pp.gmv_30d_mxn,
  pp.gmv_7d_mxn,
  pp.revenue_30d,
  pp.revenue_7d,
  pp.sales_7d,
  pp.total_ingresos_mxn,
  pp.total_ventas,
  pp.promedio_roas,
  pp.rank,
  pp.rating,
  pp.creators_count,
  pp.creators_active_30d,
  pp.tiktok_product_id,
  pp.created_at,
  pp.updated_at,
  pp.last_import,
  pp.last_imported_from_kalodata_at,
  pp.is_opportunity,
  pp.is_hidden,
  
  -- New calculated fields
  pp.creators_calc as creators_active_calc,
  pp.commission_percentile,
  pp.gmv30d_percentile,
  pp.profit_percentile,
  pp.niche_avg_creators as creators_niche_avg,
  pp.niche_avg_earning as profit_niche_avg,
  
  -- Earning per sale calculation
  COALESCE(pp.commission_amount, pp.price * COALESCE(pp.commission, 6) / 100, 0) as earning_per_sale,
  
  -- GMV calculation
  COALESCE(pp.gmv_30d_mxn, pp.revenue_30d, 0) as gmv_30d_calc,
  
  -- Commission percent calculation
  COALESCE(pp.commission, 0) as commission_percent_calc,
  
  -- IO Score: weighted score normalized 0-100
  -- 35% commission_percentile + 25% gmv_percentile + 25% profit_percentile + 15% (inverse creators)
  ROUND(
    (pp.commission_percentile * 0.35) +
    (pp.gmv30d_percentile * 0.25) +
    (pp.profit_percentile * 0.25) +
    (CASE 
      WHEN pp.creators_calc >= pp.niche_avg_creators THEN 0
      ELSE (1 - (pp.creators_calc::numeric / NULLIF(pp.niche_avg_creators, 0))) * 100
    END * 0.15)
  )::numeric as io_score,
  
  -- Determine if it's a hidden gem (meets all 4 criteria)
  (
    pp.commission_percentile > 60 AND
    pp.gmv30d_percentile > 70 AND
    pp.creators_calc < pp.niche_avg_creators AND
    COALESCE(pp.commission_amount, pp.price * COALESCE(pp.commission, 6) / 100, 0) > 55
  ) as is_hidden_gem,
  
  -- Opportunity reason with tags
  jsonb_build_object(
    'commission_high', pp.commission_percentile > 60,
    'gmv_high', pp.gmv30d_percentile > 70,
    'low_competition', pp.creators_calc < pp.niche_avg_creators,
    'high_profit', COALESCE(pp.commission_amount, pp.price * COALESCE(pp.commission, 6) / 100, 0) > 55,
    'commission_percentile', ROUND(pp.commission_percentile),
    'gmv_percentile', ROUND(pp.gmv30d_percentile),
    'profit_percentile', ROUND(pp.profit_percentile),
    'creators_niche_avg', ROUND(pp.niche_avg_creators),
    'tags', (
      SELECT jsonb_agg(tag)
      FROM (
        SELECT 'Comisión alta' as tag WHERE pp.commission_percentile > 60
        UNION ALL
        SELECT 'Buenas ventas' WHERE pp.gmv30d_percentile > 70
        UNION ALL
        SELECT 'Alta ganancia' WHERE COALESCE(pp.commission_amount, pp.price * COALESCE(pp.commission, 6) / 100, 0) > pp.niche_avg_earning
        UNION ALL
        SELECT 'Poca competencia' WHERE pp.creators_calc < pp.niche_avg_creators
      ) tags
    ),
    'summary_text', (
      SELECT string_agg(tag, ' · ')
      FROM (
        SELECT 'Comisión alta' as tag WHERE pp.commission_percentile > 60
        UNION ALL
        SELECT 'Buenas ventas' WHERE pp.gmv30d_percentile > 70
        UNION ALL
        SELECT 'Alta ganancia' WHERE COALESCE(pp.commission_amount, pp.price * COALESCE(pp.commission, 6) / 100, 0) > pp.niche_avg_earning
        UNION ALL
        SELECT 'Poca competencia' WHERE pp.creators_calc < pp.niche_avg_creators
      ) tags
    )
  ) as opportunity_reason,
  
  -- Opportunity index (same as io_score for backward compatibility)
  ROUND(
    (pp.commission_percentile * 0.35) +
    (pp.gmv30d_percentile * 0.25) +
    (pp.profit_percentile * 0.25) +
    (CASE 
      WHEN pp.creators_calc >= pp.niche_avg_creators THEN 0
      ELSE (1 - (pp.creators_calc::numeric / NULLIF(pp.niche_avg_creators, 0))) * 100
    END * 0.15)
  )::numeric as opportunity_index

FROM product_percentiles pp;