import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, DollarSign, ShoppingCart, Eye, Play, ExternalLink } from 'lucide-react';
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
  creator_id?: string | null;
  product_name?: string | null;
  product_id?: string | null;
  views?: number | null;
  sales?: number | null;
  revenue_mxn?: number | null;
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
  processing_status?: string | null;
  // Joined product data
  product?: {
    id: string;
    producto_nombre: string;
    imagen_url: string | null;
    total_ingresos_mxn: number | null;
    commission: number | null;
    price: number | null;
    precio_mxn: number | null;
  } | null;
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
    maximumFractionDigits: 0
  }).format(num);
};
const VideoCardOriginal = ({
  video,
  ranking
}: VideoCardOriginalProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const commissionRate = video.product?.commission || 6; // Default 6%
  const commissionEstimated = (video.revenue_mxn || 0) * (commissionRate / 100);

  // Calculate earnings per sale: price * commission%
  const productPrice = video.product?.price || video.product?.precio_mxn || 0;
  const earningsPerSale = productPrice * (commissionRate / 100);

  // Check if video is in favorites on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data
      } = await supabase.from('favorites_videos').select('id').eq('user_id', user.id).eq('video_url', video.video_url).maybeSingle();
      setIsFavorite(!!data);
    };
    checkFavoriteStatus();
  }, [video.video_url]);
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos"
      });
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      if (isFavorite) {
        const {
          error
        } = await supabase.from("favorites_videos").delete().eq("user_id", user.id).eq("video_url", video.video_url);
        if (error) throw error;
        setIsFavorite(false);
        toast({
          title: "✓ Eliminado de favoritos"
        });
      } else {
        const {
          error
        } = await supabase.from("favorites_videos").insert([{
          user_id: user.id,
          video_url: video.video_url,
          video_data: video as any
        }]);
        if (error) throw error;
        setIsFavorite(true);
        toast({
          title: "✓ Guardado en favoritos"
        });
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const openTikTok = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(video.video_url, '_blank');
  };
  const navigateToProduct = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.product_id) {
      navigate(`/videos/product/${video.product_id}`);
    } else if (video.product_name) {
      navigate(`/products?name=${encodeURIComponent(video.product_name)}`);
    }
  };
  const isTop5 = ranking <= 5;
  return <>
      <Card className="overflow-hidden group bg-card border-border rounded-card transition-card hover:shadow-card-hover" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {/* Video Container - 9:16 aspect ratio */}
        <div className="relative aspect-[9/16] bg-muted card-media">
          {/* Top Icons Bar */}
          <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
            {/* Ranking Badge */}
            <span className={`pointer-events-auto shadow-lg ${isTop5 ? 'badge-position' : 'badge-position-neutral'}`}>
              #{ranking} {isTop5 && '🔥'}
            </span>

            {/* Right Icons */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* TikTok Icon */}
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90" onClick={openTikTok} title="Ver en TikTok">
                <ExternalLink className="h-4 w-4" />
              </Button>

              {/* Favorite Icon */}
              <Button size="icon" variant="ghost" className={`h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 ${isFavorite ? 'text-red-500' : ''}`} onClick={handleToggleFavorite} disabled={loading} title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Video Player - MP4 autoplay on hover */}
          {video.video_mp4_url ? <>
              <video ref={videoRef} src={video.video_mp4_url} className="w-full h-full object-cover" muted loop playsInline poster={video.thumbnail_url || undefined} />
              {/* Play icon overlay when not hovering */}
              {!isHovered && <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                    <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
                  </div>
                </div>}
              
              {/* Earnings per sale badge - bottom left */}
              {earningsPerSale > 0 && <span className="absolute bottom-2 left-2 z-10 label-gain shadow-lg">
                  💰 Gana {formatCurrency(earningsPerSale)} por venta
                </span>}
            </> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted to-muted/80">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-6 h-6 text-muted-foreground ml-1" />
              </div>
            </div>}
        </div>

        {/* Video Info */}
        <CardContent className="p-card space-y-card-gap">
          {/* Title and Creator */}
          <div>
            <h3 className="text-base font-semibold text-foreground line-clamp-1 leading-tight" title={video.title || 'Video TikTok Shop'}>
              {video.title || 'Video TikTok Shop'}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              @{video.creator_handle || video.creator_name || 'creator'}
            </p>
          </div>

          {/* Product Association with Badge - Highlighted */}
          {video.product || video.product_name ? <button onClick={navigateToProduct} className="card-product-embed flex items-center gap-2 w-full hover:bg-muted/50 transition-colors text-left">
              {video.product?.imagen_url ? <img src={video.product.imagen_url} alt={video.product.producto_nombre} className="w-10 h-10 rounded-media object-cover flex-shrink-0 border border-border" /> : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-foreground font-medium line-clamp-2 leading-tight">
                  {video.product?.producto_nombre || video.product_name}
                </span>
                {video.product?.total_ingresos_mxn && <span className="text-[11px] text-muted-foreground">
                    GMV: {formatCurrency(video.product.total_ingresos_mxn)}
                  </span>}
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-auto shrink-0">
                Ver producto →
              </Badge>
            </button> : <div className="card-product-embed flex items-center gap-2 w-full text-left opacity-60">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[13px] text-muted-foreground">
                Sin producto asignado
              </span>
            </div>}

          {/* Metrics Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="metric-box-success">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="h-3.5 w-3.5 text-success" />
                <span className="text-[11px] text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-success">
                {formatCurrency(video.revenue_mxn)}
              </p>
            </div>

            <div className="metric-box-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <ShoppingCart className="h-3.5 w-3.5 text-foreground" />
                <span className="text-[11px] text-muted-foreground">Ventas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.sales)}
              </p>
            </div>

            <div className="metric-box bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[11px] text-muted-foreground">Ganancias Est.</span>
              </div>
              <p className="text-sm font-bold text-amber-600">
                {formatCurrency(commissionEstimated)}
              </p>
            </div>

            <div className="metric-box-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <Eye className="h-3.5 w-3.5 text-foreground" />
                <span className="text-[11px] text-muted-foreground">Vistas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.views)}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90" onClick={() => setShowModal(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Analizar guion y replicar
          </Button>
        </CardContent>
      </Card>

      {/* Analysis Modal */}
      {showModal && <VideoAnalysisModalOriginal isOpen={showModal} onClose={() => setShowModal(false)} video={video} />}
    </>;
};
export default VideoCardOriginal;