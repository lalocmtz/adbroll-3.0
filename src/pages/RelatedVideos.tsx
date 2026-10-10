import { useEffect, useRef, useState } from "react";
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
import { FilterPills } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { openTikTokLink } from "@/lib/tiktokDeepLink";

// SECURITY: explicit non-premium columns. transcript / variants_json /
// analysis_json are REVOKEd at the DB level for anon/authenticated, so
// select("*") would now fail. Scripts are fetched via the get_video_script RPC.
const VIDEO_CARD_COLUMNS = `
  id, video_url, video_mp4_url, thumbnail_url, title,
  creator_name, creator_handle, creator_id, product_name, product_id,
  sales, revenue_mxn, views, roas, category, country, rank,
  imported_at, processing_status, snapshot_date_range,
  product:products!product_id (
    id, producto_nombre, imagen_url, total_ingresos_mxn, commission, price, precio_mxn, revenue_30d, producto_url
  )
`;

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

// TikTok handles are exact identities, never a fuzzy name/title search.
export const creatorVideoFilter = (creator: Pick<CreatorInfo, "id" | "creator_handle" | "usuario_creador">) => {
  const handle = (creator.creator_handle || creator.usuario_creador || "").trim().replace(/^@/, "").toLowerCase();
  const clauses = [`creator_id.eq.${creator.id}`];
  if (/^[a-z0-9._]+$/.test(handle)) {
    // ilike is case-insensitive; escape underscores so they cannot match another creator.
    const exactHandle = handle.replace(/_/g, "\\_");
    clauses.push(`creator_handle.ilike.${exactHandle}`, `creator_handle.ilike.@${exactHandle}`);
  }
  return clauses.join(",");
};

const SORT_COLUMNS: Record<string, "revenue_mxn" | "sales" | "views"> = {
  revenue: "revenue_mxn", sales: "sales", views: "views",
};

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
  const [totalVideos, setTotalVideos] = useState(0);
  const [identifiedVideos, setIdentifiedVideos] = useState(0);
  const requestVersion = useRef(0);
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
    setCurrentPage(1);
    setProductInfo(null);
    setCreatorInfo(null);
    setCandidates([]);
  }, [productId, creatorId]);

  useEffect(() => {
    fetchData();
    return () => { requestVersion.current += 1; };
  }, [productId, creatorId, sortOrder, currentPage]);

  // Load candidate videos when product is available
  useEffect(() => {
    if (isProductView && productInfo && isFounder) {
      loadCandidates();
    }
  }, [productInfo?.id, isFounder]);

  const fetchData = async () => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setVideos([]);
      setTotalVideos(0);
      setIdentifiedVideos(0);
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const loadVideos = async (scope: (query: any) => any) => {
        const [page, identified] = await Promise.all([
          scope(supabase.from("videos").select(VIDEO_CARD_COLUMNS, { count: "exact" }))
            .not("video_mp4_url", "is", null)
            .neq("video_mp4_url", "")
            .order(SORT_COLUMNS[sortOrder] || "revenue_mxn", { ascending: false, nullsFirst: false })
            .order("id", { ascending: true })
            .range(from, from + ITEMS_PER_PAGE - 1),
          scope(supabase.from("videos").select("id", { count: "exact", head: true })),
        ]);
        if (version !== requestVersion.current) return;
        if (page.error) throw page.error;
        if (identified.error) throw identified.error;
        setVideos(page.data || []);
        setTotalVideos(page.count || 0);
        setIdentifiedVideos(identified.count || 0);
      };
      
      if (isProductView && productId) {
        const { data: product, error: productError } = await supabase
          .from("products")
          .select("id, producto_nombre, imagen_url, total_ingresos_mxn, rank, producto_url, market, tiktok_product_id")
          .eq("id", productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!product) {
          toast({ title: "Producto no encontrado", variant: "destructive" });
          navigate("/products");
          return;
        }
        if (version !== requestVersion.current) return;
        setProductInfo(product);

        await loadVideos(query => query
          .eq("product_id", productId)
          .eq("country", product.market)
          .or(product.tiktok_product_id && /^\d+$/.test(product.tiktok_product_id)
            ? `manual_match.eq.true,tiktok_product_id.eq.${product.tiktok_product_id}`
            : "manual_match.eq.true"));

      } else if (isCreatorView && creatorId) {
        const { data: creator, error: creatorError } = await supabase
          .from("creators")
          .select("id, nombre_completo, usuario_creador, creator_handle, avatar_url, total_ingresos_mxn, tiktok_url, country")
          .eq("id", creatorId)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creator) {
          toast({ title: "Creador no encontrado", variant: "destructive" });
          navigate("/creadores");
          return;
        }
        if (version !== requestVersion.current) return;
        setCreatorInfo(creator);

        await loadVideos(query => query
          .or(creatorVideoFilter(creator))
          .eq("country", creator.country || "mx"));
      }
    } catch (error: any) {
      if (version !== requestVersion.current) return;
      toast({
        title: "Error al cargar datos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (version === requestVersion.current) setLoading(false);
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

  const totalPages = Math.ceil(totalVideos / ITEMS_PER_PAGE);

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
    <div className="min-w-0 w-full pt-3 pb-6 px-4 md:px-6 md:pt-5">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="mb-2 h-11 text-xs" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Volver
      </Button>

      {/* Breadcrumbs */}
      <div className="mb-3 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/app" className="hover:text-foreground transition-colors">Videos</Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <Link to={isProductView ? "/products" : "/creadores"} className="hover:text-foreground transition-colors">
          {isProductView ? "Productos" : "Creadores"}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0" />
        <span className="text-foreground truncate max-w-[150px]">
          {productInfo?.producto_nombre || creatorInfo?.nombre_completo || creatorInfo?.usuario_creador}
        </span>
      </div>

      {/* Product Header */}
      {isProductView && productInfo && (
        <Card className="min-w-0 p-3 sm:p-4 mb-4 bg-card border-border">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
            {productInfo.imagen_url ? (
              <img src={productInfo.imagen_url} alt={productInfo.producto_nombre} className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
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
              <h1 className="text-base sm:text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] leading-snug">{productInfo.producto_nombre}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1">
                <DollarSign className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {productInfo.total_ingresos_mxn === null ? 'Métricas del producto pendientes de un reporte de Kalodata' : `GMV del reporte: ${formatCurrency(productInfo.total_ingresos_mxn)}`}
              </p>
            </div>
            <div className="col-span-2 flex min-w-0 flex-wrap gap-2 lg:col-span-1 lg:justify-end [&>button]:min-h-11">
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
              <div className="flex flex-wrap items-center gap-3 text-sm">
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
        <Card className="min-w-0 p-3 sm:p-4 mb-4 bg-card border-border">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Avatar className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 border-2 border-primary/20">
              <AvatarImage 
                src={creatorInfo.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorInfo.nombre_completo || creatorInfo.usuario_creador)}&background=0D8ABC&color=fff`}
              />
              <AvatarFallback>
                {(creatorInfo.nombre_completo || creatorInfo.usuario_creador).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-foreground break-words [overflow-wrap:anywhere] leading-snug">
                {creatorInfo.nombre_completo || creatorInfo.usuario_creador}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground break-all">@{(creatorInfo.creator_handle || creatorInfo.usuario_creador).trim().replace(/^@/, "")}</p>
              <p className="text-xs sm:text-sm text-muted-foreground flex items-start gap-1 mt-1">
                <DollarSign className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                GMV del reporte: {formatCurrency(creatorInfo.total_ingresos_mxn)}
              </p>
            </div>
            {creatorInfo.tiktok_url && (
              <Button variant="outline" size="sm" className="col-span-2 lg:col-span-1 h-11 w-fit" onClick={() => openTikTokLink(creatorInfo.tiktok_url!)}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ver en TikTok
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Subtitle and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <p className="text-[11px] text-muted-foreground mb-2">
          Videos descargados y vinculados · métricas del reporte importado, no en tiempo real
        </p>
        <Badge variant="secondary" className="w-fit text-xs">
          {totalVideos} {totalVideos === 1 ? "video disponible" : "videos disponibles"}
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
      {videos.length === 0 ? (
        <Card className="min-w-0 px-4 py-8 sm:p-12 text-center">
          <p className="text-muted-foreground text-lg">Todavía no hay videos descargados para {isProductView ? "este producto" : "este creador"}</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            {identifiedVideos > 0
              ? `Hay ${identifiedVideos} ${identifiedVideos === 1 ? "video identificado" : "videos identificados"} en los reportes. Falta descargar y verificar sus archivos para mostrarlos aquí.`
              : `Necesitamos importar enlaces de videos ${isProductView ? "con el ID exacto de este producto" : "de esta cuenta"} y descargar sus archivos. El ranking por sí solo no incluye esos videos.`}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(isProductView ? "/products" : "/creadores")}>
            Volver a {isProductView ? "Productos" : "Creadores"}
          </Button>
        </Card>
      ) : (
        <>
          {/* Linked videos */}
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {videos.map((video, index) => (
              <div key={video.id} className="relative min-w-0 group">
                <VideoCardOriginal video={video} ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} />
                {isFounder && isProductView && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-16 right-4 h-11 w-11 sm:h-8 sm:w-8 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-20"
                    onClick={() => handleUnlinkVideo(video.id)}
                    title="Desvincular video"
                    aria-label="Desvincular video"
                  >
                    <X className="h-3.5 w-3.5 shrink-0 mt-0.5" />
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
          
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {candidates.map(candidate => (
              <Card key={candidate.id} className="min-w-0 overflow-hidden border-dashed border-primary/30">
                <div className="p-3">
                  {candidate.thumbnail_url && (
                    <img src={candidate.thumbnail_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
                  )}
                  <p className="text-xs font-medium truncate">{candidate.title || 'Sin título'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words [overflow-wrap:anywhere]">
                    @{candidate.creator_handle || '—'} • ${formatNum(candidate.revenue_mxn)} • {formatNum(candidate.views)} views
                  </p>
                  {candidate.product_name && (
                    <Badge variant="outline" className="max-w-full whitespace-normal break-words text-[10px] leading-snug mt-1">
                      Actual: {candidate.product_name}
                    </Badge>
                  )}
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {candidate.matchedKeywords?.map(kw => (
                      <Badge key={kw} variant="secondary" className="text-[10px] h-4">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="min-w-0 flex-1 h-11 text-xs"
                      onClick={() => handleLinkVideo(candidate.id)}
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      Vincular
                    </Button>
                    <a
                      href={candidate.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir video en TikTok"
                      className="h-11 w-11 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground border rounded"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
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
