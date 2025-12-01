import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Save, ExternalLink, Eye, DollarSign, ShoppingCart, Percent } from "lucide-react";

interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    tiktok_url: string;
    descripcion_video: string;
    creador: string;
    ingresos_mxn: number;
    ventas: number;
    visualizaciones: number;
    duracion: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
    producto_nombre: string | null;
    producto_url: string | null;
    product_id?: string | null;
  };
}

interface ProductData {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  price: number | null;
  commission: number | null;
  categoria: string | null;
}

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([]);
  const embedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && video.producto_nombre) {
      loadProductData();
    }
  }, [isOpen, video.producto_nombre]);

  useEffect(() => {
    if (isOpen) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    }
  }, [isOpen]);

  const loadProductData = async () => {
    try {
      const { data } = await supabase
        .from("products")
        .select("id, producto_nombre, imagen_url, producto_url, price, commission, categoria")
        .eq("producto_nombre", video.producto_nombre)
        .maybeSingle();

      if (data) {
        setProductData(data);
      }
    } catch (error) {
      console.error("Error loading product data:", error);
    }
  };

  const getVideoId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const commissionEstimated = productData?.commission 
    ? video.ingresos_mxn * (productData.commission / 100)
    : null;

  const handleAnalyzeScript = async () => {
    setIsGenerating(true);
    try {
      const originalScript = video.transcripcion_original || video.guion_ia;
      if (!originalScript) {
        toast({
          title: "No hay guión disponible",
          description: "No se puede analizar sin un guión.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Analizando...",
        description: "El análisis con IA puede tomar unos segundos.",
      });

      // Mock analysis - in production, call edge function
      setTimeout(() => {
        toast({
          title: "✓ Análisis completado",
          description: "El guión ha sido analizado con éxito.",
        });
        setIsGenerating(false);
      }, 2000);
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleGenerateVariants = async () => {
    setIsGenerating(true);
    try {
      const originalScript = video.transcripcion_original || video.guion_ia;
      if (!originalScript) {
        toast({
          title: "No hay guión disponible",
          description: "No se puede generar variantes sin un guión.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-script-variants', {
        body: {
          originalScript,
          videoTitle: video.descripcion_video,
          variantType: 'comercial'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedVariants([data.variant]);
      toast({
        title: "✓ Variantes generadas",
        description: "Las variantes del guión están listas.",
      });
    } catch (error: any) {
      console.error("Error generating variants:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveScript = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const content = video.guion_ia || video.transcripcion_original;
      if (!content) {
        toast({
          title: "No hay contenido",
          description: "No hay guión para guardar.",
          variant: "destructive",
        });
        return;
      }

      const { data: scriptData, error: scriptError } = await supabase
        .from("guiones_personalizados")
        .insert({
          video_id: video.id,
          user_id: user.id,
          contenido: content,
          version_number: 1,
        })
        .select()
        .single();

      if (scriptError) throw scriptError;

      await supabase
        .from("favorites_scripts")
        .insert({
          user_id: user.id,
          script_id: scriptData.id,
          script_data: scriptData,
        });

      toast({
        title: "✓ Guardado",
        description: "El guión se agregó a tu colección.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const videoId = getVideoId(video.tiktok_url);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold pr-8">{video.descripcion_video}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden max-w-[300px] mx-auto">
            {videoId ? (
              <div ref={embedRef} className="w-full h-full">
                <blockquote
                  className="tiktok-embed"
                  cite={video.tiktok_url}
                  data-video-id={videoId}
                  style={{ maxWidth: '100%', minWidth: '100%' }}
                >
                  <section></section>
                </blockquote>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando video...</p>
              </div>
            )}
          </div>

          {/* Metrics Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Métricas del Video</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-md bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">Ingresos</span>
                </div>
                <p className="text-sm font-bold text-success">
                  {formatCurrency(video.ingresos_mxn)}
                </p>
              </div>

              <div className="p-3 rounded-md bg-muted">
                <div className="flex items-center gap-1 mb-1">
                  <ShoppingCart className="h-3 w-3 text-foreground" />
                  <span className="text-xs text-muted-foreground">Ventas</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {formatNumber(video.ventas)}
                </p>
              </div>

              <div className="p-3 rounded-md bg-accent/5 border border-accent/10">
                <div className="flex items-center gap-1 mb-1">
                  <Percent className="h-3 w-3 text-accent" />
                  <span className="text-xs text-muted-foreground">Comisión Est.</span>
                </div>
                <p className="text-sm font-bold text-accent">
                  {commissionEstimated ? formatCurrency(commissionEstimated) : "--"}
                </p>
              </div>

              <div className="p-3 rounded-md bg-muted">
                <div className="flex items-center gap-1 mb-1">
                  <Eye className="h-3 w-3 text-foreground" />
                  <span className="text-xs text-muted-foreground">Vistas</span>
                </div>
                <p className="text-sm font-bold text-foreground">
                  {formatNumber(video.visualizaciones)}
                </p>
              </div>
            </div>
          </div>

          {/* Product Section */}
          {(video.producto_nombre || productData) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Producto Asociado</h3>
              <div className="p-3 bg-primary/5 rounded-md border border-primary/10">
                <div className="flex items-center gap-3">
                  {productData?.imagen_url && (
                    <img
                      src={productData.imagen_url}
                      alt={productData.producto_nombre}
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {productData?.producto_nombre || video.producto_nombre}
                    </p>
                    {productData?.categoria && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {productData.categoria}
                      </Badge>
                    )}
                    {productData?.price && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Precio: ${productData.price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Script Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Transcripción del Guión</h3>
            <div className="bg-muted p-4 rounded-lg max-h-[300px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                {video.transcripcion_original || video.guion_ia || "Guión no disponible"}
              </pre>
            </div>
          </div>

          {/* Generated Variants */}
          {generatedVariants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Variantes Generadas</h3>
              {generatedVariants.map((variant, index) => (
                <div key={index} className="bg-accent/5 border border-accent/10 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {variant}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4 border-t">
            <Button 
              className="w-full" 
              onClick={handleAnalyzeScript}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating ? "Analizando..." : "Analizar guion con IA"}
            </Button>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleGenerateVariants}
              disabled={isGenerating}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generar variantes
            </Button>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={handleSaveScript}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>

            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.open(video.tiktok_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver en TikTok
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VideoAnalysisModal;
