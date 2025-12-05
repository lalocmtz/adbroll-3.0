import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Heart, Copy, X, ExternalLink, DollarSign, ShoppingCart, Eye, Percent, Package, Zap, Target, Flame, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface FullAnalysis {
  script_original_limpio: string;
  analisis_guion: {
    hook_detectado: string;
    problema: string;
    beneficios: string;
    demostracion: string;
    cta: string;
    intencion_emocional: string;
    fortalezas: string[];
    debilidades: string[];
    oportunidades_mejora: string[];
  };
  hooks: {
    hook_1_similar: string;
    hook_2_variado: string;
    hook_3_disruptivo: string;
  };
  cuerpo_reescrito: {
    para_hook_1: string;
    para_hook_2: string;
    para_hook_3: string;
  };
}

interface ProductOption {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  precio_mxn: number | null;
  commission: number | null;
}

const VideoAnalysisModal = ({ isOpen, onClose, video }: VideoAnalysisModalProps) => {
  const [fullAnalysis, setFullAnalysis] = useState<FullAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [transcription, setTranscription] = useState<string>(video.transcripcion_original || "");
  const [manualTranscription, setManualTranscription] = useState<string>("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [customProduct, setCustomProduct] = useState<string>("");
  const [selectedHook, setSelectedHook] = useState<1 | 2 | 3>(1);
  const [copiedHook, setCopiedHook] = useState<number | null>(null);
  const embedRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const initModal = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("favorites_videos")
          .select("id")
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url)
          .maybeSingle();
        setIsFavorite(!!data);
      }

      const { data: products } = await supabase
        .from("products")
        .select("id, producto_nombre, imagen_url, precio_mxn, commission")
        .order("producto_nombre");
      
      if (products) {
        setProductOptions(products);
        if (video.product_id) {
          setSelectedProduct(video.product_id);
        }
      }
    };

    if (isOpen) {
      initModal();
      
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
  }, [isOpen, video.tiktok_url]);

  const handleFullAnalysis = async () => {
    const scriptToAnalyze = manualTranscription || transcription || video.transcripcion_original || video.guion_ia;
    
    if (!scriptToAnalyze) {
      toast({
        title: "No hay guión disponible",
        description: "Ingresa la transcripción del video manualmente.",
        variant: "destructive",
      });
      return;
    }

    const productName = customProduct || 
      productOptions.find(p => p.id === selectedProduct)?.producto_nombre || 
      video.producto_nombre || 
      "producto";

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-full-script', {
        body: {
          transcription: scriptToAnalyze,
          videoTitle: video.descripcion_video,
          productName,
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFullAnalysis(data);
      setTranscription(data.script_original_limpio || scriptToAnalyze);
      
      toast({
        title: "✓ Análisis completado",
        description: "El guión ha sido analizado y las variantes están listas.",
      });
    } catch (error: any) {
      console.error("Error in full analysis:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos",
      });
      navigate("/login");
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from("favorites_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_url", video.tiktok_url);

        setIsFavorite(false);
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { data: videoData } = await supabase
          .from("daily_feed")
          .select("*")
          .eq("tiktok_url", video.tiktok_url)
          .single();

        await supabase
          .from("favorites_videos")
          .insert({
            user_id: user.id,
            video_url: video.tiktok_url,
            video_data: videoData,
          });

        setIsFavorite(true);
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCopyScript = async (text: string, hookNum?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (hookNum) {
        setCopiedHook(hookNum);
        setTimeout(() => setCopiedHook(null), 2000);
      }
      toast({
        title: "✓ Copiado",
        description: "El guión se copió al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    }
  };

  const getVideoId = (url: string) => {
    const match = url.match(/\/video\/(\d+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(video.tiktok_url);
  const script = transcription || video.transcripcion_original || video.guion_ia || "";
  
  const selectedProductData = productOptions.find(p => p.id === selectedProduct);
  const commissionRate = selectedProductData?.commission || 6;
  const commissionEstimated = video.ingresos_mxn * (commissionRate / 100);

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "k";
    return new Intl.NumberFormat("es-MX").format(num);
  };

  const getHookIcon = (hookNum: number) => {
    switch (hookNum) {
      case 1: return <Target className="h-4 w-4" />;
      case 2: return <Zap className="h-4 w-4" />;
      case 3: return <Flame className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getHookLabel = (hookNum: number) => {
    switch (hookNum) {
      case 1: return "Similar al original";
      case 2: return "Ángulo variado";
      case 3: return "Disruptivo/Viral";
      default: return "Hook";
    }
  };

  const getHookColor = (hookNum: number) => {
    switch (hookNum) {
      case 1: return "bg-blue-500/10 border-blue-500/30 text-blue-600";
      case 2: return "bg-amber-500/10 border-amber-500/30 text-amber-600";
      case 3: return "bg-red-500/10 border-red-500/30 text-red-600";
      default: return "bg-muted";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 overflow-hidden bg-background/95 backdrop-blur-xl">
        {/* Close Button & Top Actions */}
        <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={handleToggleFavorite}
            className={`h-8 w-8 ${isFavorite ? "text-red-500" : ""}`}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.open(video.tiktok_url, '_blank')}
            className="h-8 w-8"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
          {/* Left Side - Video & Metrics */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">@{video.creador}</p>
            
            {/* Video Player */}
            <div className="relative w-full max-w-[320px] mx-auto">
              <div className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden">
                {videoId ? (
                  <div ref={embedRef} className="w-full h-full">
                    <blockquote
                      className="tiktok-embed"
                      cite={video.tiktok_url}
                      data-video-id={videoId}
                      style={{ maxWidth: '100%', minWidth: '100%', margin: 0 }}
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
            </div>

            {/* Metrics Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Métricas del Video</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Ingresos</span>
                  </div>
                  <p className="text-sm font-bold text-success">
                    {formatCurrency(video.ingresos_mxn)}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingCart className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-muted-foreground">Ventas</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatNumber(video.ventas)}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-muted">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-foreground" />
                    <span className="text-xs text-muted-foreground">Vistas</span>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {formatNumber(video.visualizaciones)}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Comisión</span>
                  </div>
                  <p className="text-sm font-bold text-accent">
                    {formatCurrency(commissionEstimated)}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Section */}
            {(video.producto_nombre || selectedProductData) && (
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Producto</h3>
                </div>
                <p className="text-xs text-foreground font-medium">
                  {selectedProductData?.producto_nombre || video.producto_nombre}
                </p>
                {selectedProductData?.precio_mxn && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Precio: {formatCurrency(selectedProductData.precio_mxn)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Tabs */}
          <div className="flex flex-col h-full overflow-hidden">
            <Tabs defaultValue="script" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="analisis">Análisis</TabsTrigger>
                <TabsTrigger value="hooks">Hooks IA</TabsTrigger>
              </TabsList>

              {/* Script Tab */}
              <TabsContent value="script" className="flex-1 overflow-y-auto space-y-4 mt-4">
                <div className="space-y-3">
                  <Label>Transcripción del Video</Label>
                  {script ? (
                    <div className="space-y-2">
                      <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {fullAnalysis?.script_original_limpio || script}
                        </pre>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyScript(fullAnalysis?.script_original_limpio || script)}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar
                      </Button>
                    </div>
                  ) : (
                    <Textarea
                      placeholder="Pega aquí la transcripción del video de TikTok..."
                      value={manualTranscription}
                      onChange={(e) => setManualTranscription(e.target.value)}
                      className="min-h-[200px] font-mono text-xs"
                    />
                  )}
                </div>

                {/* Product Selection */}
                <div className="space-y-3 border-t pt-4">
                  <Label>Producto para las variantes</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir de la lista" />
                    </SelectTrigger>
                    <SelectContent>
                      {productOptions.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.producto_nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        O ingresar manualmente
                      </span>
                    </div>
                  </div>

                  <Input
                    placeholder="Ej: Crema facial antiedad"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleFullAnalysis}
                  disabled={isAnalyzing || (!script && !manualTranscription)}
                  size="lg"
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                      Analizando con GPT-4o-mini...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analizar guión y generar hooks
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Análisis Tab */}
              <TabsContent value="analisis" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {!fullAnalysis ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Primero analiza el guión en la pestaña "Script"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 bg-red-500/5 border-red-500/20">
                      <h4 className="font-semibold mb-1 text-xs text-red-600">🎯 Hook Detectado</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.hook_detectado}</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold mb-1 text-xs text-muted-foreground">⚠️ Problema</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.problema}</p>
                    </div>

                    <div className="border rounded-lg p-3 bg-green-500/5 border-green-500/20">
                      <h4 className="font-semibold mb-1 text-xs text-green-600">✓ Beneficios</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.beneficios}</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold mb-1 text-xs text-muted-foreground">📹 Demostración</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.demostracion}</p>
                    </div>

                    <div className="border rounded-lg p-3 bg-purple-500/5 border-purple-500/20">
                      <h4 className="font-semibold mb-1 text-xs text-purple-600">🛒 CTA</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.cta}</p>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-semibold mb-1 text-xs text-muted-foreground">💭 Intención Emocional</h4>
                      <p className="text-sm">{fullAnalysis.analisis_guion.intencion_emocional}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border rounded-lg p-3 bg-green-500/5">
                        <h4 className="font-semibold mb-2 text-xs text-green-600">Fortalezas</h4>
                        <ul className="space-y-1">
                          {fullAnalysis.analisis_guion.fortalezas.map((f, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {f}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="border rounded-lg p-3 bg-orange-500/5">
                        <h4 className="font-semibold mb-2 text-xs text-orange-600">Debilidades</h4>
                        <ul className="space-y-1">
                          {fullAnalysis.analisis_guion.debilidades.map((d, i) => (
                            <li key={i} className="text-xs text-muted-foreground">• {d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-blue-500/5">
                      <h4 className="font-semibold mb-2 text-xs text-blue-600">💡 Oportunidades de Mejora</h4>
                      <ul className="space-y-1">
                        {fullAnalysis.analisis_guion.oportunidades_mejora.map((o, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {o}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Hooks IA Tab */}
              <TabsContent value="hooks" className="flex-1 overflow-y-auto space-y-4 mt-4">
                {!fullAnalysis ? (
                  <div className="text-center py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Primero analiza el guión en la pestaña "Script"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecciona un hook para ver el guión completo reescrito:
                    </p>

                    {/* Hook Selection Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map((hookNum) => (
                        <button
                          key={hookNum}
                          onClick={() => setSelectedHook(hookNum as 1 | 2 | 3)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedHook === hookNum 
                              ? getHookColor(hookNum) + " ring-2 ring-offset-2" 
                              : "bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getHookIcon(hookNum)}
                            <span className="text-xs font-semibold">Hook {hookNum}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {getHookLabel(hookNum)}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Selected Hook Display */}
                    <div className={`border rounded-lg p-4 ${getHookColor(selectedHook)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {getHookLabel(selectedHook)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyScript(
                            selectedHook === 1 ? fullAnalysis.hooks.hook_1_similar :
                            selectedHook === 2 ? fullAnalysis.hooks.hook_2_variado :
                            fullAnalysis.hooks.hook_3_disruptivo,
                            selectedHook
                          )}
                        >
                          {copiedHook === selectedHook ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm font-medium">
                        {selectedHook === 1 && fullAnalysis.hooks.hook_1_similar}
                        {selectedHook === 2 && fullAnalysis.hooks.hook_2_variado}
                        {selectedHook === 3 && fullAnalysis.hooks.hook_3_disruptivo}
                      </p>
                    </div>

                    {/* Full Rewritten Script */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-sm">Guión Completo Reescrito</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyScript(
                            selectedHook === 1 ? fullAnalysis.cuerpo_reescrito.para_hook_1 :
                            selectedHook === 2 ? fullAnalysis.cuerpo_reescrito.para_hook_2 :
                            fullAnalysis.cuerpo_reescrito.para_hook_3
                          )}
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copiar guión completo
                        </Button>
                      </div>
                      <div className="bg-background p-4 rounded-lg max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                          {selectedHook === 1 && fullAnalysis.cuerpo_reescrito.para_hook_1}
                          {selectedHook === 2 && fullAnalysis.cuerpo_reescrito.para_hook_2}
                          {selectedHook === 3 && fullAnalysis.cuerpo_reescrito.para_hook_3}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom Button */}
        <div className="border-t p-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleFullAnalysis}
            disabled={isAnalyzing || (!script && !manualTranscription)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isAnalyzing ? "Analizando..." : "Analizar guión y replicar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoAnalysisModal;
