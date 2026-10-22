import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Lock, PackageSearch, Search, Store } from "lucide-react";
import { ProductDiscoveryGrid } from "@/components/ProductDiscoveryGrid";
import { CompactPagination } from "@/components/CompactPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useDiscoveryShop, useProductDiscovery } from "@/hooks/useProductDiscovery";
import { useProOffer } from "@/hooks/useProOffer";
import { formatReportPeriod } from "@/lib/catalog-period";
import { DISCOVERY_PAGE_SIZE, discoveryCount } from "@/lib/product-discovery";

export default function ShopDetail() {
  const { shopId } = useParams();
  const { market } = useMarket();
  const { formatMoney, language } = useLanguage();
  const { isLoggedIn, loading: accessLoading } = useBlurGateContext();
  const openProOffer = useProOffer();
  const shop = useDiscoveryShop(market, shopId);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => { setQuery(""); setDraft(""); setPage(1); }, [shopId, isLoggedIn]);
  const products = useProductDiscovery({ market, shopId, query: isLoggedIn ? query : "", page: isLoggedIn ? page : 1, sort: "revenue_30d", enabled: !!shop.data });
  const pages = Math.ceil((products.data?.count || 0) / DISCOVERY_PAGE_SIZE);
  const metrics = shop.data;
  return <div className="w-full min-w-0 px-3 pb-12 pt-2 md:px-6">
    <Button variant="ghost" asChild className="mb-3 h-11 px-0"><Link to="/shops"><ArrowLeft className="mr-2 size-4" />Volver a tiendas</Link></Button>
    {shop.loading ? <div role="status" className="rounded-2xl bg-muted p-12 text-center">Cargando tienda…</div>
      : shop.error ? <div role="alert" className="rounded-2xl border p-8 text-center"><p>{shop.error}</p><Button variant="outline" className="mt-4" onClick={shop.refetch}>Reintentar</Button></div>
      : !metrics ? <div className="rounded-2xl border p-8 text-center"><h1 className="font-semibold">No encontramos esta tienda</h1><Button asChild className="mt-4"><Link to="/shops">Explorar tiendas</Link></Button></div>
      : <>
        <section className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-card">
          <div className="flex items-start gap-3 border-b border-border bg-primary/5 p-4 md:p-6"><div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-background text-primary"><Store className="size-6" /></div><div className="min-w-0"><p className="mb-1 text-xs font-medium text-primary">{metrics.rank != null ? `#${metrics.rank} en el reporte de tiendas` : "Tienda del catálogo"}</p><h1 className="break-words text-xl font-bold md:text-2xl">{metrics.shop_name}</h1><p className="mt-2 text-xs text-muted-foreground">{metrics.report_date_range ? formatReportPeriod(metrics.report_date_range) : "Periodo no disponible"}</p></div></div>
          <dl className="grid grid-cols-2 gap-5 p-4 md:grid-cols-4 md:p-6">{[
            ["Ventas de la tienda", metrics.revenue == null ? "Sin dato" : formatMoney(metrics.revenue)],
            ["Unidades vendidas", discoveryCount(metrics.total_sales, language)],
            ["Ventas por videos", metrics.revenue_videos == null ? "Sin dato" : formatMoney(metrics.revenue_videos)],
            ["Ventas por directos", metrics.revenue_live == null ? "Sin dato" : formatMoney(metrics.revenue_live)],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-lg font-bold tabular-nums md:text-xl">{value}</dd></div>)}</dl>
          <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground md:px-6">Ventas reportadas de toda la tienda; no son las ganancias de un creador. Una tienda puede ofrecer productos de distintas marcas.</p>
        </section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-bold">Productos de esta tienda</h2><p className="mt-1 text-xs text-muted-foreground">{metrics.verified_product_count} productos vinculados · {metrics.available_video_count} videos disponibles</p></div><Link to="/products" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">Buscar en todo el catálogo</Link></div>
        {metrics.verified_product_count > 0 && <form className="mb-4 flex gap-2" onSubmit={event => { event.preventDefault(); if (accessLoading) return; if (!isLoggedIn) { openProOffer(); return; } setPage(1); setQuery(draft.trim()); }}><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input type="search" className="h-11 pl-9 text-base md:text-sm" aria-label="Buscar producto dentro de esta tienda" placeholder="Buscar en esta tienda" maxLength={300} value={draft} onChange={event => setDraft(event.target.value)} /></div><Button disabled={accessLoading} className="h-11">Buscar</Button></form>}
        {products.loading ? <p role="status" className="p-8 text-center text-muted-foreground">Cargando productos…</p>
          : products.error ? <div role="alert" className="rounded-xl border p-8 text-center"><p>{products.error}</p><Button variant="outline" className="mt-4" onClick={products.refetch}>Reintentar</Button></div>
          : products.data?.rows.length ? <><p className="mb-3 text-xs text-muted-foreground">{products.data.count} productos · Ordenados por ventas. Consulta el periodo de cada ficha.</p><ProductDiscoveryGrid products={products.data.rows} offset={(page - 1) * DISCOVERY_PAGE_SIZE} /></>
          : <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center"><PackageSearch className="mx-auto mb-3 size-9 text-primary" /><h3 className="font-semibold">{query ? "No encontramos ese producto en esta tienda" : "Sus productos todavía no están vinculados"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{query ? "Prueba otro nombre o busca en el catálogo completo." : "Ya puedes consultar las ventas de esta tienda. Mostraremos aquí sus productos cuando tengamos confirmada la relación exacta con cada ficha."}</p><Button asChild className="mt-5" variant="outline"><Link to="/products">Buscar un producto</Link></Button></div>}
        {pages > 1 && <div className="mt-6">{isLoggedIn ? <CompactPagination currentPage={page} totalPages={pages} onPageChange={value => { setPage(value); window.scrollTo({ top: 0, behavior: "instant" }); }} /> : <Button className="mx-auto flex" variant="outline" onClick={openProOffer}><Lock className="mr-2 size-4" />Desbloquear más productos</Button>}</div>}
      </>}
  </div>;
}
