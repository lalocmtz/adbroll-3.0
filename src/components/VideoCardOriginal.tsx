import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, DollarSign, ShoppingCart, Percent, Eye, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import VideoAnalysisModalOriginal from './VideoAnalysisModalOriginal';

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
}

interface VideoCardOriginalProps {
  video: Video;
  ranking: number;
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

const VideoCardOriginal = ({ video, ranking }: VideoCardOriginalProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const commissionRate = 6; // Default 6%
  const commissionEstimated = (video.revenue_mxn || 0) * (commissionRate / 100);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current && video.video_mp4_url) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  const openTikTok = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(video.video_url, '_blank');
  };

  const isTop5 = ranking <= 5;

  return (
    <>
      <Card 
        className="overflow-hidden group hover:shadow-xl transition-all duration-300 bg-card border-border"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video Container - 9:16 aspect ratio */}
        <div className="relative aspect-[9/16] bg-muted overflow-hidden">
          {/* Top Icons Bar */}
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
            {/* Ranking Badge */}
            <Badge 
              className={`pointer-events-auto font-bold text-xs px-2 py-0.5 shadow-lg ${
                isTop5 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background/90 text-foreground border'
              }`}
            >
              #{ranking} {isTop5 && '🔥'}
            </Badge>

            {/* Right Icons */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* TikTok Icon */}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                onClick={openTikTok}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </Button>

              {/* Favorite Icon */}
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 ${isFavorite ? 'text-red-500' : ''}`}
                onClick={handleToggleFavorite}
                disabled={loading}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Video Player - MP4 autoplay on hover */}
          {video.video_mp4_url ? (
            <>
              <video
                ref={videoRef}
                src={video.video_mp4_url}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                poster={video.thumbnail_url || undefined}
              />
              {/* Play icon overlay when not hovering */}
              {!isHovered && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted to-muted/80">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground ml-1" />
              </div>
            </div>
          )}

          {/* Bottom right metrics overlay on video */}
          <div className="absolute bottom-2 right-2 z-10 flex flex-col items-end gap-1 text-white text-xs font-medium">
            <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
              {formatNumber(video.views)}
            </span>
            <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
              {formatNumber(video.sales)}
            </span>
          </div>
        </div>

        {/* Video Info */}
        <CardContent className="p-3 space-y-2">
          {/* Title and Creator */}
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight min-h-[2.5rem]">
              {video.title || 'Video TikTok Shop'}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                @{video.creator_handle || video.creator_name || 'creator'}
              </p>
              {video.product_name ? (
                <p className="text-[10px] text-primary font-medium truncate max-w-[100px]">
                  {video.product_name}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground italic">
                  Sin producto
                </p>
              )}
            </div>
          </div>

          {/* Metrics Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-emerald-600">
                {formatCurrency(video.revenue_mxn)}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <ShoppingCart className="h-3 w-3 text-foreground" />
                <span className="text-[10px] text-muted-foreground">Ventas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.sales)}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Percent className="h-3 w-3 text-amber-600" />
                <span className="text-[10px] text-muted-foreground">Comisión</span>
              </div>
              <p className="text-sm font-bold text-amber-600">
                {formatCurrency(commissionEstimated)}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <Eye className="h-3 w-3 text-foreground" />
                <span className="text-[10px] text-muted-foreground">Vistas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.views)}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90"
            onClick={() => setShowModal(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar guion y replicar
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      {showModal && (
        <VideoAnalysisModalOriginal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          video={video}
        />
      )}
    </>
  );
};

export default VideoCardOriginal;
