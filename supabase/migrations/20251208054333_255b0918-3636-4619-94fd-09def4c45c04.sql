-- Allow public read access to products (for preview)
CREATE POLICY "Public can view products"
ON public.products
FOR SELECT
USING (true);

-- Allow public read access to creators (for preview)
CREATE POLICY "Public can view creators"
ON public.creators
FOR SELECT
USING (true);