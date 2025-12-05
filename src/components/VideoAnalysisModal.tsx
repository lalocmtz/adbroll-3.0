import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, X, Check, FileText, BarChart3, Wand2, Loader2, AlertCircle, RefreshCw, Heart, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
  };
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

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [transcript, setTranscript] = useState<string>("");
  const [sections, setSections] = useState<Section[]>([]);
  const [variants, setVariants] = useState<Variants | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [savedScripts, setSavedScripts] = useState<Set<string>>(new Set());
  const [savingScript, setSavingScript] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(true);
  const embedRef = useRef<HTMLDivElement>(null);
  const hasStartedProcess = useRef(false);
  const { toast } = useToast();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTranscript("");
      setSections([]);
      setVariants(null);
      setLoadingTranscript(false);
      setLoadingAnalysis(false);
      setLoadingVariants(false);
      setTranscriptError(null);
      setSavedScripts(new Set());
      setGeneratorOpen(true);
      hasStartedProcess.current = false;
    }
  }, [isOpen]);

  // Auto-start transcription when modal opens
  useEffect(() => {
    if (isOpen && !hasStartedProcess.current) {
      hasStartedProcess.current = true;
      
      // Load TikTok embed
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      // Start automatic transcription
      transcribeVideo();
    }
  }, [isOpen]);

  const saveScriptToFavorites = async (content: string, variantType: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ 
          title: "Inicia sesión", 
          description: "Debes iniciar sesión para guardar guiones",
          variant: "destructive"
        });
        return;
      }

      setSavingScript(variantType);
      
      // Generate a unique script_id
      const scriptId = crypto.randomUUID();
      
      const { error } = await supabase.from("favorites_scripts").insert({
        user_id: user.id,
        script_id: scriptId,
        script_data: {
          content,
          video_title: video.descripcion_video,
          variant_type: variantType,
          created_at: new Date().toISOString()
        }
      });

      if (error) throw error;

      setSavedScripts(prev => new Set([...prev, variantType]));
      toast({ title: "✓ Guión guardado en favoritos" });
    } catch (error: any) {
      console.error("Error saving script:", error);
      toast({ 
        title: "Error", 
        description: "No se pudo guardar el guión",
        variant: "destructive"
      });
    } finally {
      setSavingScript(null);
    }
  };

  const transcribeVideo = async () => {
    setLoadingTranscript(true);
    setTranscriptError(null);

    try {
      console.log('Starting transcription for:', video.tiktok_url);
      
      const { data, error } = await supabase.functions.invoke("transcribe-assemblyai", {
        body: { 
          videoUrl: video.tiktok_url,
          videoId: video.id
        }
      });

      if (error) {
        console.error("Transcription error:", error);
        setTranscriptError("Error al transcribir el video. Intenta nuevamente.");
        return;
      }

      if (data?.transcript) {
        setTranscript(data.transcript);
        // Auto-trigger analysis
        analyzeScript(data.transcript);
      } else {
        setTranscriptError("No se pudo obtener la transcripción del video.");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setTranscriptError(err.message || "Error desconocido al transcribir.");
    } finally {
      setLoadingTranscript(false);
    }
  };

  const analyzeScript = async (scriptText: string) => {
    if (!scriptText) return;
    
    setLoadingAnalysis(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-script-sections", {
        body: { script: scriptText, videoTitle: video.descripcion_video }
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
    if (!transcript || variants) return;
    
    setLoadingVariants(true);

    try {
      // Generate 5 variants using a single call
      const { data, error } = await supabase.functions.invoke("generate-script-variants", {
        body: { 
          originalScript: transcript,
          videoTitle: video.descripcion_video,
          generateMultiple: true
        }
      });

      if (error) {
        console.error("Variants error:", error);
        toast({
          title: "Error",
          description: "No se pudieron generar las variantes",
          variant: "destructive",
        });
        return;
      }

      if (data?.variants) {
        setVariants({
          hooks: {
            similar: data.variants[0] || "",
            medium: data.variants[1] || "",
            different: data.variants[2] || "",
          },
          full_variant: data.variants.slice(3).join('\n\n---\n\n') || data.variants[0] || "",
        });
      } else if (data?.variant) {
        // Fallback for single variant response
        setVariants({
          hooks: {
            similar: data.variant,
            medium: "",
            different: "",
          },
          full_variant: data.variant,
        });
      }

      // Auto-collapse generator section
      setGeneratorOpen(false);
      
      toast({
        title: "✓ Variantes generadas",
        description: "5 variantes listas para copiar",
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

  const SaveButton = ({ text, variantType }: { text: string; variantType: string }) => (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => saveScriptToFavorites(text, variantType)}
      disabled={savedScripts.has(variantType) || savingScript === variantType}
      className="h-7 w-7 p-0"
    >
      {savedScripts.has(variantType) ? (
        <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
      ) : savingScript === variantType ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
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
                {loadingTranscript ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Transcribiendo audio del video…</p>
                    <p className="text-xs text-muted-foreground/70">Esto puede tomar hasta 60 segundos</p>
                  </div>
                ) : transcriptError ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                    <p className="text-sm text-destructive text-center">{transcriptError}</p>
                    <Button 
                      onClick={() => {
                        hasStartedProcess.current = false;
                        transcribeVideo();
                      }}
                      variant="outline"
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Intentar nuevamente
                    </Button>
                  </div>
                ) : transcript ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Transcripción del Video</h3>
                      <div className="flex items-center gap-1">
                        <SaveButton text={transcript} variantType="Transcripción Original" />
                        <CopyButton text={transcript} section="transcript" />
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg border border-border">
                      <pre className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                        {transcript}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <FileText className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Esperando transcripción...</p>
                  </div>
                )}
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
                    <p className="text-sm">
                      {loadingTranscript ? "Esperando transcripción..." : "Cargando análisis..."}
                    </p>
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
                ) : (
                  <div className="space-y-4">
                    {/* Collapsible Generator Section */}
                    <Collapsible open={generatorOpen} onOpenChange={setGeneratorOpen}>
                      <div className="border border-primary/20 rounded-lg bg-primary/5">
                        <CollapsibleTrigger asChild>
                          <button className="w-full p-4 flex items-center justify-between hover:bg-primary/10 transition-colors rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Wand2 className="h-5 w-5 text-primary" />
                              </div>
                              <div className="text-left">
                                <h4 className="text-sm font-semibold">Generador de Variantes IA</h4>
                                <p className="text-xs text-muted-foreground">
                                  {variants ? "Variantes generadas • Clic para expandir" : "Crea guiones optimizados basados en este video"}
                                </p>
                              </div>
                            </div>
                            {generatorOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4">
                            {!transcript ? (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                Esperando transcripción...
                              </p>
                            ) : (
                              <Button 
                                onClick={generateVariants} 
                                disabled={loadingVariants}
                                className="w-full bg-primary hover:bg-primary/90"
                              >
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generar Variantes IA
                              </Button>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>

                    {/* Generated Variants */}
                    {variants && (
                      <div className="space-y-3">
                    {/* Variante 1 */}
                    <div className="border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          📝 Variante 1
                        </h4>
                        {variants.hooks.similar && (
                          <div className="flex items-center gap-1">
                            <SaveButton text={variants.hooks.similar} variantType="Variante 1" />
                            <CopyButton text={variants.hooks.similar} section="variant1" />
                          </div>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{variants.hooks.similar || "No generado"}</p>
                    </div>

                    {/* Variante 2 */}
                    {variants.hooks.medium && (
                      <div className="border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400">
                            📝 Variante 2
                          </h4>
                          <div className="flex items-center gap-1">
                            <SaveButton text={variants.hooks.medium} variantType="Variante 2" />
                            <CopyButton text={variants.hooks.medium} section="variant2" />
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{variants.hooks.medium}</p>
                      </div>
                    )}

                    {/* Variante 3 */}
                    {variants.hooks.different && (
                      <div className="border border-purple-200 dark:border-purple-900/30 rounded-lg p-4 bg-purple-50/50 dark:bg-purple-950/20">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium text-purple-700 dark:text-purple-400">
                            📝 Variante 3
                          </h4>
                          <div className="flex items-center gap-1">
                            <SaveButton text={variants.hooks.different} variantType="Variante 3" />
                            <CopyButton text={variants.hooks.different} section="variant3" />
                          </div>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{variants.hooks.different}</p>
                      </div>
                    )}

                    {/* Full Variants */}
                    {variants.full_variant && (
                      <div className="border border-border rounded-lg p-4 bg-muted/30">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-medium">✨ Más Variantes</h4>
                          <div className="flex items-center gap-1">
                            <SaveButton text={variants.full_variant} variantType="Variante Completa" />
                            <CopyButton text={variants.full_variant} section="fullvariant" />
                          </div>
                        </div>
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {variants.full_variant}
                        </pre>
                      </div>
                    )}
                      </div>
                    )}
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
