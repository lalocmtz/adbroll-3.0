import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LipsyncStatus = 'idle' | 'generating-audio' | 'generating-image' | 'generating-video' | 'completed' | 'failed';

interface GeneratedVideo {
  id: string;
  status: string;
  videoUrl?: string;
  errorMessage?: string;
}

interface GenerateLipsyncParams {
  imageUrl: string;
  audioUrl: string;
  productName?: string;
  duration: string;
  videoId?: string;
}

export const useLipsyncGeneration = () => {
  const [status, setStatus] = useState<LipsyncStatus>('idle');
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(async (generatedVideoId: string) => {
    const checkStatus = async () => {
      try {
        const { data, error: pollError } = await supabase.functions.invoke('check-video-status', {
          body: { generatedVideoId },
        });

        if (pollError) {
          console.error('Poll error:', pollError);
          return;
        }

        if (data.status === 'completed') {
          setGeneratedVideo({
            id: generatedVideoId,
            status: 'completed',
            videoUrl: data.videoUrl,
          });
          setStatus('completed');
          stopPolling();
          toast({
            title: '✅ Video con lip-sync listo',
            description: 'Tu video incluye el audio sincronizado',
          });
        } else if (data.status === 'failed') {
          setGeneratedVideo({
            id: generatedVideoId,
            status: 'failed',
            errorMessage: data.errorMessage,
          });
          setStatus('failed');
          setError(data.errorMessage || 'La generación del video falló');
          stopPolling();
          toast({
            title: 'Error en generación',
            description: data.errorMessage || 'El video no pudo ser generado. Tu crédito fue reembolsado.',
            variant: 'destructive',
          });
        }
        // If still processing, continue polling
      } catch (err) {
        console.error('Error checking status:', err);
      }
    };

    // Poll every 5 seconds
    pollingRef.current = setInterval(checkStatus, 5000);
    
    // Also check immediately
    checkStatus();
  }, [stopPolling, toast]);

  const generateLipsyncVideo = useCallback(async ({
    imageUrl,
    audioUrl: audioInput,
    productName,
    duration,
    videoId,
  }: GenerateLipsyncParams) => {
    setStatus('generating-video');
    setError(null);
    setGeneratedVideo(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('generate-lipsync-video', {
        body: {
          imageUrl,
          audioUrl: audioInput,
          productName,
          duration,
          videoId,
        },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const generatedVideoId = data.generatedVideoId;
      
      setGeneratedVideo({
        id: generatedVideoId,
        status: 'processing',
      });

      toast({
        title: '🎬 Generando video con lip-sync',
        description: `${data.estimatedTime}. El audio estará sincronizado automáticamente.`,
      });

      // Start polling for status
      pollStatus(generatedVideoId);

    } catch (err: any) {
      console.error('Lipsync generation error:', err);
      setError(err.message);
      setStatus('failed');
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  }, [pollStatus, toast]);

  const reset = useCallback(() => {
    stopPolling();
    setStatus('idle');
    setGeneratedVideo(null);
    setError(null);
    setAudioUrl(null);
  }, [stopPolling]);

  return {
    status,
    generatedVideo,
    error,
    audioUrl,
    setAudioUrl,
    generateLipsyncVideo,
    reset,
    isGenerating: status === 'generating-video' || status === 'generating-audio' || status === 'generating-image',
    isCompleted: status === 'completed',
    isFailed: status === 'failed',
  };
};
