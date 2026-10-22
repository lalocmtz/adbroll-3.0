-- Fresh Supabase tables inherit table-level grants. Column grants cannot remove
-- those inherited privileges, so revoke SELECT explicitly before restoring cards.
REVOKE SELECT ON public.videos FROM anon,authenticated;
REVOKE SELECT(transcript,analysis_json,variants_json) ON public.videos FROM anon,authenticated;
GRANT SELECT(id,rank,video_url,title,creator_handle,creator_name,product_name,category,
 country,views,sales,revenue_mxn,roas,imported_at,product_id,product_price,product_sales,
 product_revenue,video_mp4_url,thumbnail_url,duration,processing_status,creator_id,
 ai_match_attempted_at,ai_match_confidence,snapshot_date_range,snapshot_at,
 download_attempts,visual_product_detected,visual_confidence,visual_keywords,
 visual_analyzed_at,manual_match,manual_matched_at,manual_matched_by,tiktok_video_id,
 match_source,suggested_product_id,match_reason,tiktok_product_id,source_product_url,
 match_status,match_method,match_confidence,match_algorithm_version)
 ON public.videos TO anon,authenticated;
-- Premium data is served only through the entitlement-aware get_video_script RPC.
REVOKE TRUNCATE,REFERENCES,TRIGGER ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
