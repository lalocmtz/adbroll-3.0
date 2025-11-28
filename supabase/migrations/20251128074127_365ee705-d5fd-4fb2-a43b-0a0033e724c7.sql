-- Create products table for Kalodata product data
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_nombre TEXT NOT NULL,
  producto_url TEXT,
  categoria TEXT,
  precio_mxn NUMERIC(12,2),
  descripcion TEXT,
  imagen_url TEXT,
  total_ventas INTEGER DEFAULT 0,
  total_ingresos_mxn NUMERIC(12,2) DEFAULT 0,
  promedio_roas NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create creators table for Kalodata creator data
CREATE TABLE IF NOT EXISTS public.creators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_creador TEXT NOT NULL UNIQUE,
  nombre_completo TEXT,
  seguidores INTEGER,
  total_videos INTEGER DEFAULT 0,
  total_ventas INTEGER DEFAULT 0,
  total_ingresos_mxn NUMERIC(12,2) DEFAULT 0,
  promedio_visualizaciones INTEGER,
  promedio_roas NUMERIC(5,2),
  mejor_video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_products_nombre ON public.products(producto_nombre);
CREATE INDEX idx_products_ventas ON public.products(total_ventas DESC);
CREATE INDEX idx_products_ingresos ON public.products(total_ingresos_mxn DESC);

CREATE INDEX idx_creators_usuario ON public.creators(usuario_creador);
CREATE INDEX idx_creators_ventas ON public.creators(total_ventas DESC);
CREATE INDEX idx_creators_ingresos ON public.creators(total_ingresos_mxn DESC);

-- Enable RLS on both tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for creators
CREATE POLICY "Authenticated users can view creators"
  ON public.creators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage creators"
  ON public.creators
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add timestamp update trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creators_updated_at
  BEFORE UPDATE ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();