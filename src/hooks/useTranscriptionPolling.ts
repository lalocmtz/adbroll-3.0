import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseTranscriptionPollingResult {
  isPolling: boolean;
  transcript: string | null;
  error: string | null;
  status: 'idle' | 'starting' | 'extracting' | 'transcribing' | 'completed' | 'error';
  startTranscription: (videoId: string, tiktokUrl: string) => Promise<boolean>;
  reset: () => void;
}

export const useTranscriptionPolling = (): UseTranscriptionPollingResult => {
  const [isPolling, setIsPolling] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'extracting' | 'transcribing' | 'completed' | 'error'>('idle');
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

  const pollForTranscript = useCallback(async (videoId: string): Promise<string | null> => {
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
  }, []);

  const startTranscription = useCallback(async (videoId: string, tiktokUrl: string): Promise<boolean> => {
    setIsPolling(true);
    setError(null);
    setTranscript(null);
    setStatus('starting');
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

      // Trigger transcription edge function
      console.log("Starting transcription for:", tiktokUrl);
      setStatus('extracting');
      
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

      // Otherwise, poll the database
      console.log("Polling for transcript...");
      setStatus('transcribing');
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max (2 seconds * 60)

      return new Promise((resolve) => {
        const poll = async () => {
          if (abortRef.current) {
            resolve(false);
            return;
          }

          attempts++;
          const transcript = await pollForTranscript(videoId);

          if (transcript) {
            console.log("Transcript found after", attempts, "attempts");
            setTranscript(transcript);
            setIsPolling(false);
            setStatus('completed');
            resolve(true);
            return;
          }

          if (attempts >= maxAttempts) {
            console.log("Polling timeout reached");
            setError("Tiempo de espera agotado. El video puede ser muy largo o no estar disponible.");
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
  }, [pollForTranscript]);

  return {
    isPolling,
    transcript,
    error,
    status,
    startTranscription,
    reset,
  };
};
