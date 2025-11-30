import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Heart, Video, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/hooks/use-toast";
import VideoCard from "@/components/VideoCard";
import ProductCard from "@/components/ProductCard";

interface Favorite {
  id: string;
  item_type: "video" | "product";
  item_id: string;
  created_at: string;
}

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

interface Product {
  id: string;
  producto_nombre: string;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  precio_mxn: number | null;
  promedio_roas: number | null;
  categoria: string | null;
  producto_url: string | null;
}

const Favorites = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [videos, setVideos] = useState<DailyFeedVideo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Fetch user's favorites
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (favError) throw favError;

      setFavorites((favData || []) as Favorite[]);

      // Fetch video details
      const videoIds = (favData || [])
        .filter((f) => f.item_type === "video")
        .map((f) => f.item_id);

      if (videoIds.length > 0) {
        const { data: videoData, error: videoError } = await supabase
          .from("daily_feed")
          .select("*")
          .in("id", videoIds);

        if (videoError) throw videoError;
        setVideos(videoData || []);
      }

      // Fetch product details
      const productIds = (favData || [])
        .filter((f) => f.item_type === "product")
        .map((f) => f.item_id);

      if (productIds.length > 0) {
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds);

        if (productError) throw productError;
        setProducts(productData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error al cargar favoritos",
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
        <p className="text-muted-foreground">Cargando favoritos...</p>
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            Mis Favoritos
          </h2>
          <p className="text-muted-foreground">
            Videos y productos que has guardado
          </p>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                No tienes favoritos guardados
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Explora videos y productos, y guarda tus favoritos haciendo clic en el botón de corazón
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Videos Section */}
            {videos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Video className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">
                    Videos Guardados ({videos.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {videos.map((video, index) => (
                    <VideoCard key={video.id} video={video} ranking={index + 1} />
                  ))}
                </div>
              </div>
            )}

            {/* Products Section */}
            {products.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">
                    Productos Guardados ({products.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} showRelatedVideos />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;
