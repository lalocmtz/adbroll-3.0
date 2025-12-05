import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  rank: number | null;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  precio_mxn: number | null;
  price: number | null;
  commission: number | null;
  commission_amount: number | null;
  categoria: string | null;
  revenue_7d: number | null;
  revenue_30d: number | null;
  sales_7d: number | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  creators_count: number | null;
  rating: number | null;
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";

const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("rank", { ascending: true, nullsFirst: false })
        .limit(20);

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error al cargar productos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const getCommissionAmount = (product: Product): number | null => {
    // First try the stored commission_amount
    if (product.commission_amount) return product.commission_amount;
    
    // Calculate from price and rate
    const price = product.price || product.precio_mxn;
    const rate = product.commission || 6; // Default 6%
    if (!price) return null;
    return price * (rate / 100);
  };

  const getRevenue = (product: Product): number | null => {
    return product.revenue_7d || product.total_ingresos_mxn || product.revenue_30d;
  };

  const getSales = (product: Product): number | null => {
    return product.sales_7d || product.total_ventas;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Top 20 Productos TikTok Shop
          </h1>
          <p className="text-muted-foreground">
            Los productos más rentables para promocionar como creador
          </p>
        </div>

        {products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay productos disponibles. El administrador debe importar el archivo de productos.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-muted">
                  <img
                    src={product.imagen_url || PLACEHOLDER_IMAGE}
                    alt={product.producto_nombre}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold">
                    #{product.rank || index + 1}
                  </Badge>
                  {product.rating && (
                    <Badge variant="secondary" className="absolute top-2 right-2 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {product.rating.toFixed(1)}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Product Name */}
                  <h3 className="font-semibold text-foreground line-clamp-1" title={product.producto_nombre}>
                    {product.producto_nombre}
                  </h3>
                  
                  {/* Category */}
                  {product.categoria && (
                    <Badge variant="outline" className="text-xs">
                      {product.categoria}
                    </Badge>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Revenue 7d - Ingresos */}
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground uppercase">Ingresos 7d</span>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(getRevenue(product))}
                      </p>
                    </div>

                    {/* Sales 7d - Ventas */}
                    <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                      <div className="flex items-center gap-1 mb-0.5">
                        <ShoppingCart className="h-3 w-3 text-accent-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase">Ventas 7d</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatNumber(getSales(product))}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-1 mb-0.5">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase">Precio</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(product.price || product.precio_mxn)}
                      </p>
                    </div>

                    {/* Commission */}
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Percent className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground uppercase">Comisión</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {product.commission ? `${product.commission}%` : "6%"} 
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({formatCurrency(getCommissionAmount(product))})
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Creators count */}
                  {product.creators_count && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{formatNumber(product.creators_count)} creadores activos</span>
                    </div>
                  )}

                  {/* CTA Button */}
                  {product.producto_url && (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => window.open(product.producto_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en TikTok Shop
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
