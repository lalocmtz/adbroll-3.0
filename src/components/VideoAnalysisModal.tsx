import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Heart, Copy, Play, Pause, Volume2, VolumeX, X, ExternalLink } from "lucide-react";
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

interface ScriptSection {
  type: 'hook' | 'problema' | 'beneficio' | 'demostracion' | 'cta';
  content: string;
  label: string;
}

interface ScriptAnalysis {
  sections: ScriptSection[];
  insights: {
    funcionamiento: string;
    angulos: string[];
    ctaLocation: string;
    estructura: string;
    fortalezas: string[];
    debilidades: string[];
  } | null;
}

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysis>({ sections: [], insights: null });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingVariant, setIsGeneratingVariant] = useState(false);
  const [generatedVariant, setGeneratedVariant] = useState<string>("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkFavorite = async () => {
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
      checkFavorite();
      // Load TikTok embed script
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);
      
      // Auto-analyze script sections when modal opens
      if (video.transcripcion_original || video.guion_ia) {
        analyzeScriptSections();
      }

      return () => {
        const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen, video.tiktok_url]);

  const analyzeScriptSections = async () => {
    const script = video.transcripcion_original || video.guion_ia;
    if (!script) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-script-sections', {
        body: { script, videoTitle: video.descripcion_video }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScriptAnalysis(prev => ({ ...prev, sections: data.sections }));
    } catch (error: any) {
      console.error("Error analyzing script sections:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyzeInsights = async () => {
    const script = video.transcripcion_original || video.guion_ia;
    if (!script) {
      toast({
        title: "No hay guión disponible",
        description: "No se puede analizar sin un guión.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-script-insights', {
        body: { script, videoTitle: video.descripcion_video }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setScriptAnalysis(prev => ({ ...prev, insights: data.insights }));
      
      toast({
        title: "✓ Análisis completado",
        description: "Los insights del guión están listos.",
      });
    } catch (error: any) {
      console.error("Error analyzing insights:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateVariant = async () => {
    const originalScript = video.transcripcion_original || video.guion_ia;
    if (!originalScript) {
      toast({
        title: "No hay guión disponible",
        description: "No se puede generar variantes sin un guión.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingVariant(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script-variants', {
        body: {
          originalScript,
          videoTitle: video.descripcion_video,
          variantType: 'comercial'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedVariant(data.variant);
      toast({
        title: "✓ Variante generada",
        description: "La variante del guión está lista.",
      });
    } catch (error: any) {
      console.error("Error generating variant:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingVariant(false);
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

  const handleCopyScript = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✓ Copiado",
        description: "El guión se copió al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    }
  };

  const getSectionBadgeColor = (type: string) => {
    switch (type) {
      case 'hook': return 'bg-red-500 text-white';
      case 'problema': return 'bg-orange-500 text-white';
      case 'beneficio': return 'bg-green-500 text-white';
      case 'demostracion': return 'bg-blue-500 text-white';
      case 'cta': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getVideoId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video.tiktok_url);
  const script = video.transcripcion_original || video.guion_ia || "No hay guión disponible";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
        {/* Close Button & Top Actions */}
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
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
          {/* Left Side - Video */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold pr-24">{video.descripcion_video}</h2>
            <p className="text-sm text-muted-foreground">@{video.creador}</p>
            
            {/* Video Player */}
            <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden max-w-sm mx-auto">
              {videoId ? (
                <div ref={embedRef} className="w-full h-full">
                  <blockquote
                    className="tiktok-embed"
                    cite={video.tiktok_url}
                    data-video-id={videoId}
                    style={{ maxWidth: '100%', minWidth: '100%' }}
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

          {/* Right Side - Tabs */}
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs defaultValue="script" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="analizar">Analizar</TabsTrigger>
                <TabsTrigger value="variante">Variante IA</TabsTrigger>
              </TabsList>

              {/* Script Tab */}
              <TabsContent value="script" className="flex-1 overflow-y-auto space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold">Transcripción del Guion</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyScript(script)}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copiar
                  </Button>
                </div>

                {isAnalyzing ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse text-primary" />
                    <p className="text-sm text-muted-foreground">Analizando secciones...</p>
                  </div>
                ) : scriptAnalysis.sections.length > 0 ? (
                  <div className="space-y-3">
                    {scriptAnalysis.sections.map((section, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <Badge className={`${getSectionBadgeColor(section.type)} mb-2`}>
                          {section.label}
                        </Badge>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {script}
                    </pre>
                  </div>
                )}
              </TabsContent>

              {/* Analizar Tab */}
              <TabsContent value="analizar" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {!scriptAnalysis.insights ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Analiza el guion para obtener insights
                    </p>
                    <Button
                      onClick={handleAnalyzeInsights}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Analizando..." : "Analizar Guion"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm">¿Qué hace que funcione?</h4>
                      <p className="text-sm text-muted-foreground">{scriptAnalysis.insights.funcionamiento}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm">Ángulos usados</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {scriptAnalysis.insights.angulos.map((angulo, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{angulo}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm">Ubicación del CTA</h4>
                      <p className="text-sm text-muted-foreground">{scriptAnalysis.insights.ctaLocation}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm">Estructura</h4>
                      <p className="text-sm text-muted-foreground">{scriptAnalysis.insights.estructura}</p>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm text-green-600">Fortalezas</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {scriptAnalysis.insights.fortalezas.map((f, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{f}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2 text-sm text-orange-600">Debilidades</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {scriptAnalysis.insights.debilidades.map((d, i) => (
                          <li key={i} className="text-sm text-muted-foreground">{d}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Variante IA Tab */}
              <TabsContent value="variante" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {!generatedVariant ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Genera una variante del guion manteniendo el estilo original
                    </p>
                    <Button
                      onClick={handleGenerateVariant}
                      disabled={isGeneratingVariant}
                      size="lg"
                    >
                      {isGeneratingVariant ? "Generando..." : "Generar Variante"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">Variante Generada</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyScript(generatedVariant)}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-accent/5 border border-accent/10 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                        {generatedVariant}
                      </pre>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleGenerateVariant}
                      disabled={isGeneratingVariant}
                      className="w-full"
                    >
                      Generar otra variante
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="border-t p-4">
          <Button className="w-full" size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Replicar guion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAnalysisModal;
