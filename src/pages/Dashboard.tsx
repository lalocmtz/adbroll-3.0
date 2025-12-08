import { useEffect, useState, useCallback } from "react";
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
import { Lock } from "lucide-react";

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

const SORT_OPTIONS = [
  { value: "revenue", label: "Más ingresos" },
  { value: "sales", label: "Más ventas" },
  { value: "views", label: "Más vistas" },
  { value: "earnings", label: "Ganancias estimadas" },
];

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<string>("revenue");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { market } = useMarket();
  const { isLoggedIn } = useBlurGateContext();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  
  const ITEMS_PER_PAGE = 20;
  const MAX_VIDEOS = 100;
  const FREE_PREVIEW_LIMIT = 10; // Videos visitors can see without blur

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
    const { data } = await supabase
      .from("products")
      .select("categoria")
      .eq("market", market)
      .not("categoria", "is", null);
    
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
      let query = supabase
        .from("videos")
        .select(`
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
        `, { count: "exact" })
        .not("video_mp4_url", "is", null)  // Must be downloaded
        .not("product_id", "is", null);     // Must have product assigned

      // Apply sorting first (before category filter which happens client-side)
      if (sortOrder === "revenue") {
        query = query.order("revenue_mxn", { ascending: false });
      } else if (sortOrder === "sales") {
        query = query.order("sales", { ascending: false });
      } else if (sortOrder === "views") {
        query = query.order("views", { ascending: false });
      } else if (sortOrder === "earnings") {
        query = query.order("revenue_mxn", { ascending: false });
      }

      if (productFilter) {
        query = query.ilike("product_name", `%${productFilter}%`);
      }

      if (creatorFilter) {
        query = query.or(`creator_name.ilike.%${creatorFilter}%,creator_handle.ilike.%${creatorFilter}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Filter by category client-side (since category is in the joined product)
      let filteredData = data || [];
      if (selectedCategory && selectedCategory !== "all") {
        filteredData = filteredData.filter(v => v.product?.categoria === selectedCategory);
      }

      // Apply pagination after filtering
      const paginatedData = filteredData.slice(from, to + 1);
      
      setVideos(paginatedData);
      setTotalCount(Math.min(filteredData.length, MAX_VIDEOS));
    } catch (error: any) {
      toast({
        title: "Error al cargar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{t("loadingVideos")}</p>
      </div>
    );
  }

  const totalPages = Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), 5);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      {/* Minimal header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <DataSubtitle />
        {(productFilter || creatorFilter) && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="text-xs h-7">
            ← Ver todos
          </Button>
        )}
      </div>

      {/* Filter Pills - Locked for visitors */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isLoggedIn ? (
          <div 
            className="flex flex-wrap gap-1.5 opacity-60 cursor-pointer"
            onClick={() => {
              navigate("/unlock");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {SORT_OPTIONS.map((option, i) => (
              <span
                key={option.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium h-8 flex items-center gap-1.5 ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border/50"
                }`}
              >
                <Lock className="h-3 w-3" />
                {option.label}
              </span>
            ))}
          </div>
        ) : (
          <FilterPills
            options={SORT_OPTIONS}
            value={sortOrder}
            onChange={setSortOrder}
          />
        )}
        
        {/* Category Dropdown - Locked for visitors */}
        {!isLoggedIn ? (
          <div 
            className="h-8 px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 cursor-pointer"
            onClick={() => {
              navigate("/unlock");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Lock className="h-3 w-3" />
            Categorías
          </div>
        ) : (
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs rounded-full border-border/50 bg-muted/60">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categorías</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        <span className="text-xs text-muted-foreground ml-auto">
          {totalCount} videos
        </span>
      </div>

      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            {productFilter
              ? `No se encontraron videos relacionados con "${productFilter}"`
              : creatorFilter
              ? `No se encontraron videos de @${creatorFilter}`
              : "No hay videos disponibles."}
          </p>
        </Card>
      ) : (
        <>
          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {videos.map((video, index) => {
              const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;
              const isFreePreview = !isLoggedIn && globalIndex < FREE_PREVIEW_LIMIT;
              const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
              
              if (isLocked) {
                return (
                  <div 
                    key={video.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      navigate("/unlock");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="blur-[2px] pointer-events-none">
                      <VideoCardOriginal 
                        video={video}
                        ranking={globalIndex + 1} 
                      />
                    </div>
                    <div className="absolute inset-0 bg-background/30 flex items-center justify-center rounded-xl">
                      <div className="text-center p-4">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Desbloquear</p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <VideoCardOriginal 
                  key={video.id} 
                  video={video}
                  ranking={globalIndex + 1}
                  isFreePreview={isFreePreview}
                />
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <CompactPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
