import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp } from "lucide-react";
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
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative aspect-[9/16] bg-muted">
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-primary text-primary-foreground font-bold text-lg px-3 py-1">
              #{ranking}
            </Badge>
          </div>

          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <p className="text-muted-foreground text-sm">Video de TikTok</p>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {video.descripcion_video}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {video.creador} • {video.duracion}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ingresos</span>
              <span className="text-sm font-bold text-positive">
                {formatCurrency(video.ingresos_mxn)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Ventas</span>
              <span className="text-sm font-semibold text-foreground">
                {formatNumber(video.ventas)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Vistas</span>
              <span className="text-sm font-semibold text-foreground">
                {formatNumber(video.visualizaciones)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">ROAS</span>
              <span className="text-sm font-semibold text-foreground flex items-center">
                <TrendingUp className="h-3 w-3 mr-1 text-positive" />
                {video.roas}x
              </span>
            </div>
          </div>

          <Button 
            className="w-full" 
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
