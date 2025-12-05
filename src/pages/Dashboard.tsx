import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";

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

const SORT_OPTIONS = [
  { value: "revenue", label: "Más ingresos" },
  { value: "sales", label: "Más ventas" },
  { value: "views", label: "Más vistas" },
  { value: "recent", label: "Más recientes" },
];

const Dashboard = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<string>("revenue");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");
  
  const ITEMS_PER_PAGE = 20;
  const MAX_VIDEOS = 100;

  useEffect(() => {
    setCurrentPage(1);
    fetchVideos(1);
  }, [productFilter, creatorFilter, sortOrder]);

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
        .select("*", { count: "exact" });

      // Apply sorting
      if (sortOrder === "revenue") {
        query = query.order("revenue_mxn", { ascending: false });
      } else if (sortOrder === "sales") {
        query = query.order("sales", { ascending: false });
      } else if (sortOrder === "views") {
        query = query.order("views", { ascending: false });
      } else if (sortOrder === "recent") {
        query = query.order("imported_at", { ascending: false });
      }

      query = query.range(from, to);

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

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills
          options={SORT_OPTIONS}
          value={sortOrder}
          onChange={setSortOrder}
        />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {videos.map((video, index) => (
              <VideoCardOriginal 
                key={video.id} 
                video={video}
                ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} 
              />
            ))}
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
