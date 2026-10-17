-- Provider attempts, including retries and invalid responses. No content or user identifiers.
CREATE TABLE public.ai_provider_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  attempt smallint NOT NULL CHECK (attempt BETWEEN 1 AND 2),
  started_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer NOT NULL CHECK (duration_ms>=0),
  model text NOT NULL CHECK (model ~ '^[a-z0-9.-]{1,100}$'),
  http_status smallint CHECK (http_status BETWEEN 100 AND 599),
  succeeded boolean NOT NULL,
  error_code text CHECK (error_code ~ '^[A-Z0-9_]{1,80}$'),
  input_tokens bigint CHECK (input_tokens>=0),
  output_tokens bigint CHECK (output_tokens>=0),
  thinking_tokens bigint CHECK (thinking_tokens>=0),
  estimated_cost_usd numeric CHECK (estimated_cost_usd>=0),
  pricing_reference text,
  UNIQUE (request_id,attempt)
);
CREATE INDEX ai_provider_usage_recorded ON public.ai_provider_usage(recorded_at DESC);
CREATE TABLE public.ai_provider_metering (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  enabled_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ai_provider_metering(id) VALUES(true);
ALTER TABLE public.ai_provider_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_metering ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_provider_usage,public.ai_provider_metering FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.ai_provider_usage TO service_role;
GRANT SELECT ON public.ai_provider_metering TO service_role;

-- Invoked only by the existing founder-authorized security-definer RPC below.
CREATE FUNCTION public.ai_provider_usage_summary() RETURNS jsonb
LANGUAGE sql STABLE SET search_path=public AS $$
WITH models AS (
  SELECT model,count(*) AS attempts,count(*) FILTER(WHERE succeeded) AS succeeded,
    count(*) FILTER(WHERE NOT succeeded) AS failed,
    count(*) FILTER(WHERE estimated_cost_usd IS NULL) AS unpriced_attempts,
    coalesce(sum(input_tokens),0) AS input_tokens,
    coalesce(sum(output_tokens),0)+coalesce(sum(thinking_tokens),0) AS output_tokens,
    sum(estimated_cost_usd) AS estimated_usd
  FROM public.ai_provider_usage GROUP BY model
)
SELECT jsonb_build_object(
  'since',(SELECT enabled_at FROM public.ai_provider_metering WHERE id),
  'latestAt',(SELECT max(recorded_at) FROM public.ai_provider_usage),
  'attempts',(SELECT count(*) FROM public.ai_provider_usage),
  'failed',(SELECT count(*) FROM public.ai_provider_usage WHERE NOT succeeded),
  'unpricedAttempts',(SELECT count(*) FROM public.ai_provider_usage WHERE estimated_cost_usd IS NULL),
  'estimatedUsd',(SELECT sum(estimated_cost_usd) FROM public.ai_provider_usage),
  'models',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY model),'[]') FROM models m)
);
$$;
REVOKE ALL ON FUNCTION public.ai_provider_usage_summary() FROM PUBLIC,anon,authenticated;

-- Read-only operations snapshot. Never expose job capabilities, user rows or provider secrets.
CREATE OR REPLACE FUNCTION public.get_operations_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='founder') THEN
    RAISE EXCEPTION 'Founder access required' USING ERRCODE='42501';
  END IF;
  WITH bucket_usage AS (
    SELECT b.id, count(o.id) AS objects,
      coalesce(sum(CASE WHEN o.metadata->>'size' ~ '^[0-9]{1,20}$' THEN (o.metadata->>'size')::numeric ELSE 0 END),0) AS bytes,
      count(o.id) FILTER (WHERE o.metadata->>'size' IS NULL OR o.metadata->>'size' !~ '^[0-9]{1,20}$') AS unknown_sizes
    FROM storage.buckets b LEFT JOIN storage.objects o ON o.bucket_id=b.id GROUP BY b.id
  ), cached AS (
    SELECT analysis_json->'_cache' AS c FROM public.videos WHERE analysis_json IS NOT NULL
  ), metered AS (
    SELECT coalesce(c->>'model','Modelo no registrado') AS model,
      CASE WHEN c->'usage'->>'promptTokenCount' ~ '^[0-9]{1,15}$' THEN (c->'usage'->>'promptTokenCount')::numeric END AS input_tokens,
      CASE WHEN c->'usage'->>'candidatesTokenCount' ~ '^[0-9]{1,15}$' THEN (c->'usage'->>'candidatesTokenCount')::numeric END
        + CASE WHEN c->'usage'->>'thoughtsTokenCount' ~ '^[0-9]{1,15}$' THEN (c->'usage'->>'thoughtsTokenCount')::numeric ELSE 0 END AS output_tokens
    FROM cached
  ), models AS (
    SELECT model, count(*) AS analyses, count(*) FILTER(WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL) AS metered_analyses,
      coalesce(sum(input_tokens),0) AS input_tokens, coalesce(sum(output_tokens),0) AS output_tokens,
      CASE WHEN model='gemini-3.5-flash-lite' AND count(*) FILTER(WHERE input_tokens IS NOT NULL AND output_tokens IS NOT NULL)>0
        THEN sum((input_tokens*0.30+output_tokens*2.50)/1000000) END AS estimated_usd
    FROM metered GROUP BY model
  ), queue AS (
    SELECT count(*) FILTER(WHERE status IN ('pending','dispatched','running')) AS remaining,
      count(*) FILTER(WHERE status='failed') AS failed,
      count(*) FILTER(WHERE status='pending' AND last_error_code IS NOT NULL) AS retrying,
      count(*) FILTER(WHERE status='ready' AND estimated_cost_usd IS NOT NULL AND updated_at>=now()-interval '60 minutes') AS completed_last_hour,
      count(*) FILTER(WHERE status IN ('dispatched','running') AND lease_until<now()) AS expired_leases
    FROM public.catalog_analysis_jobs
  )
  SELECT jsonb_build_object(
    'asOf',now(),
    'storage',jsonb_build_object('databaseBytes',pg_database_size(current_database()),'fileBytes',(SELECT coalesce(sum(bytes),0) FROM bucket_usage),'unknownSizes',(SELECT coalesce(sum(unknown_sizes),0) FROM bucket_usage),'buckets',(SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.bytes DESC),'[]') FROM bucket_usage b)),
    'users',public.get_founder_user_overview('','all',0,1)->'stats',
    'providerUsage',public.ai_provider_usage_summary(),
    'ai',jsonb_build_object('balanceUsd',NULL,'models',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.model),'[]') FROM models m),'unmeteredAnalyses',(SELECT count(*) FROM metered WHERE input_tokens IS NULL OR output_tokens IS NULL)),
    'queue',(SELECT to_jsonb(q) FROM queue q),
    'settings',(SELECT jsonb_build_object('enabled',enabled,'dailyLimit',daily_attempt_limit,'concurrency',max_concurrent) FROM public.catalog_analysis_settings WHERE id),
    'downloads',(SELECT jsonb_build_object(
      'failed',count(*) FILTER(WHERE status='failed'),
      'unknown',count(*) FILTER(WHERE status='unknown'),
      'rejected',count(*) FILTER(WHERE status='rejected'),
      'billingBlocked',count(*) FILTER(WHERE status IN ('rejected','failed','unknown') AND failure_message ~* '(saldo|cr[eé]dito|cuota mensual|l[ií]mite de uso del proveedor|monthly.?(usage|limit)|insufficient.funds|billing|usage.limit)'),
      'latestFailureAt',max(updated_at) FILTER(WHERE status IN ('rejected','failed','unknown'))
    ) FROM public.catalog_download_jobs),
    'attemptsToday',(SELECT count(*) FROM public.catalog_analysis_attempts WHERE started_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_operations_overview() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_operations_overview() TO authenticated;
COMMENT ON FUNCTION public.get_operations_overview() IS 'Founder-only snapshot; cached base-analysis estimates are not an invoice, usage ledger or provider credit balance.';
