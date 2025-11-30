import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  producto_nombre: string;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  precio_mxn: number | null;
  promedio_roas: number | null;
  categoria: string | null;
  producto_url: string | null;
  created_at: string | null;
}

const Products = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("total_ingresos_mxn", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
      
      if (data && data.length > 0 && data[0].created_at) {
        setLastUpdate(new Date(data[0].created_at));
      }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
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
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Productos TikTok Shop México
          </h2>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Última actualización:{" "}
              {lastUpdate.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                No hay productos disponibles. Sube un archivo desde el panel de administración.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-2">
                    {product.producto_nombre}
                  </CardTitle>
                  {product.categoria && (
                    <p className="text-sm text-muted-foreground">{product.categoria}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ingresos:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(product.total_ingresos_mxn)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ventas:</span>
                      <span className="font-semibold text-foreground">
                        {product.total_ventas ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Precio:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(product.precio_mxn)}
                      </span>
                    </div>
                    {product.promedio_roas !== null && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">ROAS:</span>
                        <span className="font-semibold text-foreground">
                          {product.promedio_roas.toFixed(2)}x
                        </span>
                      </div>
                    )}
                  </div>
                  {product.producto_url && (
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => window.open(product.producto_url!, "_blank")}
                    >
                      Ver Producto
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
