import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles } from "lucide-react";
import { CATALOG_PERIODS, CatalogPeriod, selectReportPeriod, formatReportPeriod } from "@/lib/catalog-period";
import { useStartCheckout } from "@/lib/checkout";

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
  label: "Ranking actual"
}, {
  value: "revenue",
  label: "Más ingresos"
}, {
  value: "sales",
  label: "Más ventas"
}, {
  value: "views",
  label: "Más vistas"
}, {
  value: "earnings",
  label: "Ganancias estimadas"
}];
const Dashboard = () => {
  const [period, setPeriod] = useState<CatalogPeriod>("latest");
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
  const { start: startCheckout, loading: checkoutLoading } = useStartCheckout();
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
    if (period !== 'all' && !selectedReport) {
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
    return <div className="min-h-screen flex items-center justify-center">
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
  
  return <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Compact mobile catalogue header */}
      <div className="mb-3 md:mb-4 py-1 md:py-0">
        <div className="md:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-foreground leading-tight">
              Videos destacados de TikTok Shop
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            TikTok Shop {marketLabel} · Datos de Kalodata
          </p>
        </div>

        {/* Desktop minimal header */}
        <div className="hidden md:flex md:items-center md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-foreground leading-tight">
                Videos destacados de TikTok Shop
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              TikTok Shop {marketLabel} · Datos de Kalodata; no en tiempo real
            </p>
          </div>
          {(productFilter || creatorFilter) && <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-xs h-7">
              ← Ver todos
            </Button>}
        </div>
        
        {/* Mobile back button */}
        {(productFilter || creatorFilter) && <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-xs h-7 md:hidden">
            ← Ver todos
          </Button>}
      </div>

      {/* Filter Pills - Compact horizontal scrollable on mobile */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <label htmlFor="catalog-period" className="text-xs font-medium">Periodo de ventas</label>
          <Select value={period} onValueChange={(value) => { setCurrentPage(1); setPeriod(value as CatalogPeriod); }}>
            <SelectTrigger id="catalog-period" className="h-9 w-auto min-w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATALOG_PERIODS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{selectedReport ? formatReportPeriod(selectedReport.range) : period === 'all' ? 'Comparas reportes de distintas fechas' : 'Sin reporte importado para este periodo'}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {period === 'all' ? 'Histórico: cada video conserva las métricas de su último reporte. No representan ventas actuales.' : 'Filtra el periodo de ventas del reporte, no la fecha de publicación del video. No sumamos reportes que se superponen.'}
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-3">
          {!isLoggedIn ? <div className="flex gap-1.5 opacity-60 cursor-pointer flex-wrap" onClick={() => {
          navigate("/unlock");
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}>
              {SORT_OPTIONS.map((option, i) => <span key={option.value} className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium h-7 md:h-8 flex items-center gap-1 whitespace-nowrap ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border/50"}`}>
                  <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  {option.label}
                </span>)}
            </div> : <FilterPills options={SORT_OPTIONS} value={sortOrder} onChange={setSortOrder} />}
          
          {/* Category Dropdown - Locked for visitors */}
          {!isLoggedIn ? <div className="h-7 md:h-8 px-2.5 md:px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground opacity-60 cursor-pointer whitespace-nowrap flex-shrink-0" onClick={() => {
          navigate("/unlock");
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }}>
              <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
              Categorías
            </div> : <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-7 md:h-8 w-auto min-w-[100px] md:min-w-[120px] text-[11px] md:text-xs rounded-full border-border/50 bg-muted/60 flex-shrink-0">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categorías</SelectItem>
                {categories.map(cat => <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>)}
              </SelectContent>
            </Select>}
        </div>
        
        <span className="text-[11px] text-muted-foreground block mt-1.5 md:hidden">
          {totalCount} videos
        </span>
        <span className="text-xs text-muted-foreground hidden md:block mt-2">
          {totalCount} videos
        </span>
      </div>

      {videos.length === 0 ? <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            {period !== 'all' && !selectedReport ? `Todavía no hay un reporte de ${period === 'latest' ? 'ventas' : `${period} días`} importado. Hace falta exportar ese periodo desde Kalodata.` : productFilter ? `No se encontraron videos relacionados con "${productFilter}"` : creatorFilter ? `No se encontraron videos de @${creatorFilter}` : "No hay videos descargados con estos filtros. Prueba otra categoría o periodo."}
          </p>
        </Card> : <>
          {/* Video Grid - 2 columns on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-5">
            {videos.map((video, index) => {
          const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
          const isFreePreview = !isLoggedIn && globalIndex < FREE_PREVIEW_LIMIT;
          const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
          if (isLocked) {
            return <div key={video.id} className="relative cursor-pointer group" onClick={() => {
              navigate("/unlock");
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
          navigate("/unlock");
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
          <Button className="w-full h-12 text-sm font-semibold shadow-lg" onClick={startCheckout} disabled={checkoutLoading}>
            <Sparkles className="h-4 w-4 mr-2" />
            Desbloquear acceso completo
          </Button>
        </div>}
    </div>;
};
export default Dashboard;
