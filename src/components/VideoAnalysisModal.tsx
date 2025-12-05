import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, X, Check, FileText, BarChart3, Wand2, Loader2 } from "lucide-react";

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
    transcripcion_original?: string | null;
    guion_ia?: string | null;
  };
}

interface Insights {
  hook: string;
  body: string;
  cta: string;
}

interface Variants {
  hooks: {
    similar: string;
    medium: string;
    different: string;
  };
  full_variant: string;
}

interface ModalState {
  loading: boolean;
  loadingStep: string;
  transcript: string;
  insights: Insights | null;
  variants: Variants | null;
}

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [state, setState] = useState<ModalState>({
    loading: false,
    loadingStep: "",
    transcript: "",
    insights: null,
    variants: null,
  });
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const hasStartedAnalysis = useRef(false);
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        loading: false,
        loadingStep: "",
        transcript: "",
        insights: null,
        variants: null,
      });
      hasStartedAnalysis.current = false;
    }
  }, [isOpen]);

  // Load TikTok embed script and start auto-analysis
  useEffect(() => {
    if (isOpen && !hasStartedAnalysis.current) {
      // Load TikTok embed
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      // Start automatic analysis
      hasStartedAnalysis.current = true;
      startAutomaticAnalysis();

      return () => {
        const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen]);

  const startAutomaticAnalysis = async () => {
    setState(prev => ({ ...prev, loading: true, loadingStep: "Extrayendo audio del video…" }));

    try {
      // Step 1: Get transcript
      let transcript = video.transcripcion_original || video.guion_ia || "";

      if (!transcript) {
        setState(prev => ({ ...prev, loadingStep: "Descargando audio de TikTok…" }));
        
        // Try to transcribe via edge function
        const { data: transcribeData, error: transcribeError } = await supabase.functions.invoke('transcribe-video', {
          body: { tiktokUrl: video.tiktok_url }
        });

        if (transcribeError) {
          console.error("Transcription error:", transcribeError);
          setState(prev => ({
            ...prev,
            loading: false,
            loadingStep: "",
            transcript: "⚠️ Error al conectar con el servicio de transcripción. Intenta de nuevo.",
          }));
          return;
        }

        if (transcribeData?.transcription) {
          transcript = transcribeData.transcription;
          setState(prev => ({ ...prev, loadingStep: "Transcripción completada. Analizando…" }));
        } else if (transcribeData?.requiresManualInput || transcribeData?.message) {
          setState(prev => ({
            ...prev,
            loading: false,
            loadingStep: "",
            transcript: `⚠️ ${transcribeData.message || "No se pudo transcribir automáticamente."}`,
          }));
          return;
        }
      }

      if (!transcript) {
        setState(prev => ({
          ...prev,
          loading: false,
          loadingStep: "",
          transcript: "⚠️ No hay transcripción disponible para este video.",
        }));
        return;
      }

      // Update transcript immediately
      setState(prev => ({ ...prev, transcript, loadingStep: "Analizando estructura del guión…" }));

      // Step 2: Analyze script (parallel calls)
      const [insightsResult, variantsResult] = await Promise.all([
        supabase.functions.invoke('analyze-full-script', {
          body: { script: transcript }
        }),
        supabase.functions.invoke('generate-script-variants', {
          body: { 
            originalScript: transcript,
            videoTitle: video.descripcion_video,
            numVariants: 1,
            variantType: "full"
          }
        })
      ]);

      // Process insights
      let insights: Insights | null = null;
      if (insightsResult.data && !insightsResult.error) {
        const data = insightsResult.data;
        insights = {
          hook: data.analysis?.hook || data.hook || "",
          body: data.analysis?.body || data.body || "",
          cta: data.analysis?.cta || data.cta || "",
        };
      }

      // Process variants
      let variants: Variants | null = null;
      if (insightsResult.data && !insightsResult.error) {
        const data = insightsResult.data;
        variants = {
          hooks: {
            similar: data.hooks?.similar || "",
            medium: data.hooks?.medium || "",
            different: data.hooks?.different || "",
          },
          full_variant: data.full_variant || variantsResult.data?.variant || "",
        };
      }

      setState(prev => ({
        ...prev,
        loading: false,
        loadingStep: "",
        insights,
        variants,
      }));

      toast({
        title: "✓ Análisis completado",
        description: "El guión ha sido analizado correctamente.",
      });

    } catch (error: any) {
      console.error("Analysis error:", error);
      setState(prev => ({
        ...prev,
        loading: false,
        loadingStep: "",
      }));
      toast({
        title: "Error",
        description: error.message || "Error al analizar el video",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({
        title: "✓ Copiado",
        description: "Texto copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    }
  };

  const getVideoId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video.tiktok_url);

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => handleCopy(text, section)}
      className="h-7 w-7 p-0"
    >
      {copiedSection === section ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden bg-background border-border">
        {/* Close Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="absolute top-4 right-4 z-50 h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Loading Overlay */}
        {state.loading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">{state.loadingStep}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
          {/* Left Side - Video */}
          <div className="p-6 border-r border-border flex flex-col">
            <p className="text-sm text-muted-foreground mb-4">@{video.creador}</p>
            
            <div className="flex-1 flex items-start justify-center">
              <div className="relative w-full max-w-[280px]">
                <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden">
                  {videoId ? (
                    <div ref={embedRef} className="w-full h-full">
                      <blockquote
                        className="tiktok-embed"
                        cite={video.tiktok_url}
                        data-video-id={videoId}
                        style={{ maxWidth: '100%', minWidth: '100%', margin: 0 }}
                      >
                        <section></section>
                      </blockquote>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <p className="text-sm text-muted-foreground">Cargando video...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Tabs */}
          <div className="p-6 flex flex-col h-[80vh] overflow-hidden">
            <Tabs defaultValue="script" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="script" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  Script
                </TabsTrigger>
                <TabsTrigger value="analysis" className="gap-1.5 text-xs">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Análisis
                </TabsTrigger>
                <TabsTrigger value="variants" className="gap-1.5 text-xs">
                  <Wand2 className="h-3.5 w-3.5" />
                  Variantes IA
                </TabsTrigger>
              </TabsList>

              {/* TAB 1 - Script */}
              <TabsContent value="script" className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Transcripción</h3>
                    {state.transcript && !state.transcript.startsWith("⚠️") && (
                      <CopyButton text={state.transcript} section="transcript" />
                    )}
                  </div>
                  
                  {state.transcript ? (
                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                        {state.transcript}
                      </pre>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Cargando transcripción...</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 2 - Análisis */}
              <TabsContent value="analysis" className="flex-1 overflow-y-auto">
                {!state.insights ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Generando análisis...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Hook */}
                    <div className="border border-red-200 dark:border-red-900/30 rounded-lg p-4 bg-red-50/50 dark:bg-red-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-red-700 dark:text-red-400">🎯 Hook</h4>
                        {state.insights.hook && <CopyButton text={state.insights.hook} section="hook" />}
                      </div>
                      <p className="text-sm">{state.insights.hook || "No detectado"}</p>
                    </div>

                    {/* Body */}
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-muted-foreground">📝 Cuerpo</h4>
                        {state.insights.body && <CopyButton text={state.insights.body} section="body" />}
                      </div>
                      <p className="text-sm">{state.insights.body || "No detectado"}</p>
                    </div>

                    {/* CTA */}
                    <div className="border border-green-200 dark:border-green-900/30 rounded-lg p-4 bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-400">🛒 CTA</h4>
                        {state.insights.cta && <CopyButton text={state.insights.cta} section="cta" />}
                      </div>
                      <p className="text-sm">{state.insights.cta || "No detectado"}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3 - Variantes IA */}
              <TabsContent value="variants" className="flex-1 overflow-y-auto">
                {!state.variants ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Generando variantes...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Hook 1 - Similar */}
                    <div className="border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">Hook 1 — Similar</h4>
                        {state.variants.hooks.similar && <CopyButton text={state.variants.hooks.similar} section="hook1" />}
                      </div>
                      <p className="text-sm">{state.variants.hooks.similar || "No generado"}</p>
                    </div>

                    {/* Hook 2 - Intermedio */}
                    <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">Hook 2 — Intermedio</h4>
                        {state.variants.hooks.medium && <CopyButton text={state.variants.hooks.medium} section="hook2" />}
                      </div>
                      <p className="text-sm">{state.variants.hooks.medium || "No generado"}</p>
                    </div>

                    {/* Hook 3 - Diferente */}
                    <div className="border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400">Hook 3 — Diferente</h4>
                        {state.variants.hooks.different && <CopyButton text={state.variants.hooks.different} section="hook3" />}
                      </div>
                      <p className="text-sm">{state.variants.hooks.different || "No generado"}</p>
                    </div>

                    {/* Full Variant */}
                    <div className="border border-border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium">✨ Variante Completa</h4>
                        {state.variants.full_variant && <CopyButton text={state.variants.full_variant} section="fullvariant" />}
                      </div>
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {state.variants.full_variant || "No generada"}
                      </pre>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAnalysisModal;
