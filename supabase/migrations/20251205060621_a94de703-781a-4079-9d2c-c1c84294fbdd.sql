-- Create transcription queue table
CREATE TABLE public.transcription_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  video_url text NOT NULL,
  status text DEFAULT 'pending',
  transcription_text text,
  error text,
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transcription_queue ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage queue
CREATE POLICY "Service role can manage transcription queue" 
ON public.transcription_queue 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_transcription_queue_status ON public.transcription_queue(status);
CREATE INDEX idx_transcription_queue_video_id ON public.transcription_queue(video_id);