import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, Eye, DollarSign, ShoppingCart, ExternalLink } from "lucide-react";
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
    roas: number;
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

  return (
    <>
      <Card className="card-premium overflow-hidden group">
        {/* TikTok Embed Player */}
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

          {/* Product Info - Enhanced with full product data */}
          {(video.producto_nombre || productData) && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 space-y-3">
              <div className="flex items-start gap-3">
                {productData?.imagen_url && (
                  <img
                    src={productData.imagen_url}
                    alt={productData.producto_nombre}
                    className="h-16 w-16 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-primary mb-1">Producto</p>
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                    {productData?.producto_nombre || video.producto_nombre}
                  </p>
                  {productData?.categoria && (
                    <Badge variant="secondary" className="text-xs">
                      {productData.categoria}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Product Metrics */}
              {(productData?.price || productData?.commission) && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-primary/10">
                  {productData.price && (
                    <div>
                      <p className="text-xs text-muted-foreground">Precio</p>
                      <p className="text-sm font-bold text-foreground">
                        ${productData.price.toFixed(2)}
                      </p>
                    </div>
                  )}
                  {productData.commission && (
                    <div>
                      <p className="text-xs text-muted-foreground">Comisión</p>
                      <p className="text-sm font-bold text-accent">
                        {productData.commission}%
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(productData?.producto_url || video.producto_url) && (
                <a
                  href={productData?.producto_url || video.producto_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  Ver producto en TikTok Shop
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          )}

          {/* Product Revenue & Sales Estimation */}
          {video.product_id && video.product_price && video.product_sales ? (
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20 space-y-2">
              <p className="text-xs font-semibold text-accent mb-2">Estimaciones del Producto</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Revenue Estimado</p>
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(video.product_price * video.product_sales)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ventas por Video</p>
                  <p className="text-sm font-bold text-foreground">
                    {formatNumber(Math.floor(video.product_sales / Math.max(1, video.product_sales / video.ventas)))}
                  </p>
                </div>
              </div>
            </div>
          ) : video.producto_nombre ? (
            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">Sin datos de producto</p>
            </div>
          ) : null}

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
