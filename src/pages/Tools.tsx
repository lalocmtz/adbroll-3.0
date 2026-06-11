import { useState, useEffect, useCallback } from "react";
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

const DAILY_LIMIT = 5;
const HISTORY_LIMIT = 20;

// Acepta los formatos comunes de TikTok (link normal, vm.tiktok, /t/).
const isValidTikTokUrl = (url: string): boolean => {
  const trimmed = url.trim();
  return /tiktok\.com/i.test(trimmed) || /vm\.tiktok/i.test(trimmed);
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

// Bloque del guión segmentado por segundos (lo emite transcribe-assemblyai).
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
  transcribe: { es: "Transcribiendo el guión…", en: "Transcribing the script…" },
  analyze: { es: "Analizando por qué funcionó…", en: "Analyzing why it worked…" },
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

  const [videoUrl, setVideoUrl] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

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
  const hasResult = step === "done" && !!transcript;

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
    if (isLoggedIn) loadHistory();
  }, [isLoggedIn, loadHistory]);

  const resetAll = () => {
    setStep("idle");
    setErrorMsg(null);
    setLimitReached(false);
    setTranscript("");
    setSegments([]);
    setInsights(null);
    setVariants([]);
    setThumbnail(null);
    setActiveTab("script");
    setActiveHistoryId(null);
  };

  // Re-renderiza un análisis guardado SIN volver a llamar las APIs.
  const openFromHistory = (item: HistoryItem) => {
    const r = item.result || ({} as AnalysisResult);
    setStep("done");
    setErrorMsg(null);
    setLimitReached(false);
    setVideoUrl(item.video_url);
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
      .then((data) => data?.thumbnail_url && setThumbnail(data.thumbnail_url))
      .catch(() => {});
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: t("✓ Copiado", "✓ Copied") });
  };

  // Verifica el limite diario contando los analisis de hoy del usuario.
  const checkDailyLimit = async (userId: string): Promise<boolean> => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("tool_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfToday.toISOString());

    if (error) {
      console.error("No se pudo verificar el limite diario:", error);
      return true; // No bloqueamos si falla la verificacion.
    }
    return (count ?? 0) < DAILY_LIMIT;
  };

  const handleAnalyze = async () => {
    setErrorMsg(null);
    setLimitReached(false);
    setActiveHistoryId(null);

    if (!isValidTikTokUrl(videoUrl)) {
      setErrorMsg(t("Ingresa un enlace válido de TikTok.", "Enter a valid TikTok link."));
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

    // Identificar usuario y verificar limite diario.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/unlock");
      return;
    }

    const underLimit = await checkDailyLimit(user.id);
    if (!underLimit) {
      setLimitReached(true);
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
      .then((data) => data?.thumbnail_url && setThumbnail(data.thumbnail_url))
      .catch(() => {});

    try {
      // PASO 1 + 2: descargar/transcribir.
      // transcribe-assemblyai acepta la URL cruda de TikTok: internamente extrae
      // el MP4 (tikwm/savetik/etc.) y lo transcribe, sin requerir un registro en
      // la tabla videos. Por eso no insertamos un video temporal.
      setStep("download");
      // Pequena pausa visual para que se vea el paso de descarga.
      await new Promise((r) => setTimeout(r, 400));
      setStep("transcribe");

      const { data: trData, error: trError } = await supabase.functions.invoke(
        "transcribe-assemblyai",
        { body: { videoUrl: url } }
      );

      if (trError) throw new Error(trError.message || "transcribe_failed");

      if (trData?.error) {
        if (trData.quotaExceeded) {
          throw new Error(
            t(
              "La cuota del proveedor de transcripción se agotó. Intenta más tarde.",
              "The transcription provider quota ran out. Try again later."
            )
          );
        }
        throw new Error(trData.error);
      }

      const tx: string = trData?.transcript?.trim() || "";
      if (!tx) {
        throw new Error(
          t(
            "No se pudo transcribir este video. Puede ser privado o no tener audio.",
            "Could not transcribe this video. It may be private or have no audio."
          )
        );
      }
      setTranscript(tx);

      // Guión segmentado por segundos (aditivo; puede venir vacío o null).
      const segs: Segment[] = Array.isArray(trData?.segments) ? trData.segments : [];
      setSegments(segs);

      // PASO 3: analizar por que funciono.
      setStep("analyze");
      const { data: inData } = await supabase.functions.invoke(
        "analyze-script-insights",
        { body: { script: tx, videoTitle: "Video de TikTok" } }
      );
      if (inData?.insights) setInsights(inData.insights as Insights);

      // PASO 4: generar 3 variantes.
      setStep("variants");
      const { data: vData } = await supabase.functions.invoke(
        "generate-script-variants",
        { body: { transcript: tx, variantCount: 3, changeLevel: "medium" } }
      );
      const vList: Variant[] = vData?.variants || [];
      setVariants(vList);

      // Registrar el analisis (cuenta para el limite diario + historial).
      const savedResult: AnalysisResult = {
        transcript: tx,
        segments: segs,
        insights: (inData?.insights as Insights) ?? null,
        variants: vList,
      };
      const { data: inserted } = await supabase
        .from("tool_analyses")
        .insert({
          user_id: user.id,
          video_url: url,
          result: savedResult as unknown as Json,
        })
        .select("id, video_url, created_at, result")
        .single();

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
      console.error("Analyze error:", err);
      setStep("error");
      setErrorMsg(
        err?.message ||
          t(
            "No fue posible analizar el video. Intenta con otro link.",
            "Could not analyze the video. Try another link."
          )
      );
    }
  };

  const currentLabel = isBusy ? PROGRESS_LABELS[step] : null;
  const progressPct =
    step === "download" ? 15 :
    step === "transcribe" ? 40 :
    step === "analyze" ? 65 :
    step === "variants" ? 90 : 0;

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
    <div className="pt-6 pb-10 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="lg:flex lg:gap-6">
        {/* Columna principal */}
        <div className="flex-1 min-w-0 space-y-6 max-w-3xl mx-auto lg:mx-0">
          {/* Encabezado */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-1">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t("Analizar video", "Analyze video")}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t(
                "Pega cualquier TikTok y descubre por qué vende: guión, análisis y 3 variantes listas para grabar.",
                "Paste any TikTok and discover why it sells: script, breakdown and 3 ready-to-shoot variants."
              )}
            </p>
          </div>

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
          <Card className="p-4 md:p-5 border-border/50 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder={t(
                    "https://tiktok.com/@usuario/video/...",
                    "https://tiktok.com/@user/video/..."
                  )}
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setErrorMsg(null);
                    setLimitReached(false);
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

            {/* Limite diario */}
            {limitReached && (
              <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  {t(
                    `Llegaste a tu límite diario de ${DAILY_LIMIT} análisis. Vuelve mañana para seguir analizando videos.`,
                    `You reached your daily limit of ${DAILY_LIMIT} analyses. Come back tomorrow to keep analyzing videos.`
                  )}
                </span>
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
            <Card className="p-6 border-border/50 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                <p className="text-sm font-medium text-foreground">
                  {currentLabel ? t(currentLabel.es, currentLabel.en) : ""}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3 text-[10px] text-muted-foreground">
                {(["download", "transcribe", "analyze", "variants"] as const).map((s) => (
                  <span
                    key={s}
                    className={
                      progressPct >=
                      (s === "download" ? 15 : s === "transcribe" ? 40 : s === "analyze" ? 65 : 90)
                        ? "text-primary font-medium"
                        : ""
                    }
                  >
                    {t(PROGRESS_LABELS[s].es, PROGRESS_LABELS[s].en).replace("…", "")}
                  </span>
                ))}
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
                  <div className="lg:w-60 bg-muted/30 p-4 border-b lg:border-b-0 lg:border-r border-border/50 shrink-0">
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
                      <div className="px-4 pt-3 border-b border-border/50">
                        <TabsList className="h-9 bg-muted/50 p-1 rounded-lg">
                          <TabsTrigger value="script" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            {t("Guión", "Script")}
                          </TabsTrigger>
                          <TabsTrigger value="why" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                            <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                            {t("Por qué funcionó", "Why it worked")}
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
                            {segments.length > 0
                              ? t("Guión por segundos", "Script by seconds")
                              : t("Guión transcrito", "Transcribed script")}
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
                        <ScrollArea className="h-[280px] rounded-xl bg-muted/30 border border-border/50">
                          {segments.length > 0 ? (
                            // Timeline segmentada: "0:00–0:04 texto…"
                            <ul className="p-3 space-y-2">
                              {segments.map((seg, i) => (
                                <li
                                  key={i}
                                  className="flex gap-3 p-2 rounded-lg bg-background/60 border border-border/40"
                                >
                                  <span className="shrink-0 text-[11px] font-semibold text-primary tabular-nums mt-0.5 whitespace-nowrap">
                                    {msToClock(seg.start_ms)}–{msToClock(seg.end_ms)}
                                  </span>
                                  <span className="text-sm text-foreground/90 leading-relaxed">
                                    {seg.text}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="p-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                              {transcript}
                            </p>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      {/* Por que funciono */}
                      <TabsContent value="why" className="m-0 p-4">
                        <ScrollArea className="h-[316px] pr-2">
                          {insights ? (
                            <div className="space-y-4">
                              {insights.funcionamiento && (
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                                  <p className="text-xs font-semibold text-primary mb-1">
                                    {t("Por qué funcionó", "Why it worked")}
                                  </p>
                                  <p className="text-sm text-foreground/90 leading-relaxed">
                                    {insights.funcionamiento}
                                  </p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2">
                                {insights.estructura && (
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      {t("Estructura", "Structure")}
                                    </p>
                                    <p className="text-xs text-foreground/90">{insights.estructura}</p>
                                  </div>
                                )}
                                {insights.ctaLocation && (
                                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      {t("CTA", "CTA")}
                                    </p>
                                    <p className="text-xs text-foreground/90">{insights.ctaLocation}</p>
                                  </div>
                                )}
                              </div>

                              {insights.angulos && insights.angulos.length > 0 && (
                                <BulletBlock
                                  title={t("Ángulos / ganchos", "Angles / hooks")}
                                  items={insights.angulos}
                                  tone="default"
                                />
                              )}
                              {insights.fortalezas && insights.fortalezas.length > 0 && (
                                <BulletBlock
                                  title={t("Fortalezas", "Strengths")}
                                  items={insights.fortalezas}
                                  tone="positive"
                                />
                              )}
                              {insights.debilidades && insights.debilidades.length > 0 && (
                                <BulletBlock
                                  title={t("Qué mejorar", "What to improve")}
                                  items={insights.debilidades}
                                  tone="warning"
                                />
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              {t("No se pudo generar el análisis.", "Could not generate the analysis.")}
                            </p>
                          )}
                        </ScrollArea>
                      </TabsContent>

                      {/* Variantes */}
                      <TabsContent value="variants" className="m-0 p-4">
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
                                    <VariantField label="Hook" text={v.hook} />
                                    <VariantField label={t("Cuerpo", "Body")} text={v.body} />
                                    <VariantField label="CTA" text={v.cta} />
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
                          <p className="text-sm text-muted-foreground text-center py-8">
                            {t("No se pudieron generar variantes.", "Could not generate variants.")}
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
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
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
    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">{label}</p>
    <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{text}</p>
  </div>
);

export default Tools;
