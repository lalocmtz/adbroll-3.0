import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Copy, Loader2, Zap, PenTool, Check, AlertCircle, 
  Link2, RotateCcw, Play, Heart, Download, Sparkles, ChevronRight
} from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Product {
  id: string;
  producto_nombre: string;
  categoria: string | null;
  precio_mxn: number | null;
  commission: number | null;
  imagen_url?: string | null;
  gmv_30d_mxn?: number | null;
}

interface FavoriteProduct {
  product_id: string;
  product_data: Product;
}

const isValidTikTokUrl = (url: string): boolean => {
  const tiktokPatterns = [
    /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
    /^https?:\/\/vm\.tiktok\.com\/[\w]+/i,
    /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w]+/i,
  ];
  return tiktokPatterns.some(pattern => pattern.test(url.trim()));
};

type ExtractorState = "idle" | "loading" | "success" | "error";
type ExtractorError = "invalid_url" | "api_error" | "no_transcript" | null;

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const Tools = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Script Extractor State
  const [videoUrl, setVideoUrl] = useState("");
  const [extractorState, setExtractorState] = useState<ExtractorState>("idle");
  const [extractorError, setExtractorError] = useState<ExtractorError>(null);
  const [transcript, setTranscript] = useState("");
  const [structuredScript, setStructuredScript] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [variants, setVariants] = useState<any>(null);
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  const [activeExtractorTab, setActiveExtractorTab] = useState("script");
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  
  // Hook Generator State
  const [hookProductDesc, setHookProductDesc] = useState("");
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  
  // Script Generator State
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<FavoriteProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [additionalBenefits, setAdditionalBenefits] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<any>(null);
  const [productTab, setProductTab] = useState<"popular" | "favorites">("popular");
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchPopularProducts();
    fetchFavoriteProducts();
  }, []);

  const fetchPopularProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, producto_nombre, categoria, precio_mxn, commission, imagen_url, gmv_30d_mxn")
      .order("gmv_30d_mxn", { ascending: false, nullsFirst: false })
      .limit(8);
    if (data) setPopularProducts(data);
  };

  const fetchFavoriteProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites_products")
      .select("product_id, product_data")
      .eq("user_id", user.id)
      .limit(8);
    
    if (data) {
      const mapped = data.map(item => ({
        product_id: item.product_id,
        product_data: item.product_data as unknown as Product
      }));
      setFavoriteProducts(mapped);
    }
  };

  const getErrorMessage = (error: ExtractorError): string => {
    if (language === "es") {
      switch (error) {
        case "invalid_url": return "Ingresa un enlace válido de TikTok.";
        case "api_error": return "No fue posible obtener el guión. Intenta con otro link.";
        case "no_transcript": return "Este video no cuenta con transcripción disponible.";
        default: return "";
      }
    } else {
      switch (error) {
        case "invalid_url": return "Enter a valid TikTok link.";
        case "api_error": return "Could not extract the script. Try another link.";
        case "no_transcript": return "This video does not have a transcript available.";
        default: return "";
      }
    }
  };

  const handleExtract = async () => {
    setExtractorError(null);
    setTranscript("");
    setStructuredScript(null);
    setAnalysisData(null);
    setVariants(null);

    if (!videoUrl.trim() || !isValidTikTokUrl(videoUrl)) {
      setExtractorError("invalid_url");
      return;
    }

    setExtractorState("loading");

    try {
      const { data, error } = await supabase.functions.invoke("transcribe-assemblyai", {
        body: { videoUrl }
      });

      if (error) throw error;

      if (data?.transcript && data.transcript.trim().length > 0) {
        setTranscript(data.transcript);
        
        // Analyze script structure
        const { data: analysisResult } = await supabase.functions.invoke("analyze-script-sections", {
          body: { script: data.transcript, videoTitle: "Video de TikTok" }
        });

        if (analysisResult?.sections) {
          setStructuredScript(analysisResult.sections);
          setAnalysisData(analysisResult);
        }

        setExtractorState("success");
        toast({
          title: language === "es" ? "✓ Guión extraído" : "✓ Script extracted",
        });
      } else {
        setExtractorState("error");
        setExtractorError("no_transcript");
      }
    } catch (err: any) {
      console.error("Extract error:", err);
      setExtractorState("error");
      setExtractorError("api_error");
    }
  };

  const handleGenerateVariants = async () => {
    if (!transcript) return;
    
    setIsGeneratingVariants(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-script-variants", {
        body: { 
          transcript, 
          analysis: analysisData,
          variantCount: 3,
          changeLevel: 'medium'
        }
      });

      if (error) throw error;
      if (data?.variants) {
        setVariants(data.variants);
        toast({ title: language === "es" ? "✓ Variantes generadas" : "✓ Variants generated" });
      }
    } catch (err: any) {
      console.error("Variants error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(transcript);
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2000);
    toast({ title: language === "es" ? "✓ Copiado al portapapeles" : "✓ Copied to clipboard" });
  };

  const handleDownloadScript = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guion-tiktok.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetExtractor = () => {
    setVideoUrl("");
    setExtractorState("idle");
    setExtractorError(null);
    setTranscript("");
    setStructuredScript(null);
    setAnalysisData(null);
    setVariants(null);
    setActiveExtractorTab("script");
  };

  const handleGenerateHooks = async () => {
    if (!hookProductDesc.trim()) {
      toast({
        title: "Error",
        description: language === "es" ? "Describe tu producto" : "Describe your product",
        variant: "destructive",
      });
      return;
    }

    setLoadingHooks(true);
    setGeneratedHooks([]);

    try {
      const { data, error } = await supabase.functions.invoke("generate-hooks", {
        body: { productDescription: hookProductDesc }
      });

      if (error) throw error;

      if (data?.hooks) {
        setGeneratedHooks(data.hooks);
        toast({ title: language === "es" ? "✓ Hooks generados" : "✓ Hooks generated" });
      }
    } catch (err: any) {
      console.error("Hook generation error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingHooks(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedProduct) {
      toast({
        title: "Error",
        description: language === "es" ? "Selecciona un producto" : "Select a product",
        variant: "destructive",
      });
      return;
    }

    setLoadingScript(true);
    setGeneratedScript(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-full-script", {
        body: { 
          product: {
            name: selectedProduct.producto_nombre,
            category: selectedProduct.categoria,
            price: selectedProduct.precio_mxn,
            commission: selectedProduct.commission
          },
          additionalBenefits 
        }
      });

      if (error) throw error;

      if (data) {
        setGeneratedScript(data);
        toast({ title: language === "es" ? "✓ Guión generado" : "✓ Script generated" });
      }
    } catch (err: any) {
      console.error("Script generation error:", err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingScript(false);
    }
  };

  const handleCopy = async (text: string, index?: number) => {
    await navigator.clipboard.writeText(text);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
    toast({ title: language === "es" ? "✓ Copiado" : "✓ Copied" });
  };

  const getSectionEmoji = (type: string) => {
    switch (type) {
      case "hook": return "🎯";
      case "problema": return "😰";
      case "beneficio": return "✨";
      case "demostracion": return "📱";
      case "cta": return "🛒";
      default: return "📝";
    }
  };

  const ProductCard = ({ product, isSelected, onClick }: { product: Product; isSelected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`relative group p-3 rounded-xl border-2 transition-all duration-200 text-left ${
        isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
      }`}
    >
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
          {product.imagen_url ? (
            <img src={product.imagen_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
            {product.producto_nombre}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-primary">
              {formatCurrency(product.precio_mxn)}
            </span>
            {product.commission && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {product.commission}%
              </span>
            )}
          </div>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </button>
  );

  return (
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-5xl space-y-5">
      <DataSubtitle />

      {/* 1. Script Extractor Tool */}
      <Card className="overflow-hidden border-border/50 shadow-sm">
        {/* Idle State */}
        {extractorState === "idle" && (
          <div className="p-5 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {language === "es" ? "Extractor de Guiones" : "Script Extractor"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {language === "es" ? "Pega un link de TikTok y extrae el guión" : "Paste a TikTok link and extract the script"}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  placeholder={language === "es" ? "https://tiktok.com/@usuario/video/..." : "https://tiktok.com/@user/video/..."}
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setExtractorError(null);
                  }}
                  className="h-11 pl-10 rounded-xl border-border/60"
                />
              </div>
              <Button 
                onClick={handleExtract} 
                className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 shadow-sm"
              >
                <FileText className="h-4 w-4 mr-2" />
                {language === "es" ? "Extraer" : "Extract"}
              </Button>
            </div>
            
            {extractorError === "invalid_url" && (
              <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{getErrorMessage("invalid_url")}</span>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {extractorState === "loading" && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/5 mb-4">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {language === "es" ? "Extrayendo guión..." : "Extracting script..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === "es" ? "Esto puede tomar unos segundos" : "This may take a few seconds"}
            </p>
          </div>
        )}

        {/* Error State */}
        {extractorState === "error" && extractorError && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive mb-1">
              {language === "es" ? "Error al extraer" : "Extraction error"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">{getErrorMessage(extractorError)}</p>
            <Button onClick={resetExtractor} variant="outline" size="sm" className="rounded-xl">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              {language === "es" ? "Intentar de nuevo" : "Try again"}
            </Button>
          </div>
        )}

        {/* Success State - Modal-like View with Tabs */}
        {extractorState === "success" && transcript && (
          <div className="flex flex-col lg:flex-row">
            {/* Left: Video Preview */}
            <div className="lg:w-72 bg-muted/30 p-4 border-r border-border/50 shrink-0">
              <div className="aspect-[9/16] max-h-[320px] bg-black rounded-xl overflow-hidden flex items-center justify-center mx-auto">
                <div className="text-center p-4">
                  <Play className="h-10 w-10 text-white/40 mx-auto mb-2" />
                  <p className="text-xs text-white/60">
                    {language === "es" ? "Vista previa no disponible" : "Preview not available"}
                  </p>
                </div>
              </div>
              <Button 
                onClick={resetExtractor} 
                variant="outline" 
                size="sm" 
                className="w-full mt-3 rounded-xl text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {language === "es" ? "Nuevo video" : "New video"}
              </Button>
            </div>

            {/* Right: Tabs Content */}
            <div className="flex-1 min-w-0">
              <Tabs value={activeExtractorTab} onValueChange={setActiveExtractorTab} className="h-full flex flex-col">
                <div className="px-4 pt-3 border-b border-border/50">
                  <TabsList className="h-9 bg-muted/50 p-1 rounded-lg">
                    <TabsTrigger value="script" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                      Script
                    </TabsTrigger>
                    <TabsTrigger value="analysis" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                      {language === "es" ? "Análisis" : "Analysis"}
                    </TabsTrigger>
                    <TabsTrigger value="variants" className="text-xs rounded-md px-3 data-[state=active]:bg-background">
                      Variantes IA
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  {/* Script Tab */}
                  <TabsContent value="script" className="h-full m-0 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium">{language === "es" ? "Transcripción" : "Transcript"}</h4>
                      <div className="flex items-center gap-1.5">
                        <Button onClick={handleDownloadScript} variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          {language === "es" ? "Descargar" : "Download"}
                        </Button>
                        <Button onClick={handleCopyTranscript} variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                          {transcriptCopied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                          {transcriptCopied ? (language === "es" ? "Copiado" : "Copied") : (language === "es" ? "Copiar" : "Copy")}
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="h-[280px] rounded-xl bg-muted/30 border border-border/50">
                      <div className="p-4">
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{transcript}</p>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Analysis Tab */}
                  <TabsContent value="analysis" className="h-full m-0 p-4">
                    <h4 className="text-sm font-medium mb-3">{language === "es" ? "Estructura del guión" : "Script structure"}</h4>
                    <ScrollArea className="h-[280px]">
                      {structuredScript && structuredScript.length > 0 ? (
                        <div className="space-y-2.5 pr-2">
                          {structuredScript.map((section: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/50 group">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-primary">
                                  {getSectionEmoji(section.type)} {section.label}
                                </span>
                                <Button 
                                  onClick={() => handleCopy(section.content)} 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {language === "es" ? "No se pudo analizar la estructura" : "Could not analyze structure"}
                        </p>
                      )}
                    </ScrollArea>
                  </TabsContent>

                  {/* Variants Tab */}
                  <TabsContent value="variants" className="h-full m-0 p-4">
                    {!variants ? (
                      <div className="text-center py-8">
                        <Sparkles className="h-10 w-10 text-primary/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          {language === "es" ? "Genera variantes del guión con IA" : "Generate script variants with AI"}
                        </p>
                        <Button 
                          onClick={handleGenerateVariants} 
                          disabled={isGeneratingVariants}
                          className="rounded-xl"
                        >
                          {isGeneratingVariants ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          {language === "es" ? "Generar Variantes IA" : "Generate AI Variants"}
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-3 pr-2">
                          {variants.map((variant: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-primary">
                                  Variante {idx + 1}
                                </span>
                                <Button 
                                  onClick={() => handleCopy(`${variant.hook}\n\n${variant.body}\n\n${variant.cta}`)} 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 px-2 text-xs"
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  {language === "es" ? "Copiar" : "Copy"}
                                </Button>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <span className="font-medium text-foreground">Hook:</span>
                                  <p className="text-muted-foreground mt-0.5">{variant.hook}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">Cuerpo:</span>
                                  <p className="text-muted-foreground mt-0.5 line-clamp-3">{variant.body}</p>
                                </div>
                                <div>
                                  <span className="font-medium text-foreground">CTA:</span>
                                  <p className="text-muted-foreground mt-0.5">{variant.cta}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </Card>

      {/* 2. Hook Generator - Compact */}
      <Card className="p-5 border-border/50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {language === "es" ? "Generador de Hooks IA" : "AI Hook Generator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Genera 5 hooks stop-scroller" : "Generate 5 stop-scroller hooks"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder={language === "es" 
              ? "Describe tu producto y el beneficio principal... Ej: Serum vitamina C que elimina manchas"
              : "Describe your product and main benefit..."}
            value={hookProductDesc}
            onChange={(e) => setHookProductDesc(e.target.value)}
            className="min-h-[56px] text-sm flex-1 resize-none rounded-xl"
          />
          <Button 
            onClick={handleGenerateHooks} 
            disabled={loadingHooks} 
            className="h-auto px-5 rounded-xl bg-amber-500 hover:bg-amber-600 shrink-0"
          >
            {loadingHooks ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1.5" />
                {language === "es" ? "Generar Hooks" : "Generate Hooks"}
              </>
            )}
          </Button>
        </div>

        {generatedHooks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-muted-foreground">
                {language === "es" ? `${generatedHooks.length} hooks generados` : `${generatedHooks.length} hooks generated`}
              </span>
              <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedHooks.join("\n\n"))} className="h-7 text-xs">
                <Copy className="h-3 w-3 mr-1.5" />
                {language === "es" ? "Copiar todos" : "Copy all"}
              </Button>
            </div>
            <div className="grid gap-2">
              {generatedHooks.map((hook, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/50 flex justify-between items-start gap-3 group">
                  <p className="text-sm flex-1">{hook}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCopy(hook, idx)} 
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 3. Script Generator - Visual Product Cards */}
      <Card className="p-5 border-border/50 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-purple-500/10">
            <PenTool className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {language === "es" ? "Generador de Guiones Potentes" : "Powerful Script Generator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Selecciona un producto y genera un guión completo" : "Select a product and generate a full script"}
            </p>
          </div>
        </div>

        {/* Product Selection Tabs */}
        <div className="mb-4">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setProductTab("popular")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                productTab === "popular" 
                  ? 'bg-primary text-white' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {language === "es" ? "Productos Populares" : "Popular Products"}
            </button>
            <button
              onClick={() => setProductTab("favorites")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                productTab === "favorites" 
                  ? 'bg-primary text-white' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <Heart className="h-3 w-3" />
              {language === "es" ? "Mis Favoritos" : "My Favorites"}
            </button>
          </div>

          {/* Products Grid */}
          {productTab === "popular" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {popularProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isSelected={selectedProduct?.id === product.id}
                  onClick={() => setSelectedProduct(product)}
                />
              ))}
            </div>
          )}

          {productTab === "favorites" && (
            <>
              {favoriteProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {favoriteProducts.map((fav) => (
                    <ProductCard
                      key={fav.product_id}
                      product={fav.product_data}
                      isSelected={selectedProduct?.id === fav.product_id}
                      onClick={() => setSelectedProduct(fav.product_data)}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                  <Heart className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {language === "es" 
                      ? "Agrega productos a favoritos para generar guiones personalizados" 
                      : "Add products to favorites to generate personalized scripts"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Benefits Input + Generate Button */}
        <div className="flex gap-2">
          <Input
            placeholder={language === "es" 
              ? "Beneficios adicionales (opcional)..."
              : "Additional benefits (optional)..."}
            value={additionalBenefits}
            onChange={(e) => setAdditionalBenefits(e.target.value)}
            className="h-11 rounded-xl flex-1"
          />
          <Button 
            onClick={handleGenerateScript} 
            disabled={loadingScript || !selectedProduct} 
            className="h-11 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 shrink-0"
          >
            {loadingScript ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-1.5" />
                {language === "es" ? "Generar Guión Personalizado" : "Generate Custom Script"}
              </>
            )}
          </Button>
        </div>

        {/* Generated Script Results */}
        {generatedScript && (
          <div className="mt-4 space-y-3">
            {/* Hook */}
            <div className="p-3 rounded-xl bg-red-50/50 border border-red-200/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-red-700">🎯 Hook Principal</span>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedScript.hook)} className="h-6 w-6 p-0">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-foreground">{generatedScript.hook}</p>
            </div>

            {/* Full Script */}
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-purple-700">📝 Guión Completo</span>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedScript.fullScript)} className="h-6 w-6 p-0">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{generatedScript.fullScript}</p>
            </div>

            {/* Alternative Hooks */}
            {generatedScript.alternativeHooks?.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {language === "es" ? "Hooks alternativos" : "Alternative hooks"}
                </span>
                {generatedScript.alternativeHooks.map((hook: string, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-muted/30 border border-border/50 flex justify-between items-start gap-2 group">
                    <p className="text-xs text-foreground/80">{hook}</p>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(hook)} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Tools;
