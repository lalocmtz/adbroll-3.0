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
  commission_high: boolean;
  gmv_high: boolean;
  low_competition: boolean;
  high_profit: boolean;
  commission_percentile: number;
  gmv_percentile: number;
  profit_percentile: number;
  creators_niche_avg: number;
  tags: string[] | null;
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
  creators_niche_avg: number | null;
  io_score: number | null;
  earning_per_sale: number | null;
  is_hidden_gem: boolean | null;
  opportunity_reason: OpportunityReason | null;
  commission_percentile: number | null;
  gmv30d_percentile: number | null;
  profit_percentile: number | null;
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
      const { data, error } = await supabase
        .from("product_opportunities")
        .select("id, producto_nombre, producto_url, categoria, imagen_url, precio_mxn, commission, gmv_30d_calc, creators_active_calc, creators_niche_avg, io_score, earning_per_sale, is_hidden_gem, opportunity_reason, commission_percentile, gmv30d_percentile, profit_percentile")
        .gte("commission", 10)
        .order("io_score", { ascending: false, nullsFirst: false })
        .limit(50);

      if (error) throw error;

      // Filter products that meet at least 2 criteria
      const filtered = (data || []).filter((p) => {
        const reason = p.opportunity_reason as unknown as OpportunityReason;
        if (!reason) return false;
        const criteriaCount = [
          reason.commission_high,
          reason.gmv_high,
          reason.low_competition,
          reason.high_profit
        ].filter(Boolean).length;
        return criteriaCount >= 2;
      }).map((p) => ({
        ...p,
        opportunity_reason: p.opportunity_reason as unknown as OpportunityReason
      } as OpportunityProduct));

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

        {/* Educational Text Above Grid */}
        <div className="bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/10 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-foreground leading-relaxed">
              {language === "es"
                ? "Estas oportunidades se detectan por tres factores: alta comisión, fuertes ventas y baja competencia de creadores."
                : "These opportunities are detected by three factors: high commission, strong sales, and low creator competition."}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {opportunities.map((product, index) => (
              <OpportunityCard
                key={product.id}
                product={product}
                index={index}
                language={language}
                currency={currency}
                formatCurrency={formatCurrency}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// Opportunity Card Component
const OpportunityCard = ({
  product,
  index,
  language,
  currency,
  formatCurrency,
  navigate
}: {
  product: OpportunityProduct;
  index: number;
  language: string;
  currency: string;
  formatCurrency: (amount: number | null, curr: string) => string;
  navigate: (path: string) => void;
}) => {
  const reason = product.opportunity_reason;
  const tags = reason?.tags || [];

  // Tooltip content for specific tags
  const tagTooltips: Record<string, { es: string; en: string }> = {
    "Comisión alta": {
      es: `Este producto paga más comisión que el ${Math.round(product.commission_percentile || 60)}% de su categoría.`,
      en: `This product pays more commission than ${Math.round(product.commission_percentile || 60)}% of its category.`
    },
    "Buenas ventas": {
      es: `Su GMV en los últimos 30 días está dentro del top ${100 - Math.round(product.gmv30d_percentile || 70)}% del nicho.`,
      en: `Its GMV in the last 30 days is in the top ${100 - Math.round(product.gmv30d_percentile || 70)}% of the niche.`
    },
    "Alta ganancia": {
      es: "Su ganancia por venta es superior al promedio del nicho.",
      en: "Its earnings per sale is above the niche average."
    },
    "Poca competencia": {
      es: "Menos creadores significa menos competencia: más probabilidad de posicionarte.",
      en: "Fewer creators means less competition: better chance to position yourself."
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-200 group cursor-pointer bg-card rounded-xl border border-border/60 shadow-sm flex flex-col"
      onClick={() => navigate(`/videos/product/${product.id}`)}
    >
      {/* Image Container - 3:4 ratio */}
      <div className="relative" style={{ aspectRatio: '3/4' }}>
        {product.imagen_url ? (
          <img 
            src={product.imagen_url} 
            alt={product.producto_nombre}
            className="w-full h-full object-cover rounded-t-xl transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ borderRadius: '12px 12px 0 0' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-t-xl">
            <Gem className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        
        {/* IO Score Badge with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute top-3 left-3">
              <Badge 
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5 shadow-md px-2.5 py-1 text-xs font-semibold"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                IO {product.io_score?.toFixed(0) || 0}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[220px]">
            <p className="text-xs">
              {language === "es"
                ? "Este IO Score refleja crecimiento, ventas y baja competencia del producto."
                : "This IO Score reflects product growth, sales, and low competition."}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Rank Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="font-bold bg-white/95 text-foreground shadow-sm px-2 py-0.5">
            #{index + 1}
          </Badge>
        </div>
      </div>

      {/* Content - 24px padding */}
      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* Product Name - max 2 lines */}
        <h3 
          className="font-semibold text-[15px] text-foreground line-clamp-2 leading-tight"
          title={product.producto_nombre}
        >
          {product.producto_nombre}
        </h3>

        {/* Category */}
        {product.categoria && (
          <p className="text-[12px] text-muted-foreground -mt-2">{product.categoria}</p>
        )}

        {/* Tags as Bullet List */}
        {tags.length > 0 && (
          <ul className="space-y-1.5">
            {tags.map((tag, i) => {
              const tooltipText = tagTooltips[tag]?.[language === "es" ? "es" : "en"] || tag;
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <li className="flex items-center gap-2 text-[12px] text-muted-foreground cursor-help hover:text-foreground transition-colors">
                      <span className="text-primary text-[8px]">●</span>
                      {tag}
                    </li>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </ul>
        )}

        {/* Metrics Grid - 16px spacing */}
        <div className="grid grid-cols-2 gap-4">
          <MetricBox
            icon={<Percent className="h-3.5 w-3.5" />}
            value={product.commission ? `${product.commission}%` : "-"}
            label={language === "es" ? "Comisión" : "Commission"}
            colorClass="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
            tooltip={language === "es" 
              ? "Porcentaje que recibes por cada venta. Mayor comisión = más ganancias." 
              : "Percentage you receive per sale. Higher commission = more earnings."}
          />
          <MetricBox
            icon={<DollarSign className="h-3.5 w-3.5" />}
            value={formatCurrency(product.gmv_30d_calc, currency)}
            label="GMV 30d"
            colorClass="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
            tooltip={language === "es" 
              ? "Volumen de ventas en 30 días. Alto GMV = demanda comprobada." 
              : "Sales volume in 30 days. High GMV = proven demand."}
          />
          <MetricBox
            icon={<Users className="h-3.5 w-3.5" />}
            value={product.creators_active_calc?.toString() || "0"}
            label={language === "es" ? "Creadores" : "Creators"}
            colorClass="text-purple-600 bg-purple-50 dark:bg-purple-950/30"
            tooltip={language === "es" 
              ? `Creadores activos (promedio nicho: ${Math.round(product.creators_niche_avg || 0)}). Menos = menos competencia.`
              : `Active creators (niche avg: ${Math.round(product.creators_niche_avg || 0)}). Fewer = less competition.`}
          />
          <MetricBox
            icon={<DollarSign className="h-3.5 w-3.5" />}
            value={formatCurrency(product.earning_per_sale, currency)}
            label={language === "es" ? "Ganancia" : "Earnings"}
            colorClass="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
            tooltip={language === "es" 
              ? "Dinero que ganas por cada venta realizada." 
              : "Money you earn per sale made."}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions - uniform at bottom */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1 h-9 text-xs rounded-lg font-medium"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/videos/product/${product.id}`);
            }}
          >
            {language === "es" ? "Ver videos" : "View videos"}
          </Button>
          
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
              className="h-9 w-9 p-0 rounded-lg"
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
};

// Metric Box Component
const MetricBox = ({ 
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
  tooltip: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className={`flex items-center gap-2 p-3 rounded-lg cursor-help transition-all hover:ring-1 hover:ring-primary/20 ${colorClass}`}>
        {icon}
        <div className="min-w-0">
          <p className="font-bold text-[12px] truncate">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[200px]">
      <p className="text-xs">{tooltip}</p>
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

  const criteria = [
    {
      met: reason.commission_high,
      label: language === "es" ? "Comisión alta" : "High commission",
      current: `${product.commission || 0}%`,
      threshold: language === "es" ? `Percentil ${Math.round(reason.commission_percentile || 0)}` : `Percentile ${Math.round(reason.commission_percentile || 0)}`,
      tip: language === "es" 
        ? "Ganas más por cada venta realizada." 
        : "You earn more per sale."
    },
    {
      met: reason.gmv_high,
      label: language === "es" ? "GMV alto" : "High GMV",
      current: formatCurrency(product.gmv_30d_calc, currency),
      threshold: language === "es" ? `Percentil ${Math.round(reason.gmv_percentile || 0)}` : `Percentile ${Math.round(reason.gmv_percentile || 0)}`,
      tip: language === "es" 
        ? "El producto tiene demanda comprobada." 
        : "The product has proven demand."
    },
    {
      met: reason.low_competition,
      label: language === "es" ? "Baja competencia" : "Low competition",
      current: `${product.creators_active_calc || 0} creadores`,
      threshold: language === "es" ? `Promedio: ${Math.round(reason.creators_niche_avg || 0)}` : `Average: ${Math.round(reason.creators_niche_avg || 0)}`,
      tip: language === "es" 
        ? "Menos creadores = más visibilidad para ti." 
        : "Fewer creators = more visibility for you."
    },
    {
      met: reason.high_profit,
      label: language === "es" ? "Alta ganancia por venta" : "High earnings per sale",
      current: formatCurrency(product.earning_per_sale, currency),
      threshold: language === "es" ? `Percentil ${Math.round(reason.profit_percentile || 0)}` : `Percentile ${Math.round(reason.profit_percentile || 0)}`,
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
          className="h-9 w-9 p-0 rounded-lg hover:bg-primary/10"
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
              IO Score: {product.io_score?.toFixed(0) || 0}
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
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{c.threshold} · {c.tip}</p>
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
