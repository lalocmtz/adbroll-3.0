import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, DollarSign, ShoppingCart, ExternalLink, Percent, Video } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ScriptModal from "./ScriptModal";
import FavoriteButton from "./FavoriteButton";
import { supabase } from "@/integrations/supabase/client";

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
  const [showScript, setShowScript] = useState(false);
  const [productData, setProductData] = useState<ProductData | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load TikTok embed script
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  useEffect(() => {
    // Load product data if producto_nombre matches
    const loadProductData = async () => {
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
    };

    loadProductData();
  }, [video.producto_nombre]);

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

  // Calculate commission estimated
  const commissionEstimated = productData?.commission 
    ? video.ingresos_mxn * (productData.commission / 100)
    : null;

  return (
    <>
      <Card className="card-premium overflow-hidden group">
        {/* TikTok Embed Player */}
        <div className="relative aspect-[9/16] bg-muted overflow-hidden">
          {/* Ranking Badge */}
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-primary text-primary-foreground font-bold text-sm px-2 py-0.5 shadow-lg">
              #{ranking} {ranking <= 5 && "🔥"}
            </Badge>
          </div>


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
        <CardContent className="p-3 space-y-2">
          {/* Title and Creator */}
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug mb-1">
              {video.descripcion_video}
            </h3>
            <p className="text-xs text-muted-foreground">
              {video.creador} • {video.duracion}
            </p>
          </div>

          {/* Product Info - Compact */}
          {(video.producto_nombre || productData) && (
            <div className="p-2 bg-primary/5 rounded-md border border-primary/10">
              <div className="flex items-center gap-2">
                {productData?.imagen_url && (
                  <img
                    src={productData.imagen_url}
                    alt={productData.producto_nombre}
                    className="h-10 w-10 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-1">
                    {productData?.producto_nombre || video.producto_nombre}
                  </p>
                  {productData?.categoria && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 mt-0.5">
                      {productData.categoria}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}


          {/* Metrics Grid - 2x2 Compact */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded-md bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1 mb-0.5">
                <DollarSign className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-muted-foreground">Ingresos</span>
              </div>
              <p className="text-sm font-bold text-success">
                {formatCurrency(video.ingresos_mxn)}
              </p>
            </div>

            <div className="p-2 rounded-md bg-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <ShoppingCart className="h-3 w-3 text-foreground" />
                <span className="text-[10px] text-muted-foreground">Ventas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.ventas)}
              </p>
            </div>

            <div className="p-2 rounded-md bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-1 mb-0.5">
                <Percent className="h-3 w-3 text-accent" />
                <span className="text-[10px] text-muted-foreground">Comisión Est.</span>
              </div>
              <p className="text-sm font-bold text-accent">
                {commissionEstimated ? formatCurrency(commissionEstimated) : "--"}
              </p>
            </div>

            <div className="p-2 rounded-md bg-muted">
              <div className="flex items-center gap-1 mb-0.5">
                <Eye className="h-3 w-3 text-foreground" />
                <span className="text-[10px] text-muted-foreground">Vistas</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {formatNumber(video.visualizaciones)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5">
            <Button
              className="w-full h-8 text-xs" 
              variant="default"
              onClick={() => setShowScript(true)}
            >
              <FileText className="h-3 w-3 mr-1.5" />
              Ver guion + variantes
            </Button>
            
            <div className="flex gap-1.5">
              <Button
                className="flex-1 h-7 text-xs" 
                variant="outline"
                onClick={() => window.open(video.tiktok_url, '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Ver en TikTok
              </Button>
              <Button
                className="flex-1 h-7 text-xs" 
                variant="outline"
              >
                <Video className="h-3 w-3 mr-1" />
                Transcribir
              </Button>
              <FavoriteButton itemId={video.id} itemType="video" videoUrl={video.tiktok_url} />
            </div>
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
