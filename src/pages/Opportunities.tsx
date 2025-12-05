import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gem, TrendingUp, Users, DollarSign, Percent, ExternalLink, Check, X, Sparkles, Target, HelpCircle, Lightbulb, Info } from "lucide-react";
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
  opportunity_score?: number;
}

// Calculate weighted opportunity score
const calculateOpportunityScore = (product: OpportunityProduct): number => {
  const commission = product.commission || 0;
  const gmv = product.gmv_30d_calc || 0;
  const earning = product.earning_per_sale || 0;
  const creators = product.creators_active_calc || 1;
  
  // Weighted formula: prioritize high commission + low competition
  const commissionWeight = 0.35;
  const gmvWeight = 0.25;
  const earningWeight = 0.25;
  const competitionWeight = 0.15;
  
  // Normalize values (rough scaling)
  const normalizedCommission = Math.min(commission / 30, 1) * 100; // 30% = max
  const normalizedGmv = Math.min(gmv / 5000000, 1) * 100; // 5M = max
  const normalizedEarning = Math.min(earning / 200, 1) * 100; // $200 = max
  const normalizedCompetition = Math.max(0, 100 - (creators / 5)); // Fewer = better
  
  return (
    normalizedCommission * commissionWeight +
    normalizedGmv * gmvWeight +
    normalizedEarning * earningWeight +
    normalizedCompetition * competitionWeight
  );
};

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
      const { data, error } = await supabase
        .from("product_opportunities")
        .select("id, producto_nombre, producto_url, categoria, imagen_url, precio_mxn, commission, gmv_30d_calc, creators_active_calc, opportunity_index, earning_per_sale, is_hidden_gem, opportunity_reason")
        .gte("commission", 15)
        .order("opportunity_index", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter products that meet at least 2 criteria
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
      }).map((p) => {
        const product = {
          ...p,
          opportunity_reason: p.opportunity_reason as unknown as OpportunityReason
        } as OpportunityProduct;
        product.opportunity_score = calculateOpportunityScore(product);
        return product;
      });

      // Sort by opportunity_score descending
      filtered.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));

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

  const getReasonTags = (reason: OpportunityReason | null) => {
    if (!reason) return [];
    const tags = [];
    if (reason.high_commission) tags.push(language === "es" ? "Comisión alta" : "High commission");
    if (reason.high_gmv) tags.push(language === "es" ? "Buenas ventas" : "Good sales");
    if (reason.low_competition) tags.push(language === "es" ? "Poca competencia" : "Low competition");
    if (reason.high_earning) tags.push(language === "es" ? "Alta ganancia" : "High earnings");
    return tags;
  };

  // Tooltip content for metrics
  const tooltips = {
    commission: {
      es: {
        title: "Comisión",
        what: "Porcentaje que recibes por cada venta.",
        why: "Mayor comisión = más dinero por tu esfuerzo.",
        impact: "Con 20% de comisión en un producto de $500, ganas $100 por venta."
      },
      en: {
        title: "Commission",
        what: "Percentage you earn per sale.",
        why: "Higher commission = more money for your effort.",
        impact: "With 20% commission on a $500 product, you earn $100 per sale."
      }
    },
    gmv: {
      es: {
        title: "GMV 30d",
        what: "Volumen de ventas totales en los últimos 30 días.",
        why: "Indica que el producto tiene demanda comprobada.",
        impact: "Alto GMV = producto que la gente ya está comprando."
      },
      en: {
        title: "GMV 30d",
        what: "Total sales volume in the last 30 days.",
        why: "Indicates proven product demand.",
        impact: "High GMV = product people are already buying."
      }
    },
    creators: {
      es: {
        title: "Creadores",
        what: "Número de creadores promocionando este producto.",
        why: "Menos creadores = menos competencia para ti.",
        impact: "Pocos creadores + alto GMV = oportunidad ideal."
      },
      en: {
        title: "Creators",
        what: "Number of creators promoting this product.",
        why: "Fewer creators = less competition for you.",
        impact: "Few creators + high GMV = ideal opportunity."
      }
    },
    earning: {
      es: {
        title: "Ganancia por venta",
        what: "Dinero que recibes cada vez que alguien compra.",
        why: "Te permite calcular tus ganancias potenciales.",
        impact: "Si vendes 10 unidades y ganas $50 c/u = $500 en total."
      },
      en: {
        title: "Earnings per sale",
        what: "Money you receive each time someone buys.",
        why: "Helps calculate your potential earnings.",
        impact: "If you sell 10 units at $50 each = $500 total."
      }
    }
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
    <TooltipProvider delayDuration={200}>
      <div className="pt-5 pb-6 px-4 md:px-6">
        {/* Header */}
        <div className="mb-4">
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

        {/* Educational Mini Block */}
        <div className="bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/10 rounded-xl p-3 mb-5 flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] text-foreground font-medium mb-0.5">
              {language === "es" ? "¿Qué es una oportunidad?" : "What is an opportunity?"}
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {language === "es"
                ? "Un producto aparece aquí cuando vende muy bien, paga una comisión alta y pocos creadores lo están promocionando. Es tu ventaja competitiva."
                : "A product appears here when it sells well, pays high commission, and few creators are promoting it. It's your competitive advantage."}
            </p>
          </div>
        </div>

        {opportunities.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed">
            <Gem className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
            <p className="text-muted-foreground mb-2">
              {language === "es" 
                ? "No se encontraron oportunidades que cumplan los criterios."
                : "No opportunities found meeting criteria."}
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
                  className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer bg-card rounded-2xl border border-border/60 shadow-sm flex flex-col"
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
                    
                    {/* Score Badge */}
                    <div className="absolute top-3 left-3">
                      <Badge 
                        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1 shadow-sm"
                        title={language === "es" ? "Puntuación de oportunidad" : "Opportunity score"}
                      >
                        <TrendingUp className="h-3 w-3" />
                        {product.opportunity_score?.toFixed(0) || 0}
                      </Badge>
                    </div>

                    {/* Rank */}
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="font-bold bg-white/95 text-foreground shadow-sm">
                        #{index + 1}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Product Name */}
                    <h3 
                      className="font-semibold text-[15px] text-foreground truncate mb-1"
                      title={product.producto_nombre}
                    >
                      {product.producto_nombre}
                    </h3>

                    {/* Category */}
                    {product.categoria && (
                      <p className="text-[12px] text-muted-foreground mb-2">{product.categoria}</p>
                    )}

                    {/* Reason Tags */}
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

                    {/* Metrics Grid with Tooltips */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <MetricWithTooltip
                        icon={<Percent className="h-3.5 w-3.5" />}
                        value={product.commission ? `${product.commission}%` : "-"}
                        label={language === "es" ? "Comisión" : "Commission"}
                        colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                        tooltip={tooltips.commission[language === "es" ? "es" : "en"]}
                      />
                      <MetricWithTooltip
                        icon={<DollarSign className="h-3.5 w-3.5" />}
                        value={formatCurrency(product.gmv_30d_calc, currency)}
                        label="GMV 30d"
                        colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
                        tooltip={tooltips.gmv[language === "es" ? "es" : "en"]}
                      />
                      <MetricWithTooltip
                        icon={<Users className="h-3.5 w-3.5" />}
                        value={product.creators_active_calc?.toString() || "0"}
                        label={language === "es" ? "Creadores" : "Creators"}
                        colorClass="text-purple-600 bg-purple-50 dark:bg-purple-950/30"
                        tooltip={tooltips.creators[language === "es" ? "es" : "en"]}
                      />
                      <MetricWithTooltip
                        icon={<DollarSign className="h-3.5 w-3.5" />}
                        value={formatCurrency(product.earning_per_sale, currency)}
                        label={language === "es" ? "Ganancia" : "Earnings"}
                        colorClass="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                        tooltip={tooltips.earning[language === "es" ? "es" : "en"]}
                      />
                    </div>

                    {/* Spacer to push buttons to bottom */}
                    <div className="flex-1" />

                    {/* Actions - Always at bottom */}
                    <div className="flex gap-2 mt-auto pt-2">
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
                      
                      {/* Why Opportunity Modal */}
                      <WhyOpportunityModal 
                        product={product} 
                        language={language} 
                        currency={currency}
                        formatCurrency={formatCurrency}
                      />
                      
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
    </TooltipProvider>
  );
};

// Metric box with tooltip
const MetricWithTooltip = ({ 
  icon, 
  value, 
  label, 
  colorClass,
  tooltip
}: { 
  icon: React.ReactNode; 
  value: string; 
  label: string; 
  colorClass: string;
  tooltip: { title: string; what: string; why: string; impact: string };
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={`flex items-center gap-1.5 p-2 rounded-lg cursor-help transition-all hover:ring-1 hover:ring-primary/20 ${colorClass}`}>
        {icon}
        <div className="min-w-0">
          <p className="font-bold text-[11px] truncate">{value}</p>
          <p className="text-[9px] text-muted-foreground truncate">{label}</p>
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[240px] p-3">
      <p className="font-semibold text-sm mb-1">{tooltip.title}</p>
      <p className="text-xs text-muted-foreground mb-1"><strong>Qué es:</strong> {tooltip.what}</p>
      <p className="text-xs text-muted-foreground mb-1"><strong>Por qué importa:</strong> {tooltip.why}</p>
      <p className="text-xs text-primary"><strong>Ejemplo:</strong> {tooltip.impact}</p>
    </TooltipContent>
  </Tooltip>
);

// Why Opportunity Modal
const WhyOpportunityModal = ({ 
  product, 
  language, 
  currency,
  formatCurrency 
}: { 
  product: OpportunityProduct; 
  language: string; 
  currency: string;
  formatCurrency: (amount: number | null, curr: string) => string;
}) => {
  const reason = product.opportunity_reason;
  if (!reason) return null;

  const thresholds = reason.thresholds || {
    min_commission: 15,
    min_gmv: 1214245,
    max_creators: 50,
    min_earning: 49
  };

  const criteria = [
    {
      met: reason.high_commission,
      label: language === "es" ? "Comisión alta" : "High commission",
      current: `${product.commission || 0}%`,
      threshold: `≥${thresholds.min_commission}%`,
      tip: language === "es" 
        ? "Ganas más por cada venta realizada." 
        : "You earn more per sale."
    },
    {
      met: reason.high_gmv,
      label: language === "es" ? "GMV alto" : "High GMV",
      current: formatCurrency(product.gmv_30d_calc, currency),
      threshold: `≥${formatCurrency(thresholds.min_gmv, currency)}`,
      tip: language === "es" 
        ? "El producto tiene demanda comprobada." 
        : "The product has proven demand."
    },
    {
      met: reason.low_competition,
      label: language === "es" ? "Baja competencia" : "Low competition",
      current: `${product.creators_active_calc || 0}`,
      threshold: `≤${thresholds.max_creators}`,
      tip: language === "es" 
        ? "Menos creadores = más visibilidad para ti." 
        : "Fewer creators = more visibility for you."
    },
    {
      met: reason.high_earning,
      label: language === "es" ? "Alta ganancia por venta" : "High earnings per sale",
      current: formatCurrency(product.earning_per_sale, currency),
      threshold: `≥${formatCurrency(thresholds.min_earning, currency)}`,
      tip: language === "es" 
        ? "Cada venta te genera un buen ingreso." 
        : "Each sale generates good income."
    }
  ];

  const criteriaMet = criteria.filter(c => c.met).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="ghost"
          className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10"
          onClick={(e) => e.stopPropagation()}
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5 text-primary" />
            {language === "es" ? "¿Por qué es una oportunidad?" : "Why is it an opportunity?"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Product Name */}
          <p className="text-sm font-medium line-clamp-2 text-foreground">
            {product.producto_nombre}
          </p>

          {/* Score Badge */}
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              Score: {product.opportunity_score?.toFixed(0) || 0}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {language === "es" 
                ? `Cumple ${criteriaMet} de 4 criterios` 
                : `Meets ${criteriaMet} of 4 criteria`}
            </span>
          </div>

          {/* Criteria Breakdown */}
          <div className="space-y-2">
            {criteria.map((c, i) => (
              <div 
                key={i} 
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  c.met 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-muted/30 border border-border/50'
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${c.met ? 'text-emerald-500' : 'text-muted-foreground/40'}`}>
                  {c.met ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`text-sm font-medium ${c.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {c.label}
                    </span>
                    <div className="flex items-center gap-1 text-xs">
                      <span className={c.met ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}>
                        {c.current}
                      </span>
                      <span className="text-muted-foreground/50">/</span>
                      <span className="text-muted-foreground">{c.threshold}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.tip}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips Section */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">
                {language === "es" ? "Consejos para ti" : "Tips for you"}
              </span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {language === "es" 
                ? "Crea contenido original que destaque el producto." 
                : "Create original content that highlights the product."}
              </li>
              <li>• {language === "es" 
                ? "Aprovecha que hay poca competencia para posicionarte." 
                : "Take advantage of low competition to position yourself."}
              </li>
              <li>• {language === "es" 
                ? "Analiza los videos existentes para inspirarte." 
                : "Analyze existing videos for inspiration."}
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Opportunities;