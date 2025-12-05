import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trash2, ExternalLink, Heart, Video, Package, Users, Play,
  DollarSign, ShoppingCart, Percent, Eye, TrendingUp, Star, Sparkles
} from "lucide-react";
import VideoAnalysisModalOriginal from "@/components/VideoAnalysisModalOriginal";
import { useNavigate } from "react-router-dom";
import { DataSubtitle } from "@/components/FilterPills";

interface FavoriteVideo {
  id: string;
  video_url: string;
  video_data: any;
  created_at: string;
}

interface FavoriteProduct {
  id: string;
  product_id: string;
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
  promedio_visualizaciones: number | null;
  total_live_count: number | null;
  gmv_live_mxn: number | null;
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";

const formatNumber = (num: number | null | undefined): string => {
  if (!num) return "—";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("es-MX");
};

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return "$0";
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(num);
};

const Favorites = () => {
  const [videos, setVideos] = useState<FavoriteVideo[]>([]);
  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();

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
      toast({ title: "✓ Eliminado de favoritos" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("favorites_products").delete().eq("id", id);
      if (error) throw error;
      setProducts(products.filter((p) => p.id !== id));
      toast({ title: "✓ Eliminado de favoritos" });
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
      toast({ title: "✓ Eliminado de favoritos" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
      <div className="py-8 flex items-center justify-center">
        <p className="text-muted-foreground">{t("loadingFavorites")}</p>
      </div>
    );
  }

  const totalFavorites = videos.length + products.length + creators.length;

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      {/* Minimal header */}
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-4 w-4 text-red-500 fill-current" />
        <span className="text-xs text-muted-foreground">
          {totalFavorites === 0 ? t("noFavorites") : `${totalFavorites} ${t("savedItems")}`}
        </span>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4 h-9">
          <TabsTrigger value="videos" className="flex items-center gap-1.5 text-xs">
            <Video className="h-3.5 w-3.5" />
            {t("videos")} ({videos.length})
          </TabsTrigger>
          <TabsTrigger value="productos" className="flex items-center gap-1.5 text-xs">
            <Package className="h-3.5 w-3.5" />
            {t("products")} ({products.length})
          </TabsTrigger>
          <TabsTrigger value="creadores" className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            {t("creators")} ({creators.length})
          </TabsTrigger>
        </TabsList>

        {/* VIDEOS TAB */}
        <TabsContent value="videos" className="mt-4">
          {videos.length === 0 ? (
            <Card className="p-12 text-center">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("noSavedVideos")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {videos.map((fav, index) => {
                const video = fav.video_data;
                const commissionEstimated = (video.revenue_mxn || video.ingresos_mxn || 0) * 0.06;
                
                return (
                  <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border-border">
                    <div className="relative aspect-[9/16] bg-muted overflow-hidden">
                      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                        <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 shadow-lg">
                          #{index + 1} 🔥
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                            onClick={() => window.open(video.video_url || video.tiktok_url, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 text-red-500"
                            onClick={() => handleDeleteVideo(fav.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {video.video_mp4_url || video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url || PLACEHOLDER_IMAGE} 
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-muted to-muted/80">
                          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-5 h-5 text-muted-foreground ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    <CardContent className="p-2.5 space-y-2">
                      <div>
                        <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight min-h-[2rem]">
                          {video.title || video.descripcion_video || "Video TikTok Shop"}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          @{video.creator_handle || video.creador || "creator"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <DollarSign className="h-2.5 w-2.5 text-emerald-600" />
                            <span className="text-[9px] text-muted-foreground">Ingresos</span>
                          </div>
                          <p className="text-xs font-bold text-emerald-600">
                            {formatCurrency(video.revenue_mxn || video.ingresos_mxn)}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-md bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <ShoppingCart className="h-2.5 w-2.5 text-foreground" />
                            <span className="text-[9px] text-muted-foreground">Ventas</span>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {formatNumber(video.sales || video.ventas)}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-2.5 w-2.5 text-amber-600" />
                            <span className="text-[9px] text-muted-foreground">Comisión</span>
                          </div>
                          <p className="text-xs font-bold text-amber-600">
                            {formatCurrency(commissionEstimated)}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-md bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Eye className="h-2.5 w-2.5 text-foreground" />
                            <span className="text-[9px] text-muted-foreground">Vistas</span>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {formatNumber(video.views || video.visualizaciones)}
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Analizar guion
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PRODUCTS TAB */}
        <TabsContent value="productos" className="mt-4">
          {products.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("noSavedProducts")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((fav, index) => {
                const product = fav.product_data;
                const revenue = product.revenue_30d || product.total_ingresos_mxn;
                const sales = product.sales_7d || product.total_ventas;
                const price = product.price || product.precio_mxn;
                const commission = product.commission || 6;
                
                return (
                  <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border-border">
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      <img
                        src={product.imagen_url || PLACEHOLDER_IMAGE}
                        alt={product.producto_nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      
                      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                        <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 shadow-lg">
                          #{index + 1} 🔥
                        </Badge>
                        <div className="flex items-center gap-1">
                          {product.producto_url && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                              onClick={() => window.open(product.producto_url, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 text-red-500"
                            onClick={() => handleDeleteProduct(fav.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      {product.rating && (
                        <Badge variant="secondary" className="absolute bottom-2 right-2 flex items-center gap-1 text-xs">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {product.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-2.5 space-y-2">
                      <h3 className="font-semibold text-xs text-foreground line-clamp-2 min-h-[2rem]">
                        {product.producto_nombre}
                      </h3>
                      
                      {product.categoria && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {product.categoria}
                        </Badge>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className="h-2.5 w-2.5 text-emerald-600" />
                            <span className="text-[9px] text-muted-foreground">Ingresos 30D</span>
                          </div>
                          <p className="text-xs font-bold text-emerald-600">
                            {formatCurrency(revenue)}
                          </p>
                        </div>

                        <div className="p-1.5 rounded-md bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <ShoppingCart className="h-2.5 w-2.5 text-foreground" />
                            <span className="text-[9px] text-muted-foreground">Ventas 30D</span>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {formatNumber(sales)}
                          </p>
                        </div>

                        <div className="p-1.5 rounded-md bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <DollarSign className="h-2.5 w-2.5 text-foreground" />
                            <span className="text-[9px] text-muted-foreground">Precio</span>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {formatCurrency(price)}
                          </p>
                        </div>

                        <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-2.5 w-2.5 text-amber-600" />
                            <span className="text-[9px] text-muted-foreground">Comisión</span>
                          </div>
                          <p className="text-xs font-bold text-amber-600">
                            {commission}%
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                        onClick={() => navigate(`/app?productName=${encodeURIComponent(product.producto_nombre)}`)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Ver videos
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* CREATORS TAB */}
        <TabsContent value="creadores" className="mt-4">
          {creators.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">{t("noSavedCreators")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {creators.map((creator, index) => (
                <Card key={creator.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border-border">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <Avatar className="h-10 w-10 border-2 border-primary/20 shrink-0 shadow-md">
                        <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                          {creator.nombre_completo?.substring(0, 2).toUpperCase() || creator.usuario_creador.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground line-clamp-1 text-xs">
                          {creator.nombre_completo || creator.usuario_creador}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          @{creator.creator_handle || creator.usuario_creador}
                        </p>
                        <Badge variant="outline" className="mt-0.5 text-[10px] font-bold px-1.5 py-0 bg-primary/10 border-primary/30 text-primary">
                          #{index + 1} 🔥
                        </Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-red-500"
                        onClick={() => handleDeleteCreator(creator.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 text-center">
                        <p className="text-[8px] text-muted-foreground uppercase">GMV Total</p>
                        <p className="text-xs font-bold text-emerald-600">
                          {formatCurrency(creator.total_ingresos_mxn)}
                        </p>
                      </div>
                      <div className="p-1.5 rounded-md bg-muted text-center">
                        <p className="text-[8px] text-muted-foreground uppercase">Seguidores</p>
                        <p className="text-xs font-bold text-foreground">
                          {formatNumber(creator.seguidores)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Button
                        className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                        onClick={() => navigate(`/app?creator=${encodeURIComponent(creator.creator_handle || creator.usuario_creador)}`)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Ver videos
                      </Button>
                      
                      {creator.tiktok_url && (
                        <Button
                          variant="outline"
                          className="w-full h-7 text-[10px]"
                          onClick={() => window.open(creator.tiktok_url!, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver en TikTok
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Video Analysis Modal */}
      {selectedVideo && (
        <VideoAnalysisModalOriginal
          video={selectedVideo}
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
        />
      )}
    </div>
  );
};

export default Favorites;
