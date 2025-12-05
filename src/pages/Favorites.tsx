import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, ExternalLink, Copy, Heart, Video, Package, Users, Play } from "lucide-react";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
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

interface FavoriteCreator {
  id: string;
  item_id: string;
  created_at: string;
}

interface Creator {
  id: string;
  usuario_creador: string;
  nombre_completo: string | null;
  creator_handle: string | null;
  avatar_url: string | null;
  total_ingresos_mxn: number | null;
  seguidores: number | null;
  tiktok_url: string | null;
}

const Favorites = () => {
  const [videos, setVideos] = useState<FavoriteVideo[]>([]);
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, formatMoney } = useLanguage();

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

      // Fetch videos and products favorites
      const [videosRes, productsRes, creatorFavsRes] = await Promise.all([
        supabase.from("favorites_videos").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites_products").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("favorites").select("*").eq("user_id", user.id).eq("item_type", "creator").order("created_at", { ascending: false }),
      ]);

      if (videosRes.error) throw videosRes.error;
      if (productsRes.error) throw productsRes.error;
      if (creatorFavsRes.error) throw creatorFavsRes.error;

      setVideos(videosRes.data || []);
      setProducts(productsRes.data || []);

      // Fetch creator data for favorite creators
      if (creatorFavsRes.data && creatorFavsRes.data.length > 0) {
        const creatorIds = creatorFavsRes.data.map(f => f.item_id);
        const { data: creatorsData, error: creatorsError } = await supabase
          .from("creators")
          .select("*")
          .in("id", creatorIds);

        if (creatorsError) throw creatorsError;
        setCreators(creatorsData || []);
      }
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
      toast({ title: `✓ ${t("removedFromFavorites")}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites_products").delete().eq("id", id);
      if (error) throw error;

      setProducts(products.filter((p) => p.id !== id));
      toast({ title: `✓ ${t("removedFromFavorites")}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCreator = async (creatorId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("item_type", "creator")
        .eq("item_id", creatorId);
      if (error) throw error;

      setCreators(creators.filter((c) => c.id !== creatorId));
      toast({ title: `✓ ${t("removedFromFavorites")}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `✓ ${t("copied")}` });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo copiar", variant: "destructive" });
    }
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "—";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getAvatarUrl = (creator: Creator): string => {
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      return creator.avatar_url;
    }
    const name = encodeURIComponent(creator.nombre_completo || creator.usuario_creador);
    return `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff&bold=true&size=128`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <GlobalHeader />
        <DashboardNav />
        <div className="container mx-auto px-4 py-8 flex-1">
          <p className="text-center">{t("loadingFavorites")}</p>
        </div>
        <Footer />
      </div>
    );
  }

  const totalFavorites = videos.length + products.length + creators.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader />
      <DashboardNav />
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl flex-1">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            {t("myFavorites")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {totalFavorites === 0
              ? t("noFavorites")
              : `${totalFavorites} ${t("savedItems")}`}
          </p>
        </div>

        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              {t("videos")} ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="productos" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t("products")} ({products.length})
            </TabsTrigger>
            <TabsTrigger value="creadores" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("creators")} ({creators.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="space-y-4 mt-6">
            {videos.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("noSavedVideos")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((fav) => (
                  <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-2 line-clamp-2">
                        {fav.video_data.title || fav.video_data.descripcion_video || "Video"}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        @{fav.video_data.creator_handle || fav.video_data.creador}
                      </p>
                      <p className="text-lg font-semibold text-emerald-600 mb-2">
                        {formatMoney(fav.video_data.revenue_mxn || fav.video_data.ingresos_mxn)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {new Date(fav.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => window.open(fav.video_data.video_url || fav.video_data.tiktok_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("viewOnTiktok")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteVideo(fav.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="productos" className="space-y-4 mt-6">
            {products.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("noSavedProducts")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((fav) => (
                  <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {fav.product_data.imagen_url && (
                      <img 
                        src={fav.product_data.imagen_url} 
                        alt={fav.product_data.producto_nombre}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-2 line-clamp-2">
                        {fav.product_data.producto_nombre}
                      </h3>
                      <p className="text-sm mb-2">
                        <span className="text-muted-foreground">{t("sales")}:</span>{" "}
                        <span className="font-semibold">{formatNumber(fav.product_data.total_ventas || fav.product_data.sales_7d)}</span>
                      </p>
                      <p className="text-lg font-semibold text-emerald-600 mb-2">
                        {formatMoney(fav.product_data.revenue_30d || fav.product_data.total_ingresos_mxn)}
                      </p>
                      <p className="text-xs text-muted-foreground mb-4">
                        {new Date(fav.created_at).toLocaleDateString()}
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
                            {t("viewInTiktokShop")}
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
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="creadores" className="space-y-4 mt-6">
            {creators.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("noSavedCreators")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {creators.map((creator) => (
                  <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={getAvatarUrl(creator)} />
                          <AvatarFallback>
                            {(creator.nombre_completo || creator.usuario_creador).substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base truncate">
                            {creator.nombre_completo || creator.usuario_creador}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            @{creator.creator_handle || creator.usuario_creador}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
                          <p className="text-xs text-muted-foreground">{t("gmvTotal")}</p>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatMoney(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted text-center">
                          <p className="text-xs text-muted-foreground">{t("followers")}</p>
                          <p className="text-sm font-bold">{formatNumber(creator.seguidores)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => navigate(`/app?creator=${encodeURIComponent(creator.creator_handle || creator.usuario_creador)}`)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          {t("viewCreatorVideos")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCreator(creator.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
