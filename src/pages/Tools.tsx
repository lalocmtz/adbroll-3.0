import { CatalogHeader, CatalogInfo } from "@/components/CatalogToolbar";
import { ScriptTranslation } from '@/components/ScriptTranslation';
import { ScriptTranscript, VideoInsights, validScriptSegments } from '@/components/VideoInsights';
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import {
  Sparkles, Wand2, Copy, Check, Loader2, AlertCircle, Link2,
  RotateCcw, FileText, Lightbulb, Lock, Play, History, ChevronDown, Clock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HISTORY_LIMIT = 20;

// Full canonical links allow strict host/ID validation on both client and server.
const isValidTikTokUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(url.hostname) &&
      /^\/@[^/]+\/video\/\d+\/?$/.test(url.pathname);
  } catch { return false; }
};

type Step = "idle" | "download" | "transcribe" | "analyze" | "variants" | "done" | "error";

interface Insights {
  funcionamiento?: string;
  angulos?: string[];
  ctaLocation?: string;
  estructura?: string;
  fortalezas?: string[];
  debilidades?: string[];
}

interface Variant {
  hook: string;
  body: string;
  cta: string;
  strategy_note?: string;
}

// Bloque del guion segmentado por segundos (lo emite transcribe-assemblyai).
interface Segment {
  start_ms: number;
  end_ms: number;
  text: string;
}

// Forma de lo que guardamos en tool_analyses.result.
interface AnalysisResult {
  transcript: string;
  segments?: Segment[] | null;
  insights?: Insights | null;
  variants?: Variant[];
}

// Registro del histórico (tabla tool_analyses).
interface HistoryItem {
  id: string;
  video_url: string;
  created_at: string;
  result: AnalysisResult;
}

const PROGRESS_LABELS: Record<string, { es: string; en: string }> = {
  download: { es: "Obteniendo el video…", en: "Fetching the video…" },
  transcribe: { es: "Transcribiendo el guion…", en: "Transcribing the script…" },
  analyze: { es: "Revisando cómo presenta el producto…", en: "Reviewing how it presents the product…" },
  variants: { es: "Generando 3 variantes…", en: "Generating 3 variants…" },
};

// ── Helpers de formato ────────────────────────────────────────────────

// Convierte milisegundos a "m:ss" (ej. 64000 → "1:04").
const msToClock = (ms: number): string => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

// Dominio legible a partir de la URL del video.
const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "tiktok.com";
  }
};

// "hace 2h", "hace 3d", "ahora". Versión EN equivalente.
const relativeTime = (iso: string, es: boolean): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return es ? "ahora" : "now";
  if (min < 60) return es ? `hace ${min}m` : `${min}m ago`;
  if (hr < 24) return es ? `hace ${hr}h` : `${hr}h ago`;
  if (day < 7) return es ? `hace ${day}d` : `${day}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString(es ? "es" : "en", { day: "numeric", month: "short" });
};

const Tools = () => {
  const { language } = useLanguage();
  const { hasPaid, isLoggedIn, openPaywall } = useBlurGateContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const activeRequest = useRef(0);
  const analysisBusy = useRef(false);
  const variantBusy = useRef(false);
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  useEffect(() => () => { activeRequest.current++; }, []);
  const [videoUrl, setVideoUrl] = useState("");
  const [analyzedVideoUrl, setAnalyzedVideoUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Resultados
  const [transcript, setTranscript] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("script");

  // Histórico
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false); // colapsable en móvil
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const t = (es: string, en: string) => (language === "es" ? es : en);
  const isEs = language === "es";

  const isBusy = ["download", "transcribe", "analyze", "variants"].includes(step);
  const hasResult = (step === "done" || step === "error") && (!!transcript || !!insights);

  // Carga el histórico del usuario logueado (no re-llama APIs, solo lee la tabla).
  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("tool_analyses")
      .select("id, video_url, created_at, result")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) {
      console.error("No se pudo cargar el histórico:", error);
      return;
    }
    setHistory((data ?? []) as unknown as HistoryItem[]);
  }, []);

  useEffect(() => {
    // Solo cargamos histórico si hay sesión (respeta el gating premium existente).
    if (isLoggedIn) loadHistory().catch(error => console.error("No se pudo cargar el histórico:", error));
  }, [isLoggedIn, loadHistory]);

  const resetAll = () => {
    activeRequest.current++;
    analysisBusy.current = false;
    variantBusy.current = false;
    setGeneratingVariants(false);
    setVariantError(null);
    setStep("idle");
    setErrorMsg(null);
    setTranscript("");
    setSegments([]);
    setInsights(null);
    setVariants([]);
    setThumbnail(null);
    setActiveTab("script");
    setActiveHistoryId(null);
    setAnalyzedVideoUrl("");
  };

  // Re-renderiza un análisis guardado SIN volver a llamar las APIs.
  const openFromHistory = (item: HistoryItem) => {
    const requestId = ++activeRequest.current;
    analysisBusy.current = false;
    variantBusy.current = false;
    setGeneratingVariants(false);
    setVariantError(null);
    const r = item.result || ({} as AnalysisResult);
    setStep("done");
    setErrorMsg(null);
    setVideoUrl(item.video_url);
    setAnalyzedVideoUrl(item.video_url);
    setTranscript(r.transcript || "");
    setSegments(Array.isArray(r.segments) ? r.segments : []);
    setInsights(r.insights ?? null);
    setVariants(Array.isArray(r.variants) ? r.variants : []);
    setThumbnail(null);
    setActiveTab("script");
    setActiveHistoryId(item.id);
    setHistoryOpen(false);

    // Thumbnail no bloqueante (oEmbed) para el item del histórico.
    fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(item.video_url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => requestId === activeRequest.current && data?.thumbnail_url && setThumbnail(data.thumbnail_url))
      .catch(() => {});
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: t("✓ Copiado", "✓ Copied") });
  };

  const friendlyError = (message: unknown, fallback: string): string => {
    if (typeof message !== 'string') return fallback;
    if (/cuota|quota|límite|rate.limit|429/i.test(message)) return t("Llegaste al límite disponible. Inténtalo más tarde; tu análisis guardado sigue disponible.", "The available limit has been reached. Try again later; your saved analysis is still available.");
    if (/gemini|apify|supabase|assemblyai|provider|proveedor|api[_ -]?key|jwt|https?:|json|fetch|function|[_]{1}/i.test(message)) return fallback;
    return message;
  };

  const generateVariants = async () => {
    if (!hasPaid) { openPaywall("Variantes de guion"); return; }
    if (!transcript.trim() || variantBusy.current || analysisBusy.current) return;
    const version = activeRequest.current;
    variantBusy.current = true;
    setGeneratingVariants(true);
    setVariantError(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-script-variants", {
        body: { transcript, variantCount: 3, changeLevel: "medium" },
      });
      if (version !== activeRequest.current) return;
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(detail?.error || t("No se pudieron crear las variantes. Inténtalo de nuevo.", "Could not create variants. Try again."));
      }
      if (!Array.isArray(data?.variants) || data.variants.length !== 3 || !data.variants.every((variant: any) => ['hook','body','cta'].every(key => typeof variant?.[key] === 'string' && variant[key].trim()))) {
        throw new Error(data?.error || t("Las variantes llegaron incompletas. Inténtalo de nuevo.", "The variants were incomplete. Try again."));
      }
      setVariants(data.variants);
      const { data: { user } } = await supabase.auth.getUser();
      if (version !== activeRequest.current) return;
      if (!user) throw new Error(t("Las variantes están listas, pero debes iniciar sesión para guardarlas.", "The variants are ready, but sign in to save them."));
      const { data: inserted, error: saveError } = await supabase.from("tool_analyses").insert({
        user_id: user.id, video_url: analyzedVideoUrl,
        result: { transcript, segments, insights, variants: data.variants } as unknown as Json,
      }).select("id, video_url, created_at, result").single();
      if (version !== activeRequest.current) return;
      if (saveError || !inserted) throw new Error(t("Las variantes están listas, pero no se pudieron guardar en el historial. Cópialas para conservarlas.", "The variants are ready but could not be saved to history. Copy them to keep them."));
      setHistory(previous => [inserted as unknown as HistoryItem, ...previous].slice(0, HISTORY_LIMIT));
      setActiveHistoryId(inserted.id);
    } catch (error: any) {
      if (version === activeRequest.current) setVariantError(friendlyError(error?.message, t("No se pudieron crear las variantes. Inténtalo de nuevo.", "Could not create variants. Try again.")));
    } finally {
      if (version === activeRequest.current) { variantBusy.current = false; setGeneratingVariants(false); }
    }
  };

  const handleAnalyze = async () => {
    if (analysisBusy.current) return;
    setErrorMsg(null);
    setActiveHistoryId(null);

    if (!isValidTikTokUrl(videoUrl)) {
      setErrorMsg(t("Pega el enlace completo: https://www.tiktok.com/@creador/video/123…", "Paste the full link: https://www.tiktok.com/@creator/video/123…"));
      return;
    }

    // Gating premium: si no paga, abrir paywall y no procesar.
    if (!hasPaid) {
      if (!isLoggedIn) {
        navigate("/unlock");
      } else {
        openPaywall("analizar-video");
      }
      return;
    }

    const requestId = ++activeRequest.current;
    analysisBusy.current = true;
    variantBusy.current = false;
    setGeneratingVariants(false);
    setVariantError(null);
    setStep("download");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (requestId !== activeRequest.current) return;
      if (authError) throw new Error(t("No se pudo verificar tu sesión. Vuelve a iniciar sesión.", "Could not verify your session. Please sign in again."));
      if (!user) {
        setStep("idle");
        navigate("/unlock");
        return;
      }

      // Reset de resultados previos.
      setTranscript("");
      setSegments([]);
      setInsights(null);
      setVariants([]);
      setThumbnail(null);

      const url = videoUrl.trim();

      // Thumbnail no bloqueante via oEmbed.
      fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => requestId === activeRequest.current && data?.thumbnail_url && setThumbnail(data.thumbnail_url))
        .catch(() => {});

      let mediaReady = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        if (requestId !== activeRequest.current) return;
        const { data, error } = await supabase.functions.invoke("catalog-download", { body: { videoUrl: url } });
        if (requestId !== activeRequest.current) return;
        if (error) {
          const detail = await error.context?.json?.().catch(() => null);
          throw new Error(detail?.error || "No se pudo preparar el video. Inténtalo más tarde.");
        }
        if (data?.status === 'ready') { mediaReady = true; break; }
        if (data?.status !== 'pending') throw new Error(data?.error || "No se pudo descargar este video.");
        await new Promise(resolve => setTimeout(resolve, Math.min(15, Math.max(3, data.retryAfterSeconds || 8)) * 1000));
      }
      if (requestId !== activeRequest.current) return;
      if (!mediaReady) throw new Error("La descarga sigue en proceso. Vuelve a analizar este mismo enlace en unos minutos; no se inicia otra descarga.");
      // Reuse the shared Gemini analysis for an available catalogue video.
      setStep("transcribe");

      const { data: trData, error: trError } = await supabase.functions.invoke(
        "analyze-catalog-link",
        { body: { videoUrl: url } }
      );

      if (requestId !== activeRequest.current) return;
      if (trError) {
        const detail = await trError.context?.json?.().catch(() => null);
        throw new Error(detail?.error || trError.message || "transcribe_failed");
      }

      if (trData?.error) {
        if (trData.quotaExceeded) {
          throw new Error(
            t(
              "La transcripción no está disponible en este momento. Intenta más tarde.",
              "Transcription is unavailable right now. Try again later."
            )
          );
        }
        throw new Error(trData.error);
      }

      const tx = typeof trData?.transcript === "string" ? trData.transcript.trim() : "";
      const analysis = trData?.analysis;
      const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && !!item.trim()) : [];
      const visualObservations = strings(analysis?.visual_observations);
      if (!analysis || (!tx && !visualObservations.length)) {
        throw new Error(t("No hay contenido disponible para analizar en este video.", "There is no content available to analyze in this video."));
      }
      setTranscript(tx);
      setAnalyzedVideoUrl(url);
      const segs: Segment[] = validScriptSegments(trData?.segments);
      setSegments(segs);

      // Legacy hook/body/cta results are usable without creative variants.
      const sharedInsights: Insights = {
        funcionamiento: typeof analysis.hook === 'string' ? analysis.hook : undefined,
        estructura: typeof analysis.body === 'string' ? analysis.body : undefined,
        ctaLocation: typeof analysis.cta === 'string' ? analysis.cta : undefined,
        angulos: visualObservations,
        fortalezas: strings(analysis.beginner_takeaways),
        debilidades: strings(analysis.uncertainties),
      };
      setInsights(sharedInsights);
      const sharedVariants = trData?.variants;
      const vList: Variant[] = strings(sharedVariants?.hooks).map((hook: string) => ({
        hook, body: typeof sharedVariants.body_variant === 'string' ? sharedVariants.body_variant : '',
        cta: typeof analysis.cta === 'string' ? analysis.cta : '',
      }));
      setVariants(vList);

      // Registrar el analisis (cuenta para el limite diario + historial).
      const savedResult: AnalysisResult = {
        transcript: tx,
        segments: segs,
        insights: sharedInsights,
        variants: vList,
      };
      const { data: inserted, error: saveError } = await supabase
        .from("tool_analyses")
        .insert({
          user_id: user.id,
          video_url: url,
          result: savedResult as unknown as Json,
        })
        .select("id, video_url, created_at, result")
        .single();

      if (requestId !== activeRequest.current) return;
      if (saveError || !inserted) throw new Error(t("El análisis está en pantalla, pero no se pudo guardar. No aparecerá en tu historial.", "Analysis is on screen but could not be saved to your history."));

      // Optimistic: agregar al tope del histórico.
      if (inserted) {
        const item = inserted as unknown as HistoryItem;
        setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT));
        setActiveHistoryId(item.id);
      } else {
        // Fallback: refrescar desde la tabla si el insert no devolvió la fila.
        loadHistory();
      }

      setStep("done");
      setActiveTab("script");
      toast({ title: t("✓ Análisis listo", "✓ Analysis ready") });
    } catch (err: any) {
      if (requestId !== activeRequest.current) return;
      console.error("Analyze error:", err);
      setStep("error");
      setErrorMsg(friendlyError(err?.message, t("No fue posible analizar el video. Intenta de nuevo.", "Could not analyze the video. Try again.")));
    } finally {
      if (requestId === activeRequest.current) analysisBusy.current = false;
    }
  };

  const currentLabel = isBusy ? PROGRESS_LABELS[step] : null;
  const showHistory = isLoggedIn && history.length > 0;

  // Panel del histórico (reutilizado en móvil colapsable y en columna desktop).
  const HistoryList = (
    <ul className="space-y-1.5">
      {history.map((item) => {
        const active = item.id === activeHistoryId;
        return (
          <li key={item.id}>
            <button
              onClick={() => openFromHistory(item)}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${
                active
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/50 bg-background hover:bg-muted/40"
              }`}
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                <Play className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground truncate">
                  {domainOf(item.video_url)}
                </span>
                <span className="block text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {relativeTime(item.created_at, isEs)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-w-0 w-full pt-2 pb-10 px-3 md:px-6 max-w-6xl mx-auto">
      <div className="lg:flex lg:gap-6">
        {/* Columna principal */}
        <div className="flex-1 min-w-0 space-y-3 max-w-3xl mx-auto lg:mx-0">
          <CatalogHeader title={t("Analizar video", "Analyze video")}>
            <CatalogInfo label={t("Cómo funciona el análisis", "How analysis works")}>
              <p>{t("Hasta 5 videos nuevos al día. Los análisis guardados se reutilizan; algunos enlaces públicos pueden no estar disponibles.", "Up to 5 new videos per day. Saved analyses are reused; some public links may be unavailable.")}</p>
              <p>{t("Las variantes se crean solo cuando las solicitas. Adapta sus detalles a tu producto.", "Variants are created only when you request them. Adapt their details to your product.")}</p>
            </CatalogInfo>
          </CatalogHeader>
          <p className="text-sm text-muted-foreground text-pretty">{t("Pega un enlace de TikTok para consultar su guion y preparar tu versión.", "Paste a TikTok link to review its script and prepare your version.")}</p>

          {/* Histórico colapsable (móvil): arriba, debajo del encabezado */}
          {showHistory && (
            <div className="lg:hidden">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/50 bg-background"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="h-4 w-4 text-primary" />
                  {t(`Tus análisis (${history.length})`, `Your analyses (${history.length})`)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {historyOpen && (
                <div className="mt-2">
                  <ScrollArea className="max-h-[320px]">
                    <div className="pr-1">{HistoryList}</div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Input + boton */}
          <Card className="p-3 border-border/50 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  aria-label={t("Enlace completo del video de TikTok", "Full TikTok video link")}
                  type="url" inputMode="url" autoCapitalize="none" spellCheck={false}
                  placeholder={t(
                    "https://tiktok.com/@usuario/video/...",
                    "https://tiktok.com/@user/video/..."
                  )}
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setErrorMsg(null);
                                  }}
                  onKeyDown={(e) => e.key === "Enter" && !isBusy && handleAnalyze()}
                  disabled={isBusy}
                  className="h-12 pl-10 rounded-xl border-border/60"
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={isBusy}
                className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-sm min-w-[44px]"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {t("Analizar", "Analyze")}
                  </>
                )}
              </Button>
            </div>

            {/* URL invalida */}
            {errorMsg && step !== "error" && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Aviso premium para no pagadores (informativo) */}
            {!hasPaid && step === "idle" && !errorMsg && (
              <p className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3" />
                {t(
                  "Función premium · Desbloquea para analizar videos.",
                  "Premium feature · Unlock to analyze videos."
                )}
              </p>
            )}
          </Card>

          {/* Progreso por paso */}
          {isBusy && (
            <Card className="p-4 border-border/50 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  {currentLabel ? t(currentLabel.es, currentLabel.en) : ""}
                </p>
              </div>
            </Card>
          )}

          {/* Error de procesamiento */}
          {step === "error" && (
            <Card className="p-8 text-center border-border/50 shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-7 w-7 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive mb-1">
                {t("No se pudo analizar", "Could not analyze")}
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">{errorMsg}</p>
              <Button onClick={resetAll} variant="outline" size="sm" className="rounded-xl">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {t("Intentar de nuevo", "Try again")}
              </Button>
            </Card>
          )}

          {/* Resultados */}
          {hasResult && (
            <div className="space-y-4">
              {/* Vista previa + tabs */}
              <Card className="overflow-hidden border-border/50 shadow-sm">
                <div className="flex flex-col lg:flex-row">
                  {/* Thumbnail */}
                  <div className="hidden lg:block lg:w-48 bg-muted/30 p-3 border-r border-border/50 shrink-0">
                    <div className="aspect-[9/16] max-h-[260px] bg-black rounded-xl overflow-hidden flex items-center justify-center mx-auto">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="h-10 w-10 text-white/40" />
                      )}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex-1 min-w-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
                      <div className="px-3 pt-3 pb-2 border-b border-border/50">
                        <TabsList className="grid grid-cols-3 h-11 w-full bg-muted/50 p-1 rounded-lg">
                          <TabsTrigger value="script" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            {t("Guion", "Script")}
                          </TabsTrigger>
                          <TabsTrigger value="why" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                            <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                            {t("Análisis", "Analysis")}
                          </TabsTrigger>
                          <TabsTrigger value="variants" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            {t("Variantes", "Variants")}
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Guion transcrito */}
                      <TabsContent value="script" className="m-0 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">
                            {t("Guion transcrito", "Transcribed script")}
                          </h4>
                          <Button
                            onClick={() => copyText(transcript, "script")}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                          >
                            {copied === "script" ? (
                              <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 mr-1" />
                            )}
                            {copied === "script" ? t("Copiado", "Copied") : t("Copiar", "Copy")}
                          </Button>
                        </div>
                        {/* No media duration has been verified in this view. Preserve the
                            complete transcript without showing model-generated timecodes. */}
                        <ScriptTranscript
                          locale={isEs ? 'es' : 'en'}
                          transcript={transcript || t("No hay voz transcribible. Consulta el análisis visual de este video.", "There is no transcribable speech. Review this video's visual analysis.")}
                        />
                        {hasPaid && !!transcript && <ScriptTranslation text={transcript} locale={isEs ? 'es' : 'en'} />}
                      </TabsContent>

                      {/* Por que funciono */}
                      <TabsContent value="why" className="m-0 p-4">
                        {insights ? <VideoInsights
                          locale={isEs ? 'es' : 'en'}
                          analysis={{ hook: insights.funcionamiento, body: insights.estructura, cta: insights.ctaLocation, visual_observations: insights.angulos, beginner_takeaways: insights.fortalezas }}
                          onExploreVariants={transcript ? () => setActiveTab('variants') : undefined}
                        /> : <p className="py-8 text-center text-sm text-muted-foreground">{t("El análisis aún no está disponible.", "The analysis is not available yet.")}</p>}
                      </TabsContent>

                      {/* Variantes */}
                      <TabsContent value="variants" className="m-0 p-4 space-y-3">
                        <Button onClick={generateVariants} disabled={generatingVariants || !transcript.trim()} className="w-full min-h-11 bg-brand-pink-600 text-white hover:bg-brand-pink-700">
                          {generatingVariants ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                          {generatingVariants ? t("Preparando variantes…", "Preparing variants…") : t("Generar 3 variantes", "Generate 3 variants")}
                        </Button>
                        {variantError && <p role="alert" className="text-sm text-destructive text-pretty">{variantError}</p>}
                        {variants.length > 0 ? (
                          <Tabs defaultValue="v0" className="flex flex-col">
                            <TabsList className="h-8 bg-muted/50 p-1 rounded-lg mb-3 w-fit">
                              {variants.map((_, i) => (
                                <TabsTrigger
                                  key={i}
                                  value={`v${i}`}
                                  className="text-xs rounded-md px-3 data-[state=active]:bg-background"
                                >
                                  {t("Variante", "Variant")} {i + 1}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                            {variants.map((v, i) => (
                              <TabsContent key={i} value={`v${i}`} className="m-0">
                                <ScrollArea className="h-[260px] pr-2">
                                  <div className="space-y-3">
                                    <VariantField label={t("Primeros segundos", "Opening seconds")} text={v.hook} />
                                    <VariantField label={t("Cuerpo", "Body")} text={v.body} />
                                    <VariantField label={t("Invitación a actuar", "Call to action")} text={v.cta} />
                                    {v.strategy_note && (
                                      <p className="text-[11px] text-muted-foreground italic px-1">
                                        💡 {v.strategy_note}
                                      </p>
                                    )}
                                    <Button
                                      onClick={() =>
                                        copyText(`${v.hook}\n\n${v.body}\n\n${v.cta}`, `v${i}`)
                                      }
                                      variant="outline"
                                      size="sm"
                                      className="w-full rounded-xl"
                                    >
                                      {copied === `v${i}` ? (
                                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                                      )}
                                      {t("Copiar variante", "Copy variant")}
                                    </Button>
                                  </div>
                                </ScrollArea>
                              </TabsContent>
                            ))}
                          </Tabs>
                        ) : (
                          <p className="text-sm text-muted-foreground text-pretty">
                            {t("Tu guion ya está listo. Crea variantes cuando quieras probar otra forma de contar la idea.", "Your script is ready. Create variants when you want to try another way to tell the story.")}
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </Card>

              <div className="flex justify-center">
                <Button onClick={resetAll} variant="ghost" size="sm" className="rounded-xl text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  {t("Analizar otro video", "Analyze another video")}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Histórico (desktop): columna lateral */}
        {showHistory && (
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-6">
              <div className="flex items-center gap-2 mb-3 px-1">
                <History className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  {t("Análisis anteriores", "Previous analyses")}
                </h2>
              </div>
              <ScrollArea className="h-[calc(100vh-8rem)] pr-1">
                {HistoryList}
              </ScrollArea>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

const BulletBlock = ({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "default" | "positive" | "warning";
}) => {
  const dot =
    tone === "positive" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const VariantField = ({ label, text }: { label: string; text: string }) => (
  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
    <p className="text-[10px] font-semibold text-primary uppercase mb-1">{label}</p>
    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{text}</p>
  </div>
);

export default Tools;
