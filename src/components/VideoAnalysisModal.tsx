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
  };
  transcript: string;
}

interface Section {
  type: string;
  label: string;
  content: string;
}

interface Variants {
  hooks: {
    similar: string;
    medium: string;
    different: string;
  };
  full_variant: string;
}

const VideoAnalysisModal = ({ isOpen, onClose, video, transcript }: VideoAnalysisModalProps) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [variants, setVariants] = useState<Variants | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [variantsGenerated, setVariantsGenerated] = useState(false);
  const embedRef = useRef<HTMLDivElement>(null);
  const hasStartedAnalysis = useRef(false);
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSections([]);
      setVariants(null);
      setLoadingAnalysis(false);
      setLoadingVariants(false);
      setVariantsGenerated(false);
      hasStartedAnalysis.current = false;
    }
  }, [isOpen]);

  // Auto-trigger analysis when modal opens with transcript
  useEffect(() => {
    if (isOpen && transcript && !hasStartedAnalysis.current) {
      hasStartedAnalysis.current = true;
      
      // Load TikTok embed
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      // Auto-analyze
      analyzeScript();
    }
  }, [isOpen, transcript]);

  const analyzeScript = async () => {
    if (!transcript) return;
    
    setLoadingAnalysis(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-script-sections", {
        body: { script: transcript, videoTitle: video.descripcion_video }
      });

      if (error) {
        console.error("Analysis error:", error);
        toast({
          title: "Error",
          description: "No se pudo analizar el guión",
          variant: "destructive",
        });
        return;
      }

      if (data?.sections) {
        setSections(data.sections);
      }
    } catch (err: any) {
      console.error("Analysis error:", err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const generateVariants = async () => {
    if (!transcript || variantsGenerated) return;
    
    setLoadingVariants(true);

    try {
      // Generate 3 hooks in parallel
      const [similarResult, mediumResult, differentResult] = await Promise.all([
        supabase.functions.invoke("generate-script-variants", {
          body: { 
            originalScript: transcript,
            videoTitle: video.descripcion_video,
            variantType: "similar"
          }
        }),
        supabase.functions.invoke("generate-script-variants", {
          body: { 
            originalScript: transcript,
            videoTitle: video.descripcion_video,
            variantType: "emocional"
          }
        }),
        supabase.functions.invoke("generate-script-variants", {
          body: { 
            originalScript: transcript,
            videoTitle: video.descripcion_video,
            variantType: "comercial"
          }
        }),
      ]);

      // Extract hooks from each variant
      const extractHook = (variant: string): string => {
        const hookMatch = variant?.match(/HOOK:\s*([\s\S]*?)(?=CUERPO:|$)/i);
        return hookMatch ? hookMatch[1].trim() : variant?.split('\n').slice(0, 3).join('\n') || "";
      };

      setVariants({
        hooks: {
          similar: extractHook(similarResult.data?.variant || ""),
          medium: extractHook(mediumResult.data?.variant || ""),
          different: extractHook(differentResult.data?.variant || ""),
        },
        full_variant: differentResult.data?.variant || "",
      });

      setVariantsGenerated(true);

      toast({
        title: "✓ Variantes generadas",
        description: "3 hooks y guión completo listos",
      });
    } catch (err: any) {
      console.error("Variants error:", err);
      toast({
        title: "Error",
        description: "No se pudieron generar las variantes",
        variant: "destructive",
      });
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
      toast({ title: "✓ Copiado" });
    } catch (error) {
      toast({ title: "Error al copiar", variant: "destructive" });
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

  const getSectionColor = (type: string) => {
    switch (type) {
      case "hook":
        return "border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20";
      case "problema":
        return "border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-950/20";
      case "beneficio":
        return "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20";
      case "demostracion":
        return "border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20";
      case "cta":
        return "border-purple-200 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-950/20";
      default:
        return "border-border bg-muted/30";
    }
  };

  const getSectionEmoji = (type: string) => {
    switch (type) {
      case "hook": return "🎯";
      case "problema": return "😰";
      case "beneficio": return "✨";
      case "demostracion": return "📱";
      case "cta": return "🛒";
      default: return "📝";
    }
  };

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
                <TabsTrigger value="variants" className="gap-1.5 text-xs" onClick={generateVariants}>
                  <Wand2 className="h-3.5 w-3.5" />
                  Variantes IA
                </TabsTrigger>
              </TabsList>

              {/* TAB 1 - Script */}
              <TabsContent value="script" className="flex-1 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Transcripción del Video</h3>
                    <CopyButton text={transcript} section="transcript" />
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg border border-border">
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                      {transcript}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2 - Análisis */}
              <TabsContent value="analysis" className="flex-1 overflow-y-auto">
                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Analizando estructura del guión...</p>
                  </div>
                ) : sections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Cargando análisis...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sections.map((section, index) => (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-4 ${getSectionColor(section.type)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium">
                            {getSectionEmoji(section.type)} {section.label}
                          </h4>
                          <CopyButton text={section.content} section={`section-${index}`} />
                        </div>
                        <p className="text-sm">{section.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3 - Variantes IA */}
              <TabsContent value="variants" className="flex-1 overflow-y-auto">
                {loadingVariants ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Generando variantes con IA...</p>
                  </div>
                ) : !variants ? (
                  <div className="text-center py-12">
                    <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Haz clic en esta pestaña para generar variantes
                    </p>
                    <Button onClick={generateVariants} disabled={loadingVariants}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generar Variantes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Hook 1 - Similar */}
                    <div className="border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          🎯 Hook 1 — Similar
                        </h4>
                        {variants.hooks.similar && (
                          <CopyButton text={variants.hooks.similar} section="hook1" />
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{variants.hooks.similar || "No generado"}</p>
                    </div>

                    {/* Hook 2 - Emocional */}
                    <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          💝 Hook 2 — Emocional
                        </h4>
                        {variants.hooks.medium && (
                          <CopyButton text={variants.hooks.medium} section="hook2" />
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{variants.hooks.medium || "No generado"}</p>
                    </div>

                    {/* Hook 3 - Comercial */}
                    <div className="border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400">
                          💰 Hook 3 — Comercial
                        </h4>
                        {variants.hooks.different && (
                          <CopyButton text={variants.hooks.different} section="hook3" />
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{variants.hooks.different || "No generado"}</p>
                    </div>

                    {/* Full Variant */}
                    <div className="border border-border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium">✨ Guión Completo Alternativo</h4>
                        {variants.full_variant && (
                          <CopyButton text={variants.full_variant} section="fullvariant" />
                        )}
                      </div>
                      <pre className="text-sm whitespace-pre-wrap font-mono">
                        {variants.full_variant || "No generado"}
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
