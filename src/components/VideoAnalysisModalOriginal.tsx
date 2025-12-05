import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Heart, ExternalLink, Copy, Check, Loader2, FileText, Brain, Wand2, DollarSign, ShoppingCart, Percent, Eye, FlaskConical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GeneratedVariant {
  hook: string;
  body: string;
  cta: string;
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
  // Product data
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  
  // New state for variant generator controls
  const [variantCount, setVariantCount] = useState<number>(2);
  const [changeLevel, setChangeLevel] = useState<'light' | 'medium' | 'aggressive'>('medium');
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);

  // Calculate earning per sale from product data
  const productPrice = video.product?.price || 0;
  const commissionRate = video.product?.commission || 6;
  const earningPerSale = productPrice * (commissionRate / 100);

  // Check favorite status on mount
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
      // Step 1: Check if already processed
      if (video.transcript && video.analysis_json) {
        setTranscript(video.transcript);
        setAnalysis(video.analysis_json);
        setVariants(video.variants_json);
        setIsProcessing(false);
        return;
      }

      // Step 2: Download video if needed
      if (!video.video_mp4_url) {
        setStatusMessage('Descargando video...');
        const { data: downloadData, error: downloadError } = await supabase.functions.invoke('download-tiktok-video', {
          body: { videoId: video.id, tiktokUrl: video.video_url }
        });

        if (downloadError) throw downloadError;
        console.log('Download result:', downloadData);
      }

      // Step 3: Transcribe and analyze
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

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
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

  // Generate variants - placeholder function for Phase 2
  const generateVariants = () => {
    console.log('Generating variants with:', { variantCount, changeLevel });
    setIsGeneratingVariants(true);
    
    // In Phase 3, this will call the AI edge function
    // For now, just show toast and set empty array to show the UI is working
    toast({
      title: '🧪 Generando variantes...',
      description: `${variantCount} variantes con nivel ${changeLevel === 'light' ? 'ligero' : changeLevel === 'medium' ? 'medio' : 'agresivo'}`,
    });

    // Simulate delay for Phase 3 integration
    setTimeout(() => {
      setIsGeneratingVariants(false);
      // Placeholder: set empty to show "no variants yet" state
      // In Phase 3, this will receive real AI-generated variants
      setGeneratedVariants([]);
    }, 1000);
  };

  // Copy entire variant to clipboard
  const copyVariant = (variant: GeneratedVariant, index: number) => {
    const fullText = `Hook:\n${variant.hook}\n\nCuerpo:\n${variant.body}\n\nCTA:\n${variant.cta}`;
    handleCopy(fullText, `full-variant-${index}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left: Video Player + Metrics */}
          <div className="w-full md:w-[380px] bg-black flex-shrink-0 flex flex-col">
            <div className="relative aspect-[9/16] max-h-[55vh] md:max-h-[60vh]">
              {video.video_mp4_url ? (
                <video
                  ref={videoRef}
                  src={video.video_mp4_url}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">Video no disponible</p>
                </div>
              )}
            </div>

            {/* Metrics Below Video */}
            <div className="p-3 bg-background border-t space-y-3 overflow-y-auto max-h-[35vh]">
              {/* Card 1: Video Metrics */}
              <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Métricas del Video
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Ventas del video</span>
                    </div>
                    <span className="text-sm font-semibold">{formatNumber(video.sales)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Vistas del video</span>
                    </div>
                    <span className="text-sm font-semibold">{formatNumber(video.views)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs text-muted-foreground">Comisiones generadas</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency((video.sales || 0) * earningPerSale)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Product Data */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Datos del Producto
                </h4>
                {video.product ? (
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Nombre</span>
                      <span className="text-xs font-medium text-right max-w-[180px] truncate" title={video.product.producto_nombre || ''}>
                        {video.product.producto_nombre || video.product_name || 'Sin nombre'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Comisión</span>
                      </div>
                      <span className="text-sm font-semibold">{video.product.commission || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Ganancia por venta</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(earningPerSale)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Ingresos 30 días</span>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(video.product.revenue_30d)}</span>
                    </div>
                    
                    {/* TikTok Shop Button */}
                    {video.product.producto_url && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full mt-2 gap-2"
                        onClick={() => window.open(video.product?.producto_url || '', '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver en TikTok Shop
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin producto asignado</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Analysis Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold line-clamp-1">
                  {video.title || 'Análisis de Video'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{video.creator_handle || video.creator_name || 'creator'}
                </p>
              </div>
              <Button
                size="icon"
                variant={isFavorite ? "default" : "outline"}
                onClick={handleToggleFavorite}
                className={isFavorite ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-white' : ''}`} />
              </Button>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                <TabsList className="grid grid-cols-3 mx-4 mt-4">
                  <TabsTrigger value="script" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-2">
                    <Brain className="h-4 w-4" />
                    Análisis
                  </TabsTrigger>
                  <TabsTrigger value="variants" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    Variantes IA
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto p-4">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-muted-foreground">{statusMessage}</p>
                    </div>
                  ) : (
                    <>
                      {/* Script Tab */}
                      <TabsContent value="script" className="mt-0">
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">Transcripción Original</h3>
                            {transcript && <CopyButton text={transcript} field="transcript" />}
                          </div>
                          {transcript ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {transcript}
                            </p>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground mb-4">
                                No hay transcripción disponible
                              </p>
                              <Button onClick={processVideo} disabled={isProcessing}>
                                Generar transcripción
                              </Button>
                            </div>
                          )}
                        </Card>
                      </TabsContent>

                      {/* Analysis Tab */}
                      <TabsContent value="analysis" className="mt-0 space-y-4">
                        {analysis ? (
                          <>
                            {/* Hook */}
                            {analysis.hook && (
                              <Card className="p-4 border-l-4 border-l-primary">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-primary">🎣 Hook (Gancho)</h3>
                                  <CopyButton text={analysis.hook} field="hook" />
                                </div>
                                <p className="text-sm">{analysis.hook}</p>
                              </Card>
                            )}

                            {/* Body */}
                            {analysis.body && (
                              <Card className="p-4 border-l-4 border-l-blue-500">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-blue-600">📝 Cuerpo</h3>
                                  <CopyButton text={analysis.body} field="body" />
                                </div>
                                <p className="text-sm">{analysis.body}</p>
                              </Card>
                            )}

                            {/* CTA */}
                            {analysis.cta && (
                              <Card className="p-4 border-l-4 border-l-green-500">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-green-600">🎯 Cierre / CTA</h3>
                                  <CopyButton text={analysis.cta} field="cta" />
                                </div>
                                <p className="text-sm">{analysis.cta}</p>
                              </Card>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                              No hay análisis disponible
                            </p>
                            <Button onClick={processVideo} disabled={isProcessing}>
                              Generar análisis
                            </Button>
                          </div>
                        )}
                      </TabsContent>

                      {/* Variants Tab */}
                      <TabsContent value="variants" className="mt-0 h-full flex flex-col">
                        {/* Control Panel */}
                        <Card className="p-4 mb-4 bg-muted/30">
                          <div className="flex items-center gap-2 mb-4">
                            <FlaskConical className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-base">Generador de Variantes IA</h3>
                          </div>

                          {/* Quantity Selector */}
                          <div className="mb-4">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                              Cantidad de variantes
                            </Label>
                            <div className="flex gap-2">
                              {[1, 2, 3].map((num) => (
                                <Button
                                  key={num}
                                  size="sm"
                                  variant={variantCount === num ? 'default' : 'outline'}
                                  className="w-10 h-9"
                                  onClick={() => setVariantCount(num)}
                                >
                                  {num}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Change Level */}
                          <div className="mb-4">
                            <Label className="text-xs text-muted-foreground mb-2 block">
                              Nivel de cambio
                            </Label>
                            <RadioGroup
                              value={changeLevel}
                              onValueChange={(v) => setChangeLevel(v as 'light' | 'medium' | 'aggressive')}
                              className="flex flex-wrap gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="light" id="light" />
                                <Label htmlFor="light" className="text-sm cursor-pointer">Ligero</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="medium" id="medium" />
                                <Label htmlFor="medium" className="text-sm cursor-pointer">Medio</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="aggressive" id="aggressive" />
                                <Label htmlFor="aggressive" className="text-sm cursor-pointer">Agresivo</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {/* Generate Button */}
                          <Button
                            onClick={generateVariants}
                            disabled={isGeneratingVariants || !transcript}
                            className="w-full"
                          >
                            {isGeneratingVariants ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generando...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2" />
                                Generar Variantes IA
                              </>
                            )}
                          </Button>

                          {!transcript && (
                            <p className="text-xs text-muted-foreground mt-2 text-center">
                              Primero genera la transcripción en la pestaña Script
                            </p>
                          )}
                        </Card>

                        {/* Scrollable Variants Container */}
                        <ScrollArea className="flex-1 pr-2">
                          <div className="space-y-3">
                            {generatedVariants.length > 0 ? (
                              generatedVariants.map((variant, index) => (
                                <Card key={index} className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Variante {index + 1}</h4>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1.5"
                                      onClick={() => copyVariant(variant, index)}
                                    >
                                      {copiedField === `full-variant-${index}` ? (
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                      Copiar
                                    </Button>
                                  </div>

                                  {/* Hook */}
                                  <div className="mb-2 p-2.5 bg-primary/5 rounded-lg border-l-4 border-l-primary">
                                    <span className="text-xs font-medium text-primary mb-1 block">🎣 Hook</span>
                                    <p className="text-sm">{variant.hook}</p>
                                  </div>

                                  {/* Body */}
                                  <div className="mb-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-l-blue-500">
                                    <span className="text-xs font-medium text-blue-600 mb-1 block">📝 Cuerpo</span>
                                    <p className="text-sm">{variant.body}</p>
                                  </div>

                                  {/* CTA */}
                                  <div className="p-2.5 bg-green-50 dark:bg-green-950/30 rounded-lg border-l-4 border-l-green-500">
                                    <span className="text-xs font-medium text-green-600 mb-1 block">🎯 CTA</span>
                                    <p className="text-sm">{variant.cta}</p>
                                  </div>
                                </Card>
                              ))
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Wand2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">
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
