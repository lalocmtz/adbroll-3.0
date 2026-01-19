-- Add unique constraint for batch upsert on products
ALTER TABLE public.products 
ADD CONSTRAINT products_nombre_market_unique 
UNIQUE (producto_nombre, market);