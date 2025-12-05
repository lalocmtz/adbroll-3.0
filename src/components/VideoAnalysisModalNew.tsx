import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check, Loader2, Download, FileText, Sparkles, Lightbulb } from 'lucide-react';
import { useAnalyzeVideo } from '@/hooks/useAnalyzeVideo';
import { useToast } from '@/hooks/use-toast';

interface Video {
  id: string;
  video_url: string;
  video_mp4_url?: string | null;
  title?: string | null;
  creator_name?: string | null;
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
}

interface VideoAnalysisModalNewProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}

export function VideoAnalysisModalNew({ isOpen, onClose, video }: VideoAnalysisModalNewProps) {
  const { toast } = useToast();
  const {
    transcript,
    analysis,
    variants,
    isDownloading,
    isTranscribing,
    isAnalyzing,
    error,
    processVideo
  } = useAnalyzeVideo();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('script');

  // Use cached data or fresh data
  const displayTranscript = transcript || video.transcript;
  const displayAnalysis = analysis || video.analysis_json;
  const displayVariants = variants || video.variants_json;

  const isProcessing = isDownloading || isTranscribing || isAnalyzing;
  const hasData = displayTranscript && displayAnalysis && displayVariants;

  useEffect(() => {
    if (isOpen && !hasData && !isProcessing) {
      // Auto-start processing when modal opens
      processVideo(video.id, video.video_url, video.video_mp4_url);
    }
  }, [isOpen, hasData, isProcessing, processVideo, video.id, video.video_url, video.video_mp4_url]);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copiado al portapapeles' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleCopy(text, field)}
      className="h-8 px-2"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  const getStatusMessage = () => {
    if (isDownloading) return 'Descargando video de TikTok...';
    if (isTranscribing) return 'Transcribiendo audio con AssemblyAI...';
    if (isAnalyzing) return 'Analizando guión con OpenAI...';
    return 'Procesando...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left: Video Player */}
          <div className="w-[360px] bg-black flex-shrink-0 flex items-center justify-center">
            {video.video_mp4_url ? (
              <video
                src={video.video_mp4_url}
                controls
                autoPlay
                muted
                loop
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center text-white p-4">
                <Download className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">
                  {isDownloading ? 'Descargando...' : 'Video pendiente de descarga'}
                </p>
              </div>
            )}
          </div>

          {/* Right: Analysis Tabs */}
          <div className="flex-1 flex flex-col bg-background">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold truncate">
                {video.title || 'Análisis de Guión'}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{video.creator_name || 'creator'}
              </p>
            </div>

            {isProcessing ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium">{getStatusMessage()}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Esto puede tomar 1-2 minutos
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center">
                  <p className="text-destructive font-medium">Error al procesar</p>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                  <Button 
                    className="mt-4"
                    onClick={() => processVideo(video.id, video.video_url, video.video_mp4_url)}
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : hasData ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="script" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Script
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Análisis
                  </TabsTrigger>
                  <TabsTrigger value="variants" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Variantes IA
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 p-4">
                  {/* Script Tab */}
                  <TabsContent value="script" className="m-0">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between py-3">
                        <CardTitle className="text-base">Transcripción Completa</CardTitle>
                        <CopyButton text={displayTranscript || ''} field="transcript" />
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {displayTranscript}
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Analysis Tab */}
                  <TabsContent value="analysis" className="m-0 space-y-4">
                    {displayAnalysis?.hook && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            🎣 Hook
                          </CardTitle>
                          <CopyButton text={displayAnalysis.hook} field="hook" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{displayAnalysis.hook}</p>
                        </CardContent>
                      </Card>
                    )}

                    {displayAnalysis?.body && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            📝 Cuerpo
                          </CardTitle>
                          <CopyButton text={displayAnalysis.body} field="body" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{displayAnalysis.body}</p>
                        </CardContent>
                      </Card>
                    )}

                    {displayAnalysis?.cta && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            🎯 CTA
                          </CardTitle>
                          <CopyButton text={displayAnalysis.cta} field="cta" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{displayAnalysis.cta}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Variants Tab */}
                  <TabsContent value="variants" className="m-0 space-y-4">
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-base">🔄 Hooks Alternativos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {displayVariants?.hooks?.map((hook: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                            <span className="font-bold text-primary">{index + 1}.</span>
                            <p className="flex-1 text-sm">{hook}</p>
                            <CopyButton text={hook} field={`hook-${index}`} />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {displayVariants?.body_variant && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-3">
                          <CardTitle className="text-base">✨ Variante del Cuerpo</CardTitle>
                          <CopyButton text={displayVariants.body_variant} field="body-variant" />
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm whitespace-pre-wrap">
                            {displayVariants.body_variant}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <Button onClick={() => processVideo(video.id, video.video_url, video.video_mp4_url)}>
                  Iniciar análisis
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
