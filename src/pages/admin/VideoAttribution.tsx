import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Link2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AttributionProductSelector } from "@/components/admin/AttributionProductSelector";
import { AttributionVideoList } from "@/components/admin/AttributionVideoList";

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
}

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
  candidateScore?: number;
  matchedKeywords?: string[];
}

const VideoAttribution = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<"all" | "unlinked" | "linked">("all");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadCandidateVideos(selectedProduct);
    }
  }, [selectedProduct]);

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

  const loadCandidateVideos = async (product: Product) => {
    setVideosLoading(true);
    setSelectedIds(new Set());

    try {
      // Fetch already linked videos
      const { data: linked } = await supabase
        .from("videos")
        .select("id, title, video_url, thumbnail_url, creator_handle, product_name, product_id, sales, revenue_mxn, views")
        .eq("product_id", product.id)
        .order("revenue_mxn", { ascending: false });

      // Fetch candidate videos via edge function
      const { data: candidateData } = await supabase.functions.invoke("find-candidate-videos", {
        body: { productId: product.id, productName: product.producto_nombre, limit: 50 }
      });

      const candidates: VideoItem[] = (candidateData?.candidates || []).map((c: any) => ({
        ...c,
        candidateScore: c.candidateScore,
        matchedKeywords: c.matchedKeywords,
      }));

      // Merge: linked first, then candidates (dedup)
      const linkedIds = new Set((linked || []).map(v => v.id));
      const uniqueCandidates = candidates.filter(c => !linkedIds.has(c.id));

      setVideos([...(linked || []), ...uniqueCandidates]);
    } catch (err: any) {
      toast({ title: "Error cargando videos", description: err.message, variant: "destructive" });
    } finally {
      setVideosLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(videos.filter(v => !v.product_id || v.product_id !== selectedProduct?.id).map(v => v.id)));
  };

  const handleDeselectAll = () => setSelectedIds(new Set());

  const handleAssignSelected = async () => {
    if (!selectedProduct || selectedIds.size === 0) return;
    setAssigning(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ids = Array.from(selectedIds);

      // Batch update in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        const { error } = await supabase
          .from("videos")
          .update({
            product_id: selectedProduct.id,
            product_name: selectedProduct.producto_nombre,
            manual_match: true,
            manual_matched_at: new Date().toISOString(),
            manual_matched_by: user?.id || null,
          })
          .in("id", chunk);
        if (error) throw error;
      }

      toast({
        title: `✅ ${ids.length} videos vinculados`,
        description: `Asignados a "${selectedProduct.producto_nombre}"`,
      });

      // Reload
      setSelectedIds(new Set());
      loadCandidateVideos(selectedProduct);
    } catch (err: any) {
      toast({ title: "Error asignando", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleUnlink = async (videoId: string) => {
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
        .eq("id", videoId);
      if (error) throw error;

      toast({ title: "Video desvinculado" });
      if (selectedProduct) loadCandidateVideos(selectedProduct);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

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
            <h1 className="text-xl font-bold text-foreground">Atribución de Videos</h1>
          </div>

          {selectedProduct && selectedIds.size > 0 && (
            <Button onClick={handleAssignSelected} disabled={assigning}>
              {assigning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Asignar {selectedIds.size} videos
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Product Selector */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Producto destino</CardTitle>
            </CardHeader>
            <CardContent>
              <AttributionProductSelector
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProduct}
              />
            </CardContent>
          </Card>

          {/* Right: Video List */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedProduct
                  ? `Videos para "${selectedProduct.producto_nombre}"`
                  : "Selecciona un producto para ver videos"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProduct ? (
                <AttributionVideoList
                  videos={videos}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onUnlink={handleUnlink}
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  filter={filter}
                  onFilterChange={setFilter}
                  loading={videosLoading}
                />
              ) : (
                <p className="text-muted-foreground text-center py-12 text-sm">
                  ← Selecciona un producto para ver videos candidatos y asignar en lote
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default VideoAttribution;
