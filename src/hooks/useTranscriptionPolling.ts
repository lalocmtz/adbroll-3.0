import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type TranscriptionStatus = 'idle' | 'queued' | 'extracting' | 'transcribing' | 'completed' | 'error';

interface UseTranscriptionPollingResult {
  isPolling: boolean;
  transcript: string | null;
  error: string | null;
  status: TranscriptionStatus;
  startTranscription: (videoId: string, tiktokUrl: string) => Promise<boolean>;
  reset: () => void;
}

export const useTranscriptionPolling = (): UseTranscriptionPollingResult => {
  const [isPolling, setIsPolling] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    setIsPolling(false);
    setTranscript(null);
    setError(null);
    setStatus('idle');
    abortRef.current = true;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const pollForTranscript = useCallback(async (videoId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("daily_feed")
        .select("transcripcion_original")
        .eq("id", videoId)
        .maybeSingle();

      if (error) {
        console.error("Polling error:", error);
        return null;
      }

      return data?.transcripcion_original || null;
    } catch (err) {
      console.error("Polling fetch error:", err);
      return null;
    }
  }, []);

  const checkQueueStatus = useCallback(async (videoId: string): Promise<{ status: string; error?: string } | null> => {
    try {
      const { data, error } = await supabase
        .from("transcription_queue")
        .select("status, error")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Queue status error:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Queue status fetch error:", err);
      return null;
    }
  }, []);

  const startTranscription = useCallback(async (videoId: string, tiktokUrl: string): Promise<boolean> => {
    setIsPolling(true);
    setError(null);
    setTranscript(null);
    setStatus('queued');
    abortRef.current = false;

    try {
      // First check if transcript already exists
      const existingTranscript = await pollForTranscript(videoId);
      if (existingTranscript) {
        console.log("Transcript already exists, skipping transcription");
        setTranscript(existingTranscript);
        setIsPolling(false);
        setStatus('completed');
        return true;
      }

      // Trigger transcription (will be queued)
      console.log("Starting transcription for:", tiktokUrl);
      
      const { data, error: transcribeError } = await supabase.functions.invoke("transcribe-video", {
        body: { tiktokUrl, videoId }
      });

      if (transcribeError) {
        console.error("Transcription error:", transcribeError);
        setError("Error al iniciar la transcripción");
        setIsPolling(false);
        setStatus('error');
        return false;
      }

      // If immediate transcription returned (already existed)
      if (data?.status === 'completed' && data?.transcription) {
        console.log("Got immediate transcription");
        setTranscript(data.transcription);
        setIsPolling(false);
        setStatus('completed');
        return true;
      }

      // Poll for transcript
      console.log("Polling for transcript...");
      setStatus('extracting');
      let attempts = 0;
      const maxAttempts = 90; // 3 minutes max (2 seconds * 90)
      let statusUpdateCount = 0;

      return new Promise((resolve) => {
        const poll = async () => {
          if (abortRef.current) {
            setIsPolling(false);
            resolve(false);
            return;
          }

          attempts++;
          
          // Update status based on time elapsed
          if (statusUpdateCount < 3 && attempts > 5) {
            setStatus('extracting');
          }
          if (statusUpdateCount < 3 && attempts > 15) {
            setStatus('transcribing');
            statusUpdateCount = 3;
          }

          // Check transcript in daily_feed
          const transcript = await pollForTranscript(videoId);

          if (transcript) {
            console.log("Transcript found after", attempts, "attempts");
            setTranscript(transcript);
            setIsPolling(false);
            setStatus('completed');
            resolve(true);
            return;
          }

          // Check queue status for errors
          const queueStatus = await checkQueueStatus(videoId);
          if (queueStatus?.status === 'failed') {
            console.log("Transcription failed:", queueStatus.error);
            setError(queueStatus.error || "Error en la transcripción");
            setIsPolling(false);
            setStatus('error');
            resolve(false);
            return;
          }

          if (attempts >= maxAttempts) {
            console.log("Polling timeout reached");
            setError("Tiempo de espera agotado. Intenta de nuevo más tarde.");
            setIsPolling(false);
            setStatus('error');
            resolve(false);
            return;
          }

          // Poll every 2 seconds
          pollingRef.current = setTimeout(poll, 2000);
        };

        poll();
      });
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.message || "Error desconocido");
      setIsPolling(false);
      setStatus('error');
      return false;
    }
  }, [pollForTranscript, checkQueueStatus]);

  return {
    isPolling,
    transcript,
    error,
    status,
    startTranscription,
    reset,
  };
};