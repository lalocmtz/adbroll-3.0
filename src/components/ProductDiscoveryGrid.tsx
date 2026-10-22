import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Heart, Lock, Play, Sparkles } from "lucide-react";
import { CatalogProductImage } from "@/components/CatalogProductImage";
import { Button } from "@/components/ui/button";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProOffer } from "@/hooks/useProOffer";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { formatReportPeriod } from "@/lib/catalog-period";
import { discoveryCount, productCommercialMetrics, productDisplayName, type DiscoveryProduct } from "@/lib/product-discovery";

export function ProductDiscoveryGrid({ products, offset = 0 }: { products: DiscoveryProduct[]; offset?: number }) {
  const { isLoggedIn, loading: accessLoading, session } = useBlurGateContext();
  const { formatMoney, language } = useLanguage();
  const openProOffer = useProOffer();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const ids = products.map(product => product.id).join(",");
  useEffect(() => {
    let active = true;
    setFavorites(new Set());
    if (!isLoggedIn || !ids) return;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data, error } = await supabase.from("favorites_products").select("product_id").eq("user_id", user.id).in("product_id", ids.split(","));
      if (active && !error) setFavorites(new Set(data?.map(item => item.product_id) || []));
    })().catch(() => { /* Favorite state can be retried without hiding the catalogue. */ });
    return () => { active = false; };
  }, [ids, isLoggedIn, session?.user?.id]);
  const gated = (action: () => void) => {
    if (accessLoading) return;
    if (!isLoggedIn) { openProOffer(); return; }
    action();
  };
  const toggleFavorite = async (product: DiscoveryProduct) => {
    if (saving) return;
    setSaving(product.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { openProOffer(); return; }
      const isFavorite = favorites.has(product.id);
      const { error } = isFavorite
        ? await supabase.from("favorites_products").delete().eq("user_id", user.id).eq("product_id", product.id)
        : await supabase.from("favorites_products").insert({ user_id: user.id, product_id: product.id, product_data: product as unknown as Json });
      if (error) throw error;
      setFavorites(previous => {
        const next = new Set(previous);
        if (isFavorite) next.delete(product.id); else next.add(product.id);
        return next;
      });
      toast({ title: isFavorite ? "Eliminado de favoritos" : "Producto guardado" });
    } catch {
      toast({ title: "No se pudo guardar el producto", description: "Inténtalo de nuevo.", variant: "destructive" });
    } finally { setSaving(null); }
  };
  return <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
    {products.map((product, index) => {
      const metrics = productCommercialMetrics(product);
      const displayName = productDisplayName(product.producto_nombre);
      const isLocked = !isLoggedIn && offset + index >= 3;
      if (isLocked) return <button key={product.id} type="button" disabled={accessLoading} onClick={openProOffer} className="min-h-80 rounded-2xl border border-border bg-muted/40 p-5 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div aria-hidden="true" className="mx-auto mb-5 aspect-square max-w-28 rounded-2xl bg-primary/10" />
        <Lock className="mx-auto mb-3 size-5 text-primary" /><span className="block font-semibold text-sm">Desbloquea más productos</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">Compara ventas, comisiones y videos del catálogo.</span>
      </button>;
      return <article key={product.id} aria-label={`Producto ${displayName}`} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        <div className="relative m-2 aspect-[4/3] overflow-hidden rounded-xl bg-muted md:m-3">
          <CatalogProductImage src={product.imagen_url} name={displayName} />
          {product.rank != null && product.is_current_report && <span className="absolute left-2 top-2 rounded-full bg-background/95 px-2 py-1 text-xs font-bold shadow-sm">#{product.rank}</span>}
          <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 size-11 rounded-full bg-background/95" aria-label={`${favorites.has(product.id) ? "Quitar" : "Guardar"} ${displayName} ${favorites.has(product.id) ? "de" : "en"} favoritos`} aria-pressed={favorites.has(product.id)} disabled={accessLoading || saving === product.id} onClick={() => gated(() => void toggleFavorite(product))}><Heart className={`size-4 ${favorites.has(product.id) ? "fill-primary text-primary" : ""}`} /></Button>
        </div>
        <div className="flex flex-1 flex-col px-3 pb-3 md:px-4 md:pb-4">
          <p className="mb-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{product.categoria || "Producto del catálogo"}</p>
          <h2 className="min-h-10 line-clamp-2 text-sm font-semibold leading-5" title={displayName}>{displayName}</h2>
          <div className="my-3 rounded-xl border border-primary/15 bg-primary/5 p-2.5 md:p-3"><p className="text-[10px] font-medium text-muted-foreground">Comisión estimada por venta</p><p className="mt-1 text-base font-bold tabular-nums text-primary md:text-xl">{metrics.earnings == null ? "Sin dato" : `≈ ${formatMoney(metrics.earnings)}`}</p><p className="mt-1 text-[10px] text-muted-foreground">{metrics.commission != null ? `${metrics.commission}% del precio reportado` : "Comisión no reportada"}</p></div>
          <dl className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs"><div><dt className="text-[10px] text-muted-foreground">Ventas reportadas</dt><dd className="mt-1 break-words font-semibold tabular-nums">{metrics.revenue == null ? "Sin dato" : formatMoney(metrics.revenue)}</dd></div><div><dt className="text-[10px] text-muted-foreground">Unidades</dt><dd className="mt-1 font-semibold tabular-nums">{discoveryCount(metrics.sales, language)}</dd></div></dl>
          <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{product.report_date_range ? formatReportPeriod(product.report_date_range) : "Ficha comercial por completar"}</p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Play className="size-3" />{product.available_video_count} videos</span><span className="inline-flex items-center gap-1"><Sparkles className="size-3" />{product.analysis_ready_count} análisis</span></div>
          <div className="mt-auto flex gap-1.5 pt-3"><Button className="h-11 min-w-0 flex-1 px-2 text-xs" disabled={accessLoading} onClick={() => gated(() => navigate(`/videos/product/${product.id}`))}>{product.available_video_count > 0 ? "Ver videos" : "Ver producto"}</Button>{product.producto_url && <Button variant="outline" size="icon" className="size-11 shrink-0" disabled={accessLoading} aria-label={`Abrir ${displayName} en TikTok Shop`} onClick={() => gated(() => window.open(product.producto_url!, "_blank", "noopener,noreferrer"))}><ArrowUpRight className="size-4" /></Button>}</div>
        </div>
      </article>;
    })}
  </div>;
}
