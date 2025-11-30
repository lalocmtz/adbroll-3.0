import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Eye, DollarSign, ShoppingCart } from "lucide-react";
import { useState } from "react";
import ScriptModal from "./ScriptModal";
import FavoriteButton from "./FavoriteButton";

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
    producto_nombre: string | null;
    producto_url: string | null;
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

  // Extract TikTok video ID from URL for embed with better params
  const getTikTokEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/video\/(\d+)/);
    if (videoIdMatch) {
      // Use embed with minimal UI for better control visibility
      return `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?lang=es-ES`;
    }
    return null;
  };

  const embedUrl = getTikTokEmbedUrl(video.tiktok_url);

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 border-border/50">
        {/* TikTok Video Embed */}
        <div className="relative aspect-[9/16] bg-muted group">
          <div className="absolute top-3 left-3 z-10">
            <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 shadow-lg">
              #{ranking}
            </Badge>
          </div>

          {/* Botón Ver en TikTok - Siempre visible */}
          <div className="absolute top-3 right-3 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-lg backdrop-blur-sm bg-background/90 hover:bg-background"
              onClick={() => window.open(video.tiktok_url, '_blank')}
            >
              <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              Ver en TikTok
            </Button>
          </div>

          {embedUrl ? (
            <div className="relative w-full h-full overflow-hidden">
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allowFullScreen
                scrolling="no"
                allow="encrypted-media; autoplay;"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                loading="lazy"
                style={{ 
                  border: 'none',
                  overflow: 'hidden'
                }}
                onError={(e) => {
                  // Si el iframe falla al cargar, mostrar fallback
                  const target = e.target as HTMLIFrameElement;
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `
                      <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                        <svg class="h-12 w-12 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                        </svg>
                        <p class="text-sm text-muted-foreground text-center mb-2">Video no disponible para previsualización</p>
                        <p class="text-xs text-muted-foreground text-center">${video.descripcion_video}</p>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 p-4">
              <svg className="h-12 w-12 text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
              <p className="text-sm text-muted-foreground text-center mb-2">
                Video no disponible
              </p>
              <p className="text-xs text-muted-foreground text-center">
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

          {/* Product Info - If Available */}
          {(video.producto_nombre || video.producto_url) && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-1">Producto</p>
              {video.producto_nombre && (
                <p className="text-sm font-medium text-foreground mb-1">
                  {video.producto_nombre}
                </p>
              )}
              {video.producto_url && (
                <a
                  href={video.producto_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Ver producto
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          )}

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
          <div className="flex gap-2">
            <FavoriteButton itemId={video.id} itemType="video" variant="outline" />
            <Button 
              className="flex-1" 
              variant="outline"
              onClick={() => setShowScript(true)}
              disabled={!video.transcripcion_original && !video.guion_ia}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver guión AI
            </Button>
          </div>
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
