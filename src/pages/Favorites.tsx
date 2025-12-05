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
    <div className="py-4 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3 text-foreground">
            <Heart className="h-7 w-7 text-red-500 fill-current" />
            {t("myFavorites")}
          </h1>
          <p className="text-muted-foreground">
            {totalFavorites === 0 ? t("noFavorites") : `${totalFavorites} ${t("savedItems")}`}
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

          {/* VIDEOS TAB */}
          <TabsContent value="videos" className="mt-6">
            {videos.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">{t("noSavedVideos")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map((fav, index) => {
                  const video = fav.video_data;
                  const commissionEstimated = (video.revenue_mxn || video.ingresos_mxn || 0) * 0.06;
                  
                  return (
                    <Card key={fav.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-border">
                      {/* Video Thumbnail */}
                      <div className="relative aspect-[9/16] bg-muted overflow-hidden">
                        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                          <Badge className="bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 shadow-lg">
                            #{index + 1} 🔥
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                              onClick={() => window.open(video.video_url || video.tiktok_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 text-red-500"
                              onClick={() => handleDeleteVideo(fav.id)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-6 h-6 text-muted-foreground ml-1" />
                            </div>
                          </div>
                        )}
                        
                        {!video.video_mp4_url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-6 h-6 text-foreground ml-1" fill="currentColor" />
                            </div>
                          </div>
                        )}
                      </div>

                      <CardContent className="p-3 space-y-2">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight min-h-[2.5rem]">
                            {video.title || video.descripcion_video || "Video TikTok Shop"}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            @{video.creator_handle || video.creador || "creator"}
                          </p>
                        </div>

                        {/* Metrics Grid 2x2 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <DollarSign className="h-3 w-3 text-emerald-600" />
                              <span className="text-[10px] text-muted-foreground">Ingresos</span>
                            </div>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(video.revenue_mxn || video.ingresos_mxn)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <ShoppingCart className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Ventas</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatNumber(video.sales || video.ventas)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Percent className="h-3 w-3 text-amber-600" />
                              <span className="text-[10px] text-muted-foreground">Comisión</span>
                            </div>
                            <p className="text-sm font-bold text-amber-600">
                              {formatCurrency(commissionEstimated)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Eye className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Vistas</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatNumber(video.views || video.visualizaciones)}
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90"
                          onClick={() => setSelectedVideo(video)}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Analizar guion y replicar
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* PRODUCTS TAB */}
          <TabsContent value="productos" className="mt-6">
            {products.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">{t("noSavedProducts")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((fav, index) => {
                  const product = fav.product_data;
                  const revenue = product.revenue_30d || product.total_ingresos_mxn;
                  const sales = product.sales_7d || product.total_ventas;
                  const price = product.price || product.precio_mxn;
                  const commission = product.commission || 6;
                  
                  return (
                    <Card key={fav.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-border">
                      {/* Product Image */}
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
                          <div className="flex items-center gap-1.5">
                            {product.producto_url && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                                onClick={() => window.open(product.producto_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 text-red-500"
                              onClick={() => handleDeleteProduct(fav.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {product.rating && (
                          <Badge variant="secondary" className="absolute bottom-2 right-2 flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {product.rating.toFixed(1)}
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-3 space-y-2">
                        <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
                          {product.producto_nombre}
                        </h3>
                        
                        {product.categoria && (
                          <Badge variant="outline" className="text-xs">
                            {product.categoria}
                          </Badge>
                        )}

                        {/* Metrics Grid 2x2 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                              <span className="text-[10px] text-muted-foreground">Ingresos 30D</span>
                            </div>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(revenue)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <ShoppingCart className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Ventas 30D</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatNumber(sales)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <DollarSign className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Precio</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatCurrency(price)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Percent className="h-3 w-3 text-amber-600" />
                              <span className="text-[10px] text-muted-foreground">Comisión</span>
                            </div>
                            <p className="text-sm font-bold text-amber-600">
                              {commission}%
                            </p>
                          </div>
                        </div>

                        {product.creators_count && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{formatNumber(product.creators_count)} creadores activos</span>
                          </div>
                        )}

                        <Button
                          className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90"
                          onClick={() => navigate(`/app?productName=${encodeURIComponent(product.producto_nombre)}`)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Ver videos de este producto
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* CREATORS TAB */}
          <TabsContent value="creadores" className="mt-6">
            {creators.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">{t("noSavedCreators")}</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {creators.map((creator, index) => {
                  const commissionEstimated = (creator.total_ingresos_mxn || 0) * 0.08;
                  const isTop5 = index < 5;
                  
                  return (
                    <Card key={creator.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-border">
                      {/* Creator Header */}
                      <div className="relative p-4 pb-2">
                        <div className="flex items-center justify-between mb-3">
                          <Badge 
                            className={`font-bold text-xs px-2 py-0.5 ${
                              isTop5 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            #{index + 1} {isTop5 && '🔥'}
                          </Badge>
                          <div className="flex items-center gap-1.5">
                            {creator.tiktok_url && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80"
                                onClick={() => window.open(creator.tiktok_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80 text-red-500"
                              onClick={() => handleDeleteCreator(creator.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Avatar className="h-14 w-14 border-2 border-primary/20">
                            <AvatarImage src={getAvatarUrl(creator)} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                              {(creator.nombre_completo || creator.usuario_creador).substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-foreground truncate">
                              {creator.nombre_completo || creator.usuario_creador}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              @{creator.creator_handle || creator.usuario_creador}
                            </p>
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-3 pt-0 space-y-2">
                        {/* Metrics Grid 2x2 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                              <span className="text-[10px] text-muted-foreground">GMV Total</span>
                            </div>
                            <p className="text-sm font-bold text-emerald-600">
                              {formatCurrency(creator.total_ingresos_mxn)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Users className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Seguidores</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatNumber(creator.seguidores)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Percent className="h-3 w-3 text-amber-600" />
                              <span className="text-[10px] text-muted-foreground">Comisión Est.</span>
                            </div>
                            <p className="text-sm font-bold text-amber-600">
                              {formatCurrency(commissionEstimated)}
                            </p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center gap-1 mb-0.5">
                              <Eye className="h-3 w-3 text-foreground" />
                              <span className="text-[10px] text-muted-foreground">Views Prom.</span>
                            </div>
                            <p className="text-sm font-bold text-foreground">
                              {formatNumber(creator.promedio_visualizaciones)}
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90"
                          onClick={() => navigate(`/app?creator=${encodeURIComponent(creator.creator_handle || creator.usuario_creador)}`)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Ver videos del creador
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Video Analysis Modal */}
      {selectedVideo && (
        <VideoAnalysisModalOriginal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          video={{
            id: selectedVideo.id || '',
            video_url: selectedVideo.video_url || selectedVideo.tiktok_url || '',
            video_mp4_url: selectedVideo.video_mp4_url,
            thumbnail_url: selectedVideo.thumbnail_url,
            title: selectedVideo.title || selectedVideo.descripcion_video,
            creator_handle: selectedVideo.creator_handle || selectedVideo.creador,
            views: selectedVideo.views || selectedVideo.visualizaciones,
            sales: selectedVideo.sales || selectedVideo.ventas,
            revenue_mxn: selectedVideo.revenue_mxn || selectedVideo.ingresos_mxn,
            transcript: selectedVideo.transcript || selectedVideo.transcripcion_original,
            analysis_json: selectedVideo.analysis_json,
            variants_json: selectedVideo.variants_json || selectedVideo.ai_variants,
          }}
        />
      )}
    </div>
  );
};

export default Favorites;
