import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Eye, DollarSign, ShoppingCart, ExternalLink } from "lucide-react";
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
  const [videoError, setVideoError] = useState(false);

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

  return (
    <>
      <Card className="card-premium overflow-hidden group">
        {/* Video Player */}
        <div className="relative aspect-[9/16] bg-muted overflow-hidden">
          {/* Ranking Badge */}
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-primary text-primary-foreground font-bold text-base px-3 py-1 shadow-lg">
              #{ranking}
            </Badge>
          </div>

          {/* Ver en TikTok Button - Small and Discrete */}
          <div className="absolute bottom-3 right-3 z-20">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-xs shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
              onClick={() => window.open(video.tiktok_url, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              TikTok
            </Button>
          </div>

          {/* Native HTML5 Video Player */}
          {!videoError ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              src={video.tiktok_url}
              className="w-full h-full object-cover rounded-t-xl"
              onError={() => setVideoError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/50 p-6">
              <div className="rounded-full bg-background/50 p-4 mb-4">
                <svg className="h-10 w-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground text-center mb-1">
                Video no disponible
              </p>
              <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                El video no pudo ser cargado
              </p>
            </div>
          )}
        </div>

        {/* Video Info */}
        <CardContent className="p-5 space-y-4">
          {/* Title and Creator */}
          <div>
            <h3 className="text-base font-bold text-foreground line-clamp-2 leading-snug mb-2">
              {video.descripcion_video}
            </h3>
            <p className="text-sm text-muted-foreground">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-base font-bold text-success">
                {formatCurrency(video.ingresos_mxn)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="h-4 w-4 text-foreground" />
                <span className="text-xs text-muted-foreground">Ventas</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {formatNumber(video.ventas)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-foreground" />
                <span className="text-xs text-muted-foreground">Vistas</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {formatNumber(video.visualizaciones)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">ROAS</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {video.roas.toFixed(1)}x
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1" 
              variant="default"
              onClick={() => setShowScript(true)}
              disabled={!video.transcripcion_original && !video.guion_ia}
            >
              <FileText className="h-4 w-4 mr-2" />
              Ver guión AI
            </Button>
            <FavoriteButton itemId={video.id} itemType="video" videoUrl={video.tiktok_url} />
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
