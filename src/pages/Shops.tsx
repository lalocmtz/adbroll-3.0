import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, Package, Play, Search, Store } from "lucide-react";
import { CatalogHeader, CatalogInfo } from "@/components/CatalogToolbar";
import { CompactPagination } from "@/components/CompactPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useDiscoveryShops } from "@/hooks/useProductDiscovery";
import { useProOffer } from "@/hooks/useProOffer";
import { formatReportPeriod } from "@/lib/catalog-period";
import { DISCOVERY_PAGE_SIZE, discoveryCount, discoveryPage } from "@/lib/product-discovery";

export default function Shops() {
  const { market, marketLabel } = useMarket();
  const { formatMoney, language } = useLanguage();
  const { isLoggedIn, loading: accessLoading } = useBlurGateContext();
  const navigate = useNavigate();
  const openProOffer = useProOffer();
  const [params, setParams] = useSearchParams();
  const query = isLoggedIn ? (params.get("q") || "").slice(0, 300) : "";
  const page = isLoggedIn ? discoveryPage(params.get("page")) : 1;
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const { data, loading, error, refetch } = useDiscoveryShops(market, query, page);
  const pages = Math.ceil((data?.count || 0) / DISCOVERY_PAGE_SIZE);
  useEffect(() => {
    if (!loading && !error && data && page > Math.max(1, pages)) setParams(previous => { const next = new URLSearchParams(previous); next.delete("page"); return next; }, { replace: true });
  }, [data, loading, error, page, pages, setParams]);
  const gated = (action: () => void) => { if (accessLoading) return; if (!isLoggedIn) openProOffer(); else action(); };
  return <div className="w-full min-w-0 px-3 pb-12 pt-2 md:px-6">
    <CatalogHeader title="Tiendas que están vendiendo"><CatalogInfo><p className="font-semibold">Tiendas de TikTok Shop {marketLabel}</p><p>Ranking por ventas del reporte importado. Una tienda puede vender varias marcas; este catálogo no es un ranking de marcas.</p><p>Solo mostramos productos cuya relación con la tienda está verificada. Las ventas de la tienda también pueden incluir directos y fichas de producto.</p></CatalogInfo></CatalogHeader>
    <div className="mb-5 mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 md:p-5">
      <div className="flex items-start gap-3"><Store className="mt-1 hidden size-8 shrink-0 text-primary sm:block" /><div><h2 className="text-base font-semibold">Empieza por la tienda. Encuentra qué producto grabar.</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Compara sus ventas, descubre los productos vinculados y pasa a sus videos de referencia. Cada tienda reúne su propio catálogo verificado.</p></div></div>
      <form className="mt-4 flex gap-2" onSubmit={event => { event.preventDefault(); gated(() => setParams(draft.trim() ? { q: draft.trim() } : {})); }}><div className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-muted-foreground" /><Input className="h-11 bg-background pl-9 text-base md:text-sm" type="search" aria-label="Buscar tienda por nombre o ID" placeholder="Nombre de tienda o ID" maxLength={300} value={draft} onChange={event => setDraft(event.target.value)} /></div><Button className="h-11" disabled={accessLoading}>Buscar</Button></form>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p aria-live="polite" className="min-w-0 [overflow-wrap:anywhere]">{loading ? "Buscando tiendas…" : data ? `${data.count} tiendas${query ? ` para “${query}”` : " en el ranking"}` : "Ranking de tiendas"}</p>{data?.current_period && <p>Reporte: {formatReportPeriod(data.current_period)}</p>}</div>
    {error ? <div role="alert" className="rounded-xl border p-8 text-center"><p>{error}</p><Button variant="outline" className="mt-4" onClick={refetch}>Reintentar</Button></div>
      : loading ? <div role="status" aria-label="Cargando tiendas" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-64 rounded-2xl bg-muted motion-safe:animate-pulse" />)}</div>
      : data?.rows.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.rows.map((shop, index) => {
        if (!isLoggedIn && (page - 1) * DISCOVERY_PAGE_SIZE + index >= 3) return <button key={shop.shop_id} disabled={accessLoading} onClick={openProOffer} className="min-h-60 rounded-2xl border border-border bg-muted/40 p-6 text-center hover:border-primary/40"><Lock className="mx-auto mb-3 size-5 text-primary" /><span className="block font-semibold">Desbloquea el ranking de tiendas</span><span className="mt-2 block text-sm text-muted-foreground">Encuentra más opciones para tu próximo producto.</span></button>;
        return <article key={shop.shop_id} aria-label={`Tienda ${shop.shop_name}`} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-start gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">{shop.rank != null ? `#${shop.rank}` : <Store className="size-5" />}</span><div className="min-w-0"><h2 className="break-words text-base font-semibold">{shop.shop_name}</h2><p className="mt-1 text-xs text-muted-foreground">{shop.seller_type || "Tienda de TikTok Shop"}</p></div></div>
          <dl className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-muted-foreground">Ventas reportadas</dt><dd className="mt-1 text-xl font-bold tabular-nums">{shop.revenue == null ? "Sin dato" : formatMoney(shop.revenue)}</dd></div><div><dt className="text-xs text-muted-foreground">Unidades</dt><dd className="mt-1 text-xl font-bold tabular-nums">{discoveryCount(shop.total_sales, language)}</dd></div></dl>
          <div className="mb-4 mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Package className="size-3.5" />{shop.verified_product_count} productos vinculados</span><span className="inline-flex items-center gap-1.5"><Play className="size-3.5" />{shop.available_video_count} videos disponibles</span></div>
          <Button className="mt-auto h-11 justify-between" variant={shop.verified_product_count > 0 ? "default" : "outline"} disabled={accessLoading} onClick={() => gated(() => navigate(`/shops/${shop.shop_id}`))}>{shop.verified_product_count > 0 ? "Explorar productos" : "Ver tienda"}<ArrowRight className="size-4" /></Button>
        </article>;
      })}</div> : <div className="rounded-2xl border border-border p-8 text-center"><Store className="mx-auto mb-3 size-10 text-muted-foreground" /><h2 className="font-semibold">No encontramos esa tienda</h2><p className="mt-2 text-sm text-muted-foreground">Prueba otro nombre o busca directamente el producto que tienes.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={() => setParams({})}>Ver todas las tiendas</Button><Button asChild><Link to="/products">Buscar productos</Link></Button></div></div>}
    {pages > 1 && <div className="mt-6">{isLoggedIn ? <CompactPagination currentPage={page} totalPages={pages} onPageChange={value => { setParams(previous => { const next = new URLSearchParams(previous); next.set("page", String(value)); return next; }); window.scrollTo({ top: 0, behavior: "instant" }); }} /> : <Button variant="outline" className="mx-auto flex" onClick={openProOffer}><Lock className="mr-2 size-4" />Desbloquear más tiendas</Button>}</div>}
  </div>;
}
