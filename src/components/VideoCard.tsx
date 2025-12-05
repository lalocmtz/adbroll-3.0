import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign, ShoppingCart, Percent, Heart, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import VideoAnalysisModal from "./VideoAnalysisModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useTranscriptionPolling } from "@/hooks/useTranscriptionPolling";

interface VideoCardProps {
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
    ingresos_mxn: number;
    ventas: number;
    visualizaciones: number;
    cpa_mxn: number;
    duracion: string;
    fecha_publicacion: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
    producto_nombre: string | null;
    producto_url: string | null;
    product_id?: string | null;
    product_price?: number | null;
    product_sales?: number | null;
    product_revenue?: number | null;
  };
  ranking: number;
}

interface ProductData {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  price: number | null;
  commission: number | null;
  categoria: string | null;
}

const VideoCard = ({ video, ranking }: VideoCardProps) => {
  const [showModal, setShowModal] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcriptReady, setTranscriptReady] = useState<string | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { isPolling, transcript, error, status, startTranscription, reset } = useTranscriptionPolling();

  useEffect(() => {
    // Load TikTok embed script
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
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Load product data
      if (video.producto_nombre) {
        const { data } = await supabase
          .from("products")
          .select("id, producto_nombre, imagen_url, producto_url, price, commission, categoria")
          .eq("producto_nombre", video.producto_nombre)
          .maybeSingle();

        if (data) {
          setProductData(data);
        }
      }

      // Check favorite status
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("favorites_videos")
          .select("id")
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url)
          .maybeSingle();

        if (data) {
          setIsFavorite(true);
        }
      }
    };

    loadData();
  }, [video.producto_nombre, video.tiktok_url]);

  // When transcript is ready, open modal
  useEffect(() => {
    if (transcript && !showModal) {
      setTranscriptReady(transcript);
      setShowModal(true);
    }
  }, [transcript]);

  // Handle transcription error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error de transcripción",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  // Extract video ID from TikTok URL
  const getVideoId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video.tiktok_url);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const commissionRate = productData?.commission || 6;
  const commissionEstimated = video.ingresos_mxn * (commissionRate / 100);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
      });
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("favorites_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url);

        if (error) throw error;

        setIsFavorite(false);
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { data: videoData, error: fetchError } = await supabase
          .from("daily_feed")
          .select("*")
          .eq("tiktok_url", video.tiktok_url)
          .single();

        if (fetchError) throw fetchError;

        const { error } = await supabase
          .from("favorites_videos")
          .insert({
            user_id: user.id,
            video_url: video.tiktok_url,
            video_data: videoData,
          });

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
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    // If transcript already exists, open modal directly
    if (video.transcripcion_original) {
      setTranscriptReady(video.transcripcion_original);
      setShowModal(true);
      return;
    }

    // Otherwise, start transcription process
    const success = await startTranscription(video.id, video.tiktok_url);
    
    if (!success && !transcript) {
      toast({
        title: "Error",
        description: "No se pudo transcribir el video. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTranscriptReady(null);
    reset();
  };

  return (
    <>
      <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
        {/* TikTok Embed Player */}
        <div className="relative aspect-[9/16] bg-muted overflow-hidden">
          {/* Top Icons Bar */}
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
            <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 shadow-lg">
              #{ranking} {ranking <= 5 && "🔥"}
            </Badge>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                onClick={() => window.open(video.tiktok_url, '_blank')}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 ${isFavorite ? "text-red-500" : ""}`}
                onClick={handleToggleFavorite}
                disabled={loading}
              >
                <Heart className={`h-3 w-3 ${isFavorite ? "fill-current" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Loading Overlay when transcribing */}
          {isPolling && (
            <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-center px-4">
                {status === 'starting' && 'Iniciando...'}
                {status === 'extracting' && 'Extrayendo audio del video...'}
                {status === 'transcribing' && 'Transcribiendo con IA...'}
              </p>
              <p className="text-xs text-muted-foreground text-center px-4">
                Esto puede tomar hasta 30 segundos
              </p>
            </div>
          )}

          {/* TikTok Official Embed */}
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
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <p className="text-sm text-muted-foreground">Cargando video...</p>
            </div>
          )}
        </div>

        {/* Video Info */}
        <CardContent className="p-2 space-y-2">
          {/* Title and Creator */}
          <div>
            <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
              {video.descripcion_video?.split(' ').slice(0, 20).join(' ')}{video.descripcion_video?.split(' ').length > 20 ? '...' : ''}
            </h3>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[10px] text-muted-foreground">
                @{video.creador}
              </p>
              {productData ? (
                <p className="text-[9px] text-primary font-medium truncate max-w-[120px]">
                  {productData.producto_nombre}
                </p>
              ) : (
                <p className="text-[9px] text-muted-foreground italic">
                  Sin producto
                </p>
              )}
            </div>
          </div>

          {/* Metrics Grid - 2x2 Compact */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-1.5 rounded bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-0.5 mb-0.5">
                <DollarSign className="h-2.5 w-2.5 text-primary" />
                <span className="text-[9px] text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-xs font-bold text-success">
                {formatCurrency(video.ingresos_mxn)}
              </p>
            </div>

            <div className="p-1.5 rounded bg-muted">
              <div className="flex items-center gap-0.5 mb-0.5">
                <ShoppingCart className="h-2.5 w-2.5 text-foreground" />
                <span className="text-[9px] text-muted-foreground">Ventas</span>
              </div>
              <p className="text-xs font-bold text-foreground">
                {formatNumber(video.ventas)}
              </p>
            </div>

            <div className="p-1.5 rounded bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-0.5 mb-0.5">
                <Percent className="h-2.5 w-2.5 text-accent" />
                <span className="text-[9px] text-muted-foreground">Comisión</span>
              </div>
              <p className="text-xs font-bold text-accent">
                {formatCurrency(commissionEstimated)}
              </p>
            </div>

            <div className="p-1.5 rounded bg-muted">
              <div className="flex items-center gap-0.5 mb-0.5">
                <Eye className="h-2.5 w-2.5 text-foreground" />
                <span className="text-[9px] text-muted-foreground">Vistas</span>
              </div>
              <p className="text-xs font-bold text-foreground">
                {formatNumber(video.visualizaciones)}
              </p>
            </div>
          </div>

          {/* Single CTA Button */}
          <Button
            className="w-full h-8 text-xs font-semibold" 
            variant="default"
            onClick={handleAnalyzeClick}
            disabled={isPolling}
          >
            {isPolling ? (
              <>
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                {status === 'extracting' ? 'Extrayendo audio...' : 
                 status === 'transcribing' ? 'Transcribiendo...' : 
                 'Procesando...'}
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1.5" />
                Analizar guion y replicar
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {showModal && transcriptReady && (
        <VideoAnalysisModal
          isOpen={showModal}
          onClose={handleCloseModal}
          video={video}
          transcript={transcriptReady}
        />
      )}
    </>
  );
};

export default VideoCard;
