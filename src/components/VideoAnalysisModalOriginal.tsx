import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Heart, ExternalLink, Copy, Check, Loader2, FileText, Brain, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Video {
  id: string;
  video_url: string;
  video_mp4_url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
  processing_status?: string | null;
}

interface VideoAnalysisModalOriginalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

const VideoAnalysisModalOriginal = ({ isOpen, onClose, video }: VideoAnalysisModalOriginalProps) => {
  const [activeTab, setActiveTab] = useState('script');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [transcript, setTranscript] = useState(video.transcript || '');
  const [analysis, setAnalysis] = useState<any>(video.analysis_json || null);
  const [variants, setVariants] = useState<any>(video.variants_json || null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const hasData = transcript || analysis || variants;

  useEffect(() => {
    if (isOpen && !hasData && video.video_mp4_url) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col md:flex-row h-full">
          {/* Left: Video Player */}
          <div className="w-full md:w-[360px] bg-black flex-shrink-0">
            <div className="relative aspect-[9/16] max-h-[70vh] md:max-h-[85vh]">
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
          </div>

          {/* Right: Analysis Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold line-clamp-1">
                  {video.title || 'Análisis de Video'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  @{video.creator_handle || video.creator_name || 'creator'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => window.open(video.video_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
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
                              <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-primary">🎣 Hook</h3>
                                  <CopyButton text={analysis.hook} field="hook" />
                                </div>
                                <p className="text-sm">{analysis.hook}</p>
                              </Card>
                            )}

                            {/* Body */}
                            {analysis.body && (
                              <Card className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-semibold text-blue-600">📝 Cuerpo</h3>
                                  <CopyButton text={analysis.body} field="body" />
                                </div>
                                <p className="text-sm">{analysis.body}</p>
                              </Card>
                            )}

                            {/* CTA */}
                            {analysis.cta && (
                              <Card className="p-4">
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
                      <TabsContent value="variants" className="mt-0 space-y-4">
                        {variants ? (
                          <>
                            {/* Hook Variants */}
                            {variants.hookVariants && variants.hookVariants.length > 0 && (
                              <Card className="p-4">
                                <h3 className="font-semibold mb-3">🎣 Variantes de Hook</h3>
                                <div className="space-y-3">
                                  {variants.hookVariants.map((hook: string, i: number) => (
                                    <div key={i} className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg">
                                      <p className="text-sm flex-1">{hook}</p>
                                      <CopyButton text={hook} field={`hook-${i}`} />
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* Body Variants */}
                            {variants.bodyVariants && variants.bodyVariants.length > 0 && (
                              <Card className="p-4">
                                <h3 className="font-semibold mb-3">📝 Variantes de Cuerpo</h3>
                                <div className="space-y-3">
                                  {variants.bodyVariants.map((body: string, i: number) => (
                                    <div key={i} className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg">
                                      <p className="text-sm flex-1">{body}</p>
                                      <CopyButton text={body} field={`body-${i}`} />
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* CTA Variants */}
                            {variants.ctaVariants && variants.ctaVariants.length > 0 && (
                              <Card className="p-4">
                                <h3 className="font-semibold mb-3">🎯 Variantes de Cierre</h3>
                                <div className="space-y-3">
                                  {variants.ctaVariants.map((cta: string, i: number) => (
                                    <div key={i} className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg">
                                      <p className="text-sm flex-1">{cta}</p>
                                      <CopyButton text={cta} field={`cta-${i}`} />
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground mb-4">
                              No hay variantes disponibles
                            </p>
                            <Button onClick={processVideo} disabled={isProcessing}>
                              Generar variantes
                            </Button>
                          </div>
                        )}
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
