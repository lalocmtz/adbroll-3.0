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

interface DailyFeedVideo {
  id: string;
  rango_fechas: string;
  descripcion_video: string;
  duracion: string;
  creador: string;
  fecha_publicacion: string;
  ingresos_mxn: number;
  ventas: number;
  visualizaciones: number;
  gpm_mxn: number | null;
  cpa_mxn: number;
  ratio_ads: number | null;
  coste_publicitario_mxn: number;
  roas: number;
  tiktok_url: string;
  transcripcion_original: string | null;
  guion_ia: string | null;
  producto_nombre: string | null;
  producto_url: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<DailyFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const productFilter = searchParams.get("productName");
  const creatorFilter = searchParams.get("creator");

  useEffect(() => {
    fetchVideos();
  }, [productFilter, creatorFilter]);

  const fetchVideos = async () => {
    try {
      let query = supabase
        .from("daily_feed")
        .select("*")
        .eq("featured_today", true)
        .order("ingresos_mxn", { ascending: false })
        .limit(20);

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Filter by product name if provided
      if (productFilter) {
        filteredData = filteredData.filter((video) =>
          video.descripcion_video.toLowerCase().includes(productFilter.toLowerCase()) ||
          (video.producto_nombre && video.producto_nombre.toLowerCase().includes(productFilter.toLowerCase()))
        );
      }

      // Filter by creator if provided
      if (creatorFilter) {
        filteredData = filteredData.filter((video) =>
          video.creador.toLowerCase().includes(creatorFilter.toLowerCase())
        );
      }

      setVideos(filteredData);
      
      if (data && data.length > 0) {
        setLastUpdate(new Date(data[0].created_at));
      }
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

const mockVideos = [
  {
    id: "1",
    ranking: 1,
    tiktok_url: "https://www.tiktok.com/@example/video/123",
    descripcion_video: "Tutorial de maquillaje viral que generó altas ventas",
    creador: "@beautyguru",
    ingresos_mxn: 125000,
    ventas: 450,
    visualizaciones: 2500000,
    cpa_mxn: 277.78,
    roas: 4.5,
    duracion: "0:45",
    fecha_publicacion: "2025-01-15",
  },
  {
    id: "2",
    ranking: 2,
    tiktok_url: "https://www.tiktok.com/@example/video/124",
    descripcion_video: "Review de producto tech con llamado a la acción directo",
    creador: "@techreview",
    ingresos_mxn: 98500,
    ventas: 320,
    visualizaciones: 1800000,
    cpa_mxn: 307.81,
    roas: 3.8,
    duracion: "1:20",
    fecha_publicacion: "2025-01-14",
  },
  {
    id: "3",
    ranking: 3,
    tiktok_url: "https://www.tiktok.com/@example/video/125",
    descripcion_video: "Unboxing y prueba de producto fitness",
    creador: "@fitlife",
    ingresos_mxn: 87200,
    ventas: 280,
    visualizaciones: 1500000,
    cpa_mxn: 311.43,
    roas: 3.5,
    duracion: "0:55",
    fecha_publicacion: "2025-01-14",
  },
];

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} ranking={index + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
