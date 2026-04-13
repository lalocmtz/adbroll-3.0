import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink, Copy, Heart } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useNavigate } from "react-router-dom";

interface FavoriteVideo {
  id: string;
  video_data: any;
  created_at: string;
}

interface FavoriteProduct {
  id: string;
  product_data: any;
  created_at: string;
}

interface FavoriteScript {
  id: string;
  script_data: any;
  created_at: string;
}

const Favorites = () => {
  const [videos, setVideos] = useState<FavoriteVideo[]>([]);
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [scripts, setScripts] = useState<FavoriteScript[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

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

      const [videosRes, productsRes, scriptsRes] = await Promise.all([
        supabase.from("favorites_videos").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites_products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites_scripts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (videosRes.error) throw videosRes.error;
      if (productsRes.error) throw productsRes.error;
      if (scriptsRes.error) throw scriptsRes.error;

      setVideos(videosRes.data || []);
      setProducts(productsRes.data || []);
      setScripts(scriptsRes.data || []);
    } catch (error: any) {
      console.error("Error fetching favorites:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los favoritos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites_videos").delete().eq("id", id);
      if (error) throw error;

      setVideos(videos.filter((v) => v.id !== id));
      toast({
        title: "✓ Eliminado de favoritos",
        description: "Video eliminado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites_products").delete().eq("id", id);
      if (error) throw error;

      setProducts(products.filter((p) => p.id !== id));
      toast({
        title: "✓ Eliminado de favoritos",
        description: "Producto eliminado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteScript = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites_scripts").delete().eq("id", id);
      if (error) throw error;

      setScripts(scripts.filter((s) => s.id !== id));
      toast({
        title: "✓ Eliminado de favoritos",
        description: "Guión eliminado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✓ Copiado",
        description: "Copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Cargando favoritos...</p>
        </div>
      </div>
    );
  }

  const totalFavorites = videos.length + products.length + scripts.length;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            Mis Favoritos
          </h1>
          <p className="text-lg text-muted-foreground">
            {totalFavorites === 0
              ? "No tienes favoritos guardados aún"
              : `${totalFavorites} elemento(s) guardado(s)`}
          </p>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
            <TabsTrigger value="productos">Productos ({products.length})</TabsTrigger>
            <TabsTrigger value="guiones">Guiones ({scripts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4 mt-6">
            {videos.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No tienes videos guardados</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((fav) => (
                  <Card key={fav.id} className="card-premium p-6">
                    <h3 className="font-bold text-lg mb-3 line-clamp-2">{fav.video_data.descripcion_video}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Creador: {fav.video_data.creador}
                    </p>
                    <p className="text-base font-semibold mb-2 text-success">
                      ${fav.video_data.ingresos_mxn?.toLocaleString("es-MX")} MXN
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {new Date(fav.created_at).toLocaleDateString("es-MX")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => window.open(fav.video_data.tiktok_url, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteVideo(fav.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="productos" className="space-y-4 mt-6">
            {products.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No tienes productos guardados</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((fav) => (
                  <Card key={fav.id} className="card-premium p-6">
                    <h3 className="font-bold text-lg mb-3 line-clamp-2">{fav.product_data.producto_nombre}</h3>
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">Ventas:</span>{" "}
                      <span className="font-semibold">{fav.product_data.total_ventas?.toLocaleString("es-MX")}</span>
                    </p>
                    <p className="text-base font-semibold mb-2 text-success">
                      ${fav.product_data.total_ingresos_mxn?.toLocaleString("es-MX")} MXN
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {new Date(fav.created_at).toLocaleDateString("es-MX")}
                    </p>
                    <div className="flex gap-2">
                      {fav.product_data.producto_url && (
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => window.open(fav.product_data.producto_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteProduct(fav.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="guiones" className="space-y-4 mt-6">
            {scripts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No tienes guiones guardados</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {scripts.map((fav) => (
                  <Card key={fav.id} className="card-premium p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">Versión #{fav.script_data.version_number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(fav.created_at).toLocaleDateString("es-MX", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopy(fav.script_data.contenido)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteScript(fav.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {fav.script_data.contenido}
                    </pre>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Favorites;
