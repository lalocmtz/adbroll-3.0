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
  });

  const shouldStopRef = useRef(false);
  const activeWorkersRef = useRef({
    downloads: 0,
    transcriptions: 0,
    matching: 0,
    avatars: 0,
  });

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
      (v.download_attempts || 0) < 5
    ).length;

    // Pending = has MP4, no transcript, not failed
    const pendingTranscription = videos.filter(v =>
      v.video_mp4_url && !v.transcript && v.processing_status !== 'transcription_failed'
    ).length;
    
    // Failed = has MP4, no transcript, status is transcription_failed
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

  // Individual worker functions
  const runDownloadWorker = useCallback(async (): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("download-videos-batch", {
      body: { batchSize: WORKER_CONFIGS.downloads.batchSize },
    });

    if (error) {
      console.warn("Download worker error:", error.message);
      updateStats("downloads", {
        errors: state.stats.downloads.errors + 1,
      });
      return true; // Continue trying
    }

    if (!data || data.processed === 0 || data.remaining === 0) {
      return false; // No more work
    }

    updateStats("downloads", {
      processed: state.stats.downloads.processed + (data.successful || 0),
      pending: data.remaining || 0,
      errors: state.stats.downloads.errors + (data.permanentlyFailed || 0),
    });

    return data.remaining > 0;
  }, [state.stats.downloads, updateStats]);

  const runTranscriptionWorker = useCallback(async (): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("transcribe-videos-batch", {
      body: { batchSize: WORKER_CONFIGS.transcriptions.batchSize },
    });

    if (error) {
      console.warn("Transcription worker error:", error.message);
      updateStats("transcriptions", {
        errors: state.stats.transcriptions.errors + 1,
      });
      return true;
    }

    if (!data || data.processed === 0 || data.remaining === 0 || data.complete) {
      return false;
    }

    updateStats("transcriptions", {
      processed: state.stats.transcriptions.processed + (data.successful || 0),
      pending: data.remaining || 0,
      failed: data.totalFailed || 0,
    });

    return data.remaining > 0;
  }, [state.stats.transcriptions, updateStats]);

  const runMatchingWorker = useCallback(async (useAI: boolean, market: string): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    console.log(`🔗 Matching worker: market=${market}, useAI=${useAI}`);

    const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
      body: { 
        batchSize: WORKER_CONFIGS.matching.batchSize, 
        threshold: 0.5, 
        useAI,
        market, // CRITICAL: Pass market to ensure same-market matching only
      },
    });

    if (error) {
      console.warn("Matching worker error:", error.message);
      updateStats("matching", {
        errors: state.stats.matching.errors + 1,
      });
      return true; // Keep trying on error
    }

    if (data?.complete) {
      return false;
    }

    const matched = data?.matchedInBatch || 0;
    const aiMatched = data?.aiMatched || 0;
    updateStats("matching", {
      processed: state.stats.matching.processed + matched,
      pending: data?.remainingUnmatched || 0,
      aiMatched: state.stats.matching.aiMatched + aiMatched,
    });

    // REMOVED: Premature stop condition
    // Now continue processing until remainingUnmatched is 0
    // Allow multiple passes - some videos may need AI fallback
    console.log(`🔗 Batch result: matched=${matched}, aiMatched=${aiMatched}, remaining=${data?.remainingUnmatched}`);

    return (data?.remainingUnmatched || 0) > 0;
  }, [state.stats.matching, updateStats]);

  const runAvatarWorker = useCallback(async (): Promise<boolean> => {
    if (shouldStopRef.current) return false;

    const { data, error } = await supabase.functions.invoke("download-creator-avatars");

    if (error) {
      console.warn("Avatar worker error:", error.message);
      updateStats("avatars", { errors: state.stats.avatars.errors + 1 });
      return false;
    }

    if (data) {
      updateStats("avatars", {
        processed: data.successCount || 0,
        errors: state.stats.avatars.errors + (data.errorCount || 0),
        pending: 0,
      });
    }

    return false; // Avatars run once per cycle
  }, [state.stats.avatars, updateStats]);

  // Main parallel pipeline
  const startParallelPipeline = useCallback(async (useAI: boolean = false, market: string = 'mx') => {
    shouldStopRef.current = false;

    setState(prev => ({
      ...prev,
      isRunning: true,
      isPaused: false,
      phase: "Iniciando pipeline paralelo...",
      stats: {
        downloads: { processed: 0, pending: 0, errors: 0 },
        transcriptions: { processed: 0, pending: 0, errors: 0, failed: 0 },
        matching: { processed: 0, pending: 0, errors: 0, aiMatched: 0 },
        avatars: { processed: 0, pending: 0, errors: 0 },
      },
    }));

    // Load initial stats
    const initialStats = await loadCurrentStats();

    let downloadsActive = initialStats.pendingDownload > 0;
    let transcriptionsActive = initialStats.pendingTranscription > 0;
    let matchingActive = initialStats.pendingMatch > 0;
    let avatarsActive = initialStats.pendingAvatars > 0;

    let cycleCount = 0;
    const MAX_CYCLES = 100; // Safety limit

    while (
      !shouldStopRef.current &&
      cycleCount < MAX_CYCLES &&
      (downloadsActive || transcriptionsActive || matchingActive || avatarsActive)
    ) {
      cycleCount++;

      setState(prev => ({
        ...prev,
        phase: `Ciclo ${cycleCount}: ${[
          downloadsActive ? "📥 Descargando" : "",
          transcriptionsActive ? "📝 Transcribiendo" : "",
          matchingActive ? "🔗 Vinculando" : "",
          avatarsActive ? "📷 Fotos" : "",
        ].filter(Boolean).join(" • ")}`,
      }));

      // Run all workers in parallel
      const results = await Promise.all([
        downloadsActive ? runDownloadWorker() : Promise.resolve(false),
        transcriptionsActive ? runTranscriptionWorker() : Promise.resolve(false),
        matchingActive ? runMatchingWorker(useAI, market) : Promise.resolve(false),
        avatarsActive ? runAvatarWorker() : Promise.resolve(false),
      ]);

      // Update worker states
      downloadsActive = results[0];
      transcriptionsActive = results[1] || (results[0] && initialStats.pendingTranscription > 0);
      matchingActive = results[2];
      avatarsActive = results[3];

      // Re-check pending stats periodically
      if (cycleCount % 5 === 0) {
        const refreshedStats = await loadCurrentStats();
        // Activate transcriptions if new videos were downloaded
        if (refreshedStats.pendingTranscription > 0 && !transcriptionsActive) {
          transcriptionsActive = true;
        }
      }

      // Small delay between cycles
      await new Promise(r => setTimeout(r, 1500));
    }

    // Final stats refresh
    await loadCurrentStats();

    setState(prev => ({
      ...prev,
      isRunning: false,
      phase: shouldStopRef.current ? "⏸️ Pausado" : "✅ Completado",
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
