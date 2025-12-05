import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight, ArrowLeft, Package, User, DollarSign, ExternalLink } from "lucide-react";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import { useToast } from "@/hooks/use-toast";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";

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

const RelatedVideos = () => {
  const { productId, creatorId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [creatorInfo, setCreatorInfo] = useState<CreatorInfo | null>(null);
  const [sortOrder, setSortOrder] = useState("revenue");
  const [currentPage, setCurrentPage] = useState(1);

  const isProductView = !!productId;
  const isCreatorView = !!creatorId;

  useEffect(() => {
    fetchData();
  }, [productId, creatorId]);

  useEffect(() => {
    sortVideos();
  }, [sortOrder, videos.length]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (isProductView && productId) {
        // Fetch product info
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

        // Fetch videos with product JOIN
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
        // Fetch creator info
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

        // Fetch videos by creator with product JOIN
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

  const sortVideos = () => {
    const sorted = [...videos].sort((a, b) => {
      switch (sortOrder) {
        case "revenue":
          return (b.revenue_mxn || 0) - (a.revenue_mxn || 0);
        case "sales":
          return (b.sales || 0) - (a.sales || 0);
        case "views":
          return (b.views || 0) - (a.views || 0);
        default:
          return 0;
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
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 h-8 text-xs"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
        Volver
      </Button>

      {/* Breadcrumbs */}
      <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/app" className="hover:text-foreground transition-colors">
          Videos
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link 
          to={isProductView ? "/products" : "/creadores"} 
          className="hover:text-foreground transition-colors"
        >
          {isProductView ? "Productos" : "Creadores"}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground truncate max-w-[150px]">
          {productInfo?.producto_nombre || creatorInfo?.nombre_completo || creatorInfo?.usuario_creador}
        </span>
      </div>

      {/* Entity Header Card */}
      {isProductView && productInfo && (
        <Card className="p-4 mb-4 bg-card border-border">
          <div className="flex items-center gap-4">
            {productInfo.imagen_url ? (
              <img 
                src={productInfo.imagen_url} 
                alt={productInfo.producto_nombre}
                className="w-16 h-16 rounded-lg object-cover"
              />
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
              <h1 className="text-lg font-bold text-foreground truncate">
                {productInfo.producto_nombre}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                GMV 30D: {formatCurrency(productInfo.total_ingresos_mxn)}
              </p>
            </div>
            {productInfo.producto_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(productInfo.producto_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ver producto
              </Button>
            )}
          </div>
        </Card>
      )}

      {isCreatorView && creatorInfo && (
        <Card className="p-4 mb-4 bg-card border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage 
                src={creatorInfo.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(creatorInfo.nombre_completo || creatorInfo.usuario_creador)}&background=0D8ABC&color=fff`} 
                alt={creatorInfo.nombre_completo || creatorInfo.usuario_creador} 
              />
              <AvatarFallback>
                {(creatorInfo.nombre_completo || creatorInfo.usuario_creador).substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {creatorInfo.nombre_completo || creatorInfo.usuario_creador}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{creatorInfo.creator_handle || creatorInfo.usuario_creador}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <DollarSign className="h-3.5 w-3.5" />
                GMV Total: {formatCurrency(creatorInfo.total_ingresos_mxn)}
              </p>
            </div>
            {creatorInfo.tiktok_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(creatorInfo.tiktok_url!, '_blank')}
              >
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
          {videos.length} {videos.length === 1 ? "video" : "videos"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills
          options={SORT_OPTIONS}
          value={sortOrder}
          onChange={(v) => {
            setSortOrder(v);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            No se encontraron videos relacionados
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(isProductView ? "/products" : "/creadores")}
          >
            Volver a {isProductView ? "Productos" : "Creadores"}
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedVideos.map((video, index) => (
              <VideoCardOriginal 
                key={video.id} 
                video={video} 
                ranking={(currentPage - 1) * ITEMS_PER_PAGE + index + 1} 
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              <CompactPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RelatedVideos;
