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
}

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
    fetchVideos(1);
  }, [productFilter, creatorFilter]);

  useEffect(() => {
    fetchVideos(currentPage);
  }, [currentPage]);

  const fetchVideos = async (page: number) => {
    try {
      setLoading(true);
      
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("videos")
        .select("*", { count: "exact" })
        .order("sales", { ascending: false })
        .order("revenue_mxn", { ascending: false })
        .range(from, to)
        .limit(100);

      // Apply filters
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
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
                    guion_ia: null
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
