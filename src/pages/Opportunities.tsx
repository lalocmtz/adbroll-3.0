import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
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
      <GlobalHeader />
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Oportunidades de Productos
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Productos con alto potencial de venta seleccionados automáticamente
          </p>
          <Badge variant="secondary" className="text-sm">
            {opportunities.length} oportunidades encontradas
          </Badge>
        </div>

        {opportunities.length === 0 ? (
          <Card className="p-12 text-center">
            <TrendingUp className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No se encontraron oportunidades. Sube datos de productos desde el admin.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {opportunities.map((product) => (
              <ProductCard key={product.id} product={product} showRelatedVideos />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Opportunities;
