-- Source-only product identities do not yet have product performance metrics.
CREATE OR REPLACE VIEW public.product_opportunities AS
 WITH base AS (
         SELECT p.id,
            p.producto_nombre,
            p.producto_url,
            p.categoria,
            p.precio_mxn,
            p.descripcion,
            p.imagen_url,
            p.total_ventas,
            p.total_ingresos_mxn,
            p.promedio_roas,
            p.created_at,
            p.updated_at,
            p.tiktok_product_id,
            p.price,
            p.currency,
            p.is_opportunity,
            p.last_import,
            p.commission,
            p.rank,
            p.sales_7d,
            p.revenue_7d,
            p.revenue_30d,
            p.creators_count,
            p.rating,
            p.commission_amount,
            p.last_imported_from_kalodata_at,
            p.is_hidden,
            p.gmv_7d_mxn,
            p.gmv_30d_mxn,
            p.creators_active_30d,
            p.market,
            p.nombre_normalizado,
            COALESCE(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn, 0::numeric) AS gmv_30d_calc,
            COALESCE(p.creators_count, p.creators_active_30d, 0) AS creators_active_calc,
            COALESCE(p.precio_mxn, p.price, 0::numeric) * COALESCE(p.commission, 0::numeric) / 100.0 AS earning_per_sale,
            snap.growth_pct AS momentum_growth,
            COALESCE(snap.growth_pct,
                CASE
                    WHEN COALESCE(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn, 0::numeric) > 0::numeric THEN COALESCE(p.revenue_7d, 0::numeric) / COALESCE(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn)
                    ELSE NULL::numeric
                END) AS momentum_value
           FROM products p
             LEFT JOIN LATERAL ( SELECT
                        CASE
                            WHEN s.rev_prev > 0::numeric THEN (s.rev_last - s.rev_prev) / s.rev_prev
                            ELSE NULL::numeric
                        END AS growth_pct
                   FROM ( SELECT max(ordered.rev) FILTER (WHERE ordered.rn = 1) AS rev_last,
                            max(ordered.rev) FILTER (WHERE ordered.rn = 2) AS rev_prev
                           FROM ( SELECT COALESCE(ps.revenue_30d, ps.gmv_30d_mxn) AS rev,
                                    row_number() OVER (ORDER BY ps.captured_at DESC) AS rn
                                   FROM product_snapshots ps
                                  WHERE ps.product_id = p.id AND COALESCE(ps.revenue_30d, ps.gmv_30d_mxn) IS NOT NULL) ordered
                          WHERE ordered.rn <= 2) s
                  WHERE s.rev_last IS NOT NULL AND s.rev_prev IS NOT NULL) snap ON true
          WHERE p.is_hidden IS NOT TRUE AND p.identity_status <> 'video_source'
        ), ranked AS (
         SELECT b.id,
            b.producto_nombre,
            b.producto_url,
            b.categoria,
            b.precio_mxn,
            b.descripcion,
            b.imagen_url,
            b.total_ventas,
            b.total_ingresos_mxn,
            b.promedio_roas,
            b.created_at,
            b.updated_at,
            b.tiktok_product_id,
            b.price,
            b.currency,
            b.is_opportunity,
            b.last_import,
            b.commission,
            b.rank,
            b.sales_7d,
            b.revenue_7d,
            b.revenue_30d,
            b.creators_count,
            b.rating,
            b.commission_amount,
            b.last_imported_from_kalodata_at,
            b.is_hidden,
            b.gmv_7d_mxn,
            b.gmv_30d_mxn,
            b.creators_active_30d,
            b.market,
            b.nombre_normalizado,
            b.gmv_30d_calc,
            b.creators_active_calc,
            b.earning_per_sale,
            b.momentum_growth,
            b.momentum_value,
            percent_rank() OVER (PARTITION BY b.market, b.categoria ORDER BY b.gmv_30d_calc) AS pct_demand,
            1::double precision - percent_rank() OVER (PARTITION BY b.market, b.categoria ORDER BY b.creators_active_calc) AS pct_space,
            percent_rank() OVER (PARTITION BY b.market, b.categoria ORDER BY (COALESCE(b.momentum_value, 0::numeric))) AS pct_momentum,
            percent_rank() OVER (PARTITION BY b.market, b.categoria ORDER BY b.earning_per_sale) AS pct_pay,
            percent_rank() OVER (PARTITION BY b.market, b.categoria ORDER BY (COALESCE(b.promedio_roas, 0::numeric))) AS pct_brand
           FROM base b
        )
 SELECT id,
    producto_nombre,
    producto_url,
    categoria,
    precio_mxn,
    descripcion,
    imagen_url,
    total_ventas,
    total_ingresos_mxn,
    promedio_roas,
    created_at,
    updated_at,
    tiktok_product_id,
    price,
    currency,
    is_opportunity,
    last_import,
    commission,
    rank,
    sales_7d,
    revenue_7d,
    revenue_30d,
    creators_count,
    rating,
    commission_amount,
    last_imported_from_kalodata_at,
    is_hidden,
    gmv_7d_mxn,
    gmv_30d_mxn,
    creators_active_30d,
    market,
    nombre_normalizado,
    gmv_30d_calc,
    creators_active_calc,
    earning_per_sale,
    momentum_growth,
    momentum_value,
    pct_demand,
    pct_space,
    pct_momentum,
    pct_pay,
    pct_brand,
    round(100::double precision * (0.30::double precision * pct_demand + 0.25::double precision * pct_space + 0.20::double precision * pct_momentum + 0.15::double precision * pct_pay + 0.10::double precision * pct_brand))::integer AS opportunity_index,
    round(100::double precision * (0.30::double precision * pct_demand + 0.25::double precision * pct_space + 0.20::double precision * pct_momentum + 0.15::double precision * pct_pay + 0.10::double precision * pct_brand))::integer AS io_score,
    pct_demand >= 0.75::double precision AND pct_space >= 0.75::double precision AS is_hidden_gem,
    pct_momentum >= 0.8::double precision AND COALESCE(total_ventas, sales_7d, 0) > 100 AS is_rising,
    pct_pay >= 0.8::double precision AS is_high_pay,
    pct_brand >= 0.8::double precision AND COALESCE(promedio_roas, 0::numeric) > 2::numeric AS is_brand_backed,
    pct_demand >= 0.6::double precision AND pct_space <= 0.15::double precision AS is_saturated,
    (
        CASE
            WHEN gmv_30d_calc > 0::numeric AND creators_active_calc > 0 THEN jsonb_build_array(((('Vendió $'::text || to_char(round(gmv_30d_calc), 'FM999,999,999,999'::text)) || ' en 30 días y solo '::text) || creators_active_calc) || ' creadores lo promueven'::text)
            WHEN gmv_30d_calc > 0::numeric THEN jsonb_build_array(('Vendió $'::text || to_char(round(gmv_30d_calc), 'FM999,999,999,999'::text)) || ' en los últimos 30 días'::text)
            ELSE '[]'::jsonb
        END ||
        CASE
            WHEN earning_per_sale > 0::numeric AND commission IS NOT NULL THEN jsonb_build_array(((('Ganarías ~$'::text || to_char(round(earning_per_sale), 'FM999,999,999'::text)) || ' por venta (comisión '::text) ||
            CASE
                WHEN commission = floor(commission) THEN floor(commission)::integer::text
                ELSE round(commission, 1)::text
            END) || '%)'::text)
            ELSE '[]'::jsonb
        END) ||
        CASE
            WHEN momentum_growth IS NOT NULL AND momentum_growth > 0.05 THEN jsonb_build_array(('Crecimiento +'::text || round(momentum_growth * 100::numeric)::integer) || '% vs periodo anterior'::text)
            ELSE '[]'::jsonb
        END AS opportunity_reasons
   FROM ranked r;
