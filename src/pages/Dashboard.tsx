import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCard from "@/components/VideoCard";
import { useToast } from "@/hooks/use-toast";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import FilterBar from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
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
  product_price: number | null;
  product_sales: number | null;
  product_revenue: number | null;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"sales" | "revenue" | "roas">("sales");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchVideos(1);
  }, [productFilter, creatorFilter, searchText, selectedCategory, sortOrder]);

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

      // Determine sort order
      let primarySort: "sales" | "revenue_mxn" | "roas" = "sales";
      let secondarySort: "sales" | "revenue_mxn" | "roas" = "revenue_mxn";

      if (sortOrder === "revenue") {
        primarySort = "revenue_mxn";
        secondarySort = "sales";
      } else if (sortOrder === "roas") {
        primarySort = "roas";
        secondarySort = "revenue_mxn";
      }

      let query = supabase
        .from("videos")
        .select("*", { count: "exact" })
        .order(primarySort, { ascending: false })
        .order(secondarySort, { ascending: false })
        .range(from, to);

      // Apply search filter
      if (searchText.trim()) {
        query = query.or(`title.ilike.%${searchText}%,creator_handle.ilike.%${searchText}%`);
      }

      // Apply category filter
      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      // Apply existing filters
      if (productFilter) {
        query = query.ilike("product_name", `%${productFilter}%`);
      }

      if (creatorFilter) {
        query = query.or(`creator_name.ilike.%${creatorFilter}%,creator_handle.ilike.%${creatorFilter}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setVideos(data || []);
      setTotalCount(count || 0);
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

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {productFilter 
              ? `Videos de: ${productFilter}` 
              : creatorFilter 
              ? `Videos de @${creatorFilter}`
              : "Top 20 Videos del Día"}
          </h1>
          {(productFilter || creatorFilter) && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/app")}
              >
                Ver todos los videos
              </Button>
            </div>
          )}
        </div>

        <FilterBar />

        {/* New Filter Bar */}
        <div className="mt-8 space-y-6">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título o creador..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === "all" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Ordenar por:</span>
            <Select value={sortOrder} onValueChange={(value: "sales" | "revenue" | "roas") => setSortOrder(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Más ventas</SelectItem>
                <SelectItem value="revenue">Más ingresos</SelectItem>
                <SelectItem value="roas">Mejor ROAS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {videos.length === 0 ? (
          <Card className="p-12 text-center mt-8">
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
            <div className="mb-6 mt-8">
              <p className="text-muted-foreground text-sm">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} videos
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video, index) => (
                <VideoCard 
                  key={video.id} 
                  video={{
                    id: video.id,
                    tiktok_url: video.video_url,
                    descripcion_video: video.title || "",
                    creador: video.creator_name || video.creator_handle || "",
                    ingresos_mxn: video.revenue_mxn || 0,
                    ventas: video.sales || 0,
                    visualizaciones: video.views || 0,
                    roas: video.roas || 0,
                    producto_nombre: video.product_name,
                    producto_url: null,
                    cpa_mxn: video.revenue_mxn && video.sales ? video.revenue_mxn / video.sales : 0,
                    duracion: "",
                    fecha_publicacion: video.imported_at || "",
                    transcripcion_original: null,
                    guion_ia: null,
                    product_id: video.product_id,
                    product_price: video.product_price,
                    product_sales: video.product_sales,
                    product_revenue: video.product_revenue,
                  }} 
                  ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} 
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12 mb-8">
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
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
