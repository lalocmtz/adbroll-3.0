CREATE TABLE IF NOT EXISTS public.stg_products_mx (
  tiktok_product_id text,
  producto_nombre text,
  producto_url text,
  imagen_url text,
  categoria text,
  price numeric,
  commission numeric,
  commission_amount numeric,
  revenue_30d numeric,
  total_ventas integer,
  creators_count integer,
  rating numeric,
  rank integer
);
ALTER TABLE public.stg_products_mx ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stg_products_mx TO service_role;