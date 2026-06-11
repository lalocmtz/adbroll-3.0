import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  X,
  Search,
  Loader2,
  RefreshCw,
  Inbox,
  Film,
} from "lucide-react";

// =============================================================================
// MatchReviewQueue: cola de confirmación 1-clic para videos con
// match_source='review' (la capa IA sugirió un producto con confianza media).
// ✓ Confirmar -> rpc confirm_video_match (crea alias para futuros imports)
// ✗ Rechazar  -> rpc reject_video_match
// "Elegir otro…" -> búsqueda con rpc find_similar_products + confirmación.
// =============================================================================

interface ReviewVideo {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  product_name: string | null;
  suggested_product_id: string | null;
  match_reason: string | null;
  country: string | null;
}

interface SuggestedProduct {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
}

interface Candidate {
  id: string;
  producto_nombre: string;
  score: number;
}

export const MatchReviewQueue = ({ onResolved }: { onResolved?: () => void }) => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<ReviewVideo[]>([]);
  const [products, setProducts] = useState<Record<string, SuggestedProduct>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Estado del buscador "Elegir otro…" por video
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("id, title, thumbnail_url, product_name, suggested_product_id, match_reason, country")
        .eq("match_source", "review")
        .limit(200);

      if (error) throw error;
      const list = (data || []) as ReviewVideo[];
      setVideos(list);

      // Join client-side: nombres de los productos sugeridos
      const ids = [...new Set(list.map((v) => v.suggested_product_id).filter(Boolean))] as string[];
      if (ids.length > 0) {
        const { data: prods, error: prodError } = await supabase
          .from("products")
          .select("id, producto_nombre, imagen_url")
          .in("id", ids);
        if (prodError) throw prodError;
        const map: Record<string, SuggestedProduct> = {};
        for (const p of prods || []) map[p.id] = p as SuggestedProduct;
        setProducts(map);
      } else {
        setProducts({});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Error al cargar la cola de revisión",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Optimistic UI: quitar de la lista de inmediato
  const removeFromList = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (pickerFor === videoId) {
      setPickerFor(null);
      setCandidates([]);
      setSearchQuery("");
    }
    onResolved?.();
  };

  const confirmMatch = async (video: ReviewVideo, productId: string) => {
    if (!productId || busyId) return;
    setBusyId(video.id);
    const snapshot = videos;
    removeFromList(video.id);
    try {
      const { error } = await supabase.rpc("confirm_video_match", {
        _video_id: video.id,
        _product_id: productId,
      });
      if (error) throw error;
      toast({ title: "✓ Match confirmado", description: "Se creó un alias: el próximo import lo vinculará solo." });
    } catch (err) {
      setVideos(snapshot); // revertir
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "No se pudo confirmar", description: message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const rejectMatch = async (video: ReviewVideo) => {
    if (busyId) return;
    setBusyId(video.id);
    const snapshot = videos;
    removeFromList(video.id);
    try {
      const { error } = await supabase.rpc("reject_video_match", { _video_id: video.id });
      if (error) throw error;
      toast({ title: "✗ Sugerencia rechazada" });
    } catch (err) {
      setVideos(snapshot);
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "No se pudo rechazar", description: message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const searchProducts = async (video: ReviewVideo) => {
    const query = searchQuery.trim() || video.product_name || video.title || "";
    if (!query) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc("find_similar_products", {
        _title: query,
        _market: video.country || "mx",
        _limit: 8,
      });
      if (error) throw error;
      setCandidates((data || []) as Candidate[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error en la búsqueda", description: message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cola de confirmación...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 border-amber-200/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              🤝 Cola de confirmación
              {videos.length > 0 && (
                <Badge className="bg-amber-500 text-white border-0">{videos.length} por confirmar</Badge>
              )}
            </CardTitle>
            <CardDescription>
              La IA sugirió estos matches con confianza media. Confírmalos con un clic: cada confirmación
              enseña al sistema (alias) para el próximo import.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadQueue}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {videos.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay videos esperando confirmación. Todo al día. 🎉</p>
          </div>
        ) : (
          videos.map((video) => {
            const suggested = video.suggested_product_id ? products[video.suggested_product_id] : null;
            const isPicking = pickerFor === video.id;

            return (
              <div key={video.id} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                <div className="flex gap-3">
                  {/* Miniatura */}
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt=""
                      className="w-12 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Film className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                      {video.title || video.product_name || "Video sin título"}
                    </p>
                    <p className="text-xs text-foreground mt-1">
                      <span className="text-muted-foreground">Sugerido:</span>{" "}
                      <span className="font-semibold">
                        {suggested?.producto_nombre || "(producto no encontrado)"}
                      </span>
                    </p>
                    {video.match_reason && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        {video.match_reason}
                      </p>
                    )}
                  </div>

                  {suggested?.imagen_url && (
                    <img
                      src={suggested.imagen_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
                    />
                  )}
                </div>

                {/* Acciones — botones táctiles >=44px */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="h-11 flex-1 min-w-[110px] bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!video.suggested_product_id || busyId === video.id}
                    onClick={() => confirmMatch(video, video.suggested_product_id as string)}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-11 flex-1 min-w-[110px] border-destructive/40 text-destructive hover:bg-destructive/10"
                    disabled={busyId === video.id}
                    onClick={() => rejectMatch(video)}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-11 flex-1 min-w-[110px]"
                    disabled={busyId === video.id}
                    onClick={() => {
                      if (isPicking) {
                        setPickerFor(null);
                        setCandidates([]);
                        setSearchQuery("");
                      } else {
                        setPickerFor(video.id);
                        setCandidates([]);
                        setSearchQuery(video.product_name || "");
                      }
                    }}
                  >
                    Elegir otro…
                  </Button>
                </div>

                {/* Buscador de producto alternativo */}
                {isPicking && (
                  <div className="rounded-lg border border-border bg-background p-2.5 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") searchProducts(video);
                        }}
                        placeholder="Busca el producto correcto..."
                        className="h-11 text-sm"
                      />
                      <Button
                        size="sm"
                        className="h-11 px-4"
                        onClick={() => searchProducts(video)}
                        disabled={searching}
                      >
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {candidates.length > 0 && (
                      <ul className="space-y-1">
                        {candidates.map((c) => (
                          <li key={c.id}>
                            <button
                              className="w-full min-h-[44px] text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between gap-2"
                              onClick={() => confirmMatch(video, c.id)}
                            >
                              <span className="text-sm text-foreground line-clamp-1">{c.producto_nombre}</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums flex-shrink-0">
                                {(c.score * 100).toFixed(0)}%
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {candidates.length === 0 && !searching && (
                      <p className="text-xs text-muted-foreground px-1">
                        Escribe el nombre del producto y presiona buscar.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default MatchReviewQueue;
