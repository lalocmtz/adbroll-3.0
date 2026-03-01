import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Check, ChevronRight, ExternalLink, Globe, Link2, Loader2, Package, Search, SkipForward, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMarket } from "@/contexts/MarketContext";

interface VideoItem {
  id: string;
  title: string | null;
  video_url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  product_name: string | null;
  product_id: string | null;
  sales: number | null;
  revenue_mxn: number | null;
  views: number | null;
  country: string | null;
  transcript: string | null;
}

interface CandidateProduct {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  market: string;
  candidateScore: number;
  matchedKeywords: string[];
}

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

const formatNum = (n: number | null | undefined): string => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const VideoAttribution = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { market } = useMarket();
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  // Video-first: list of videos needing attribution
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [filter, setFilter] = useState<"unlinked" | "low_confidence" | "all">("unlinked");

  // Candidate products for the selected video
  const [candidates, setCandidates] = useState<CandidateProduct[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState<CandidateProduct[]>([]);

  const currentVideo = videos[currentVideoIndex] || null;

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadVideos();
      loadAllProducts();
    }
  }, [isFounder, market, filter]);

  useEffect(() => {
    if (currentVideo) {
      loadCandidateProducts(currentVideo);
    } else {
      setCandidates([]);
    }
  }, [currentVideo?.id]);

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "founder")
      .maybeSingle();
    if (!data) { navigate("/app"); return; }
    setIsFounder(true);
    setLoading(false);
  };

  const loadVideos = async () => {
    setVideosLoading(true);
    try {
      let query = supabase
        .from("videos")
        .select("id, title, video_url, thumbnail_url, creator_handle, product_name, product_id, sales, revenue_mxn, views, country, transcript")
        .eq("country", market)
        .order("revenue_mxn", { ascending: false, nullsFirst: false })
        .limit(200);

      if (filter === "unlinked") {
        query = query.is("product_id", null);
      } else if (filter === "low_confidence") {
        query = query.not("product_id", "is", null).lt("ai_match_confidence", 0.75);
      }

      const { data } = await query;
      setVideos(data || []);
      setCurrentVideoIndex(0);
    } finally {
      setVideosLoading(false);
    }
  };

  const loadAllProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, producto_nombre, imagen_url, total_ingresos_mxn, total_ventas, market")
      .eq("market", market)
      .order("total_ingresos_mxn", { ascending: false, nullsFirst: false })
      .limit(300);

    setAllProducts((data || []).map(p => ({
      ...p,
      candidateScore: 0,
      matchedKeywords: [],
    })));
  };

  const loadCandidateProducts = async (video: VideoItem) => {
    setCandidatesLoading(true);
    setProductSearch("");
    try {
      const { data } = await supabase.functions.invoke("find-candidate-products", {
        body: { videoId: video.id, market, limit: 15 }
      });
      setCandidates(data?.candidates || []);
    } catch (err) {
      console.error("Error loading candidates:", err);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleAssignProduct = async (productId: string, productName: string) => {
    if (!currentVideo) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("videos")
        .update({
          product_id: productId,
          product_name: productName,
          manual_match: true,
          manual_matched_at: new Date().toISOString(),
          manual_matched_by: user?.id || null,
        })
        .eq("id", currentVideo.id);
      if (error) throw error;

      toast({ title: "✅ Video vinculado", description: `→ ${productName}` });
      // Remove from list and go to next
      setVideos(prev => prev.filter(v => v.id !== currentVideo.id));
      // Index stays same (next video slides into position)
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnlink = async () => {
    if (!currentVideo) return;
    try {
      const { error } = await supabase
        .from("videos")
        .update({
          product_id: null,
          product_name: null,
          manual_match: false,
          manual_matched_at: null,
          manual_matched_by: null,
          ai_match_confidence: null,
        })
        .eq("id", currentVideo.id);
      if (error) throw error;
      toast({ title: "Video desvinculado" });
      loadVideos();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSkip = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
    }
  };

  // Filtered products for manual search
  const filteredManualProducts = productSearch.trim()
    ? allProducts.filter(p => p.producto_nombre.toLowerCase().includes(productSearch.toLowerCase()))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isFounder) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/import")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Atribución Video-First</h1>
            <Badge variant="outline" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {market === 'mx' ? '🇲🇽 MX' : '🇺🇸 US'}
            </Badge>
          </div>
          <Badge variant="secondary">
            {currentVideoIndex + 1} / {videos.length} videos
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filter pills */}
        <div className="flex items-center gap-2 mb-4">
          {([
            { key: "unlinked", label: "Sin producto" },
            { key: "low_confidence", label: "Baja confianza" },
            { key: "all", label: "Todos" },
          ] as const).map(f => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="text-xs h-7"
            >
              {f.label}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {videos.length} videos en {market.toUpperCase()}
          </span>
        </div>

        {videosLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando videos...</div>
        ) : videos.length === 0 ? (
          <Card className="p-12 text-center">
            <Check className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-muted-foreground">No hay videos pendientes de atribución en {market.toUpperCase()}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Current Video */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Video actual</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev} disabled={currentVideoIndex === 0}>
                      <ChevronRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSkip} disabled={currentVideoIndex >= videos.length - 1}>
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentVideo && (
                  <div className="space-y-3">
                    {currentVideo.thumbnail_url && (
                      <img src={currentVideo.thumbnail_url} alt="" className="w-full h-48 object-cover rounded-lg" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{currentVideo.title || 'Sin título'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        @{currentVideo.creator_handle || '—'} • {formatCurrency(currentVideo.revenue_mxn)} • {formatNum(currentVideo.views)} views
                      </p>
                    </div>
                    {currentVideo.product_name && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Actual: {currentVideo.product_name}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={handleUnlink}>
                          <X className="h-3 w-3 mr-1" /> Desvincular
                        </Button>
                      </div>
                    )}
                    {currentVideo.transcript && (
                      <div className="bg-muted/50 rounded p-2 max-h-32 overflow-y-auto">
                        <p className="text-xs text-muted-foreground">{currentVideo.transcript.slice(0, 300)}...</p>
                      </div>
                    )}
                    <a
                      href={currentVideo.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver en TikTok
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Product Candidates */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Productos probables ({market.toUpperCase()})
                  {candidatesLoading && <Loader2 className="h-4 w-4 animate-spin inline ml-2" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* AI Candidates */}
                {candidates.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">✨ Sugerencias automáticas</p>
                    {candidates.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleAssignProduct(product.id, product.producto_nombre)}
                        className="w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors hover:bg-primary/10 border border-transparent hover:border-primary/30"
                      >
                        {product.imagen_url ? (
                          <img src={product.imagen_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.producto_nombre}</p>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] h-4">
                              {(product.candidateScore * 100).toFixed(0)}% match
                            </Badge>
                            {product.matchedKeywords?.slice(0, 3).map(kw => (
                              <Badge key={kw} variant="outline" className="text-[10px] h-4">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {candidates.length === 0 && !candidatesLoading && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No se encontraron coincidencias automáticas
                  </p>
                )}

                {/* Manual search */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">🔍 Buscar manualmente</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Buscar producto en ${market.toUpperCase()}...`}
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {filteredManualProducts.length > 0 && (
                    <ScrollArea className="h-[200px] mt-2">
                      <div className="space-y-1">
                        {filteredManualProducts.map(product => (
                          <button
                            key={product.id}
                            onClick={() => handleAssignProduct(product.id, product.producto_nombre)}
                            className="w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors hover:bg-accent/50"
                          >
                            {product.imagen_url ? (
                              <img src={product.imagen_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate">{product.producto_nombre}</p>
                              <p className="text-[10px] text-muted-foreground">{formatCurrency(product.total_ingresos_mxn)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Skip button */}
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={handleSkip}
                  disabled={currentVideoIndex >= videos.length - 1}
                >
                  <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                  Saltar → Siguiente video
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Video queue list */}
        {videos.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cola de videos ({videos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {videos.map((video, i) => (
                    <button
                      key={video.id}
                      onClick={() => setCurrentVideoIndex(i)}
                      className={`w-full text-left p-2 rounded flex items-center gap-2 text-xs transition-colors ${
                        i === currentVideoIndex ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/50'
                      }`}
                    >
                      <span className="text-muted-foreground w-6">{i + 1}</span>
                      {video.thumbnail_url && (
                        <img src={video.thumbnail_url} alt="" className="w-8 h-6 rounded object-cover flex-shrink-0" />
                      )}
                      <span className="truncate flex-1">{video.title || 'Sin título'}</span>
                      <span className="text-muted-foreground">{formatCurrency(video.revenue_mxn)}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default VideoAttribution;
