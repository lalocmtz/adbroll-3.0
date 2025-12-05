import { useState, useRef, useEffect } from 'react';
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

const VideoCardOriginal = ({ video, ranking }: VideoCardOriginalProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const commissionRate = video.product?.commission || 6;
  const commissionEstimated = (video.revenue_mxn || 0) * (commissionRate / 100);
  const productPrice = video.product?.price || video.product?.precio_mxn || 0;
  const earningsPerSale = productPrice * (commissionRate / 100);

  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('favorites_videos').select('id').eq('user_id', user.id).eq('video_url', video.video_url).maybeSingle();
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para guardar favoritos" });
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      if (isFavorite) {
        const { error } = await supabase.from("favorites_videos").delete().eq("user_id", user.id).eq("video_url", video.video_url);
        if (error) throw error;
        setIsFavorite(false);
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { error } = await supabase.from("favorites_videos").insert([{ user_id: user.id, video_url: video.video_url, video_data: video as any }]);
        if (error) throw error;
        setIsFavorite(true);
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  return (
    <>
      <div 
        className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Video Container - 4:5 aspect ratio */}
        <div className="relative aspect-[4/5] bg-muted rounded-2xl overflow-hidden mb-3">
          {/* Top Icons Bar */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            {/* Ranking Badge */}
            <span className={`pointer-events-auto text-[13px] font-bold px-2.5 py-1 rounded-full shadow-lg ${
              isTop5 
                ? 'bg-gradient-to-r from-[#F31260] to-[#DA0C5E] text-white' 
                : 'bg-white/95 text-[#0F172A] border border-[#E2E8F0]'
            }`}>
              #{ranking} {isTop5 && '🔥'}
            </span>

            {/* Right Icons */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button 
                onClick={openTikTok}
                className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <ExternalLink className="h-[18px] w-[18px] text-[#CBD5E1] hover:text-[#1E293B] transition-colors" />
              </button>
              <button 
                onClick={handleToggleFavorite}
                disabled={loading}
                className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
              >
                <Heart className={`h-[18px] w-[18px] transition-colors ${isFavorite ? 'text-[#F31260] fill-[#F31260]' : 'text-[#CBD5E1] hover:text-[#1E293B]'}`} />
              </button>
            </div>
          </div>

          {/* Video Player */}
          {video.video_mp4_url ? (
            <>
              <video 
                ref={videoRef}
                src={video.video_mp4_url}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                muted
                loop
                playsInline
                poster={video.thumbnail_url || undefined}
              />
              {!isHovered && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-[#0F172A] ml-1" fill="currentColor" />
                  </div>
                </div>
              )}
              {earningsPerSale > 0 && (
                <span className="absolute bottom-3 left-3 z-10 bg-[#EEF2FF] text-[#6366F1] text-xs font-medium px-2 py-1 rounded-md shadow-sm">
                  💰 Gana {formatCurrency(earningsPerSale)} por venta
                </span>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted to-muted/80">
              <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center">
                <Play className="w-7 h-7 text-muted-foreground ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          {/* Title and Creator */}
          <div>
            <h3 className="text-[15px] font-semibold text-[#0F172A] dark:text-foreground line-clamp-2 leading-snug" title={video.title || 'Video TikTok Shop'}>
              {video.title || 'Video TikTok Shop'}
            </h3>
            <p className="text-[13px] text-[#94A3B8] mt-0.5">
              @{video.creator_handle || video.creator_name || 'creator'}
            </p>
          </div>

          {/* Product Association */}
          {video.product || video.product_name ? (
            <button 
              onClick={navigateToProduct}
              className="flex items-center gap-2.5 w-full p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-muted/50 hover:bg-[#F1F5F9] dark:hover:bg-muted transition-colors text-left"
            >
              {video.product?.imagen_url ? (
                <img src={video.product.imagen_url} alt={video.product.producto_nombre} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#E2E8F0]" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#F31260]/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="h-5 w-5 text-[#F31260]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[13px] text-[#0F172A] dark:text-foreground font-medium line-clamp-1">
                  {video.product?.producto_nombre || video.product_name}
                </span>
                {video.product?.total_ingresos_mxn && (
                  <span className="text-[11px] text-[#94A3B8]">GMV: {formatCurrency(video.product.total_ingresos_mxn)}</span>
                )}
              </div>
              <span className="text-[11px] text-[#94A3B8] shrink-0">Ver →</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full p-2 rounded-xl bg-[#F8FAFC] dark:bg-muted/30 opacity-60">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[13px] text-muted-foreground">Sin producto asignado</span>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] dark:bg-success/10">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-[#475569]" />
                <span className="text-[11px] text-[#94A3B8]">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                {formatCurrency(video.revenue_mxn)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingCart className="h-3.5 w-3.5 text-[#475569]" />
                <span className="text-[11px] text-[#94A3B8]">Ventas</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                {formatNumber(video.sales)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/30">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-[#475569]" />
                <span className="text-[11px] text-[#94A3B8]">Ganancias Est.</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                {formatCurrency(commissionEstimated)}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3.5 w-3.5 text-[#475569]" />
                <span className="text-[11px] text-[#94A3B8]">Vistas</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                {formatNumber(video.views)}
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            className="w-full h-11"
            onClick={() => setShowModal(true)}
          >
            <Sparkles className="h-4 w-4" />
            Analizar guion y replicar
          </Button>
        </div>
      </div>

      {showModal && <VideoAnalysisModalOriginal isOpen={showModal} onClose={() => setShowModal(false)} video={video} />}
    </>
  );
};

export default VideoCardOriginal;
