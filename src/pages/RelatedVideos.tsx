import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, ChevronRight } from "lucide-react";
import VideoCard from "@/components/VideoCard";
import DashboardNav from "@/components/DashboardNav";
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
  producto_nombre: string | null;
  producto_url: string | null;
  created_at: string;
}

const RelatedVideos = () => {
  const { productId, creatorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<DailyFeedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const isProductView = !!productId;
  const isCreatorView = !!creatorId;

  useEffect(() => {
    fetchRelatedVideos();
  }, [productId, creatorId]);

  const fetchRelatedVideos = async () => {
    try {
      if (isProductView && productId) {
        // Fetch product info
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("producto_nombre")
          .eq("id", productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!productData) {
          toast({
            title: "Producto no encontrado",
            variant: "destructive",
          });
          navigate("/products");
          return;
        }

        setTitle(productData.producto_nombre);

        // Fetch videos matching product name
        const { data: videosData, error: videosError } = await supabase
          .from("daily_feed")
          .select("*")
          .or(`descripcion_video.ilike.%${productData.producto_nombre}%,producto_nombre.ilike.%${productData.producto_nombre}%`)
          .order("ingresos_mxn", { ascending: false })
          .order("ventas", { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);

        if (videosData && videosData.length > 0) {
          setLastUpdate(new Date(videosData[0].created_at));
        }

      } else if (isCreatorView && creatorId) {
        // Fetch creator info
        const { data: creatorData, error: creatorError } = await supabase
          .from("creators")
          .select("usuario_creador, nombre_completo")
          .eq("id", creatorId)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creatorData) {
          toast({
            title: "Creador no encontrado",
            variant: "destructive",
          });
          navigate("/creadores");
          return;
        }

        setTitle(creatorData.nombre_completo || creatorData.usuario_creador);

        // Fetch videos by creator
        const { data: videosData, error: videosError } = await supabase
          .from("daily_feed")
          .select("*")
          .eq("creador", creatorData.usuario_creador)
          .order("ingresos_mxn", { ascending: false })
          .order("ventas", { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);

        if (videosData && videosData.length > 0) {
          setLastUpdate(new Date(videosData[0].created_at));
        }
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

      {/* Navigation */}
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app" className="hover:text-foreground transition-colors">
            Videos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            to={isProductView ? "/products" : "/creadores"} 
            className="hover:text-foreground transition-colors"
          >
            {isProductView ? "Productos" : "Creadores"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{title}</span>
        </div>

        {/* Title and Info */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Videos de {isProductView ? "Producto" : "Creador"}: {title}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {videos.length} {videos.length === 1 ? "video" : "videos"}
            </Badge>
            {lastUpdate && (
              <p className="text-sm text-muted-foreground">
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
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No se encontraron videos relacionados con {title}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} ranking={index + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RelatedVideos;
