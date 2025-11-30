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
    navigate(`/app?productName=${encodeURIComponent(product.producto_nombre)}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg line-clamp-2">
          {product.producto_nombre}
        </CardTitle>
        {product.categoria && (
          <Badge variant="outline" className="w-fit mt-2">
            {product.categoria}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Ingresos</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(product.total_ingresos_mxn)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Ventas</p>
              <p className="font-semibold text-foreground">
                {product.total_ventas ?? "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Precio</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(product.precio_mxn)}
              </p>
            </div>
          </div>

          {product.promedio_roas !== null && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">ROAS Promedio</p>
              <p className="font-bold text-lg text-foreground">
                {product.promedio_roas.toFixed(2)}x
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
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
