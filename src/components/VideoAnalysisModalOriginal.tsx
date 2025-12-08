import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Heart, ExternalLink, Copy, Check, Loader2, FileText, Brain, Wand2, 
  DollarSign, ShoppingCart, Percent, Eye, FlaskConical, X, Sparkles,
  TrendingUp, Save, Play, Volume2, Maximize2, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';
import { useBlurGateContext } from '@/contexts/BlurGateContext';

interface GeneratedVariant {
  hook: string;
  body: string;
  cta: string;
  strategy_note?: string;
}

interface Video {
  id: string;
  video_url: string;
  video_mp4_url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
  product_name?: string | null;
  product_id?: string | null;
  views?: number | null;
  sales?: number | null;
  revenue_mxn?: number | null;
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
  processing_status?: string | null;
  product?: {
    producto_nombre?: string | null;
    commission?: number | null;
    price?: number | null;
    revenue_30d?: number | null;
    producto_url?: string | null;
  } | null;
}

interface VideoAnalysisModalOriginalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

const formatNumber = (num: number | null | undefined): string => {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('es-MX');
};

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const VideoAnalysisModalOriginal = ({ isOpen, onClose, video }: VideoAnalysisModalOriginalProps) => {
  const [activeTab, setActiveTab] = useState('script');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transcript, setTranscript] = useState(video.transcript || '');
  const [analysis, setAnalysis] = useState<any>(video.analysis_json || null);
  const [variants, setVariants] = useState<any>(video.variants_json || null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasPaid } = useBlurGateContext();
  
  // Variant generator controls
  const [variantCount, setVariantCount] = useState<number>(2);
  const [changeLevel, setChangeLevel] = useState<'light' | 'medium' | 'aggressive'>('medium');
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [generatorOpen, setGeneratorOpen] = useState(true);

  // Calculate earning per sale from product data
  const productPrice = video.product?.price || 0;
  const commissionRate = video.product?.commission || 6;
  const earningPerSale = productPrice * (commissionRate / 100);

  // Handle locked tabs for visitors
  const handleTabChange = (value: string) => {
    if (!hasPaid && (value === 'analysis' || value === 'variants')) {
      navigate('/unlock');
      return;
    }
    setActiveTab(value);
  };
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('favorites_videos')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_url', video.video_url)
        .maybeSingle();

      setIsFavorite(!!data);
    };

    checkFavoriteStatus();
  }, [video.video_url]);

  // Auto-process if no data
  useEffect(() => {
    if (isOpen && !transcript && video.video_mp4_url) {
      processVideo();
    }
  }, [isOpen]);

  const processVideo = async () => {
    setIsProcessing(true);
    
    try {
      if (video.transcript && video.analysis_json) {
        setTranscript(video.transcript);
        setAnalysis(video.analysis_json);
        setVariants(video.variants_json);
        setIsProcessing(false);
        return;
      }

      if (!video.video_mp4_url) {
        setStatusMessage('Descargando video...');
        const { data: downloadData, error: downloadError } = await supabase.functions.invoke('download-tiktok-video', {
          body: { videoId: video.id, tiktokUrl: video.video_url }
        });

        if (downloadError) throw downloadError;
        console.log('Download result:', downloadData);
      }

      setStatusMessage('Transcribiendo audio con IA...');
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('transcribe-and-analyze', {
        body: { videoId: video.id }
      });

      if (analyzeError) throw analyzeError;

      console.log('Analysis result:', analyzeData);

      if (analyzeData) {
        setTranscript(analyzeData.transcript || '');
        setAnalysis(analyzeData.analysis || null);
        setVariants(analyzeData.variants || null);
      }

      setStatusMessage('¡Análisis completado!');
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setStatusMessage(`Error: ${error.message}`);
      toast({
        title: 'Error al procesar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
      });
      return;
    }

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_url", video.video_url);

        if (error) throw error;
        setIsFavorite(false);
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { error } = await supabase
          .from("favorites_videos")
          .insert([{
            user_id: user.id,
            video_url: video.video_url,
            video_data: video as any,
          }]);

        if (error) throw error;
        setIsFavorite(true);
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: '✓ Copiado al portapapeles' });
  };

  const CopyButton = ({ text, field, variant = 'ghost' as 'ghost' | 'outline' }: { text: string; field: string; variant?: 'ghost' | 'outline' }) => (
    <Button
      size="sm"
      variant={variant}
      className="h-8 gap-1.5 text-xs"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? (
        <>
          <Check className="h-3.5 w-3.5 text-success" />
          <span className="hidden sm:inline">Copiado</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Copiar</span>
        </>
      )}
    </Button>
  );

  // Build complete script variants
  const buildCompleteVariant = (hookIndex: number) => {
    if (!variants?.hooks || !variants.hooks[hookIndex]) return null;
    
    const hook = variants.hooks[hookIndex];
    const body = variants.body_variant || analysis?.body || '';
    const cta = analysis?.cta || '';
    
    return `${hook}\n\n${body}\n\n${cta}`;
  };

  // Generate variants using AI edge function
  const generateVariants = async () => {
    console.log('Generating variants with:', { variantCount, changeLevel });
    setIsGeneratingVariants(true);
    setGeneratedVariants([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-script-variants', {
        body: {
          transcript,
          analysis,
          product: video.product,
          variantCount,
          changeLevel
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.variants && data.variants.length > 0) {
        setGeneratedVariants(data.variants);
        setGeneratorOpen(false); // Auto-collapse generator after generating
        toast({
          title: '✅ Variantes generadas',
          description: `${data.variants.length} variante(s) lista(s) para usar`,
        });
      } else {
        toast({
          title: '⚠️ Sin resultados',
          description: 'No se pudieron generar variantes. Intenta de nuevo.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Error generating variants:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al generar variantes',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  // Copy entire variant to clipboard
  const copyVariant = (variant: GeneratedVariant, index: number) => {
    const fullText = `Hook:\n${variant.hook}\n\nCuerpo:\n${variant.body}\n\nCTA:\n${variant.cta}`;
    handleCopy(fullText, `full-variant-${index}`);
  };

  // Save variant to favorites
  const saveVariantToFavorites = async (variant: GeneratedVariant, index: number) => {
    setIsSavingVariant(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Inicia sesión",
          description: "Debes iniciar sesión para guardar guiones",
        });
        return;
      }

      // First insert into guiones_personalizados
      const fullScript = `Hook:\n${variant.hook}\n\nCuerpo:\n${variant.body}\n\nCTA:\n${variant.cta}`;
      
      const { data: scriptData, error: scriptError } = await supabase
        .from('guiones_personalizados')
        .insert({
          user_id: user.id,
          video_id: video.id,
          contenido: fullScript,
        })
        .select()
        .single();

      if (scriptError) throw scriptError;

      // Then save to favorites_scripts
      const { error: favError } = await supabase
        .from('favorites_scripts')
        .insert({
          user_id: user.id,
          script_id: scriptData.id,
          script_data: {
            hook: variant.hook,
            body: variant.body,
            cta: variant.cta,
            strategy_note: variant.strategy_note,
            video_title: video.title,
            created_from: 'variant_generator',
            change_level: changeLevel,
          }
        });

      if (favError) throw favError;

      toast({ 
        title: '✅ Guión guardado',
        description: 'Puedes verlo en la sección de Favoritos'
      });
    } catch (error: any) {
      console.error('Error saving variant:', error);
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingVariant(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 gap-0 animate-scale-in [&>button]:hidden">
        <div className="flex flex-col lg:flex-row h-full max-h-[92vh]">
          {/* Left: Metrics + Video Player */}
          <div className="w-full lg:w-[380px] bg-muted/20 flex-shrink-0 flex flex-col border-r border-border p-4 gap-3">
            {/* Two Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Video Metrics Card */}
              <div className="card-premium p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">Métricas</h4>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ventas</span>
                    <span className="text-xs font-bold tabular-nums">{formatNumber(video.sales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Vistas</span>
                    <span className="text-xs font-bold tabular-nums">{formatNumber(video.views)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">Comisiones</span>
                    <span className="text-xs font-bold text-success tabular-nums">
                      {formatCurrency((video.sales || 0) * earningPerSale)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Data Card */}
              <div className="card-premium p-3 space-y-2 bg-gradient-to-br from-primary/[0.02] to-transparent">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">Producto</h4>
                </div>
                
                {video.product ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Comisión</span>
                      <span className="text-xs font-bold tabular-nums">{video.product.commission || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">$/venta</span>
                      <span className="text-xs font-bold text-success tabular-nums">
                        {formatCurrency(earningPerSale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">GMV 30d</span>
                      <span className="text-xs font-bold tabular-nums">{formatCurrency(video.product.revenue_30d)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-2">Sin producto</p>
                )}
              </div>
            </div>

            {/* Video Card - Centered and Smaller */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              <div className="card-premium overflow-hidden w-full max-w-[280px]">
                <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
                  {video.video_mp4_url ? (
                    <video
                      ref={videoRef}
                      src={video.video_mp4_url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      loop
                      playsInline
                      poster={video.thumbnail_url || undefined}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-2">
                      <Play className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-muted-foreground text-xs">Video no disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TikTok Shop Button - Bottom */}
            {video.product?.producto_url && (
              <Button
                variant="default"
                size="sm"
                className="w-full gap-2 h-9 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                onClick={() => window.open(video.product?.producto_url || '', '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver en TikTok Shop
              </Button>
            )}
          </div>

          {/* Right: Analysis Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold line-clamp-2 text-foreground leading-snug pr-2">
                  {video.title || 'Análisis de Video'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  @{video.creator_handle || video.creator_name || 'creator'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleToggleFavorite}
                  className={`rounded-xl h-9 w-9 transition-all ${
                    isFavorite 
                      ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive hover:text-white" 
                      : "hover:border-destructive/30 hover:text-destructive"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl h-9 w-9 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="h-full flex flex-col">
                <div className="px-5 pt-4">
                  <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted/50 rounded-xl">
                    <TabsTrigger 
                      value="script" 
                      className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="hidden sm:inline">Script</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="analysis" 
                      className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      {!hasPaid && <Lock className="h-3 w-3" />}
                      <Brain className="h-4 w-4" />
                      <span className="hidden sm:inline">Análisis</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="variants" 
                      className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                    >
                      {!hasPaid && <Lock className="h-3 w-3" />}
                      <Wand2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Variantes IA</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-5 pt-4">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm">{statusMessage}</p>
                    </div>
                  ) : (
                    <>
                      {/* Script Tab */}
                      <TabsContent value="script" className="mt-0 animate-fade-in">
                        <div className="card-premium p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <h3 className="font-semibold text-foreground">Transcripción Original</h3>
                            </div>
                            {transcript && <CopyButton text={transcript} field="transcript" variant="outline" />}
                          </div>
                          {transcript ? (
                            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
                                {transcript}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                <FileText className="h-6 w-6 text-muted-foreground/50" />
                              </div>
                              <p className="text-muted-foreground mb-4">
                                No hay transcripción disponible
                              </p>
                              <Button onClick={processVideo} disabled={isProcessing} className="rounded-xl">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generar transcripción
                              </Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Analysis Tab */}
                      <TabsContent value="analysis" className="mt-0 space-y-4 animate-fade-in">
                        {analysis ? (
                          <>
                            {/* Hook */}
                            {analysis.hook && (
                              <div className="card-premium p-5 border-l-4 border-l-primary bg-gradient-to-r from-primary/[0.03] to-transparent">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <span className="text-sm">🎣</span>
                                    </div>
                                    <h3 className="font-semibold text-primary">Hook (Gancho)</h3>
                                  </div>
                                  <CopyButton text={analysis.hook} field="hook" variant="outline" />
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed pl-10">{analysis.hook}</p>
                              </div>
                            )}

                            {/* Body */}
                            {analysis.body && (
                              <div className="card-premium p-5 border-l-4 border-l-accent bg-gradient-to-r from-accent/[0.03] to-transparent">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                      <span className="text-sm">📝</span>
                                    </div>
                                    <h3 className="font-semibold text-accent">Cuerpo</h3>
                                  </div>
                                  <CopyButton text={analysis.body} field="body" variant="outline" />
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed pl-10">{analysis.body}</p>
                              </div>
                            )}

                            {/* CTA */}
                            {analysis.cta && (
                              <div className="card-premium p-5 border-l-4 border-l-success bg-gradient-to-r from-success/[0.03] to-transparent">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                                      <span className="text-sm">🎯</span>
                                    </div>
                                    <h3 className="font-semibold text-success">Cierre / CTA</h3>
                                  </div>
                                  <CopyButton text={analysis.cta} field="cta" variant="outline" />
                                </div>
                                <p className="text-sm text-foreground/80 leading-relaxed pl-10">{analysis.cta}</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-10">
                            <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                              <Brain className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground mb-4">
                              No hay análisis disponible
                            </p>
                            <Button onClick={processVideo} disabled={isProcessing} className="rounded-xl">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generar análisis
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      {/* Variants Tab */}
                      <TabsContent value="variants" className="mt-0 h-full flex flex-col animate-fade-in">
                        {/* Collapsible Control Panel */}
                        <Collapsible open={generatorOpen} onOpenChange={setGeneratorOpen} className="mb-4">
                          <div className="card-premium bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
                            <CollapsibleTrigger asChild>
                              <button className="w-full p-5 flex items-center justify-between hover:bg-primary/5 transition-colors rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                                    <FlaskConical className="h-5 w-5 text-white" />
                                  </div>
                                  <div className="text-left">
                                    <h3 className="font-semibold text-base text-foreground">Generador de Variantes IA</h3>
                                    <p className="text-xs text-muted-foreground">
                                      {generatedVariants.length > 0 ? `${generatedVariants.length} variante(s) generada(s) • Clic para expandir` : 'Crea guiones optimizados basados en este video'}
                                    </p>
                                  </div>
                                </div>
                                {generatorOpen ? (
                                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-5 pb-5">
                                <div className="grid sm:grid-cols-2 gap-5">
                                  {/* Quantity Selector */}
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-2.5 block uppercase tracking-wider">
                                      Cantidad de variantes
                                    </Label>
                                    <div className="flex gap-2">
                                      {[1, 2, 3].map((num) => (
                                        <Button
                                          key={num}
                                          size="sm"
                                          variant={variantCount === num ? 'default' : 'outline'}
                                          className={`flex-1 h-10 rounded-xl transition-all ${
                                            variantCount === num ? 'shadow-sm' : ''
                                          }`}
                                          onClick={() => setVariantCount(num)}
                                        >
                                          {num}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Change Level */}
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground mb-2.5 block uppercase tracking-wider">
                                      Nivel de cambio
                                    </Label>
                                    <RadioGroup
                                      value={changeLevel}
                                      onValueChange={(v) => setChangeLevel(v as 'light' | 'medium' | 'aggressive')}
                                      className="flex gap-3"
                                    >
                                      {[
                                        { value: 'light', label: 'Ligero', emoji: '🌱' },
                                        { value: 'medium', label: 'Medio', emoji: '🔥' },
                                        { value: 'aggressive', label: 'Agresivo', emoji: '🚀' }
                                      ].map(({ value, label, emoji }) => (
                                        <div key={value} className="flex items-center">
                                          <RadioGroupItem value={value} id={value} className="peer sr-only" />
                                          <Label 
                                            htmlFor={value} 
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                                              changeLevel === value 
                                                ? 'border-primary bg-primary/10 text-primary font-medium' 
                                                : 'border-border bg-background hover:border-primary/30'
                                            }`}
                                          >
                                            <span>{emoji}</span>
                                            <span className="hidden sm:inline">{label}</span>
                                          </Label>
                                        </div>
                                      ))}
                                    </RadioGroup>
                                  </div>
                                </div>

                                {/* Generate Button */}
                                <Button
                                  onClick={generateVariants}
                                  disabled={isGeneratingVariants || !transcript}
                                  className="w-full mt-5 h-11 rounded-xl font-medium shadow-sm hover:shadow-md transition-all"
                                  size="lg"
                                >
                                  {isGeneratingVariants ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Generando variantes...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="h-4 w-4 mr-2" />
                                      Generar Variantes IA
                                    </>
                                  )}
                                </Button>

                                {!transcript && (
                                  <p className="text-xs text-muted-foreground mt-3 text-center bg-muted/50 py-2 rounded-lg">
                                    ⚠️ Primero genera la transcripción en la pestaña Script
                                  </p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        {/* Scrollable Variants Container */}
                        <ScrollArea className="flex-1">
                          <div className="space-y-4 pr-2">
                            {generatedVariants.length > 0 ? (
                              generatedVariants.map((variant, index) => (
                                <div key={index} className="card-premium p-5 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">{index + 1}</span>
                                      </div>
                                      <h4 className="font-semibold text-foreground">Variante {index + 1}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1.5 rounded-lg"
                                        onClick={() => saveVariantToFavorites(variant, index)}
                                        disabled={isSavingVariant}
                                      >
                                        {isSavingVariant ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <Save className="h-3.5 w-3.5" />
                                        )}
                                        <span className="hidden sm:inline">Guardar</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1.5 rounded-lg"
                                        onClick={() => copyVariant(variant, index)}
                                      >
                                        {copiedField === `full-variant-${index}` ? (
                                          <Check className="h-3.5 w-3.5 text-success" />
                                        ) : (
                                          <Copy className="h-3.5 w-3.5" />
                                        )}
                                        <span className="hidden sm:inline">Copiar</span>
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    {/* Hook */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] border border-primary/10">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm">🎣</span>
                                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Hook</span>
                                      </div>
                                      <p className="text-sm text-foreground/80 leading-relaxed">{variant.hook}</p>
                                    </div>

                                    {/* Body */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-accent/[0.06] to-accent/[0.02] border border-accent/10">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm">📝</span>
                                        <span className="text-xs font-semibold text-accent uppercase tracking-wider">Cuerpo</span>
                                      </div>
                                      <p className="text-sm text-foreground/80 leading-relaxed">{variant.body}</p>
                                    </div>

                                    {/* CTA */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-success/[0.06] to-success/[0.02] border border-success/10">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm">🎯</span>
                                        <span className="text-xs font-semibold text-success uppercase tracking-wider">CTA</span>
                                      </div>
                                      <p className="text-sm text-foreground/80 leading-relaxed">{variant.cta}</p>
                                    </div>

                                    {/* Strategy Note */}
                                    {variant.strategy_note && (
                                      <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/10">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-sm">💡</span>
                                          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Estrategia</span>
                                        </div>
                                        <p className="text-xs text-foreground/60 leading-relaxed">{variant.strategy_note}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-12">
                                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                  <Wand2 className="h-7 w-7 text-muted-foreground/40" />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Las variantes aparecerán aquí después de generarlas
                                </p>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    </>
                  )}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAnalysisModalOriginal;
