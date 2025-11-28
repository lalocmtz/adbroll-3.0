import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Eye, DollarSign, ShoppingCart } from "lucide-react";
import { useState } from "react";
import ScriptModal from "./ScriptModal";

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
    roas: number;
    duracion: string;
    fecha_publicacion: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
  };
  ranking: number;
}

const VideoCard = ({ video, ranking }: VideoCardProps) => {
  const [showScript, setShowScript] = useState(false);

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

  // Extract TikTok video ID from URL for embed
  const getTikTokEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      return `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`;
    }
    return null;
  };

  const embedUrl = getTikTokEmbedUrl(video.tiktok_url);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50">
        {/* TikTok Video Embed */}
        <div className="relative aspect-[9/16] bg-muted">
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 shadow-lg">
              #{ranking}
            </Badge>
          </div>

          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              scrolling="no"
              allow="encrypted-media;"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
              <p className="text-muted-foreground text-sm px-4 text-center">
                {video.descripcion_video}
              </p>
            </div>
          )}
        </div>

        {/* Video Info */}
        <CardContent className="p-4 space-y-3">
          {/* Title and Creator */}
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
              {video.descripcion_video}
            </h3>
            <p className="text-xs text-muted-foreground">
              {video.creador} • {video.duracion}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                Ingresos
              </span>
              <span className="font-bold text-positive">
                {formatCurrency(video.ingresos_mxn)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5" />
                Ventas
              </span>
              <span className="font-semibold text-foreground">
                {formatNumber(video.ventas)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Vistas
              </span>
              <span className="font-semibold text-foreground">
                {formatNumber(video.visualizaciones)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                ROAS
              </span>
              <span className="font-semibold text-foreground">
                ↗ {video.roas.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            className="w-full mt-2" 
            variant="outline"
            onClick={() => setShowScript(true)}
            disabled={!video.transcripcion_original && !video.guion_ia}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver guión AI
          </Button>
        </CardContent>
      </Card>

      <ScriptModal
        isOpen={showScript}
        onClose={() => setShowScript(false)}
        video={video}
      />
    </>
  );
};

export default VideoCard;
