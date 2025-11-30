import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
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
  };
  showRelatedVideos?: boolean;
}

const ProductCard = ({ product, showRelatedVideos = false }: ProductCardProps) => {
  const navigate = useNavigate();

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewRelatedVideos = () => {
    navigate(`/videos/product/${product.id}`);
  };

  return (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg md:text-xl line-clamp-2 mb-2">
              {product.producto_nombre}
            </CardTitle>
            {product.categoria && (
              <Badge variant="outline" className="w-fit">
                {product.categoria}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Ingresos</span>
            </div>
            <p className="text-base font-bold text-success">
              {formatCurrency(product.total_ingresos_mxn)}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-foreground" />
              <span className="text-xs text-muted-foreground">Ventas</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {product.total_ventas ?? "N/A"}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <span className="text-xs text-muted-foreground">Precio</span>
            </div>
            <p className="text-base font-bold text-foreground">
              {formatCurrency(product.precio_mxn)}
            </p>
          </div>

          {product.promedio_roas !== null && (
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">ROAS</span>
              </div>
              <p className="text-base font-bold text-foreground">
                {product.promedio_roas.toFixed(2)}x
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <FavoriteButton itemId={product.id} itemType="product" variant="outline" />
          {showRelatedVideos && (
            <Button 
              variant="default" 
              className="flex-1"
              onClick={handleViewRelatedVideos}
            >
              Ver videos relacionados
            </Button>
          )}
          {product.producto_url && !showRelatedVideos && (
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.open(product.producto_url!, "_blank")}
            >
              Ver Producto
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
