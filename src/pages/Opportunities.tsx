import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gem, TrendingUp, Sparkles, Lock, Lightbulb, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useNavigate } from "react-router-dom";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useStartCheckout } from "@/lib/checkout";

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
  earning_per_sale: number | null;
  opportunity_index: number | null;
  opportunity_reasons: string[] | null;
  is_hidden_gem: boolean | null;
  is_rising: boolean | null;
  is_high_pay: boolean | null;
  is_brand_backed: boolean | null;
  is_saturated: boolean | null;
}

type BadgeFilter = "all" | "gems" | "rising" | "high_pay";

const BADGE_FILTERS: { value: BadgeFilter; labelEs: string; labelEn: string }[] = [
  { value: "all", labelEs: "Todas", labelEn: "All" },
  { value: "gems", labelEs: "💎 Joyas", labelEn: "💎 Gems" },
  { value: "rising", labelEs: "🚀 Despegando", labelEn: "🚀 Rising" },
  { value: "high_pay", labelEs: "💰 Paga bien", labelEn: "💰 High pay" },
];

const FREE_PREVIEW_LIMIT = 3;

const Opportunities = () => {
  const { toast } = useToast();
  const { language, formatMoney } = useLanguage();
  const { market } = useMarket();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const { start: startCheckout, loading: checkoutLoading } = useStartCheckout();
  const [opportunities, setOpportunities] = useState<OpportunityProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchOpportunities();
  }, [market]); // Re-fetch when market changes

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("product_opportunities")
        .select(
          "id, producto_nombre, producto_url, categoria, imagen_url, precio_mxn, commission, gmv_30d_calc, creators_active_calc, earning_per_sale, opportunity_index, opportunity_reasons, is_hidden_gem, is_rising, is_high_pay, is_brand_backed, is_saturated, market, rank"
        )
        .eq("market", market)
        .not("rank", "is", null)
        .order("opportunity_index", { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;

      setOpportunities(
        (data || []).map((p) => ({
          ...p,
          opportunity_reasons: Array.isArray(p.opportunity_reasons)
            ? (p.opportunity_reasons as string[])
            : [],
        })) as OpportunityProduct[]
      );
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

  const categories = useMemo(() => {
    return [...new Set(opportunities.map((p) => p.categoria).filter(Boolean))] as string[];
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    let result = [...opportunities];

    if (badgeFilter === "gems") result = result.filter((p) => p.is_hidden_gem);
    if (badgeFilter === "rising") result = result.filter((p) => p.is_rising);
    if (badgeFilter === "high_pay") result = result.filter((p) => p.is_high_pay);

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.categoria === categoryFilter);
    }

    // Default order: opportunity_index desc (ya viene del server, re-asegura tras filtros)
    result.sort((a, b) => (b.opportunity_index || 0) - (a.opportunity_index || 0));

    return result;
  }, [opportunities, badgeFilter, categoryFilter]);

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

  const todayFormatted = format(new Date(), "d 'de' MMMM", { locale: language === "es" ? es : enUS });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
        {/* Hero */}
        <div className="mb-3 md:mb-4 py-1 md:py-0">
          <div className="md:hidden">
            <h1 className="text-base font-bold text-foreground leading-tight">
              💎 {language === "es" ? "Oportunidades detectadas HOY" : "Opportunities detected TODAY"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {todayFormatted} · {language === "es" ? "IA de TokXray" : "TokXray AI"}
            </p>
          </div>
          <div className="hidden md:block">
            <h1 className="text-lg font-bold text-foreground leading-tight">
              💎 {language === "es" ? `Oportunidades detectadas HOY, ${todayFormatted}` : `Opportunities detected TODAY, ${todayFormatted}`}
            </h1>
            <p className="text-xs text-muted-foreground">
              {language === "es"
                ? "Productos con demanda fuerte, poca competencia y buena comisión"
                : "Products with strong demand, low competition, and good commission"}
            </p>
          </div>
        </div>

        {/* Badge filter chips + category */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-3">
            {!isLoggedIn ? (
              <div
                className="flex gap-1.5 flex-nowrap"
                onClick={() => {
                  navigate("/unlock");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {BADGE_FILTERS.map((option, i) => (
                  <span
                    key={option.value}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium h-11 md:h-8 flex items-center gap-1.5 whitespace-nowrap ${
                      i === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground border border-border/50"
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    {language === "es" ? option.labelEs : option.labelEn}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex gap-1.5 flex-nowrap md:flex-wrap">
                {BADGE_FILTERS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setBadgeFilter(option.value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium min-h-[44px] md:min-h-0 md:h-8 flex items-center whitespace-nowrap transition-colors ${
                      badgeFilter === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground border border-border/50 hover:bg-muted"
                    }`}
                  >
                    {language === "es" ? option.labelEs : option.labelEn}
                  </button>
                ))}
              </div>
            )}

            {/* Category dropdown */}
            {!isLoggedIn ? (
              <div
                className="h-11 md:h-8 px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 cursor-pointer whitespace-nowrap"
                onClick={() => {
                  navigate("/unlock");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <Lock className="h-3 w-3" />
                {language === "es" ? "Categorías" : "Categories"}
              </div>
            ) : (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-auto h-11 md:h-8 text-xs px-3 rounded-full border-border/50 bg-muted/60">
                  <SelectValue placeholder={language === "es" ? "Categoría" : "Category"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "es" ? "Todas las categorías" : "All categories"}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <span className="text-[11px] md:text-xs text-muted-foreground block mt-1.5">
            {filteredOpportunities.length} {language === "es" ? "oportunidades" : "opportunities"}
          </span>
        </div>

        {/* Educational strip */}
        <div className="bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/10 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-foreground leading-relaxed">
              {language === "es"
                ? "El índice compara cada producto contra su categoría: ventas reales, cuántos creadores ya lo promueven, si está creciendo y cuánto pagaría por venta."
                : "The index compares each product against its category: real sales, how many creators already promote it, whether it's growing, and how much it pays per sale."}
            </p>
          </div>
        </div>

        {filteredOpportunities.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed">
            <Gem className="h-16 w-16 text-muted-foreground/30 mb-4 mx-auto" />
            <p className="text-muted-foreground mb-2">
              {language === "es"
                ? "No hay oportunidades con este filtro por ahora."
                : "No opportunities for this filter right now."}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {language === "es"
                ? "Prueba con otro filtro o vuelve después del próximo análisis."
                : "Try another filter or come back after the next analysis."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {filteredOpportunities.map((product, index) => {
              const isLocked = !isLoggedIn && index >= FREE_PREVIEW_LIMIT;

              if (isLocked) {
                return (
                  <div
                    key={product.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      navigate("/unlock");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <div className="blur-[6px] pointer-events-none">
                      <OpportunityCard
                        product={product}
                        index={index}
                        language={language}
                        formatMoney={formatMoney}
                        navigate={navigate}
                        isLoggedIn={false}
                      />
                    </div>
                    <div className="absolute inset-0 bg-background/30 flex items-center justify-center rounded-xl">
                      <div className="text-center p-3 md:p-4">
                        <Lock className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1.5 md:mb-2 text-muted-foreground" />
                        <p className="text-xs md:text-sm font-medium text-foreground">Desbloquear</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <OpportunityCard
                  key={product.id}
                  product={product}
                  index={index}
                  language={language}
                  formatMoney={formatMoney}
                  navigate={navigate}
                  isLoggedIn={isLoggedIn}
                />
              );
            })}
          </div>
        )}

        {/* Sticky CTA for visitors - Mobile only */}
        {!isLoggedIn && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
            <Button
              className="w-full h-12 text-sm font-semibold shadow-lg"
              onClick={startCheckout}
              disabled={checkoutLoading}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {language === "es" ? "Desbloquear acceso completo" : "Unlock full access"}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// ----------------------------------------------------------------------------
// Badge pill with tooltip
// ----------------------------------------------------------------------------
const BadgePill = ({
  emoji,
  label,
  tooltip,
  variant = "default",
}: {
  emoji: string;
  label: string;
  tooltip: string;
  variant?: "default" | "warning";
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-help ${
          variant === "warning"
            ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
            : "bg-primary/10 text-primary"
        }`}
      >
        {emoji} {label}
      </span>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[220px]">
      <p className="text-xs">{tooltip}</p>
    </TooltipContent>
  </Tooltip>
);

// ----------------------------------------------------------------------------
// Opportunity Card — mobile-first: lo importante es el PORQUÉ con números
// ----------------------------------------------------------------------------
const OpportunityCard = ({
  product,
  index,
  language,
  formatMoney,
  navigate,
  isLoggedIn,
}: {
  product: OpportunityProduct;
  index: number;
  language: string;
  formatMoney: (amount: number | null | undefined) => string;
  navigate: (path: string) => void;
  isLoggedIn: boolean;
}) => {
  const isEs = language === "es";
  const reasons = (product.opportunity_reasons || []).slice(0, 3);

  const goToVideos = () => {
    if (!isLoggedIn) {
      navigate("/unlock");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(`/videos/product/${product.id}`);
  };

  const badges: { emoji: string; label: string; tooltip: string; variant?: "default" | "warning" }[] = [];
  if (product.is_hidden_gem)
    badges.push({
      emoji: "💎",
      label: isEs ? "Joya oculta" : "Hidden gem",
      tooltip: isEs
        ? "Vende mucho y casi nadie lo promueve todavía."
        : "Sells a lot and almost nobody promotes it yet.",
    });
  if (product.is_rising)
    badges.push({
      emoji: "🚀",
      label: isEs ? "Despegando" : "Rising",
      tooltip: isEs
        ? "Sus ventas crecen más rápido que el resto de su categoría."
        : "Its sales are growing faster than the rest of its category.",
    });
  if (product.is_high_pay)
    badges.push({
      emoji: "💰",
      label: isEs ? "Paga bien" : "High pay",
      tooltip: isEs
        ? "Está en el top de ganancia por venta de su categoría."
        : "Top earnings per sale within its category.",
    });
  if (product.is_brand_backed)
    badges.push({
      emoji: "🏷️",
      label: isEs ? "Marca invirtiendo" : "Brand backed",
      tooltip: isEs
        ? "La marca está metiendo dinero en anuncios: el producto tiene empuje."
        : "The brand is investing in ads: the product has momentum.",
    });
  if (product.is_saturated)
    badges.push({
      emoji: "⚠️",
      label: isEs ? "Saturado" : "Saturated",
      tooltip: isEs
        ? "Vende bien pero ya hay demasiados creadores compitiendo."
        : "Sells well but too many creators are already competing.",
      variant: "warning",
    });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 bg-card rounded-xl border border-border/60 shadow-sm flex flex-col">
      {/* Header: imagen + nombre + categoría */}
      <div className="flex gap-3 p-3 md:p-4 pb-0 md:pb-0">
        <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
          {product.imagen_url ? (
            <img
              src={product.imagen_url}
              alt={product.producto_nombre}
              className="w-full h-full object-cover rounded-lg border border-border/50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-lg">
              <Gem className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
          {/* Rank */}
          <Badge
            variant="secondary"
            className="absolute -top-1.5 -left-1.5 font-bold bg-white/95 text-foreground shadow-sm px-1.5 py-0 text-[10px]"
          >
            #{index + 1}
          </Badge>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-semibold text-[13px] md:text-[15px] text-foreground line-clamp-2 leading-tight"
              title={product.producto_nombre}
            >
              {product.producto_nombre}
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm cursor-help">
                  <TrendingUp className="h-3 w-3" />
                  {product.opportunity_index ?? 0}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <p className="text-xs">
                  {es
                    ? "Índice 0-100: demanda, espacio libre, crecimiento, pago por venta e inversión de marca, comparado contra su categoría."
                    : "0-100 index: demand, free space, growth, pay per sale and brand investment, compared against its category."}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {product.categoria && (
            <p className="text-[10px] md:text-[12px] text-muted-foreground mt-0.5 truncate">{product.categoria}</p>
          )}
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {badges.map((b, i) => (
                <BadgePill key={i} emoji={b.emoji} label={b.label} tooltip={b.tooltip} variant={b.variant} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 md:p-4 flex flex-col flex-1 gap-3">
        {/* El PORQUÉ con números — lo más importante de la tarjeta */}
        {reasons.length > 0 && (
          <ul className="space-y-1.5 bg-muted/30 rounded-lg p-2.5">
            {reasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] md:text-[13px] text-foreground leading-snug">
                <span className="text-primary text-[8px] mt-1.5">●</span>
                {reason}
              </li>
            ))}
          </ul>
        )}

        {/* Métrica destacada */}
        {(product.earning_per_sale ?? 0) > 0 && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 px-3 py-2">
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              {isEs ? "Tú ganarías" : "You would earn"}
            </p>
            <p className="text-base md:text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
              ~{formatMoney(product.earning_per_sale)}{" "}
              <span className="text-[11px] font-medium">{isEs ? "por venta" : "per sale"}</span>
            </p>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <Button className="w-full h-11 text-[13px] font-semibold rounded-lg" onClick={goToVideos}>
          {isEs ? "Ver los videos que ya venden esto" : "See the videos already selling this"}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </Card>
  );
};

export default Opportunities;
