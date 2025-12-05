import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gem, TrendingUp, Users, DollarSign, Percent, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { DataSubtitle } from "@/components/FilterPills";
import { useNavigate } from "react-router-dom";

interface OpportunityProduct {
  id: string;
  producto_nombre: string;
  producto_url: string | null;
  categoria: string | null;
  imagen_url: string | null;
  precio_mxn: number | null;
  commission: number | null;
  gmv_30d_mxn: number | null;
  creators_active_30d: number | null;
  opportunity_index: number | null;
  is_hidden_gem: boolean | null;
}

const Opportunities = () => {
  const { toast } = useToast();
  const { language, currency } = useLanguage();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<OpportunityProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      // Use the product_opportunities view with IO calculation
      const { data, error } = await supabase
        .from("product_opportunities")
        .select("id, producto_nombre, producto_url, categoria, imagen_url, precio_mxn, commission, gmv_30d_mxn, creators_active_30d, opportunity_index, is_hidden_gem")
        .eq("is_hidden_gem", true)
        .order("opportunity_index", { ascending: false })
        .limit(50);

      if (error) throw error;

      setOpportunities(data || []);
    } catch (error: any) {
      console.error("Error fetching opportunities:", error);
      toast({
        title: language === "es" ? "Error al cargar" : "Error loading",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null, curr: string = "MXN") => {
    if (amount === null) return "-";
    const value = curr === "USD" ? amount / 20 : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">
          {language === "es" ? "Cargando oportunidades..." : "Loading opportunities..."}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      <DataSubtitle />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Gem className="h-5 w-5 text-yellow-500" />
          <h1 className="text-xl font-bold">
            {language === "es" ? "Gemas Ocultas" : "Hidden Gems"}
          </h1>
          <Badge variant="secondary" className="ml-2">
            {opportunities.length} {language === "es" ? "encontradas" : "found"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {language === "es" 
            ? "Productos con alta comisión (>15%), ventas activas y baja competencia (<50 creadores)"
            : "Products with high commission (>15%), active sales, and low competition (<50 creators)"}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card className="p-12 text-center">
          <Gem className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
          <p className="text-muted-foreground">
            {language === "es" 
              ? "No se encontraron gemas ocultas. Los productos deben tener comisión >15%, GMV >0 y <50 creadores activos."
              : "No hidden gems found. Products must have commission >15%, GMV >0, and <50 active creators."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {opportunities.map((product, index) => (
            <Card 
              key={product.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer"
              onClick={() => navigate(`/videos/product/${product.id}`)}
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted">
                {product.imagen_url ? (
                  <img 
                    src={product.imagen_url} 
                    alt={product.producto_nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gem className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* IO Badge */}
                <div className="absolute top-2 left-2">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1">
                    <TrendingUp className="h-3 w-3" />
                    IO: {formatNumber(product.opportunity_index)}
                  </Badge>
                </div>

                {/* Rank Badge */}
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="font-bold">
                    #{index + 1}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {product.producto_nombre}
                </h3>

                {product.categoria && (
                  <Badge variant="outline" className="text-xs mb-2">
                    {product.categoria}
                  </Badge>
                )}

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-2 rounded bg-green-50 dark:bg-green-950/30">
                    <Percent className="h-3.5 w-3.5 text-green-600" />
                    <div>
                      <p className="font-bold text-green-700 dark:text-green-400">
                        {product.commission ? `${product.commission}%` : "-"}
                      </p>
                      <p className="text-muted-foreground text-[10px]">Comisión</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                    <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                    <div>
                      <p className="font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(product.gmv_30d_mxn, currency)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">GMV 30d</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded bg-purple-50 dark:bg-purple-950/30">
                    <Users className="h-3.5 w-3.5 text-purple-600" />
                    <div>
                      <p className="font-bold text-purple-700 dark:text-purple-400">
                        {product.creators_active_30d ?? 0}
                      </p>
                      <p className="text-muted-foreground text-[10px]">Creadores</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="font-bold">
                        {formatCurrency(product.precio_mxn, currency)}
                      </p>
                      <p className="text-muted-foreground text-[10px]">Precio</p>
                    </div>
                  </div>
                </div>

                {/* Estimated Commission */}
                {product.precio_mxn && product.commission && (
                  <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/50 dark:to-emerald-950/50 text-center">
                    <p className="text-xs text-muted-foreground">
                      {language === "es" ? "Ganancia por venta" : "Earnings per sale"}
                    </p>
                    <p className="font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(product.precio_mxn * (product.commission / 100), currency)}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button 
                    size="sm" 
                    className="flex-1 h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/videos/product/${product.id}`);
                    }}
                  >
                    {language === "es" ? "Ver videos" : "View videos"}
                  </Button>
                  {product.producto_url && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(product.producto_url!, '_blank');
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Opportunities;
