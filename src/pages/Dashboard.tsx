import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import FilterSidebar from "@/components/FilterSidebar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";

interface Video {
  id: string;
  video_url: string;
  video_mp4_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  creator_name: string | null;
  creator_handle: string | null;
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
}

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"sales" | "revenue" | "views">("revenue");
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  
  const ITEMS_PER_PAGE = 20;
  const MAX_VIDEOS = 100;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchVideos(1);
  }, [productFilter, creatorFilter, selectedCategory, selectedDate, sortOrder]);

  useEffect(() => {
    fetchVideos(currentPage);
  }, [currentPage]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("category")
        .not("category", "is", null);

      if (error) throw error;

      const uniqueCategories = Array.from(
        new Set(data?.map((item) => item.category).filter(Boolean))
      ) as string[];

      setCategories(uniqueCategories.sort());
    } catch (error: any) {
      console.error("Error loading categories:", error.message);
    }
  };

  const fetchVideos = async (page: number) => {
    try {
      setLoading(true);
      
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let primarySort: "sales" | "revenue_mxn" = "revenue_mxn";
      let secondarySort: "sales" | "revenue_mxn" = "sales";

      if (sortOrder === "sales") {
        primarySort = "sales";
        secondarySort = "revenue_mxn";
      }

      let query = supabase
        .from("videos")
        .select("*", { count: "exact" })
        .order(primarySort, { ascending: false })
        .order(secondarySort, { ascending: false })
        .range(from, to);

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (productFilter) {
        query = query.ilike("product_name", `%${productFilter}%`);
      }

      if (creatorFilter) {
        query = query.or(`creator_name.ilike.%${creatorFilter}%,creator_handle.ilike.%${creatorFilter}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setVideos(data || []);
      setTotalCount(Math.min(count || 0, MAX_VIDEOS));
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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

  const activeFilterCount = 
    (selectedCategory !== "all" ? 1 : 0) + 
    (selectedDate !== "all" ? 1 : 0);

  const PaginationComponent = () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              onClick={() => handlePageChange(page)}
              isActive={currentPage === page}
              className="cursor-pointer"
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  return (
    <div className="py-4 px-4 md:px-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <h1 className="text-2xl md:text-3xl font-bold">
          {productFilter
              ? `Videos de: ${productFilter}` 
              : creatorFilter 
              ? `Videos de @${creatorFilter}`
              : "Top 100 Videos de TikTok Shop México"}
          </h1>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden md:inline">{t("sortBy")}:</span>
              <Select value={sortOrder} onValueChange={(value: "sales" | "revenue" | "views") => setSortOrder(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">{t("moreRevenue")}</SelectItem>
                  <SelectItem value="sales">{t("moreSales")}</SelectItem>
                  <SelectItem value="views">{t("moreViews")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="default"
              onClick={() => setFilterSidebarOpen(true)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {(productFilter || creatorFilter) && (
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app")}
            >
              Ver todos los videos
            </Button>
          </div>
        )}

        {videos.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              {productFilter
                ? `No se encontraron videos relacionados con "${productFilter}"`
                : creatorFilter
                ? `No se encontraron videos de @${creatorFilter}`
                : "No hay videos disponibles. El fundador subirá datos pronto."}
            </p>
          </Card>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {Math.min(totalCount, MAX_VIDEOS)} videos
              </p>
              {totalPages > 1 && (
                <div className="flex justify-center sm:justify-end">
                  <PaginationComponent />
                </div>
              )}
            </div>

            {/* Video Grid - 4 columns like original design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video, index) => (
                <VideoCardOriginal 
                  key={video.id} 
                  video={video}
                  ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} 
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 mb-4 flex justify-center">
                <PaginationComponent />
              </div>
            )}
          </>
        )}

        <FilterSidebar
          open={filterSidebarOpen}
          onOpenChange={setFilterSidebarOpen}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
    </div>
  );
};

export default Dashboard;
