import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gem, TrendingUp, Users, DollarSign, Percent, ExternalLink, Check, X, Sparkles, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

interface OpportunityReason {
  high_commission: boolean;
  high_gmv: boolean;
  low_competition: boolean;
  high_earning: boolean;
  thresholds: {
    min_commission: number;
    min_gmv: number;
    max_creators: number;
    min_earning: number;
  };
  summary_text: string | null;
}

interface OpportunityProduct {
  id: string;
  producto_nombre: string;
  producto_url: string | null;
  categoria: string | null;
  imagen_url: string | null;
  precio_mxn: number | null;
  commission: number | null;
  gmv_30d_calc: number | null;
  creators_active_calc: number | null;
  opportunity_index: number | null;
  earning_per_sale: number | null;
  is_hidden_gem: boolean | null;
  opportunity_reason: OpportunityReason | null;
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
      // Fetch products with high commission that meet at least 2 criteria
      const { data, error } = await supabase
        .from("product_opportunities")
        .select("id, producto_nombre, producto_url, categoria, imagen_url, precio_mxn, commission, gmv_30d_calc, creators_active_calc, opportunity_index, earning_per_sale, is_hidden_gem, opportunity_reason")
        .gte("commission", 15)
        .order("opportunity_index", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter to show products that meet at least 2 of the 4 criteria
      const filtered = (data || []).filter((p) => {
        const reason = p.opportunity_reason as unknown as OpportunityReason;
        if (!reason) return false;
        const criteriaCount = [
          reason.high_commission,
          reason.high_gmv,
          reason.low_competition,
          reason.high_earning
        ].filter(Boolean).length;
        return criteriaCount >= 2;
      }).map((p) => ({
        ...p,
        opportunity_reason: p.opportunity_reason as unknown as OpportunityReason
      })) as OpportunityProduct[];

      setOpportunities(filtered);
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

  // Generate dynamic reason text based on criteria met
  const getReasonTags = (reason: OpportunityReason | null) => {
    if (!reason) return [];
    const tags = [];
    if (reason.high_commission) tags.push(language === "es" ? "Comisión alta" : "High commission");
    if (reason.high_gmv) tags.push(language === "es" ? "Buenas ventas" : "Good sales");
    if (reason.low_competition) tags.push(language === "es" ? "Poca competencia" : "Low competition");
    if (reason.high_earning) tags.push(language === "es" ? "Alta ganancia" : "High earnings");
    return tags;
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground">
            {language === "es" ? "Analizando oportunidades..." : "Analyzing opportunities..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      {/* Header with explanation */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">
            {language === "es" ? "Oportunidades" : "Opportunities"}
          </h1>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">
          {language === "es" 
            ? "Productos con comisión alta, ventas fuertes y baja competencia. Actualizado diariamente."
            : "Products with high commission, strong sales, and low competition. Updated daily."}
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border-dashed">
          <Gem className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
          <p className="text-muted-foreground mb-2">
            {language === "es" 
              ? "No se encontraron oportunidades que cumplan todos los criterios."
              : "No opportunities found meeting all criteria."}
          </p>
          <p className="text-xs text-muted-foreground/70">
            {language === "es"
              ? "Los productos deben tener: comisión ≥15%, GMV alto, pocos creadores y buena ganancia por venta."
              : "Products must have: commission ≥15%, high GMV, few creators, and good earnings per sale."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {opportunities.map((product, index) => {
            const reason = product.opportunity_reason;
            const reasonTags = getReasonTags(reason);
            
            return (
              <Card 
                key={product.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer bg-card rounded-2xl border border-border/60 shadow-sm"
                onClick={() => navigate(`/videos/product/${product.id}`)}
              >
                {/* Image */}
                <div className="relative aspect-square bg-muted/30">
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
                  
                  {/* IO Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge 
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-sm"
                      title={language === "es" 
                        ? "Índice de Oportunidad: (comisión × GMV) / creadores" 
                        : "Opportunity Index: (commission × GMV) / creators"}
                    >
                      <TrendingUp className="h-3 w-3" />
                      IO: {formatNumber(product.opportunity_index)}
                    </Badge>
                  </div>

                  {/* Rank Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="font-bold bg-white/95 text-foreground shadow-sm">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Product Name */}
                  <h3 
                    className="font-semibold text-[15px] text-foreground truncate mb-1 cursor-help"
                    title={product.producto_nombre}
                  >
                    {product.producto_nombre}
                  </h3>

                  {/* Category */}
                  {product.categoria && (
                    <p className="text-[12px] text-muted-foreground mb-2">{product.categoria}</p>
                  )}

                  {/* Dynamic Reason Tags */}
                  {reasonTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {reasonTags.map((tag, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 h-5 bg-primary/5 border-primary/20 text-primary font-medium"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Why is it an opportunity - Compact Visual Block */}
                  {reason && (
                    <div className="bg-muted/30 rounded-lg p-2.5 mb-3 border border-border/40">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                        {language === "es" ? "Por qué es oportunidad:" : "Why it's an opportunity:"}
                      </p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <CriteriaItem 
                          met={reason.high_commission} 
                          label={language === "es" ? "Comisión" : "Commission"} 
                        />
                        <CriteriaItem 
                          met={reason.high_gmv} 
                          label={language === "es" ? "GMV alto" : "High GMV"} 
                        />
                        <CriteriaItem 
                          met={reason.low_competition} 
                          label={language === "es" ? "Baja competencia" : "Low competition"} 
                        />
                        <CriteriaItem 
                          met={reason.high_earning} 
                          label={language === "es" ? "Alta ganancia" : "High earnings"} 
                        />
                      </div>
                    </div>
                  )}

                  {/* Metrics Grid - More Compact */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <MetricBox 
                      icon={<Percent className="h-3.5 w-3.5" />}
                      value={product.commission ? `${product.commission}%` : "-"}
                      label={language === "es" ? "Comisión" : "Commission"}
                      colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                    />
                    <MetricBox 
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      value={formatCurrency(product.gmv_30d_calc, currency)}
                      label="GMV 30d"
                      colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                    />
                    <MetricBox 
                      icon={<Users className="h-3.5 w-3.5" />}
                      value={product.creators_active_calc?.toString() || "0"}
                      label={language === "es" ? "Creadores" : "Creators"}
                      colorClass="text-purple-600 bg-purple-50 dark:bg-purple-950/30"
                    />
                    <MetricBox 
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                      value={formatCurrency(product.earning_per_sale, currency)}
                      label={language === "es" ? "Ganancia/venta" : "Earn/sale"}
                      colorClass="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 h-8 text-xs rounded-lg"
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
                        className="h-8 w-8 p-0 rounded-lg"
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
            );
          })}
        </div>
      )}
    </div>
  );
};

// Criteria checkmark component
const CriteriaItem = ({ met, label }: { met: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    {met ? (
      <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
    ) : (
      <X className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
    )}
    <span className={`text-[10px] ${met ? 'text-foreground' : 'text-muted-foreground/60'}`}>
      {label}
    </span>
  </div>
);

// Metric box component
const MetricBox = ({ 
  icon, 
  value, 
  label, 
  colorClass 
}: { 
  icon: React.ReactNode; 
  value: string; 
  label: string; 
  colorClass: string;
}) => (
  <div className={`flex items-center gap-1.5 p-2 rounded-lg ${colorClass}`}>
    {icon}
    <div className="min-w-0">
      <p className="font-bold text-[11px] truncate">{value}</p>
      <p className="text-[9px] text-muted-foreground truncate">{label}</p>
    </div>
  </div>
);

export default Opportunities;
