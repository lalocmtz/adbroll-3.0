import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Lock, PackageSearch, Search, Store, X } from "lucide-react";
import { CatalogHeader, CatalogInfo } from "@/components/CatalogToolbar";
import { CompactPagination } from "@/components/CompactPagination";
import { ProductDiscoveryGrid } from "@/components/ProductDiscoveryGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useMarket } from "@/contexts/MarketContext";
import { useProOffer } from "@/hooks/useProOffer";
import { useProductDiscovery } from "@/hooks/useProductDiscovery";
import { formatReportPeriod } from "@/lib/catalog-period";
import { DISCOVERY_PAGE_SIZE, discoveryPage, discoverySort, PRODUCT_DISCOVERY_SORTS } from "@/lib/product-discovery";

export default function Products() {
  const { market, marketLabel } = useMarket();
  const { isLoggedIn, loading: accessLoading } = useBlurGateContext();
  const openProOffer = useProOffer();
  const [params, setParams] = useSearchParams();
  const query = isLoggedIn ? (params.get("q") || "").slice(0, 300) : "";
  const sort = isLoggedIn ? discoverySort(params.get("sort")) : "ranking";
  const category = isLoggedIn ? params.get("category") || "" : "";
  const hasVideos = isLoggedIn && params.get("videos") === "1";
  const minimum = Number(params.get("commission"));
  const minCommission = isLoggedIn && [5, 10, 15, 20].includes(minimum) ? minimum : null;
  const page = isLoggedIn ? discoveryPage(params.get("page")) : 1;
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const { data, loading, error, refetch } = useProductDiscovery({ market, query, sort, category, hasVideos, minCommission, page });
  const filtered = !!query || !!category || hasVideos || minCommission != null || sort !== "ranking";
  const update = (key: string, value: string) => {
    if (accessLoading) return;
    if (!isLoggedIn) { openProOffer(); return; }
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  };
  const pages = Math.ceil((data?.count || 0) / DISCOVERY_PAGE_SIZE);
  useEffect(() => {
    if (!loading && !error && data && page > Math.max(1, pages)) setParams(previous => { const next = new URLSearchParams(previous); next.delete("page"); return next; }, { replace: true });
  }, [loading, error, data, page, pages, setParams]);
  return <div className="w-full min-w-0 px-3 pb-24 pt-2 md:px-6 md:pb-8">
    <CatalogHeader title="Encuentra tu próximo producto"><CatalogInfo><p className="font-semibold">TikTok Shop {marketLabel}</p><p>El ranking muestra el último reporte. Una búsqueda también encuentra productos de reportes anteriores y productos identificados en videos.</p><p>Las comisiones son estimaciones calculadas con el precio y la tasa reportados. Los videos disponibles pueden pertenecer a distintos periodos.</p></CatalogInfo></CatalogHeader>
    <section aria-label="Buscar productos" className="mb-5 mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold md:text-base">¿Ya tienes un producto en mente?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Encuéntralo, compara su comisión y estudia los videos que lo venden.</p></div><Link to="/shops" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-primary hover:underline"><Store className="size-4" />Explorar tiendas<ArrowUpRight className="size-3.5" /></Link></div>
      <form onSubmit={event => { event.preventDefault(); update("q", draft.trim()); }} className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input type="search" value={draft} onChange={event => setDraft(event.target.value)} maxLength={300} aria-label="Buscar producto por nombre, enlace o ID" placeholder="Nombre, enlace de producto o ID" className="h-11 border-border bg-background pl-9 text-base md:text-sm" /></div><Button type="submit" disabled={accessLoading} className="h-11 px-4">Buscar</Button></form>
      <p className="mt-2 text-[11px] text-muted-foreground">Usa el enlace completo de la ficha de TikTok Shop o Kalodata. También puedes buscar por nombre.</p>
    </section>
    <div role="group" aria-label="Filtros de productos" className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Select value={sort} onValueChange={value => update("sort", value)}><SelectTrigger className="h-11 min-w-0 sm:w-44" aria-label="Ordenar productos"><SelectValue /></SelectTrigger><SelectContent>{PRODUCT_DISCOVERY_SORTS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
      <Select value={category || "all"} onValueChange={value => update("category", value === "all" ? "" : value)}><SelectTrigger className="h-11 min-w-0 sm:w-52" aria-label="Categoría de productos"><SelectValue placeholder="Todas las categorías" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las categorías</SelectItem>{(data?.categories || (category ? [category] : [])).map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      <Select value={String(minCommission || "all")} onValueChange={value => update("commission", value === "all" ? "" : value)}><SelectTrigger className="h-11 min-w-0 sm:w-44" aria-label="Comisión mínima"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Cualquier comisión</SelectItem>{[5, 10, 15, 20].map(value => <SelectItem key={value} value={String(value)}>Desde {value}%</SelectItem>)}</SelectContent></Select>
      <Button variant={hasVideos ? "default" : "outline"} className="h-11 min-w-0 whitespace-normal px-2 text-xs leading-tight" aria-pressed={hasVideos} onClick={() => update("videos", hasVideos ? "" : "1")}>Con videos disponibles</Button>
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p aria-live="polite" className="min-w-0 [overflow-wrap:anywhere]">{loading ? "Buscando productos…" : data ? `${data.count.toLocaleString("es-MX")} productos${query ? ` para “${query}”` : ""}` : "Catálogo de productos"}</p>{filtered && <Button variant="ghost" size="sm" className="min-h-11 text-xs" onClick={() => setParams({})}><X className="mr-1 size-3.5" />Limpiar filtros</Button>}{!filtered && data?.current_period && <span>Reporte: {formatReportPeriod(data.current_period)}</span>}{filtered && <span>Consulta el periodo en cada producto.</span>}</div>
    {error ? <div role="alert" className="rounded-xl border border-border bg-card p-8 text-center"><p>{error}</p><Button variant="outline" className="mt-4" onClick={refetch}>Reintentar</Button></div>
      : loading ? <div role="status" aria-label="Cargando productos" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-96 rounded-2xl bg-muted motion-safe:animate-pulse" />)}</div>
      : data?.rows.length ? <ProductDiscoveryGrid products={data.rows} offset={(page - 1) * DISCOVERY_PAGE_SIZE} />
      : <div className="rounded-2xl border border-border bg-card p-8 text-center"><PackageSearch className="mx-auto mb-4 size-10 text-primary" /><h2 className="font-semibold">No encontramos productos con esta búsqueda</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Prueba con menos palabras, el ID del producto o quita un filtro. Un producto que aún no está en el catálogo no aparecerá aquí.</p><Button variant="outline" className="mt-5" onClick={() => setParams({})}>Ver ranking actual</Button></div>}
    {pages > 1 && <div className="mt-6">{isLoggedIn ? <CompactPagination currentPage={page} totalPages={pages} onPageChange={value => { update("page", String(value)); window.scrollTo({ top: 0, behavior: "instant" }); }} /> : <Button variant="outline" className="mx-auto flex" onClick={openProOffer}><Lock className="mr-2 size-4" />Desbloquear más productos</Button>}</div>}
  </div>;
}
