import { CatalogProductImage } from "@/components/CatalogProductImage";
import { CatalogHeader, CatalogInfo, CatalogFilterBar } from "@/components/CatalogToolbar";
import { FilterPills } from "@/components/FilterPills";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gem, TrendingUp, Sparkles, Lock, Lightbulb, ArrowRight, ArrowLeftRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useNavigate } from "react-router-dom";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useProOffer } from "@/hooks/useProOffer";
import { ProductComparison } from "@/components/opportunities/ProductComparison";
import { getComparisonProducts } from "@/lib/opportunity-comparison";

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
  { value: "gems", labelEs: "Menos creadores", labelEn: "Fewer creators" },
  { value: "high_pay", labelEs: "Mayor comisión", labelEn: "Higher commission" },
];

const FREE_PREVIEW_LIMIT = 3;

export const OpportunityGuide = ({ language }: { language: string }) => {
  const es = language === 'es';
  const factors = [
    { weight: 30, name: es ? 'Ventas reportadas' : 'Reported sales' },
    { weight: 25, name: es ? 'Menos creadores' : 'Fewer creators' },
    { weight: 20, name: es ? 'Impulso de ventas' : 'Sales momentum' },
    { weight: 15, name: es ? 'Comisión por venta' : 'Commission per sale' },
    { weight: 10, name: es ? 'Retorno publicitario' : 'Ad return' },
  ];
  return <section className="mb-4 overflow-hidden rounded-2xl border border-brand-ink-700 bg-brand-ink p-4 text-white md:p-5" aria-label={es ? 'Cómo funciona el indicador' : 'How the score works'}>
    <div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-cyan text-brand-ink"><Lightbulb className="size-5" aria-hidden="true" /></div><div className="min-w-0"><h2 className="text-balance text-base font-semibold md:text-lg">{es ? 'Encuentra qué producto vale la pena explorar' : 'Find a product worth exploring'}</h2><p className="mt-1 max-w-3xl text-pretty text-sm leading-relaxed text-white/75">{es ? 'Buscamos ventas reportadas, menos creadores compitiendo y una comisión atractiva. Elige un producto y estudia sus videos antes de decidir qué grabar.' : 'Look for reported sales, fewer competing creators and attractive commissions. Choose a product and study its videos before deciding what to record.'}</p></div></div>
    <details className="mt-3 border-t border-white/15 pt-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand-cyan">{es ? 'Cómo se calcula la puntuación de 0 a 100' : 'How the 0–100 score is calculated'}<span className="ml-auto text-xl" aria-hidden="true">+</span></summary>
      <p className="mb-3 text-sm leading-relaxed text-white/75">{es ? 'Compara la posición de cada producto dentro de su mercado y categoría. Estos son los pesos de cada señal:' : 'Compares each product with others in its market and category. Each signal has the following weight:'}</p>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">{factors.map(factor => <div key={factor.weight} className="rounded-xl border border-white/15 p-3"><dd className="font-semibold tabular-nums text-brand-cyan">{factor.weight}%</dd><dt className="mt-1 text-xs leading-relaxed text-white/80">{factor.name}</dt></div>)}</dl>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-white/65">
        <p>{es ? 'El impulso usa cambios entre reportes guardados o, si no existen, la proporción de ventas de 7 y 30 días. Las ventas usan el dato de 30 días disponible o el total reportado; no equivalen siempre a los últimos 30 días.' : 'Momentum uses changes between saved reports or, when unavailable, the ratio of 7-day to 30-day sales. Sales use available 30-day data or the reported total; they do not always represent the latest 30 days.'}</p>
        <p>{es ? 'Los datos faltantes pueden contar como cero y alterar el orden. Es una guía experimental para comparar, no una probabilidad de éxito ni una predicción de ventas.' : 'Missing data may count as zero and affect the order. This is an experimental comparison guide, not a success probability or sales forecast.'}</p>
      </div>
    </details>
  </section>;
};

const Opportunities = () => {
  const { toast } = useToast();
  const { language, formatMoney } = useLanguage();
  const { market } = useMarket();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const openProOffer = useProOffer();
  const [opportunities, setOpportunities] = useState<OpportunityProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeFilter, setBadgeFilter] = useState<BadgeFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  useEffect(() => {
    setComparisonIds([]);
    setComparisonOpen(false);
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

  const comparisonProducts = getComparisonProducts(comparisonIds, filteredOpportunities, isLoggedIn, FREE_PREVIEW_LIMIT);
  const toggleComparison = (id: string) => {
    const ids = comparisonProducts.map(product => product.id);
    const candidateIds = ids.includes(id) ? ids.filter(selected => selected !== id) : [...ids, id];
    const next = getComparisonProducts(candidateIds, filteredOpportunities, isLoggedIn, FREE_PREVIEW_LIMIT);
    setComparisonIds(next.map(product => product.id));
    if (next.length === 2 && !ids.includes(id)) setComparisonOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-primary animate-pulse mx-auto mb-3" />
          <p className="text-muted-foreground">
            {language === "es" ? "Cargando oportunidades..." : "Loading opportunities..."}
          </p>
        </div>
      </div>
    );
  }


  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-w-0 w-full pt-2 pb-24 md:pb-6 px-3 md:px-6">
        <CatalogHeader title={language === "es" ? "Oportunidades" : "Opportunities"} count={filteredOpportunities.length}>
          <CatalogInfo label={language === "es" ? "Cómo se eligen las oportunidades" : "How opportunities are selected"}>
            <p className="font-semibold">{language === "es" ? "Puntuación experimental" : "Experimental score"}</p>
            <p>{language === "es" ? "Compara demanda, competencia, comisión y otras señales del reporte importado. Sirve para priorizar productos; no predice ventas ni garantiza resultados." : "Compares demand, competition, commission and other imported report signals. Helps prioritize products; does not predict sales or guarantee results."}</p>
            <p>{language === "es" ? "Revisa los videos relacionados y la fecha del reporte antes de elegir qué grabar." : "Review related videos and the report period before choosing what to record."}</p>
          </CatalogInfo>
        </CatalogHeader>
        <OpportunityGuide language={language} />
        <CatalogFilterBar>
          <FilterPills compact options={BADGE_FILTERS.map(option => ({ value: option.value, label: language === "es" ? option.labelEs : option.labelEn }))}
            value={badgeFilter} onChange={value => {
              if (!isLoggedIn) { navigate("/pricing"); return; }
              setBadgeFilter(value as BadgeFilter);
            }} />
          {!isLoggedIn ? <Button variant="outline" className="min-h-11 rounded-full text-xs bg-muted/60" onClick={() => navigate("/pricing")}>
            <Lock className="size-3 mr-1" />{language === "es" ? "Categorías" : "Categories"}
          </Button> : <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger aria-label={language === "es" ? "Categoría de oportunidades" : "Opportunity category"} className="w-auto max-w-48 h-11 text-xs rounded-full border-border/50 bg-muted/60">
              <SelectValue placeholder={language === "es" ? "Categorías" : "Categories"} />
            </SelectTrigger>
            <SelectContent><SelectItem value="all">{language === "es" ? "Categorías" : "Categories"}</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>}
        </CatalogFilterBar>

        {filteredOpportunities.length > 1 && <ProductComparison
          products={comparisonProducts}
          language={language}
          open={comparisonOpen}
          onOpenChange={setComparisonOpen}
          onClear={() => { setComparisonIds([]); setComparisonOpen(false); }}
          onViewProduct={id => navigate(isLoggedIn ? `/videos/product/${id}` : "/pricing")}
        />}

        {filteredOpportunities.length === 0 ? (
          <Card className="p-12 text-center rounded-2xl border-dashed">
            <Gem className="size-10 text-muted-foreground/30 mb-3 mx-auto" />
            <p className="text-muted-foreground mb-2">
              {language === "es"
                ? "No hay oportunidades con este filtro por ahora."
                : "No opportunities for this filter right now."}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {language === "es"
                ? "Prueba otro filtro o vuelve cuando se incorpore un nuevo reporte."
                : "Try another filter or return when a new report is added."}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { setBadgeFilter("all"); setCategoryFilter("all"); navigate("/products"); }}>{language === "es" ? "Explorar productos" : "Explore products"}</Button>
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
                      navigate("/pricing");
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
                  comparisonSelected={comparisonProducts.some(selected => selected.id === product.id)}
                  comparisonDisabled={comparisonProducts.length === 2 && !comparisonProducts.some(selected => selected.id === product.id)}
                  onCompare={() => toggleComparison(product.id)}
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
              onClick={openProOffer}
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
  comparisonSelected = false,
  comparisonDisabled = false,
  onCompare,
}: {
  product: OpportunityProduct;
  index: number;
  language: string;
  formatMoney: (amount: number | null | undefined) => string;
  navigate: (path: string) => void;
  isLoggedIn: boolean;
  comparisonSelected?: boolean;
  comparisonDisabled?: boolean;
  onCompare?: () => void;
}) => {
  const isEs = language === "es";
  // Legacy snapshots lack source periods, so growth cannot yet be verified.
  const reasons = (product.opportunity_reasons || [])
    .filter((reason) => !reason.startsWith("Crecimiento"))
    .map((reason) => reason
      .replace(/^Vendió /, "Ventas reportadas: ")
      .replace(" en los últimos 30 días", " en el reporte")
      .replace(" en 30 días y solo ", " en el reporte; ")
      .replace(" creadores lo promueven", " creadores en el reporte")
      .replace(/^Ganarías ~/, "Comisión estimada: ~"))
    .slice(0, 3);

  const goToVideos = () => {
    if (!isLoggedIn) {
      navigate("/pricing");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(`/videos/product/${product.id}`);
  };

  const badges: { emoji: string; label: string; tooltip: string; variant?: "default" | "warning" }[] = [];
  if (product.is_hidden_gem)
    badges.push({
      emoji: "💎",
      label: isEs ? "Menos creadores" : "Fewer creators",
      tooltip: isEs
        ? "Combina demanda y menor presencia de creadores según el reporte de su categoría; revisa los videos para valorar si te conviene."
        : "Combines demand and fewer creators in its category report; review the videos to decide if it fits your content.",
    });
  if (product.is_high_pay)
    badges.push({
      emoji: "💰",
      label: isEs ? "Mayor comisión" : "Higher commission",
      tooltip: isEs
        ? "La comisión estimada por venta está entre las más altas de su categoría."
        : "Estimated commission per sale is among the highest in its category.",
    });
  if (product.is_brand_backed)
    badges.push({
      emoji: "🏷️",
      label: isEs ? "Retorno publicitario alto" : "High ad return",
      tooltip: isEs
        ? "El reporte muestra más de 2 pesos en ventas por cada peso invertido en publicidad, entre los valores más altos de su categoría. No indica el presupuesto de la marca."
        : "The report shows more than 2 units in sales for each unit spent on ads, among the highest in its category. This does not indicate the brand’s budget.",
    });
  if (product.is_saturated)
    badges.push({
      emoji: "⚠️",
      label: isEs ? "Más creadores compitiendo" : "More competing creators",
      tooltip: isEs
        ? "El reporte muestra una mayor presencia de creadores. Revisa sus videos y cómo podrías aportar algo distinto."
        : "The report shows more creators promoting it. Review their videos and consider what you could do differently.",
      variant: "warning",
    });

  return (
    <Card className="overflow-hidden bg-card rounded-2xl border border-border/60 shadow-sm flex flex-col">
      {/* Header: imagen + nombre + categoría */}
      <div className="flex gap-3 p-3 md:p-4 pb-0 md:pb-0">
        <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
          <CatalogProductImage src={product.imagen_url} name={product.producto_nombre} className="rounded-lg border border-border/50" />
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
                <span className="inline-flex items-center gap-1 flex-shrink-0 bg-brand-ink text-brand-cyan rounded-lg px-2 py-1 text-xs font-semibold tabular-nums cursor-help">
                  <TrendingUp className="h-3 w-3" />
                  {product.opportunity_index ?? "—"}<span className="text-[10px] text-white/65">/100</span><span className="sr-only"> · Indicador experimental</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <p className="text-xs">
                  {isEs
                    ? "Indicador experimental de 0 a 100: compara demanda, número de creadores, evolución de ventas, comisión y retorno publicitario dentro de su categoría. No garantiza ventas."
                    : "Experimental score from 0 to 100: compares demand, creator count, sales trends, commission and ad return within the category. It does not guarantee sales."}
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
          <ul className="space-y-1.5 border-l-2 border-brand-cyan bg-muted/20 rounded-r-lg p-3">
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
              {isEs ? "Comisión estimada" : "Estimated commission"}
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
          {isEs ? "Ver videos relacionados" : "See related videos"}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
        {onCompare && <Button variant="outline" className="w-full min-h-11 rounded-lg text-sm" aria-pressed={comparisonSelected} aria-label={`${comparisonSelected ? isEs ? "Quitar de comparación" : "Remove from comparison" : isEs ? "Comparar" : "Compare"}: ${product.producto_nombre}`} disabled={comparisonDisabled} onClick={onCompare}>
          {comparisonSelected ? <Check className="mr-2 size-4" aria-hidden="true" /> : <ArrowLeftRight className="mr-2 size-4" aria-hidden="true" />}
          {comparisonSelected ? isEs ? "Seleccionado" : "Selected" : isEs ? "Comparar" : "Compare"}
        </Button>}
      </div>
    </Card>
  );
};

export default Opportunities;
