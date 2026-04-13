-- Sistema de créditos de video para generación con Sora 2
CREATE TABLE public.video_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  credits_total INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de videos generados
CREATE TABLE public.generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_video_id UUID REFERENCES public.videos(id),
  prompt_used TEXT,
  product_image_url TEXT,
  kie_task_id TEXT,
  video_url TEXT,
  duration_seconds INTEGER DEFAULT 15,
  status TEXT DEFAULT 'processing',
  error_message TEXT,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para kie_task_id para búsquedas rápidas en callbacks
CREATE INDEX idx_generated_videos_kie_task_id ON public.generated_videos(kie_task_id);
CREATE INDEX idx_generated_videos_user_id ON public.generated_videos(user_id);
CREATE INDEX idx_video_credits_user_id ON public.video_credits(user_id);

-- Constraint único para user_id en video_credits
ALTER TABLE public.video_credits ADD CONSTRAINT video_credits_user_id_unique UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.video_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_videos ENABLE ROW LEVEL SECURITY;

-- Policies for video_credits
CREATE POLICY "Users can view own credits" ON public.video_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage video credits" ON public.video_credits
  FOR ALL USING (true) WITH CHECK (true);

-- Policies for generated_videos
CREATE POLICY "Users can view own generated videos" ON public.generated_videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated videos" ON public.generated_videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage generated videos" ON public.generated_videos
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger para actualizar updated_at en video_credits
CREATE TRIGGER update_video_credits_updated_at
  BEFORE UPDATE ON public.video_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();