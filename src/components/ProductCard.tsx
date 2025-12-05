import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, TrendingUp, Heart } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  product: {
    id: string;
    producto_nombre: string;
    total_ingresos_mxn: number | null;
    total_ventas: number | null;
    precio_mxn: number | null;
    promedio_roas: number | null;
    categoria: string | null;
    producto_url: string | null;
    cover_image?: string | null;
    imagen_url?: string | null;
    commission?: number | null;
  };
  showRelatedVideos?: boolean;
  ranking?: number;
}

const formatCurrency = (amount: number | null) => {
  if (amount === null) return "N/A";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number | null): string => {
  if (num === null) return "N/A";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("es-MX");
};

const ProductCard = ({ product, showRelatedVideos = false, ranking }: ProductCardProps) => {
  const navigate = useNavigate();
  const imageUrl = product.cover_image || product.imagen_url;
  const commissionRate = product.commission || 6;
  const earningsPerSale = (product.precio_mxn || 0) * (commissionRate / 100);

  const handleViewRelatedVideos = () => {
    navigate(`/videos/product/${product.id}`);
  };

  return (
    <div className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-4 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 group">
      {/* Product Image - 1:1 aspect ratio */}
      <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden mb-3">
        {ranking && (
          <span className={`absolute top-3 left-3 z-10 text-[13px] font-bold px-2.5 py-1 rounded-full shadow-lg ${
            ranking <= 5 
              ? 'bg-gradient-to-r from-[#F31260] to-[#DA0C5E] text-white' 
              : 'bg-white/95 text-[#0F172A] border border-[#E2E8F0]'
          }`}>
            #{ranking} {ranking <= 5 && '🔥'}
          </span>
        )}
        
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.producto_nombre}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <ShoppingCart className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {/* Earnings badge */}
        {earningsPerSale > 0 && (
          <span className="absolute bottom-3 left-3 z-10 bg-[#EEF2FF] text-[#6366F1] text-xs font-medium px-2 py-1 rounded-md shadow-sm">
            💰 Gana {formatCurrency(earningsPerSale)} por venta
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {/* Title and Category */}
        <div>
          <h3 className="text-[15px] font-semibold text-[#0F172A] dark:text-foreground line-clamp-2 leading-snug">
            {product.producto_nombre}
          </h3>
          {product.categoria && (
            <p className="text-[13px] text-[#94A3B8] mt-0.5">{product.categoria}</p>
          )}
        </div>

        {/* Price badge */}
        {product.precio_mxn && (
          <span className="inline-block bg-[#EEF2FF] text-[#6366F1] text-xs font-medium px-2 py-1 rounded-md">
            {formatCurrency(product.precio_mxn)}
          </span>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-[#ECFDF5] dark:bg-success/10">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-[#475569]" />
              <span className="text-[11px] text-[#94A3B8]">Ingresos</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
              {formatCurrency(product.total_ingresos_mxn)}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="h-3.5 w-3.5 text-[#475569]" />
              <span className="text-[11px] text-[#94A3B8]">Ventas</span>
            </div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
              {formatNumber(product.total_ventas)}
            </p>
          </div>

          {product.promedio_roas !== null && (
            <div className="p-2.5 rounded-xl bg-[#F0F9FF] dark:bg-accent/10 col-span-2">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-[#475569]" />
                <span className="text-[11px] text-[#94A3B8]">ROAS Promedio</span>
              </div>
              <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                {product.promedio_roas.toFixed(1)}x
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <FavoriteButton itemId={product.id} itemType="product" variant="outline" />
          {showRelatedVideos && (
            <Button 
              className="flex-1 h-10"
              onClick={handleViewRelatedVideos}
            >
              Ver videos relacionados
            </Button>
          )}
          {product.producto_url && !showRelatedVideos && (
            <Button 
              variant="secondary" 
              className="flex-1 h-10"
              onClick={() => window.open(product.producto_url!, "_blank")}
            >
              Ver Producto
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
