import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/hooks/use-toast";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: string;
  producto_nombre: string;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  precio_mxn: number | null;
  promedio_roas: number | null;
  categoria: string | null;
  producto_url: string | null;
}

const Opportunities = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunities, setOpportunities] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*");

      if (error) throw error;

      // Filter products that meet opportunity criteria
      const filtered = (data || []).filter((product) => {
        const hasRevenue = (product.total_ingresos_mxn ?? 0) > 0;
        const hasSales = (product.total_ventas ?? 0) > 0;
        const priceInRange = 
          product.precio_mxn !== null && 
          product.precio_mxn >= 150 && 
          product.precio_mxn <= 1500;

        return hasRevenue || hasSales || priceInRange;
      });

      // Sort by revenue descending
      filtered.sort((a, b) => 
        (b.total_ingresos_mxn ?? 0) - (a.total_ingresos_mxn ?? 0)
      );

      setOpportunities(filtered);
    } catch (error: any) {
      toast({
        title: "Error al cargar oportunidades",
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando oportunidades...</p>
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
            Oportunidades de Productos
          </h2>
          <p className="text-muted-foreground">
            Productos con alto potencial de venta seleccionados automáticamente
          </p>
        </div>

        {opportunities.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                No se encontraron oportunidades. Sube datos de productos desde el admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                {opportunities.length} oportunidades encontradas
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {opportunities.map((product) => (
                <ProductCard key={product.id} product={product} showRelatedVideos />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Opportunities;
