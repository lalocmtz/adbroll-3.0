import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CatalogHeader, CatalogInfo, CatalogFilterBar } from "@/components/CatalogToolbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { FilterPills } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles } from "lucide-react";
import { CATALOG_PERIODS, CatalogPeriod, selectReportPeriod, formatReportPeriod } from "@/lib/catalog-period";
import { useProOffer } from "@/hooks/useProOffer";

interface Video {
  id: string;
  video_url: string;
  video_mp4_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  creator_id: string | null;
  product_name: string | null;
  product_id: string | null;
  sales: number | null;
  revenue_mxn: number | null;
  views: number | null;
  roas: number | null;
  category: string | null;
  country: string | null;
  rank: number | null;
  imported_at: string | null;
  processing_status: string | null;
  // Joined product data
  product?: {
    id: string;
    producto_nombre: string;
    imagen_url: string | null;
    total_ingresos_mxn: number | null;
    commission: number | null;
    price: number | null;
    precio_mxn: number | null;
    categoria: string | null;
    revenue_30d: number | null;
    producto_url: string | null;
  } | null;
}
const SORT_OPTIONS = [{
  value: "rank",
  label: "Ranking"
}, {
  value: "revenue",
  label: "Ventas"
}, {
  value: "sales",
  label: "Unidades"
}, {
  value: "views",
  label: "Vistas"
}, {
  value: "earnings",
  label: "Comisión"
}];
const Dashboard = () => {
  const [period, setPeriod] = useState<CatalogPeriod>("30");
  const [reportRanges, setReportRanges] = useState<string[]>([]);
  const [reportsReady, setReportsReady] = useState(false);
  const requestVersion = useRef(0);
  const selectedReport = selectReportPeriod(reportRanges, period);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<string>("rank");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const {
    market
  } = useMarket();
  const {
    isLoggedIn
  } = useBlurGateContext();
  const openProOffer = useProOffer();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  const ITEMS_PER_PAGE = 20;
  const FREE_PREVIEW_LIMIT = 10; // Videos visitors can see without blur

  useEffect(() => {
    fetchCategories();
    let cancelled = false;
    setReportsReady(false);
    setReportRanges([]);
    (supabase.rpc as any)("get_catalog_report_periods", { p_country: market }).then(({ data, error }: any) => {
      if (cancelled) return;
      if (error) toast({ title: "No se pudieron cargar los periodos", description: "Intenta recargar la página.", variant: "destructive" });
      setReportRanges((data || []).map((row: { snapshot_date_range: string }) => row.snapshot_date_range));
      setReportsReady(true);
    });
    return () => { cancelled = true; requestVersion.current++; };
  }, [market]);
  useEffect(() => {
    setCurrentPage(1);
  }, [productFilter, creatorFilter, sortOrder, selectedCategory, market, period]);
  useEffect(() => {
    if (!reportsReady) return;
    fetchVideos(currentPage);
  }, [currentPage, sortOrder, selectedCategory, productFilter, creatorFilter, market, period, reportsReady, selectedReport?.range]);
  const fetchCategories = async () => {
    const {
      data
    } = await supabase.from("products").select("categoria").eq("market", market).not("categoria", "is", null);
    if (data) {
      const uniqueCategories = [...new Set(data.map(p => p.categoria).filter(Boolean))] as string[];
      setCategories(uniqueCategories.sort());
    }
  };
  const fetchVideos = async (page: number) => {
    const version = ++requestVersion.current;
    if (!selectedReport) {
      setVideos([]); setTotalCount(0); setLoading(false); return;
    }
    try {
      setLoading(true);
      const from = (page - 1) * ITEMS_PER_PAGE;
      // Server chooses one exact report, applies filters/sort, then paginates.
      // Snapshot metrics survive later imports of the same video's other periods.
      const { data, error } = await (supabase.rpc as any)("get_catalog_videos", {
        p_country: market, p_report: selectedReport?.range || null, p_sort: sortOrder,
        p_category: selectedCategory === 'all' ? null : selectedCategory,
        p_product: productFilter || null, p_creator: creatorFilter || null, p_offset: from,
      });
      if (version !== requestVersion.current) return;
      if (error) throw error;

      setVideos((data?.rows || []) as Video[]);
      setTotalCount(data?.count ?? 0);
    } catch (error: any) {
      if (version !== requestVersion.current) return;
      setVideos([]); setTotalCount(0);
      toast({
        title: "Error al cargar videos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-[50dvh] flex items-center justify-center">
        <p className="text-muted-foreground">{t("loadingVideos")}</p>
      </div>;
  }
  // Remove artificial 5-page limit - show all pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };
  const marketLabel = market === 'mx' ? 'México' : 'Estados Unidos';
  
  return <div className="min-w-0 w-full pt-2 pb-24 md:pb-6 px-3 md:px-6">
      <CatalogHeader title="Videos que están vendiendo" count={`${totalCount} videos`}>
        <CatalogInfo>
          <p className="font-semibold">TikTok Shop {marketLabel}</p>
          <p>{selectedReport ? `Datos del ${formatReportPeriod(selectedReport.range)}` : 'Este periodo todavía no tiene reporte'}</p>
          <p>Ventas reportadas del periodo seleccionado, aunque el video se haya publicado antes. No son cifras en tiempo real.</p>
          <p>Los importes están en pesos mexicanos (MXN). La comisión es una estimación según la tasa disponible del producto.</p>
        </CatalogInfo>
      </CatalogHeader>
      {(productFilter || creatorFilter) && <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-xs h-9 mb-1">← Ver todos</Button>}
      <CatalogFilterBar label="Periodo y orden de videos">
        <div role="group" aria-label="Periodo de ventas" className="flex gap-1.5">
          {CATALOG_PERIODS.map(option => <button
            key={option.value} type="button" aria-label={option.label} aria-pressed={period === option.value}
            onClick={() => { setCurrentPage(1); setPeriod(option.value); }}
            className={`min-h-11 rounded-full px-3 py-1.5 text-xs font-medium border whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${period === option.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-muted-foreground border-border/50 hover:bg-muted'}`}
          >{option.value} días</button>)}
        </div>
        <span className="h-5 border-l border-border" aria-hidden="true" />
        <FilterPills compact options={SORT_OPTIONS} value={sortOrder} onChange={(value) => {
          if (!isLoggedIn) { navigate("/pricing"); return; }
          setSortOrder(value);
        }} />
        {!isLoggedIn ? <Button variant="outline" className="min-h-11 rounded-full text-xs bg-muted/60" onClick={() => navigate("/pricing")}>
          <Lock className="size-3 mr-1" />Categorías
        </Button> : <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger aria-label="Categoría de videos" className="h-11 w-auto max-w-48 text-xs rounded-full border-border/50 bg-muted/60">
            <SelectValue placeholder="Categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Categorías</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>}
      </CatalogFilterBar>

      {videos.length === 0 ? <Card className="px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm text-pretty">
            {!selectedReport ? `Todavía no tenemos un reporte de ${period} días. Elige otro periodo para explorar las referencias disponibles.` : productFilter ? `No se encontraron videos relacionados con "${productFilter}"` : creatorFilter ? `No se encontraron videos de @${creatorFilter}` : "No hay videos disponibles con estos filtros. Prueba otra categoría o periodo."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => { setSelectedCategory("all"); setPeriod(period === "7" ? "30" : "7"); setCurrentPage(1); }}>Explorar otro periodo</Button>
        </Card> : <>
          {/* Video Grid - 2 columns on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-5 [&>*]:min-w-0">
            {videos.map((video, index) => {
          const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
          const isFreePreview = !isLoggedIn && globalIndex < FREE_PREVIEW_LIMIT;
          const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
          if (isLocked) {
            return <div key={video.id} className="relative cursor-pointer group" onClick={() => {
              navigate("/pricing");
              window.scrollTo({
                top: 0,
                behavior: 'smooth'
              });
            }}>
                    <div className="blur-[2px] pointer-events-none">
                      <VideoCardOriginal video={video} ranking={globalIndex + 1} />
                    </div>
                    <div className="absolute inset-0 bg-background/30 flex items-center justify-center rounded-xl">
                      <div className="text-center p-4">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Desbloquear</p>
                      </div>
                    </div>
                  </div>;
          }
          return <VideoCardOriginal key={video.id} video={video} ranking={globalIndex + 1} isFreePreview={isFreePreview} />;
        })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && <div className="mt-6 mb-16 md:mb-0">
              {!isLoggedIn ? <div className="flex items-center justify-center gap-2 opacity-60 cursor-pointer" onClick={() => {
          navigate("/pricing");
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ver más videos</span>
                </div> : <CompactPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>}
        </>}

      {/* Sticky CTA for visitors - Mobile only */}
      {!isLoggedIn && <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
          <Button className="w-full h-12 text-sm font-semibold shadow-lg" onClick={openProOffer}>
            <Sparkles className="h-4 w-4 mr-2" />
            Desbloquear acceso completo
          </Button>
        </div>}
    </div>;
};
export default Dashboard;
