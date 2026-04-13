-- Create table for UGC video generations
CREATE TABLE public.ugc_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_image_url TEXT NOT NULL,
  product_description TEXT NOT NULL,
  avatar_type TEXT NOT NULL DEFAULT 'latina_joven',
  
  -- Generated content
  script TEXT,
  prompt_scene_1 TEXT,
  prompt_scene_2 TEXT,
  image_1_url TEXT,
  image_2_url TEXT,
  video_1_url TEXT,
  video_1_task_id TEXT,
  video_2_url TEXT,
  video_2_task_id TEXT,
  audio_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Costs
  cost_usd DECIMAL(10,4) DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.ugc_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own generations
CREATE POLICY "Users can view their own UGC generations"
ON public.ugc_generations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own UGC generations"
ON public.ugc_generations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own UGC generations"
ON public.ugc_generations
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role policy for edge functions (callbacks)
CREATE POLICY "Service role can update any UGC generation"
ON public.ugc_generations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_ugc_generations_user_id ON public.ugc_generations(user_id);
CREATE INDEX idx_ugc_generations_status ON public.ugc_generations(status);
CREATE INDEX idx_ugc_generations_video_task_ids ON public.ugc_generations(video_1_task_id, video_2_task_id);