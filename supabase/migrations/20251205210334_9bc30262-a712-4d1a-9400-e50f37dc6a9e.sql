
-- Drop and recreate the product_opportunities view with corrected logic
-- Fix: Use creators_count instead of creators_active_30d (which is NULL)
-- New criteria for opportunities based on dynamic averages

DROP VIEW IF EXISTS product_opportunities;

CREATE OR REPLACE VIEW product_opportunities AS
WITH averages AS (
  SELECT 
    AVG(COALESCE(gmv_30d_mxn, revenue_30d, 0)) AS avg_gmv,
    AVG(CASE WHEN price > 0 AND commission > 0 THEN price * commission / 100 ELSE 0 END) AS avg_earning_per_sale
  FROM products
  WHERE is_hidden IS NOT TRUE AND COALESCE(gmv_30d_mxn, revenue_30d, 0) > 0
)
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
  -- Use creators_count as fallback when creators_active_30d is null
  COALESCE(p.creators_active_30d, p.creators_count, 0) AS creators_active_30d,
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
  -- Calculated fields
  COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) AS gmv_30d_calc,
  COALESCE(p.creators_active_30d, p.creators_count, 0) AS creators_active_calc,
  COALESCE(p.commission, 0) AS commission_percent_calc,
  -- Earning per sale calculation
  CASE 
    WHEN COALESCE(p.price, p.precio_mxn, 0) > 0 AND COALESCE(p.commission, 0) > 0 
    THEN ROUND(COALESCE(p.price, p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100, 2)
    ELSE 0
  END AS earning_per_sale,
  -- Opportunity Index (IO) formula: (commission% × GMV) / (creators + 1)
  CASE 
    WHEN (COALESCE(p.creators_active_30d, p.creators_count, 0) + 1) > 0 
    THEN ROUND(
      COALESCE(p.commission, 0) * COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 
      (COALESCE(p.creators_active_30d, p.creators_count, 0) + 1), 2
    )
    ELSE 0
  END AS opportunity_index,
  -- New opportunity detection logic with ALL 4 criteria
  (
    COALESCE(p.commission, 0) >= 15 AND
    COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) >= (a.avg_gmv * 0.75) AND
    COALESCE(p.creators_active_30d, p.creators_count, 0) <= 50 AND
    (CASE 
      WHEN COALESCE(p.price, p.precio_mxn, 0) > 0 AND COALESCE(p.commission, 0) > 0 
      THEN COALESCE(p.price, p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100
      ELSE 0
    END) >= a.avg_earning_per_sale
  ) AS is_hidden_gem,
  -- Opportunity reason JSONB for frontend
  jsonb_build_object(
    'high_commission', COALESCE(p.commission, 0) >= 15,
    'high_gmv', COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) >= (a.avg_gmv * 0.75),
    'low_competition', COALESCE(p.creators_active_30d, p.creators_count, 0) <= 50,
    'high_earning', (CASE 
      WHEN COALESCE(p.price, p.precio_mxn, 0) > 0 AND COALESCE(p.commission, 0) > 0 
      THEN COALESCE(p.price, p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100
      ELSE 0
    END) >= a.avg_earning_per_sale,
    'thresholds', jsonb_build_object(
      'min_commission', 15,
      'min_gmv', ROUND(a.avg_gmv * 0.75, 2),
      'max_creators', 50,
      'min_earning', ROUND(a.avg_earning_per_sale, 2)
    ),
    'summary_text', CASE 
      WHEN (
        COALESCE(p.commission, 0) >= 15 AND
        COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) >= (a.avg_gmv * 0.75) AND
        COALESCE(p.creators_active_30d, p.creators_count, 0) <= 50 AND
        (CASE 
          WHEN COALESCE(p.price, p.precio_mxn, 0) > 0 AND COALESCE(p.commission, 0) > 0 
          THEN COALESCE(p.price, p.precio_mxn, 0) * COALESCE(p.commission, 0) / 100
          ELSE 0
        END) >= a.avg_earning_per_sale
      )
      THEN 'Este producto es una oportunidad porque combina comisión alta, buenas ventas y poca competencia.'
      ELSE NULL
    END
  ) AS opportunity_reason
FROM products p
CROSS JOIN averages a
WHERE p.is_hidden IS NOT TRUE
ORDER BY 
  CASE 
    WHEN (COALESCE(p.creators_active_30d, p.creators_count, 0) + 1) > 0 
    THEN COALESCE(p.commission, 0) * COALESCE(p.gmv_30d_mxn, p.revenue_30d, 0) / 
         (COALESCE(p.creators_active_30d, p.creators_count, 0) + 1)
    ELSE 0
  END DESC;
