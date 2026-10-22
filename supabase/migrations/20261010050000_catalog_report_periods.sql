-- Only expose report labels; premium analysis remains protected by column grants.
CREATE OR REPLACE FUNCTION public.get_catalog_report_periods(p_country text)
RETURNS TABLE(snapshot_date_range text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT DISTINCT v.snapshot_date_range
  FROM public.videos v
  WHERE v.country = p_country
    AND v.snapshot_date_range ~ '^\d{4}-\d{2}-\d{2}~\d{4}-\d{2}-\d{2}$'
$$;
REVOKE ALL ON FUNCTION public.get_catalog_report_periods(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_catalog_report_periods(text) TO anon, authenticated, service_role;
