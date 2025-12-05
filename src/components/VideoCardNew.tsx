import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, ShoppingCart, DollarSign, Play } from 'lucide-react';
import { VideoAnalysisModalNew } from './VideoAnalysisModalNew';

interface Video {
  id: string;
  video_url: string;
  video_mp4_url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
  views?: number | null;
  sales?: number | null;
  revenue_mxn?: number | null;
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
  processing_status?: string | null;
}

interface VideoCardNewProps {
  video: Video;
  ranking: number;
}

function formatNumber(num: number | null | undefined): string {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(num: number | null | undefined): string {
  if (!num) return '$0';
  return `$${formatNumber(num)}`;
}

export function VideoCardNew({ video, ranking }: VideoCardNewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (videoRef.current && video.video_mp4_url) {
      videoRef.current.muted = false;
      videoRef.current.volume = 0.7;
      videoRef.current.play().catch(() => {
        // Autoplay with sound blocked, try muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  }, [video.video_mp4_url]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
  }, []);

  const handleClick = () => {
    setShowModal(true);
  };

  const isTop5 = ranking <= 5;

  return (
    <>
      <Card
        className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-card border-border"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Video Container */}
        <div className="relative aspect-[9/16] bg-muted overflow-hidden">
          {video.video_mp4_url ? (
            <video
              ref={videoRef}
              src={video.video_mp4_url}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              poster={video.thumbnail_url || undefined}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="w-12 h-12 text-muted-foreground" />
              <span className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                Video no descargado
              </span>
            </div>
          )}

          {/* Ranking Badge */}
          <Badge 
            className={`absolute top-2 left-2 ${
              isTop5 
                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                : 'bg-background/80 text-foreground'
            }`}
          >
            {isTop5 && '🔥'} #{ranking}
          </Badge>

          {/* Hover Overlay */}
          <div 
            className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 pointer-events-none ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              {/* Creator */}
              <p className="text-sm font-medium truncate">
                {video.creator_name || video.creator_handle || 'Creador'}
              </p>
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatNumber(video.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />
                  <span>{formatNumber(video.sales)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{formatCurrency(video.revenue_mxn)}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-3 text-center">
                <span className="text-xs font-medium bg-white/20 px-3 py-1 rounded-full">
                  Click para analizar guión
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer - Always visible */}
        <div className="p-3 bg-card">
          <p className="text-sm font-medium truncate text-foreground">
            {video.title || 'Video TikTok'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{video.creator_handle || video.creator_name || 'creator'}
          </p>
        </div>
      </Card>

      {/* Analysis Modal */}
      <VideoAnalysisModalNew
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        video={video}
      />
    </>
  );
}
