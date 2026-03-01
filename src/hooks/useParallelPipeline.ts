import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WorkerStats {
  downloads: { processed: number; pending: number; errors: number };
  transcriptions: { processed: number; pending: number; errors: number; failed: number };
  matching: { processed: number; pending: number; errors: number; aiMatched: number };
  avatars: { processed: number; pending: number; errors: number };
}

export interface PipelineState {
  isRunning: boolean;
  isPaused: boolean;
  stats: WorkerStats;
  phase: string;
  quotaExceeded: boolean;
}

interface WorkerConfig {
  maxConcurrent: number;
  batchSize: number;
  delayMs: number;
}

const WORKER_CONFIGS: Record<keyof WorkerStats, WorkerConfig> = {
  downloads: { maxConcurrent: 5, batchSize: 5, delayMs: 500 },
  transcriptions: { maxConcurrent: 3, batchSize: 3, delayMs: 1000 },
  matching: { maxConcurrent: 1, batchSize: 100, delayMs: 300 },
  avatars: { maxConcurrent: 1, batchSize: 50, delayMs: 500 },
};

const MAX_NO_PROGRESS_CYCLES = 5;

export function useParallelPipeline() {
  const [state, setState] = useState<PipelineState>({
    isRunning: false,
    isPaused: false,
    stats: {
      downloads: { processed: 0, pending: 0, errors: 0 },
      transcriptions: { processed: 0, pending: 0, errors: 0, failed: 0 },
      matching: { processed: 0, pending: 0, errors: 0, aiMatched: 0 },
      avatars: { processed: 0, pending: 0, errors: 0 },
    },
    phase: "",
    quotaExceeded: false,
  });

  const shouldStopRef = useRef(false);
  const quotaExceededRef = useRef(false);
  const noProgressCountRef = useRef({ downloads: 0, matching: 0 });

  const updateStats = useCallback((
    worker: keyof WorkerStats,
    updates: Partial<WorkerStats[keyof WorkerStats]>
  ) => {
    setState(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [worker]: { ...prev.stats[worker], ...updates },
      },
    }));
  }, []);

  const loadCurrentStats = useCallback(async () => {
    const [videosRes, creatorsRes] = await Promise.all([
      supabase.from("videos").select("id, product_id, video_mp4_url, transcript, processing_status, download_attempts"),
      supabase.from("creators").select("id, avatar_url, avatar_storage_url"),
    ]);

    const videos = videosRes.data || [];
    const creators = creatorsRes.data || [];

    const pendingDownload = videos.filter(v =>
      !v.video_mp4_url &&
      v.processing_status !== 'permanently_failed' &&
      v.processing_status !== 'download_blocked_quota' &&
      (v.download_attempts || 0) < 5
    ).length;

    const pendingTranscription = videos.filter(v =>
      v.video_mp4_url && !v.transcript && v.processing_status !== 'transcription_failed'
    ).length;
    
    const failedTranscription = videos.filter(v =>
      v.video_mp4_url && !v.transcript && v.processing_status === 'transcription_failed'
    ).length;

    const pendingMatch = videos.filter(v => !v.product_id).length;

    const pendingAvatars = creators.filter(c =>
      c.avatar_url && !c.avatar_storage_url
    ).length;

    setState(prev => ({
      ...prev,
      stats: {
        downloads: { ...prev.stats.downloads, pending: pendingDownload },
        transcriptions: { ...prev.stats.transcriptions, pending: pendingTranscription, failed: failedTranscription },
        matching: { ...prev.stats.matching, pending: pendingMatch },
        avatars: { ...prev.stats.avatars, pending: pendingAvatars },
      },
    }));

    return { pendingDownload, pendingTranscription, pendingMatch, pendingAvatars, failedTranscription };
  }, []);

  const runDownloadWorker = useCallback(async (market: string): Promise<boolean> => {
    if (shouldStopRef.current || quotaExceededRef.current) return false;

    const { data, error } = await supabase.functions.invoke("download-videos-batch", {
      body: { batchSize: WORKER_CONFIGS.downloads.batchSize, market },
    });

    if (error) {
      console.warn("Download worker error:", error.message);
      updateStats("downloads", {
        errors: (state.stats.downloads.errors || 0) + 1,
      });
      return true;
    }

    // QUOTA EXCEEDED — stop downloads immediately
    if (data?.quotaExceeded) {
      console.warn("⚠️ Download quota exceeded — stopping downloads");
      quotaExceededRef.current = true;
      setState(prev => ({ ...prev, quotaExceeded: true }));
      updateStats("downloads", {
        processed: (state.stats.downloads.processed || 0) + (data.successful || 0),
        pending: data.remaining || 0,
      });
      return false;
    }

    if (!data || data.processed === 0 || data.remaining === 0) {
      return false;
    }

    // No-progress detection
    if (data.successful === 0) {
      noProgressCountRef.current.downloads++;
      if (noProgressCountRef.current.downloads >= MAX_NO_PROGRESS_CYCLES) {
        console.warn("⚠️ Downloads: no progress for 5 cycles, stopping");
        return false;
      }
    } else {
      noProgressCountRef.current.downloads = 0;
    }

    updateStats("downloads", {
      processed: (state.stats.downloads.processed || 0) + (data.successful || 0),
      pending: data.remaining || 0,
      errors: (state.stats.downloads.errors || 0) + (data.permanentlyFailed || 0),
    });

    return data.remaining > 0;
  }, [state.stats.downloads, updateStats]);

  const runTranscriptionWorker = useCallback(async (market: string): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("transcribe-videos-batch", {
      body: { batchSize: WORKER_CONFIGS.transcriptions.batchSize, market },
    });

    if (error) {
      console.warn("Transcription worker error:", error.message);
      updateStats("transcriptions", {
        errors: (state.stats.transcriptions.errors || 0) + 1,
      });
      return true;
    }

    if (!data || data.processed === 0 || data.remaining === 0 || data.complete) {
      return false;
    }

    updateStats("transcriptions", {
      processed: (state.stats.transcriptions.processed || 0) + (data.successful || 0),
      pending: data.remaining || 0,
      failed: data.totalFailed || 0,
    });

    return data.remaining > 0;
  }, [state.stats.transcriptions, updateStats]);

  const runMatchingWorker = useCallback(async (useAI: boolean, market: string): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
      body: { 
        batchSize: WORKER_CONFIGS.matching.batchSize, 
        threshold: 0.5, 
        useAI,
        market,
      },
    });

    if (error) {
      console.warn("Matching worker error:", error.message);
      updateStats("matching", {
        errors: (state.stats.matching.errors || 0) + 1,
      });
      return true;
    }

    if (data?.complete) {
      return false;
    }

    const matched = data?.matchedInBatch || 0;
    const aiMatched = data?.aiMatched || 0;

    // No-progress detection for matching
    if (matched === 0) {
      noProgressCountRef.current.matching++;
      if (noProgressCountRef.current.matching >= MAX_NO_PROGRESS_CYCLES) {
        console.warn("⚠️ Matching: no progress for 5 cycles, stopping");
        return false;
      }
    } else {
      noProgressCountRef.current.matching = 0;
    }

    updateStats("matching", {
      processed: (state.stats.matching.processed || 0) + matched,
      pending: data?.remainingUnmatched || 0,
      aiMatched: (state.stats.matching.aiMatched || 0) + aiMatched,
    });

    return (data?.remainingUnmatched || 0) > 0;
  }, [state.stats.matching, updateStats]);

  const runAvatarWorker = useCallback(async (): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("download-creator-avatars");

    if (error) {
      console.warn("Avatar worker error:", error.message);
      updateStats("avatars", { errors: (state.stats.avatars.errors || 0) + 1 });
      return false;
    }

    if (data) {
      updateStats("avatars", {
        processed: data.successCount || 0,
        errors: (state.stats.avatars.errors || 0) + (data.errorCount || 0),
        pending: 0,
      });
    }

    return false;
  }, [state.stats.avatars, updateStats]);

  const startParallelPipeline = useCallback(async (useAI: boolean = false, market: string = 'mx') => {
    shouldStopRef.current = false;
    quotaExceededRef.current = false;
    noProgressCountRef.current = { downloads: 0, matching: 0 };

    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      quotaExceeded: false,
      phase: "Iniciando pipeline paralelo...",
      stats: {
        downloads: { processed: 0, pending: 0, errors: 0 },
        transcriptions: { processed: 0, pending: 0, errors: 0, failed: 0 },
        matching: { processed: 0, pending: 0, errors: 0, aiMatched: 0 },
        avatars: { processed: 0, pending: 0, errors: 0 },
      },
    }));

    const initialStats = await loadCurrentStats();

    let downloadsActive = initialStats.pendingDownload > 0;
    let transcriptionsActive = initialStats.pendingTranscription > 0;
    let matchingActive = initialStats.pendingMatch > 0;
    let avatarsActive = initialStats.pendingAvatars > 0;

    let cycleCount = 0;
    const MAX_CYCLES = 100;

    while (
      !shouldStopRef.current &&
      cycleCount < MAX_CYCLES &&
      (downloadsActive || transcriptionsActive || matchingActive || avatarsActive)
    ) {
      cycleCount++;

      const phaseLabels = [
        downloadsActive ? (quotaExceededRef.current ? "⚠️ Cuota agotada" : "📥 Descargando") : "",
        transcriptionsActive ? "📝 Transcribiendo" : "",
        matchingActive ? "🔗 Vinculando" : "",
        avatarsActive ? "📷 Fotos" : "",
      ].filter(Boolean).join(" • ");

      setState(prev => ({
        ...prev,
        phase: `Ciclo ${cycleCount}: ${phaseLabels}`,
      }));

      const results = await Promise.all([
        downloadsActive && !quotaExceededRef.current ? runDownloadWorker(market) : Promise.resolve(false),
        transcriptionsActive ? runTranscriptionWorker(market) : Promise.resolve(false),
        matchingActive ? runMatchingWorker(useAI, market) : Promise.resolve(false),
        avatarsActive ? runAvatarWorker() : Promise.resolve(false),
      ]);

      // If quota hit, stop downloads but let other workers continue
      downloadsActive = quotaExceededRef.current ? false : results[0];
      transcriptionsActive = results[1] || (results[0] && initialStats.pendingTranscription > 0);
      matchingActive = results[2];
      avatarsActive = results[3];

      if (cycleCount % 5 === 0) {
        const refreshedStats = await loadCurrentStats();
        if (refreshedStats.pendingTranscription > 0 && !transcriptionsActive) {
          transcriptionsActive = true;
        }
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    await loadCurrentStats();

    const finalPhase = shouldStopRef.current 
      ? "⏸️ Pausado" 
      : quotaExceededRef.current 
        ? "⚠️ Cuota agotada — upgrade tu plan en RapidAPI" 
        : "✅ Completado";

    setState(prev => ({
      ...prev,
      isRunning: false,
      phase: finalPhase,
    }));

    return state.stats;
  }, [loadCurrentStats, runDownloadWorker, runTranscriptionWorker, runMatchingWorker, runAvatarWorker, state.stats]);

  const stopPipeline = useCallback(() => {
    shouldStopRef.current = true;
    setState(prev => ({ ...prev, isPaused: true, phase: "⏸️ Pausando..." }));
  }, []);

  return {
    state,
    startParallelPipeline,
    stopPipeline,
    loadCurrentStats,
  };
}
