-- Tabla para registrar los analisis de video hechos desde la herramienta "Analizar video".
-- Sirve para aplicar el limite diario de 5 analisis por usuario y guardar el resultado.
-- Idempotente: usa IF NOT EXISTS y DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS public.tool_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url text,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tool_analyses TO authenticated;
GRANT ALL ON public.tool_analyses TO service_role;

-- Indice para contar rapido los analisis de hoy por usuario.
CREATE INDEX IF NOT EXISTS idx_tool_analyses_user_created
  ON public.tool_analyses (user_id, created_at);

-- Habilitar RLS.
ALTER TABLE public.tool_analyses ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede ver sus propios analisis.
DROP POLICY IF EXISTS "Users can view own tool analyses" ON public.tool_analyses;
CREATE POLICY "Users can view own tool analyses"
  ON public.tool_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- El usuario solo puede crear analisis a su propio nombre.
DROP POLICY IF EXISTS "Users can insert own tool analyses" ON public.tool_analyses;
CREATE POLICY "Users can insert own tool analyses"
  ON public.tool_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);