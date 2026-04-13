import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResult {
  hook: string;
  body: string;
  cta: string;
}

interface VariantsResult {
  hooks: string[];
  body_variant: string;
}

interface UseAnalyzeVideoReturn {
  transcript: string | null;
  analysis: AnalysisResult | null;
  variants: VariantsResult | null;
  isDownloading: boolean;
  isTranscribing: boolean;
  isAnalyzing: boolean;
  error: string | null;
  downloadVideo: (videoId: string, tiktokUrl: string) => Promise<boolean>;
  analyzeVideo: (videoId: string) => Promise<boolean>;
  processVideo: (videoId: string, tiktokUrl: string, videoMp4Url?: string | null) => Promise<boolean>;
}

export function useAnalyzeVideo(): UseAnalyzeVideoReturn {
  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [variants, setVariants] = useState<VariantsResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const downloadVideo = useCallback(async (videoId: string, tiktokUrl: string): Promise<boolean> => {
    setIsDownloading(true);
    setError(null);

    try {
      console.log('[useAnalyzeVideo] Downloading video:', videoId);
      
      const { data, error: fnError } = await supabase.functions.invoke('download-tiktok-video', {
        body: { videoId, tiktokUrl }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('[useAnalyzeVideo] Video downloaded successfully');
      return true;
    } catch (err: any) {
      console.error('[useAnalyzeVideo] Download error:', err);
      setError(err.message);
      toast({
        title: 'Error al descargar video',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDownloading(false);
    }
  }, [toast]);

  const analyzeVideo = useCallback(async (videoId: string): Promise<boolean> => {
    setIsTranscribing(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('[useAnalyzeVideo] Analyzing video:', videoId);
      
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-and-analyze', {
        body: { videoId }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setTranscript(data.transcript);
      setAnalysis(data.analysis);
      setVariants(data.variants);

      console.log('[useAnalyzeVideo] Analysis complete');
      return true;
    } catch (err: any) {
      console.error('[useAnalyzeVideo] Analysis error:', err);
      setError(err.message);
      toast({
        title: 'Error al analizar video',
        description: err.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsTranscribing(false);
      setIsAnalyzing(false);
    }
  }, [toast]);

  const processVideo = useCallback(async (
    videoId: string, 
    tiktokUrl: string, 
    videoMp4Url?: string | null
  ): Promise<boolean> => {
    // If video not downloaded yet, download first
    if (!videoMp4Url) {
      const downloadSuccess = await downloadVideo(videoId, tiktokUrl);
      if (!downloadSuccess) return false;
    }

    // Then analyze
    return await analyzeVideo(videoId);
  }, [downloadVideo, analyzeVideo]);

  return {
    transcript,
    analysis,
    variants,
    isDownloading,
    isTranscribing,
    isAnalyzing,
    error,
    downloadVideo,
    analyzeVideo,
    processVideo
  };
}
