import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMarket } from "@/contexts/MarketContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { PreviewGate } from "@/components/PreviewGate";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { VariantResearchCard } from "@/components/research/VariantResearchCard";
import { Events, track } from "@/lib/analytics";

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
  transcript: string | null;
  analysis_json: any;
  variants_json: any;
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
  label: "Ingresos"
}, {
  value: "earnings",
  label: "Análisis IA"
}];
const Dashboard = () => {
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
    isLoggedIn,
    openPaywall
  } = useBlurGateContext();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  const ITEMS_PER_PAGE = 20;
  const FREE_PREVIEW_LIMIT = 10; // Videos visitors can see without blur

  // Track what caused the current fetch so Top20Loaded can carry a
  // `trigger` prop — first_load vs filter/sort/page/market churn.
  const triggerRef = useRef<"first_load" | "filter" | "sort" | "page" | "market">("first_load");

  useEffect(() => {
    fetchCategories();
  }, [market]);
  useEffect(() => {
    setCurrentPage(1);
  }, [productFilter, creatorFilter, sortOrder, selectedCategory, market]);
  useEffect(() => {
    fetchVideos(currentPage);
  }, [currentPage, sortOrder, selectedCategory, productFilter, creatorFilter, market]);
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
    try {
      setLoading(true);
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Use JOIN to get product data
      // ONLY show videos that are COMPLETE (downloaded AND have product assigned)
      // Filter by market/country (using lowercase: 'mx' or 'us')
      let query = supabase.from("videos").select(`
          *,
          product:products (
            id,
            producto_nombre,
            imagen_url,
            total_ingresos_mxn,
            commission,
            price,
            precio_mxn,
            categoria,
            revenue_30d,
            producto_url
          )
        `, {
        count: "exact"
      }).not("video_mp4_url", "is", null) // Must be downloaded
      .not("product_id", "is", null) // Must have product assigned
      .eq("country", market); // Filter by market (lowercase 'mx' or 'us')

      // Apply sorting first (before category filter which happens client-side)
      if (sortOrder === "rank") {
        // Only show videos with current rank (from latest Kalodata import)
        query = query.not("rank", "is", null).order("rank", {
          ascending: true
        });
      } else if (sortOrder === "revenue") {
        query = query.order("revenue_mxn", {
          ascending: false
        });
      } else if (sortOrder === "sales") {
        query = query.order("sales", {
          ascending: false
        });
      } else if (sortOrder === "views") {
        query = query.order("views", {
          ascending: false
        });
      } else if (sortOrder === "earnings") {
        query = query.order("revenue_mxn", {
          ascending: false
        });
      }
      if (productFilter) {
        query = query.ilike("product_name", `%${productFilter}%`);
      }
      if (creatorFilter) {
        query = query.or(`creator_name.ilike.%${creatorFilter}%,creator_handle.ilike.%${creatorFilter}%`);
      }
      const {
        data,
        error,
        count
      } = await query;
      if (error) throw error;

      // Filter by category client-side (since category is in the joined product)
      let filteredData = data || [];
      if (selectedCategory && selectedCategory !== "all") {
        filteredData = filteredData.filter(v => v.product?.categoria === selectedCategory);
      }

      // Apply pagination after filtering
      const paginatedData = filteredData.slice(from, to + 1);
      setVideos(paginatedData);
      // Use the real count (backend count for non-category filter, or filtered length)
      const realCount = selectedCategory && selectedCategory !== "all"
        ? filteredData.length
        : (count || filteredData.length);
      setTotalCount(realCount);

      track(Events.Top20Loaded, {
        count: paginatedData.length,
        total: realCount,
        page,
        sort_order: sortOrder,
        category: selectedCategory,
        market,
        product_filter: productFilter,
        creator_filter: creatorFilter,
        logged_in: isLoggedIn,
        trigger: triggerRef.current,
      });
      // Next fetch is either a filter/sort/page change — reset for the
      // following render to classify it correctly. Subsequent effects
      // will bump this ref before calling fetchVideos.
      triggerRef.current = "page";
    } catch (error: any) {
      toast({
        title: "Error al cargar videos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    // Skeleton that mirrors the real grid shape so CLS is minimized and
    // perceived wait drops — avoids the generic "loading..." bounce on
    // slow mobile connections.
    return <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6 max-w-7xl mx-auto w-full">
        <div className="mb-3 md:mb-4">
          <div className="h-6 md:h-7 w-48 rounded bg-muted/60 animate-pulse" />
          <div className="mt-2 h-3 w-64 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="mb-4 md:mb-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-7 md:h-8 w-24 rounded-full bg-muted/50 animate-pulse flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-5">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-xl overflow-hidden">
              <div className="aspect-[9/16] bg-muted/50 animate-pulse" />
              <div className="p-2 md:p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>)}
        </div>
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
  const todayFormatted = format(new Date(), "d 'de' MMMM", { locale: es });
  
  return <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6 max-w-7xl mx-auto w-full">
      {/* Compact Mobile Hero Section - Dynamic Date */}
      <div className="mb-3 md:mb-4 py-1 md:py-0">
        <div className="md:hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground leading-tight">
              🤖 Lo que VENDE HOY en TikTok Shop {marketLabel}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Analizado en tiempo real por IA · {todayFormatted}
          </p>
          <p className="text-[11px] text-[#FF6B6B] font-semibold mt-0.5">
            50,000+ videos analizados
          </p>
        </div>

        {/* Desktop minimal header */}
        <div className="hidden md:flex md:items-center md:justify-between gap-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                🤖 Lo que VENDE HOY en TikTok Shop {marketLabel}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Analizado en tiempo real por IA · {todayFormatted}
            </p>
            <p className="text-xs text-[#FF6B6B] font-semibold mt-1">
              50,000+ videos analizados · Los guiones y productos que están vendiendo
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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-3">
          {!isLoggedIn ? <button
              type="button"
              className="flex gap-1.5 opacity-60 flex-wrap text-left"
              aria-label="Desbloquear filtros"
              onClick={() => openPaywall("dashboard_filters")}
            >
              {SORT_OPTIONS.map((option, i) => <span key={option.value} className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-full text-[11px] md:text-xs font-medium h-7 md:h-8 flex items-center gap-1 whitespace-nowrap ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border/50"}`}>
                  <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                  {option.label}
                </span>)}
            </button> : <FilterPills options={SORT_OPTIONS} value={sortOrder} onChange={setSortOrder} />}

          {/* Category Dropdown - Locked for visitors */}
          {!isLoggedIn ? <button
              type="button"
              className="h-7 md:h-8 px-2.5 md:px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1 text-[11px] md:text-xs text-muted-foreground opacity-60 whitespace-nowrap flex-shrink-0"
              aria-label="Desbloquear categorías"
              onClick={() => openPaywall("dashboard_categories")}
            >
              <Lock className="h-2.5 w-2.5 md:h-3 md:w-3" />
              Categorías
            </button> : <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
            {productFilter ? `No se encontraron videos relacionados con "${productFilter}"` : creatorFilter ? `No se encontraron videos de @${creatorFilter}` : "No hay videos disponibles."}
          </p>
        </Card> : <>
          {/* Video Grid - 2 columns on mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-5">
            {videos.map((video, index) => {
          const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
          const isFreePreview = !isLoggedIn && globalIndex < FREE_PREVIEW_LIMIT;
          const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;

          const handleRowClick = () => {
            track(Events.Top20RowClicked, {
              video_id: video.id,
              product_id: video.product_id,
              product_name: video.product_name,
              creator_handle: video.creator_handle,
              position: globalIndex + 1,
              sort_order: sortOrder,
              revenue_mxn: video.revenue_mxn,
              market,
              locked: isLocked,
              logged_in: isLoggedIn,
            });
          };

          if (isLocked) {
            return (
              <div key={video.id} onClickCapture={handleRowClick}>
                <PreviewGate locked feature="top20_video" radiusClass="rounded-xl" blurAmount="sm">
                  <VideoCardOriginal video={video} ranking={globalIndex + 1} />
                </PreviewGate>
              </div>
            );
          }
          return <div key={video.id} onClickCapture={handleRowClick}>
            <VideoCardOriginal video={video} ranking={globalIndex + 1} isFreePreview={isFreePreview} />
          </div>;
        })}
          </div>

          {/* Variant research prompt — shown once per session after the grid */}
          {isLoggedIn && videos.length >= 6 && (
            <div className="mt-8 mb-4 max-w-2xl mx-auto">
              <VariantResearchCard
                context="dashboard_inline"
                loggedIn={isLoggedIn}
                market={market}
              />
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && <div className="mt-6 mb-16 md:mb-0">
              {!isLoggedIn ? <button
                  type="button"
                  className="flex items-center justify-center gap-2 opacity-60 w-full"
                  aria-label="Desbloquear más videos"
                  onClick={() => openPaywall("top20_pagination")}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ver más videos</span>
                </button> : <CompactPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />}
            </div>}
        </>}

      {/* Sticky CTA for visitors - Mobile only */}
      {!isLoggedIn && <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
          <Button className="w-full h-12 text-sm font-semibold shadow-lg" onClick={() => openPaywall("dashboard_sticky_cta")}>
            <Sparkles className="h-4 w-4 mr-2" />
            Desbloquear acceso completo 
          </Button>
        </div>}
    </div>;
};
export default Dashboard;