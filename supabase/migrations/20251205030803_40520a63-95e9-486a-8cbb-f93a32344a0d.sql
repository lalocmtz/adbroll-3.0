-- Add missing columns to products table for complete Kalodata mapping
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS rank integer,
ADD COLUMN IF NOT EXISTS sales_7d integer,
ADD COLUMN IF NOT EXISTS revenue_7d numeric,
ADD COLUMN IF NOT EXISTS revenue_30d numeric,
ADD COLUMN IF NOT EXISTS creators_count integer,
ADD COLUMN IF NOT EXISTS rating numeric,
ADD COLUMN IF NOT EXISTS commission_amount numeric;