import { useEffect, useState } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import VideoCardOriginal from "@/components/VideoCardOriginal";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";

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
}

const RelatedVideos = () => {
  const { productId, creatorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const isProductView = !!productId;
  const isCreatorView = !!creatorId;

  useEffect(() => {
    fetchRelatedVideos();
  }, [productId, creatorId]);

  const fetchRelatedVideos = async () => {
    try {
      if (isProductView && productId) {
        // Fetch product info
        const { data: productData, error: productError } = await supabase
          .from("products")
          .select("producto_nombre")
          .eq("id", productId)
          .maybeSingle();

        if (productError) throw productError;
        if (!productData) {
          toast({ title: "Producto no encontrado", variant: "destructive" });
          navigate("/products");
          return;
        }

        setTitle(productData.producto_nombre);
        setSubtitle("Videos que promocionan este producto");

        // Fetch videos matching product
        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select("*")
          .or(`product_id.eq.${productId},product_name.ilike.%${productData.producto_nombre}%`)
          .order("revenue_mxn", { ascending: false, nullsFirst: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);

      } else if (isCreatorView && creatorId) {
        // Fetch creator info
        const { data: creatorData, error: creatorError } = await supabase
          .from("creators")
          .select("usuario_creador, nombre_completo, creator_handle")
          .eq("id", creatorId)
          .maybeSingle();

        if (creatorError) throw creatorError;
        if (!creatorData) {
          toast({ title: "Creador no encontrado", variant: "destructive" });
          navigate("/creadores");
          return;
        }

        const creatorName = creatorData.nombre_completo || creatorData.usuario_creador;
        const creatorHandle = creatorData.creator_handle || creatorData.usuario_creador;
        
        setTitle(creatorName);
        setSubtitle(`@${creatorHandle}`);

        // Fetch videos by creator
        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select("*")
          .or(`creator_handle.ilike.%${creatorHandle}%,creator_name.ilike.%${creatorName}%`)
          .order("revenue_mxn", { ascending: false, nullsFirst: false });

        if (videosError) throw videosError;
        setVideos(videosData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error al cargar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando videos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/app" className="hover:text-foreground transition-colors">
            Videos
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link 
            to={isProductView ? "/products" : "/creadores"} 
            className="hover:text-foreground transition-colors"
          >
            {isProductView ? "Productos" : "Creadores"}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground truncate max-w-[200px]">{title}</span>
        </div>

        {/* Title and Info */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {title}
          </h1>
          <p className="text-muted-foreground">{subtitle}</p>
          <Badge variant="secondary" className="mt-2">
            {videos.length} {videos.length === 1 ? "video" : "videos"}
          </Badge>
        </div>

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              No se encontraron videos relacionados con {title}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videos.map((video, index) => (
              <VideoCardOriginal key={video.id} video={video} ranking={index + 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RelatedVideos;
