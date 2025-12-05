import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Heart, Copy, X, ExternalLink, DollarSign, ShoppingCart, Eye, Percent, Check, FileText, BarChart3, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
    ingresos_mxn: number;
    ventas: number;
    visualizaciones: number;
    duracion: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
    producto_nombre: string | null;
    producto_url: string | null;
    product_id?: string | null;
  };
}

interface AnalysisResult {
  transcript: string;
  analysis: {
    hook: string;
    body: string;
    cta: string;
  };
  hooks: {
    similar: string;
    medium: string;
    different: string;
  };
  full_variant: string;
}

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [manualTranscription, setManualTranscription] = useState<string>("");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const initModal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("favorites_videos")
          .select("id")
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url)
          .maybeSingle();
        setIsFavorite(!!data);
      }
    };

    if (isOpen) {
      initModal();
      setAnalysisResult(null);
      setManualTranscription("");
      
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen, video.tiktok_url]);

  const handleAnalyze = async () => {
    const scriptToAnalyze = manualTranscription || video.transcripcion_original || video.guion_ia;
    
    if (!scriptToAnalyze) {
      toast({
        title: "No hay guión disponible",
        description: "Ingresa la transcripción del video manualmente.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-full-script', {
        body: { script: scriptToAnalyze }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysisResult(data);
      
      toast({
        title: "✓ Análisis completado",
        description: "El guión ha sido analizado correctamente.",
      });
    } catch (error: any) {
      console.error("Error in analysis:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
      });
      navigate("/login");
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from("favorites_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url);

        setIsFavorite(false);
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { data: videoData } = await supabase
          .from("daily_feed")
          .select("*")
          .eq("tiktok_url", video.tiktok_url)
          .single();

        await supabase
          .from("favorites_videos")
          .insert({
            user_id: user.id,
            video_url: video.tiktok_url,
            video_data: videoData,
          });

        setIsFavorite(true);
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
  const existingScript = video.transcripcion_original || video.guion_ia || "";

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const CopyButton = ({ text, section }: { text: string; section: string }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => handleCopy(text, section)}
      className="h-8"
    >
      {copiedSection === section ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden bg-background">
        {/* Top Actions */}
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleFavorite}
            className={`h-8 w-8 ${isFavorite ? "text-red-500" : ""}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.open(video.tiktok_url, '_blank')}
            className="h-8 w-8"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
          {/* Left Side - Video & Metrics */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">@{video.creador}</p>
            
            {/* Video Player */}
            <div className="relative w-full max-w-[300px] mx-auto">
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

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Ingresos</span>
                </div>
                <p className="text-sm font-bold text-green-600">{formatCurrency(video.ingresos_mxn)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">Ventas</span>
                </div>
                <p className="text-sm font-bold">{formatNumber(video.ventas)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">Vistas</span>
                </div>
                <p className="text-sm font-bold">{formatNumber(video.visualizaciones)}</p>
              </div>
              <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-2 mb-1">
                  <Percent className="h-4 w-4 text-accent" />
                  <span className="text-xs text-muted-foreground">Comisión Est.</span>
                </div>
                <p className="text-sm font-bold text-accent">{formatCurrency(video.ingresos_mxn * 0.06)}</p>
              </div>
            </div>

            {/* Transcription Input (if no existing script) */}
            {!existingScript && !analysisResult && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Pega la transcripción del video para analizarlo:
                </p>
                <Textarea
                  placeholder="Pega aquí la transcripción del video..."
                  value={manualTranscription}
                  onChange={(e) => setManualTranscription(e.target.value)}
                  className="min-h-[120px] text-sm"
                />
              </div>
            )}

            {/* Analyze Button */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!existingScript && !manualTranscription)}
              size="lg"
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                  Analizando con GPT-4o-mini...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizar guión y replicar
                </>
              )}
            </Button>
          </div>

          {/* Right Side - Tabs */}
          <div className="flex flex-col h-full">
            <Tabs defaultValue="script" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="script" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Script
                </TabsTrigger>
                <TabsTrigger value="analysis" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Análisis
                </TabsTrigger>
                <TabsTrigger value="variants" className="gap-2">
                  <Wand2 className="h-4 w-4" />
                  Variantes IA
                </TabsTrigger>
              </TabsList>

              {/* TAB 1 - Script */}
              <TabsContent value="script" className="flex-1 overflow-y-auto mt-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Transcripción del Video</h3>
                    {(analysisResult?.transcript || existingScript) && (
                      <CopyButton 
                        text={analysisResult?.transcript || existingScript} 
                        section="transcript" 
                      />
                    )}
                  </div>
                  
                  {analysisResult?.transcript ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {analysisResult.transcript}
                      </p>
                    </div>
                  ) : existingScript ? (
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {existingScript}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {manualTranscription 
                          ? "Presiona 'Analizar guión y replicar' para procesar"
                          : "Ingresa la transcripción del video para comenzar"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 2 - Análisis */}
              <TabsContent value="analysis" className="flex-1 overflow-y-auto mt-4">
                {!analysisResult ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Analiza el guión para ver la segmentación</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hook */}
                    <div className="border rounded-lg p-4 bg-red-500/5 border-red-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-red-600">🎯 Hook</h4>
                        <CopyButton text={analysisResult.analysis.hook} section="hook" />
                      </div>
                      <p className="text-sm">{analysisResult.analysis.hook}</p>
                    </div>

                    {/* Body */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-muted-foreground">📝 Cuerpo</h4>
                        <CopyButton text={analysisResult.analysis.body} section="body" />
                      </div>
                      <p className="text-sm">{analysisResult.analysis.body}</p>
                    </div>

                    {/* CTA */}
                    <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-green-600">🛒 CTA</h4>
                        <CopyButton text={analysisResult.analysis.cta} section="cta" />
                      </div>
                      <p className="text-sm">{analysisResult.analysis.cta}</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3 - Variantes IA */}
              <TabsContent value="variants" className="flex-1 overflow-y-auto mt-4">
                {!analysisResult ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Analiza el guión para generar variantes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Hook 1 - Similar */}
                    <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-blue-600">Hook 1 — Similar</h4>
                        <CopyButton text={analysisResult.hooks.similar} section="hook1" />
                      </div>
                      <p className="text-sm">{analysisResult.hooks.similar}</p>
                    </div>

                    {/* Hook 2 - Intermedio */}
                    <div className="border rounded-lg p-4 bg-amber-500/5 border-amber-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-amber-600">Hook 2 — Intermedio</h4>
                        <CopyButton text={analysisResult.hooks.medium} section="hook2" />
                      </div>
                      <p className="text-sm">{analysisResult.hooks.medium}</p>
                    </div>

                    {/* Hook 3 - Diferente */}
                    <div className="border rounded-lg p-4 bg-purple-500/5 border-purple-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-purple-600">Hook 3 — Diferente</h4>
                        <CopyButton text={analysisResult.hooks.different} section="hook3" />
                      </div>
                      <p className="text-sm">{analysisResult.hooks.different}</p>
                    </div>

                    {/* Full Variant */}
                    <div className="border-2 rounded-lg p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">✨ Variación del Guión Completo</h4>
                        <CopyButton text={analysisResult.full_variant} section="fullVariant" />
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{analysisResult.full_variant}</p>
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
