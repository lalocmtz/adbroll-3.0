-- Fix: Change product_opportunities view from SECURITY DEFINER to SECURITY INVOKER
-- This ensures queries execute with the querying user's permissions, respecting RLS policies

ALTER VIEW public.product_opportunities SET (security_invoker = on);