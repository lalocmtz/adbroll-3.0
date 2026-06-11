-- =============================================================================
-- OPPORTUNITY INDEX 2.0: vista product_opportunities con percentiles por
-- categoria + mercado (window functions), momentum desde product_snapshots
-- (fallback revenue_7d/revenue_30d), badges booleanos y razones en español.
--
-- DECISIONES:
--   * commission viene en escala 0-100 (process-kalodata-products guarda
--     commission_rate como porcentaje y calcula commission_amount =
--     price * rate / 100). Por eso earning_per_sale divide entre 100.
--   * io_score se mantiene como ALIAS de opportunity_index (compatibilidad con
--     el front; Opportunities.tsx ordenaba por io_score).
--   * gmv_30d_calc y creators_active_calc se conservan (los consumía la página).
--   * Se eliminan columnas computadas viejas (commission_percentile,
--     gmv30d_percentile, profit_percentile, creators_niche_avg,
--     profit_niche_avg, commission_percent_calc, opportunity_reason) — la
--     página rediseñada ya no las usa.
-- =============================================================================

drop view if exists public.product_opportunities;

create or replace view public.product_opportunities as
with base as (
  select
    p.*,
    -- Demanda: ingresos 30d con fallback en cadena
    coalesce(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn, 0) as gmv_30d_calc,
    -- Espacio: creadores activos (menos creadores = más espacio)
    coalesce(p.creators_count, p.creators_active_30d, 0) as creators_active_calc,
    -- Ganancia por venta (commission en escala 0-100)
    coalesce(p.precio_mxn, p.price, 0) * coalesce(p.commission, 0) / 100.0 as earning_per_sale,
    -- Crecimiento real entre los 2 snapshots más recientes (si existen)
    snap.growth_pct as momentum_growth,
    -- Valor de momentum para rankear: snapshot real o fallback ratio 7d/30d
    coalesce(
      snap.growth_pct,
      case
        when coalesce(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn, 0) > 0
          then coalesce(p.revenue_7d, 0) / coalesce(p.revenue_30d, p.gmv_30d_mxn, p.total_ingresos_mxn)
        else null
      end
    ) as momentum_value
  from public.products p
  left join lateral (
    select
      case
        when s.rev_prev > 0 then (s.rev_last - s.rev_prev) / s.rev_prev
        else null
      end as growth_pct
    from (
      select
        max(rev) filter (where rn = 1) as rev_last,
        max(rev) filter (where rn = 2) as rev_prev
      from (
        select
          coalesce(ps.revenue_30d, ps.gmv_30d_mxn) as rev,
          row_number() over (order by ps.captured_at desc) as rn
        from public.product_snapshots ps
        where ps.product_id = p.id
          and coalesce(ps.revenue_30d, ps.gmv_30d_mxn) is not null
      ) ordered
      where rn <= 2
    ) s
    where s.rev_last is not null
      and s.rev_prev is not null
  ) snap on true
  where p.is_hidden is not true
),
ranked as (
  select
    b.*,
    -- Percentiles POR mercado + categoría
    percent_rank() over (partition by b.market, b.categoria order by b.gmv_30d_calc) as pct_demand,
    1 - percent_rank() over (partition by b.market, b.categoria order by b.creators_active_calc) as pct_space,
    percent_rank() over (partition by b.market, b.categoria order by coalesce(b.momentum_value, 0)) as pct_momentum,
    percent_rank() over (partition by b.market, b.categoria order by b.earning_per_sale) as pct_pay,
    percent_rank() over (partition by b.market, b.categoria order by coalesce(b.promedio_roas, 0)) as pct_brand
  from base b
)
select
  r.*,
  -- Índice de oportunidad 0-100
  round(100 * (
    0.30 * r.pct_demand +
    0.25 * r.pct_space +
    0.20 * r.pct_momentum +
    0.15 * r.pct_pay +
    0.10 * r.pct_brand
  ))::int as opportunity_index,
  -- Alias de compatibilidad (el front histórico ordena por io_score)
  round(100 * (
    0.30 * r.pct_demand +
    0.25 * r.pct_space +
    0.20 * r.pct_momentum +
    0.15 * r.pct_pay +
    0.10 * r.pct_brand
  ))::int as io_score,
  -- Badges
  (r.pct_demand >= 0.75 and r.pct_space >= 0.75) as is_hidden_gem,
  (r.pct_momentum >= 0.8 and coalesce(r.total_ventas, r.sales_7d, 0) > 100) as is_rising,
  (r.pct_pay >= 0.8) as is_high_pay,
  (r.pct_brand >= 0.8 and coalesce(r.promedio_roas, 0) > 2) as is_brand_backed,
  (r.pct_demand >= 0.6 and r.pct_space <= 0.15) as is_saturated,
  -- Razones en español con números concretos (solo cuando hay datos)
  (
    case
      when r.gmv_30d_calc > 0 and r.creators_active_calc > 0 then
        jsonb_build_array(
          'Vendió $' || to_char(round(r.gmv_30d_calc), 'FM999,999,999,999') ||
          ' en 30 días y solo ' || r.creators_active_calc::int ||
          ' creadores lo promueven'
        )
      when r.gmv_30d_calc > 0 then
        jsonb_build_array(
          'Vendió $' || to_char(round(r.gmv_30d_calc), 'FM999,999,999,999') ||
          ' en los últimos 30 días'
        )
      else '[]'::jsonb
    end
    ||
    case
      when r.earning_per_sale > 0 and r.commission is not null then
        jsonb_build_array(
          'Ganarías ~$' || to_char(round(r.earning_per_sale), 'FM999,999,999') ||
          ' por venta (comisión ' ||
          case
            when r.commission = floor(r.commission) then floor(r.commission)::int::text
            else round(r.commission::numeric, 1)::text
          end || '%)'
        )
      else '[]'::jsonb
    end
    ||
    case
      when r.momentum_growth is not null and r.momentum_growth > 0.05 then
        jsonb_build_array(
          'Crecimiento +' || round(r.momentum_growth * 100)::int || '% vs periodo anterior'
        )
      else '[]'::jsonb
    end
  ) as opportunity_reasons
from ranked r;

grant select on public.product_opportunities to anon, authenticated;

comment on view public.product_opportunities is
  'Opportunity Index 2.0: percentiles por (market, categoria) sobre demanda, espacio, momentum (snapshots con fallback 7d/30d), pago por venta y respaldo de marca. commission en escala 0-100.';
