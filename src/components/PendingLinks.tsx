import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Link2, ExternalLink, AlertCircle, Check, X, Search, ChevronLeft, ChevronRight, Trash2, Play, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useMarket } from "@/contexts/MarketContext";

interface UnlinkedVideo {
  id: string;
  title: string | null;
  video_url: string;
  video_mp4_url: string | null;
  thumbnail_url: string | null;
  creator_name: string | null;
  revenue_mxn: number | null;
  views: number | null;
  product_name: string | null;
}

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
}

const VIDEOS_PER_PAGE = 20;

export function PendingLinks() {
  const { market } = useMarket();
  const [unlinkedVideos, setUnlinkedVideos] = useState<UnlinkedVideo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [market]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [videosRes, productsRes] = await Promise.all([
        supabase
          .from("videos")
          .select("id, title, video_url, video_mp4_url, thumbnail_url, creator_name, revenue_mxn, views, product_name")
          .is("product_id", null)
          .eq("country", market)
          .neq("processing_status", "permanently_failed")
          .order("revenue_mxn", { ascending: false, nullsFirst: false })
          .limit(500),
        supabase
          .from("products")
          .select("id, producto_nombre, imagen_url")
          .eq("market", market)
          .order("total_ingresos_mxn", { ascending: false, nullsFirst: false }),
      ]);

      setUnlinkedVideos(videosRes.data || []);
      setProducts(productsRes.data || []);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkProduct = async (videoId: string, productId: string) => {
    setLinking(videoId);
    try {
      const { error } = await supabase
        .from("videos")
        .update({ product_id: productId })
        .eq("id", videoId);

      if (error) throw error;

      setUnlinkedVideos((prev) => prev.filter((v) => v.id !== videoId));
      setOpenDropdown(null);

      toast({
        title: "✅ Video vinculado",
        description: "El producto se asignó correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLinking(null);
    }
  };

  const handleDiscardVideo = async (videoId: string) => {
    setDiscarding(videoId);
    try {
      const { error } = await supabase
        .from("videos")
        .update({ processing_status: "permanently_failed" })
        .eq("id", videoId);

      if (error) throw error;

      setUnlinkedVideos((prev) => prev.filter((v) => v.id !== videoId));

      toast({
        title: "🗑️ Video descartado",
        description: "El video fue marcado como sin producto posible.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiscarding(null);
    }
  };

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Pagination
  const totalPages = Math.ceil(unlinkedVideos.length / VIDEOS_PER_PAGE);
  const paginatedVideos = useMemo(() => {
    const start = (currentPage - 1) * VIDEOS_PER_PAGE;
    return unlinkedVideos.slice(start, start + VIDEOS_PER_PAGE);
  }, [unlinkedVideos, currentPage]);

  // Filter products by search
  const getFilteredProducts = (videoId: string) => {
    const search = (productSearch[videoId] || "").toLowerCase();
    if (!search) return products;
    return products.filter(p => 
      p.producto_nombre.toLowerCase().includes(search)
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">Cargando videos sin vincular...</p>
        </CardContent>
      </Card>
    );
  }

  if (unlinkedVideos.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6 flex items-center justify-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700 dark:text-green-400">Todos los videos están vinculados a productos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            Videos sin producto ({unlinkedVideos.length})
            <Badge variant="outline" className="text-xs ml-2">
              <Globe className="h-3 w-3 mr-1" />
              {market === 'mx' ? '🇲🇽 MX' : '🇺🇸 US'}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadData}>
            <Link2 className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {paginatedVideos.map((video) => (
          <div
            key={video.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border"
          >
            {/* Video Preview */}
            <Dialog>
              <DialogTrigger asChild>
                <button className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 hover:opacity-80 transition-opacity">
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt="" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl p-0">
                {video.video_mp4_url ? (
                  <video 
                    src={video.video_mp4_url} 
                    controls 
                    autoPlay 
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    Video no disponible
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Video Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2" title={video.title || undefined}>
                {video.title || "Sin título"}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>@{video.creator_name || "desconocido"}</span>
                <span>•</span>
                <span>${formatNumber(video.revenue_mxn)}</span>
                <span>•</span>
                <span>{formatNumber(video.views)} vistas</span>
              </div>
              {video.product_name && (
                <Badge variant="outline" className="mt-1 text-xs">
                  Menciona: {video.product_name}
                </Badge>
              )}
            </div>

            {/* Product Selector with Search */}
            <div className="relative w-[220px] flex-shrink-0">
              <div 
                className="border rounded-md bg-background cursor-pointer"
                onClick={() => setOpenDropdown(openDropdown === video.id ? null : video.id)}
              >
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Seleccionar producto...
                </div>
              </div>
              
              {openDropdown === video.id && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden">
                  <div className="p-2 border-b sticky top-0 bg-background">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar producto..."
                        value={productSearch[video.id] || ""}
                        onChange={(e) => setProductSearch(prev => ({ ...prev, [video.id]: e.target.value }))}
                        className="pl-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto">
                    {getFilteredProducts(video.id).map((product) => (
                      <button
                        key={product.id}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted text-sm"
                        onClick={() => handleLinkProduct(video.id, product.id)}
                        disabled={linking === video.id}
                      >
                        {product.imagen_url && (
                          <img
                            src={product.imagen_url}
                            alt=""
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <span className="truncate">{product.producto_nombre}</span>
                      </button>
                    ))}
                    {getFilteredProducts(video.id).length === 0 && (
                      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No se encontraron productos
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDiscardVideo(video.id)}
                disabled={discarding === video.id}
                title="Descartar video (sin producto posible)"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <a
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                title="Ver en TikTok"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages} ({unlinkedVideos.length} videos)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
