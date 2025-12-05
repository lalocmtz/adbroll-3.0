import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Copy, Loader2, Zap, PenTool, Check, AlertCircle, CheckCircle2, Link2, RotateCcw } from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  producto_nombre: string;
  categoria: string | null;
  precio_mxn: number | null;
  commission: number | null;
}

// Validate TikTok URL
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

const Tools = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Script Extractor State
  const [videoUrl, setVideoUrl] = useState("");
  const [extractorState, setExtractorState] = useState<ExtractorState>("idle");
  const [extractorError, setExtractorError] = useState<ExtractorError>(null);
  const [transcript, setTranscript] = useState("");
  const [structuredScript, setStructuredScript] = useState<any>(null);
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  
  // Hook Generator State
  const [hookProductDesc, setHookProductDesc] = useState("");
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  
  // Script Generator State
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [additionalBenefits, setAdditionalBenefits] = useState("");
  const [loadingScript, setLoadingScript] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<any>(null);
  
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, producto_nombre, categoria, precio_mxn, commission")
      .order("producto_nombre");
    if (data) setProducts(data);
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
    // Reset states
    setExtractorError(null);
    setTranscript("");
    setStructuredScript(null);

    // Validate URL
    if (!videoUrl.trim() || !isValidTikTokUrl(videoUrl)) {
      setExtractorError("invalid_url");
      return;
    }

    setExtractorState("loading");

    try {
      // Call transcribe-assemblyai
      const { data, error } = await supabase.functions.invoke("transcribe-assemblyai", {
        body: { videoUrl }
      });

      if (error) throw error;

      if (data?.transcript && data.transcript.trim().length > 0) {
        setTranscript(data.transcript);
        
        // Now analyze the script structure
        const { data: analysisData } = await supabase.functions.invoke("analyze-script-sections", {
          body: { script: data.transcript, videoTitle: "Video de TikTok" }
        });

        if (analysisData?.sections) {
          setStructuredScript(analysisData.sections);
        }

        setExtractorState("success");
        toast({
          title: language === "es" ? "✓ Guión extraído" : "✓ Script extracted",
        });
      } else {
        // Empty transcript
        setExtractorState("error");
        setExtractorError("no_transcript");
      }
    } catch (err: any) {
      console.error("Extract error:", err);
      setExtractorState("error");
      setExtractorError("api_error");
    }
  };

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(transcript);
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2000);
    toast({ title: language === "es" ? "✓ Copiado al portapapeles" : "✓ Copied to clipboard" });
  };

  const resetExtractor = () => {
    setVideoUrl("");
    setExtractorState("idle");
    setExtractorError(null);
    setTranscript("");
    setStructuredScript(null);
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
        toast({ title: language === "es" ? "✓ 10 hooks generados" : "✓ 10 hooks generated" });
      }
    } catch (err: any) {
      console.error("Hook generation error:", err);
      toast({
        title: "Error",
        description: err.message || "Error al generar hooks",
        variant: "destructive",
      });
    } finally {
      setLoadingHooks(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!selectedProductId) {
      toast({
        title: "Error",
        description: language === "es" ? "Selecciona un producto" : "Select a product",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    setLoadingScript(true);
    setGeneratedScript(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-full-script", {
        body: { 
          product: {
            name: product.producto_nombre,
            category: product.categoria,
            price: product.precio_mxn,
            commission: product.commission
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
      toast({
        title: "Error",
        description: err.message || "Error al generar guión",
        variant: "destructive",
      });
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

  return (
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-4xl space-y-6">
      <DataSubtitle />

      {/* 1. Script Extractor Tool - Premium Hero Section */}
      <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-border/50 overflow-hidden">
        {/* Idle State - Hero Input */}
        {extractorState === "idle" && (
          <div className="px-6 py-10 md:px-10 md:py-14 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#ED4C84]/10 mb-5">
              <FileText className="h-8 w-8 text-[#ED4C84]" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              {language === "es" ? "Extractor de Guiones" : "Script Extractor"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              {language === "es"
                ? "Pega un link de TikTok y extrae el guión en segundos."
                : "Paste a TikTok link and extract the script in seconds."}
            </p>
            
            <div className="max-w-xl mx-auto space-y-4">
              {/* Modern Input with Icon */}
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Link2 className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <Input
                  placeholder={language === "es" ? "Pega aquí un enlace de TikTok..." : "Paste a TikTok link here..."}
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value);
                    setExtractorError(null);
                  }}
                  className="h-14 text-base pl-12 pr-4 rounded-xl border-2 border-border/60 focus:border-[#ED4C84] focus:ring-[#ED4C84]/20 placeholder:text-muted-foreground/50 transition-all"
                />
              </div>
              
              {/* Error Banner */}
              {extractorError === "invalid_url" && (
                <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{getErrorMessage("invalid_url")}</span>
                </div>
              )}
              
              {/* Primary CTA Button */}
              <button 
                onClick={handleExtract} 
                className="w-full h-14 text-base font-semibold text-white bg-[#ED4C84] hover:bg-[#d93d73] rounded-xl transition-all duration-200 shadow-[0_4px_14px_rgba(237,76,132,0.35)] hover:shadow-[0_6px_20px_rgba(237,76,132,0.45)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <FileText className="h-5 w-5" />
                {language === "es" ? "Extraer Guión" : "Extract Script"}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {extractorState === "loading" && (
          <div className="px-6 py-16 md:py-20 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ED4C84]/5 mb-6">
              <div className="w-12 h-12 rounded-full border-3 border-[#ED4C84]/20 border-t-[#ED4C84] animate-spin" />
            </div>
            <p className="text-lg font-medium text-foreground">
              {language === "es" ? "Extrayendo guión..." : "Extracting script..."}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {language === "es" ? "Esto puede tomar unos segundos." : "This may take a few seconds."}
            </p>
          </div>
        )}

        {/* Error State */}
        {extractorState === "error" && extractorError && (
          <div className="px-6 py-14 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-5">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-lg font-medium text-red-600 mb-2">
              {language === "es" ? "Error al extraer" : "Extraction error"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {getErrorMessage(extractorError)}
            </p>
            <button 
              onClick={resetExtractor} 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-border hover:border-[#ED4C84] text-sm font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {language === "es" ? "Intentar de nuevo" : "Try again"}
            </button>
          </div>
        )}

        {/* Success State - Result Panel */}
        {extractorState === "success" && transcript && (
          <div className="p-6 md:p-8">
            {/* Header with success indicator */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {language === "es" ? "Transcripción extraída" : "Transcript extracted"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyTranscript}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F7F7F7] hover:bg-[#EEEEEE] text-sm font-medium transition-colors"
                >
                  {transcriptCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                  {transcriptCopied 
                    ? (language === "es" ? "Copiado" : "Copied")
                    : (language === "es" ? "Copiar" : "Copy")
                  }
                </button>
                <button 
                  onClick={resetExtractor}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-[#F7F7F7] text-sm font-medium text-muted-foreground transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  {language === "es" ? "Nuevo" : "New"}
                </button>
              </div>
            </div>
            
            {/* Transcript Content Box */}
            <div className="bg-[#F7F7F7] rounded-xl border border-border/30 overflow-hidden">
              <ScrollArea className="h-[220px] md:h-[280px]">
                <div className="p-5">
                  <p className="text-sm leading-7 text-foreground whitespace-pre-wrap">
                    {transcript}
                  </p>
                </div>
              </ScrollArea>
            </div>

            {/* Structured Script Sections */}
            {structuredScript && structuredScript.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {language === "es" ? "Estructura del guión" : "Script structure"}
                </h4>
                <div className="grid gap-3">
                  {structuredScript.map((section: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl bg-white border border-border/60 hover:border-[#ED4C84]/40 transition-colors group">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-sm font-semibold text-[#ED4C84]">
                          {getSectionEmoji(section.type)} {section.label}
                        </span>
                        <button 
                          onClick={() => handleCopy(section.content)} 
                          className="p-1.5 rounded-lg hover:bg-[#F7F7F7] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                      <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Hook Generator */}
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-md bg-yellow-500/10">
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {language === "es" ? "Generador de Hooks con IA" : "AI Hook Generator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es"
                ? "Genera 10 hooks stop-scroller para TikTok Shop"
                : "Generate 10 stop-scroller hooks for TikTok Shop"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Textarea
            placeholder={language === "es" 
              ? "¿Qué producto vendes y qué beneficio principal quieres destacar?\n\nEj: Vendo un serum de vitamina C que elimina manchas en 2 semanas..."
              : "What product do you sell and what main benefit do you want to highlight?"}
            value={hookProductDesc}
            onChange={(e) => setHookProductDesc(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <Button onClick={handleGenerateHooks} disabled={loadingHooks} className="w-full h-9">
            {loadingHooks ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1.5" />
                {language === "es" ? "Generar 10 Hooks" : "Generate 10 Hooks"}
              </>
            )}
          </Button>

          {generatedHooks.length > 0 && (
            <div className="space-y-2 mt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium">
                  {language === "es" ? "Hooks generados" : "Generated hooks"}
                </label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleCopy(generatedHooks.join("\n\n"))} 
                  className="h-7 text-xs"
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {language === "es" ? "Copiar todos" : "Copy all"}
                </Button>
              </div>
              {generatedHooks.map((hook, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200/50 dark:border-yellow-900/30">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm flex-1">{hook}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleCopy(hook, idx)} 
                      className="h-7 w-7 p-0 shrink-0"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* 3. Script Generator */}
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-md bg-purple-500/10">
            <PenTool className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {language === "es" ? "Generador de Guiones Potentes" : "Powerful Script Generator"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es"
                ? "Crea un guión completo optimizado para TikTok Shop"
                : "Create a complete script optimized for TikTok Shop"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              {language === "es" ? "Selecciona producto" : "Select product"}
            </label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={language === "es" ? "Elige un producto..." : "Choose a product..."} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.producto_nombre} {p.precio_mxn ? `- $${p.precio_mxn}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1.5 block">
              {language === "es" ? "Beneficios adicionales (opcional)" : "Additional benefits (optional)"}
            </label>
            <Textarea
              placeholder={language === "es" 
                ? "Escribe beneficios o diferenciadores adicionales del producto..."
                : "Write additional benefits or differentiators..."}
              value={additionalBenefits}
              onChange={(e) => setAdditionalBenefits(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>

          <Button onClick={handleGenerateScript} disabled={loadingScript} className="w-full h-9">
            {loadingScript ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <PenTool className="h-4 w-4 mr-1.5" />
                {language === "es" ? "Generar Guión Completo" : "Generate Full Script"}
              </>
            )}
          </Button>

          {generatedScript && (
            <div className="space-y-3 mt-4">
              {/* Main Hook */}
              <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-red-700 dark:text-red-400">🎯 Hook Principal</span>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedScript.hook)} className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm mt-1">{generatedScript.hook}</p>
              </div>

              {/* Full Script */}
              <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">📝 Guión Completo</span>
                  <Button variant="ghost" size="sm" onClick={() => handleCopy(generatedScript.fullScript)} className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{generatedScript.fullScript}</p>
              </div>

              {/* Alternative Hooks */}
              {generatedScript.alternativeHooks?.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    {language === "es" ? "Hooks alternativos" : "Alternative hooks"}
                  </label>
                  {generatedScript.alternativeHooks.map((hook: string, idx: number) => (
                    <div key={idx} className="p-2 rounded-lg bg-muted/50 border flex justify-between items-start gap-2">
                      <p className="text-xs">{hook}</p>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(hook)} className="h-6 w-6 p-0 shrink-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tools;
