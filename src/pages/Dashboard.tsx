import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoCard from "@/components/VideoCard";
import { useToast } from "@/hooks/use-toast";

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
  created_at: string;
}

const Dashboard = () => {
  const [videos, setVideos] = useState<DailyFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_feed")
        .select("*")
        .order("ingresos_mxn", { ascending: false })
        .limit(20);

      if (error) throw error;

      setVideos(data || []);
      
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
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Top 20 Videos del Día
          </h2>
          {lastUpdate && (
            <p className="text-muted-foreground">
              Última actualización:{" "}
              {lastUpdate.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No hay videos disponibles. El fundador subirá datos pronto.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
