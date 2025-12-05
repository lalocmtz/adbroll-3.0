import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, Users, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  precio_mxn: number | null;
  commission: number | null;
  categoria: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  promedio_roas: number | null;
}

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
        .order("total_ingresos_mxn", { ascending: false })
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
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat("es-MX").format(num);
  };

  // Calculate commission in MXN
  const calculateCommission = (price: number | null, commissionRate: number | null) => {
    if (price === null) return null;
    const rate = commissionRate ?? 6; // Default 6%
    return price * (rate / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Top 20 Productos TikTok Shop
          </h1>
          <p className="text-muted-foreground">
            Productos más rentables para promocionar como creador
          </p>
        </div>

        {products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay productos disponibles. Los productos se cargan desde el panel de administración.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => {
              const commissionMxn = calculateCommission(product.precio_mxn, product.commission);
              
              return (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    {product.imagen_url ? (
                      <img
                        src={product.imagen_url}
                        alt={product.producto_nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold">
                      #{index + 1}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Product Name & Category */}
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-2 text-sm">
                        {product.producto_nombre}
                      </h3>
                      {product.categoria && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {product.categoria}
                        </Badge>
                      )}
                    </div>

                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Revenue */}
                      <div className="p-2 rounded bg-success/10 border border-success/20">
                        <div className="flex items-center gap-1 mb-0.5">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span className="text-[10px] text-muted-foreground">Ingresos 7d</span>
                        </div>
                        <p className="text-sm font-bold text-success">
                          {formatCurrency(product.total_ingresos_mxn)}
                        </p>
                      </div>

                      {/* Sales */}
                      <div className="p-2 rounded bg-muted">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ShoppingCart className="h-3 w-3 text-foreground" />
                          <span className="text-[10px] text-muted-foreground">Ventas 7d</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {formatNumber(product.total_ventas)}
                        </p>
                      </div>

                      {/* Price */}
                      <div className="p-2 rounded bg-primary/5 border border-primary/10">
                        <div className="flex items-center gap-1 mb-0.5">
                          <DollarSign className="h-3 w-3 text-primary" />
                          <span className="text-[10px] text-muted-foreground">Precio</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(product.precio_mxn)}
                        </p>
                      </div>

                      {/* Commission */}
                      <div className="p-2 rounded bg-accent/10 border border-accent/20">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Percent className="h-3 w-3 text-accent" />
                          <span className="text-[10px] text-muted-foreground">Comisión</span>
                        </div>
                        <p className="text-sm font-bold text-accent">
                          {product.commission ? `${product.commission}%` : "6%"}
                          {commissionMxn && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              ({formatCurrency(commissionMxn)})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* ROAS if available */}
                    {product.promedio_roas !== null && product.promedio_roas > 0 && (
                      <div className="p-2 rounded bg-muted flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">ROAS Promedio</span>
                        <span className="text-sm font-bold text-foreground">
                          {product.promedio_roas.toFixed(1)}x
                        </span>
                      </div>
                    )}

                    {/* CTA Button */}
                    {product.producto_url && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(product.producto_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver en TikTok Shop
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;
