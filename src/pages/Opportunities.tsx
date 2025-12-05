import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gem, TrendingUp, Users, DollarSign, Percent, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
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
      {/* Simplified Header */}
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground mb-1">
          {language === "es" ? "Oportunidades" : "Opportunities"}
        </h1>
        <p className="text-[13px] text-muted-foreground">
          {language === "es" 
            ? "Productos con alta comisión y baja competencia"
            : "Products with high commission and low competition"}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card className="p-12 text-center">
          <Gem className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
          <p className="text-muted-foreground">
            {language === "es" 
              ? "No se encontraron oportunidades. Los productos deben tener comisión >15%, GMV >0 y <50 creadores activos."
              : "No opportunities found. Products must have commission >15%, GMV >0, and <50 active creators."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {opportunities.map((product, index) => (
            <Card 
              key={product.id} 
              className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
              onClick={() => navigate(`/videos/product/${product.id}`)}
            >
              {/* Image */}
              <div className="relative aspect-square bg-muted">
                {product.imagen_url ? (
                  <img 
                    src={product.imagen_url} 
                    alt={product.producto_nombre}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gem className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                
                {/* IO Badge with tooltip */}
                <div className="absolute top-3 left-3 group/io">
                  <Badge 
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 gap-1 cursor-help"
                    title={language === "es" 
                      ? "Índice de Oportunidad: (comisión × GMV) / creadores activos" 
                      : "Opportunity Index: (commission × GMV) / active creators"}
                  >
                    <TrendingUp className="h-3 w-3" />
                    IO: {formatNumber(product.opportunity_index)}
                  </Badge>
                </div>

                {/* Rank Badge */}
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="font-bold bg-white/95 text-[#0F172A]">
                    #{index + 1}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 
                  className="font-semibold text-[15px] text-[#0F172A] dark:text-foreground truncate mb-1 cursor-help"
                  title={product.producto_nombre}
                >
                  {product.producto_nombre}
                </h3>

                {product.categoria && (
                  <p className="text-[13px] text-[#94A3B8] mb-3">{product.categoria}</p>
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
