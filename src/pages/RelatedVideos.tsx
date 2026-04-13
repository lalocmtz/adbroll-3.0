import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, ArrowLeft, Package, DollarSign, ExternalLink, Eye, Loader2, Link2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { openTikTokLink } from "@/lib/tiktokDeepLink";

interface Video {
  id: string;
  video_url: string;
  video_mp4_url: string | null;
  thumbnail_url: string | null;
  title: string | null;
  creator_name: string | null;
  creator_handle: string | null;
  product_name: string | null;
  product_id: string | null;
  sales: number | null;
  revenue_mxn: number | null;
  views: number | null;
  roas: number | null;
  category: string | null;
  rank: number | null;
  transcript: string | null;
  analysis_json: any;
  variants_json: any;
  processing_status: string | null;
  product?: {
    id: string;
    producto_nombre: string;
    imagen_url: string | null;
    total_ingresos_mxn: number | null;
    commission: number | null;
    price: number | null;
    precio_mxn: number | null;
    revenue_30d: number | null;
    producto_url: string | null;
  } | null;
}

interface CandidateVideo {
  id: string;
  title: string | null;
  video_url: string;
  thumbnail_url: string | null;
  creator_handle: string | null;
  product_name: string | null;
  product_id: string | null;
  revenue_mxn: number | null;
  views: number | null;
  candidateScore: number;
  matchedKeywords: string[];
}

interface ProductInfo {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  total_ingresos_mxn: number | null;
  rank: number | null;
  producto_url: string | null;
}

interface CreatorInfo {
  id: string;
  nombre_completo: string | null;
  usuario_creador: string;
  creator_handle: string | null;
  avatar_url: string | null;
  total_ingresos_mxn: number | null;
  tiktok_url: string | null;
}

const SORT_OPTIONS = [
  { value: "revenue", label: "Más ingresos" },
  { value: "sales", label: "Más ventas" },
  { value: "views", label: "Más vistas" },
];

const ITEMS_PER_PAGE = 20;

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(num);
};

const formatNum = (n: number | null | undefined): string => {
  if (!n) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
};

const RelatedVideos = () => {
  const { productId, creatorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFounder } = useBlurGateContext();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [sortOrder, setSortOrder] = useState("revenue");
  const [currentPage, setCurrentPage] = useState(1);
  const [auditing, setAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<{ issues: number; fixed: number } | null>(null);
  
  // Candidate videos state
  const [candidates, setCandidates] = useState<CandidateVideo[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const isProductView = !!productId;
  const isCreatorView = !!creatorId;

  useEffect(() => {
    fetchData();
  }, [productId, creatorId]);

  useEffect(() => {
    sortVideos();
  }, [sortOrder, videos.length]);

  // Load candidate videos when product is available
  useEffect(() => {
    if (isProductView && productInfo && isFounder) {
      loadCandidates();
    }
  }, [productInfo, isFounder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (isProductView && productId) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, producto_nombre, imagen_url, total_ingresos_mxn, rank, producto_url")
          .eq("id", productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          toast({ title: "Producto no encontrado", variant: "destructive" });
          navigate("/products");
          return;
        }
        setProductInfo(product);

        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select(`
            *,
            product:products!videos_product_id_fkey (
              id, producto_nombre, imagen_url, total_ingresos_mxn, commission, price, precio_mxn, revenue_30d, producto_url
            )
          `)
          .eq("product_id", productId)
          .order("revenue_mxn", { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);

      } else if (isCreatorView && creatorId) {
        const { data: creator, error: creatorError } = await supabase
          .from("creators")
          .select("id, nombre_completo, usuario_creador, creator_handle, avatar_url, total_ingresos_mxn, tiktok_url")
          .eq("id", creatorId)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creator) {
          toast({ title: "Creador no encontrado", variant: "destructive" });
          navigate("/creadores");
          return;
        }
        setCreatorInfo(creator);

        const creatorHandle = creator.creator_handle || creator.usuario_creador;
        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select(`
            *,
            product:products!videos_product_id_fkey (
              id, producto_nombre, imagen_url, total_ingresos_mxn, commission, price, precio_mxn, revenue_30d, producto_url
            )
          `)
          .or(`creator_id.eq.${creatorId},creator_handle.ilike.%${creatorHandle}%`)
          .order("revenue_mxn", { ascending: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error al cargar datos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    if (!productInfo) return;
    setCandidatesLoading(true);
    try {
      // Load product's market to pass to candidate search
      const { data: productData } = await supabase
        .from("products")
        .select("market")
        .eq("id", productInfo.id)
        .maybeSingle();
      
      const productMarket = productData?.market || 'mx';
      
      const { data } = await supabase.functions.invoke("find-candidate-videos", {
        body: { productId: productInfo.id, productName: productInfo.producto_nombre, market: productMarket, limit: 30 }
      });
      setCandidates(data?.candidates || []);
    } catch (err) {
      console.error("Error loading candidates:", err);
    } finally {
      setCandidatesLoading(false);
    }
  };

  const handleLinkVideo = async (videoId: string) => {
    if (!productInfo) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("videos")
        .update({
          product_id: productInfo.id,
          product_name: productInfo.producto_nombre,
          manual_match: true,
          manual_matched_at: new Date().toISOString(),
          manual_matched_by: user?.id || null,
        })
        .eq("id", videoId);
      if (error) throw error;
      toast({ title: "✅ Video vinculado" });
      fetchData();
      loadCandidates();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleUnlinkVideo = async (videoId: string) => {
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
      fetchData();
      loadCandidates();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sortVideos = () => {
    const sorted = [...videos].sort((a, b) => {
      switch (sortOrder) {
        case "revenue": return (b.revenue_mxn || 0) - (a.revenue_mxn || 0);
        case "sales": return (b.sales || 0) - (a.sales || 0);
        case "views": return (b.views || 0) - (a.views || 0);
        default: return 0;
      }
    });
    if (JSON.stringify(sorted) !== JSON.stringify(videos)) {
      setVideos(sorted);
    }
  };

  const totalPages = Math.ceil(videos.length / ITEMS_PER_PAGE);
  const paginatedVideos = videos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuditProduct = async (autoFix: boolean = false) => {
    if (!productId) return;
    setAuditing(true);
    setAuditResults(null);
    try {
      const response = await supabase.functions.invoke('audit-product-videos', {
        body: { productId, autoFix, limit: 100 }
      });
      if (response.error) throw response.error;
      const data = response.data;
      setAuditResults({ issues: data.issuesCount, fixed: data.fixed });
      toast({
        title: autoFix ? "Auditoría con corrección completada" : "Auditoría completada",
        description: `${data.analyzed} videos analizados, ${data.issuesCount} issues encontrados${autoFix ? `, ${data.fixed} corregidos` : ''}`
      });
      if (autoFix && data.fixed > 0) fetchData();
    } catch (error: any) {
      toast({ title: "Error en auditoría", description: error.message, variant: "destructive" });
    } finally {
      setAuditing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">Cargando videos...</p>
      </div>
    );
  }

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-3 h-8 text-xs" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Volver
      </Button>

      {/* Breadcrumbs */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/app" className="hover:text-foreground transition-colors">Videos</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={isProductView ? "/products" : "/creadores"} className="hover:text-foreground transition-colors">
          {isProductView ? "Productos" : "Creadores"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground truncate max-w-[150px]">
          {productInfo?.producto_nombre || creatorInfo?.nombre_completo || creatorInfo?.usuario_creador}
        </span>
      </div>

      {/* Product Header */}
      {isProductView && productInfo && (
        <Card className="p-4 mb-4 bg-card border-border">
          <div className="flex items-center gap-4">
            {productInfo.imagen_url ? (
              <img src={productInfo.imagen_url} alt={productInfo.producto_nombre} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {productInfo.rank && (
                  <Badge variant="secondary" className="text-xs">
                    #{productInfo.rank} {productInfo.rank <= 5 && '🔥'}
                  </Badge>
                )}
              </div>
              <h1 className="text-lg font-bold text-foreground truncate">{productInfo.producto_nombre}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                GMV 30D: {formatCurrency(productInfo.total_ingresos_mxn)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {productInfo.producto_url && (
                <Button variant="outline" size="sm" onClick={() => window.open(productInfo.producto_url!, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Ver producto
                </Button>
              )}
              {isFounder && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleAuditProduct(false)} disabled={auditing}>
                    {auditing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Eye className="h-4 w-4 mr-1.5" />}
                    Auditar
                  </Button>
                  <Button variant="default" size="sm" onClick={() => handleAuditProduct(true)} disabled={auditing}>
                    {auditing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Eye className="h-4 w-4 mr-1.5" />}
                    Auto-corregir
                  </Button>
                </>
              )}
            </div>
          </div>
          {auditResults && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-3 text-sm">
                <Badge variant={auditResults.issues > 0 ? "destructive" : "secondary"}>
                  {auditResults.issues} issues detectados
                </Badge>
                {auditResults.fixed > 0 && (
                  <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">
                    {auditResults.fixed} corregidos
                  </Badge>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Creator Header */}
      {isCreatorView && creatorInfo && (
        <Card className="p-4 mb-4 bg-card border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage 
                src={creatorInfo.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorInfo.nombre_completo || creatorInfo.usuario_creador)}&background=0D8ABC&color=fff`}
              />
              <AvatarFallback>
                {(creatorInfo.nombre_completo || creatorInfo.usuario_creador).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {creatorInfo.nombre_completo || creatorInfo.usuario_creador}
              </h1>
              <p className="text-sm text-muted-foreground">@{creatorInfo.creator_handle || creatorInfo.usuario_creador}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <DollarSign className="h-3.5 w-3.5" />
                GMV Total: {formatCurrency(creatorInfo.total_ingresos_mxn)}
              </p>
            </div>
            {creatorInfo.tiktok_url && (
              <Button variant="outline" size="sm" onClick={() => openTikTokLink(creatorInfo.tiktok_url!)}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ver en TikTok
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Subtitle and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <DataSubtitle />
        <Badge variant="secondary" className="w-fit text-xs">
          {videos.length} {videos.length === 1 ? "video" : "videos"} vinculados
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills
          options={SORT_OPTIONS}
          value={sortOrder}
          onChange={(v) => { setSortOrder(v); setCurrentPage(1); }}
        />
      </div>

      {/* Linked Videos Grid */}
      {videos.length === 0 && candidates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">No se encontraron videos relacionados</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(isProductView ? "/products" : "/creadores")}>
            Volver a {isProductView ? "Productos" : "Creadores"}
          </Button>
        </Card>
      ) : (
        <>
          {/* Linked videos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedVideos.map((video, index) => (
              <div key={video.id} className="relative group">
                <VideoCardOriginal video={video} ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} />
                {isFounder && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => handleUnlinkVideo(video.id)}
                    title="Desvincular video"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <CompactPagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}

      {/* Candidate Videos Section (Founders only, Product view only) */}
      {isProductView && isFounder && (candidates.length > 0 || candidatesLoading) && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Videos posiblemente relacionados (sin vincular)</h2>
            {candidatesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {candidates.map(candidate => (
              <Card key={candidate.id} className="overflow-hidden border-dashed border-primary/30">
                <div className="p-3">
                  {candidate.thumbnail_url && (
                    <img src={candidate.thumbnail_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  )}
                  <p className="text-xs font-medium truncate">{candidate.title || 'Sin título'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{candidate.creator_handle || '—'} • ${formatNum(candidate.revenue_mxn)} • {formatNum(candidate.views)} views
                  </p>
                  {candidate.product_name && (
                    <Badge variant="outline" className="text-[10px] h-4 mt-1">
                      Actual: {candidate.product_name}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    {candidate.matchedKeywords?.map(kw => (
                      <Badge key={kw} variant="secondary" className="text-[10px] h-4">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => handleLinkVideo(candidate.id)}
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      Vincular
                    </Button>
                    <a
                      href={candidate.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground border rounded"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedVideos;
