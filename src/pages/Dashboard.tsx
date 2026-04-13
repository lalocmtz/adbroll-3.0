import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCard from "@/components/VideoCard";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
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
  tiktok_url: string;
  descripcion_video: string;
  creador: string;
  producto_nombre: string | null;
  producto_url: string | null;
  product_id: string | null;
  ventas: number;
  ingresos_mxn: number;
  visualizaciones: number;
  roas: number | null;
  cpa_mxn: number;
  duracion: string;
  fecha_publicacion: string;
  transcripcion_original: string | null;
  guion_ia: string | null;
  category: string | null;
  country: string | null;
  product_price: number | null;
  product_sales: number | null;
  product_revenue: number | null;
  created_at: string | null;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"sales" | "revenue">("revenue");
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
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
        .from("daily_feed")
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

      const primarySort = sortOrder === "sales" ? "ventas" : "ingresos_mxn";
      const secondarySort = sortOrder === "sales" ? "ingresos_mxn" : "ventas";

      let query = supabase
        .from("daily_feed")
        .select("*", { count: "exact" })
        .order(primarySort, { ascending: false })
        .order(secondarySort, { ascending: false })
        .range(from, to);

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (productFilter) {
        query = query.ilike("producto_nombre", `%${productFilter}%`);
      }

      if (creatorFilter) {
        query = query.ilike("creador", `%${creatorFilter}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setVideos((data ?? []) as Video[]);
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
        <p className="text-muted-foreground">Cargando videos...</p>
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
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-2 max-w-7xl">
        {/* Compact Header - Single Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <h1 className="text-2xl md:text-3xl font-bold">
            {productFilter 
              ? `Videos de: ${productFilter}` 
              : creatorFilter 
              ? `Videos de @${creatorFilter}`
              : "Top 100 Videos de TikTok Shop México"}
          </h1>

          <div className="flex items-center gap-3">
            {/* Sort Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium hidden md:inline">Ordenar:</span>
              <Select value={sortOrder} onValueChange={(value: "sales" | "revenue") => setSortOrder(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Más ingresos</SelectItem>
                  <SelectItem value="sales">Más ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Button */}
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
            {/* Pagination Info and Controls - TOP */}
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

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {videos.map((video, index) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                />
              ))}
            </div>

            {/* Pagination - BOTTOM */}
            {totalPages > 1 && (
              <div className="mt-8 mb-4 flex justify-center">
                <PaginationComponent />
              </div>
            )}
          </>
        )}

        {/* Filter Sidebar */}
        <FilterSidebar
          open={filterSidebarOpen}
          onOpenChange={setFilterSidebarOpen}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categories}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      </main>
    </div>
  );
};

export default Dashboard;
