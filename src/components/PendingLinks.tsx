import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, ExternalLink, AlertCircle, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UnlinkedVideo {
  id: string;
  title: string | null;
  video_url: string;
  creator_name: string | null;
  revenue_mxn: number | null;
  views: number | null;
}

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
}

export function PendingLinks() {
  const [unlinkedVideos, setUnlinkedVideos] = useState<UnlinkedVideo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [videosRes, productsRes] = await Promise.all([
        supabase
          .from("videos")
          .select("id, title, video_url, creator_name, revenue_mxn, views")
          .is("product_id", null)
          .order("revenue_mxn", { ascending: false })
          .limit(20),
        supabase
          .from("products")
          .select("id, producto_nombre, imagen_url")
          .order("total_ingresos_mxn", { ascending: false }),
      ]);

      setUnlinkedVideos(videosRes.data || []);
      setProducts(productsRes.data || []);
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

      // Remove video from list without reload
      setUnlinkedVideos((prev) => prev.filter((v) => v.id !== videoId));

      toast({
        title: "Video vinculado",
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

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
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
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6 flex items-center justify-center gap-2">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">Todos los videos están vinculados a productos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          Videos sin producto ({unlinkedVideos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {unlinkedVideos.slice(0, 10).map((video) => (
          <div
            key={video.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{video.title || "Sin título"}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>@{video.creator_name || "desconocido"}</span>
                <span>•</span>
                <span>${formatNumber(video.revenue_mxn)}</span>
                <span>•</span>
                <span>{formatNumber(video.views)} vistas</span>
              </div>
            </div>
            
            <Select
              onValueChange={(productId) => handleLinkProduct(video.id, productId)}
              disabled={linking === video.id}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent className="bg-background border shadow-lg z-50">
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex items-center gap-2">
                      {product.imagen_url && (
                        <img
                          src={product.imagen_url}
                          alt=""
                          className="w-5 h-5 rounded object-cover"
                        />
                      )}
                      <span className="truncate max-w-[150px]">{product.producto_nombre}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <a
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ))}

        {unlinkedVideos.length > 10 && (
          <p className="text-xs text-center text-muted-foreground">
            +{unlinkedVideos.length - 10} videos más sin vincular
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          className="w-full"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Actualizar lista
        </Button>
      </CardContent>
    </Card>
  );
}
