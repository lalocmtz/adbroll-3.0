import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Sparkles, Copy, Loader2, Zap, PenTool, Check } from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  producto_nombre: string;
  categoria: string | null;
  precio_mxn: number | null;
  commission: number | null;
}

const Tools = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  
  // Script Extractor State
  const [videoUrl, setVideoUrl] = useState("");
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [structuredScript, setStructuredScript] = useState<any>(null);
  
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

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: language === "es" ? "Ingresa una URL de TikTok" : "Enter a TikTok URL",
        variant: "destructive",
      });
      return;
    }

    setLoadingExtract(true);
    setTranscript("");
    setStructuredScript(null);

    try {
      // Call transcribe-assemblyai
      const { data, error } = await supabase.functions.invoke("transcribe-assemblyai", {
        body: { videoUrl }
      });

      if (error) throw error;

      if (data?.transcript) {
        setTranscript(data.transcript);
        
        // Now analyze the script structure
        const { data: analysisData } = await supabase.functions.invoke("analyze-script-sections", {
          body: { script: data.transcript, videoTitle: "Video de TikTok" }
        });

        if (analysisData?.sections) {
          setStructuredScript(analysisData.sections);
        }

        toast({
          title: language === "es" ? "✓ Guión extraído" : "✓ Script extracted",
        });
      }
    } catch (err: any) {
      console.error("Extract error:", err);
      toast({
        title: "Error",
        description: err.message || "Error al extraer el guión",
        variant: "destructive",
      });
    } finally {
      setLoadingExtract(false);
    }
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

      {/* 1. Script Extractor Tool */}
      <Card className="p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-md bg-accent/10">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">
              {language === "es" ? "Extractor de Guiones" : "Script Extractor"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {language === "es"
                ? "Extrae y analiza el guión de cualquier video de TikTok"
                : "Extract and analyze the script from any TikTok video"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.tiktok.com/@user/video/..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="flex-1 h-9 text-sm"
            />
            <Button onClick={handleExtract} disabled={loadingExtract} className="h-9 text-sm">
              {loadingExtract ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  {language === "es" ? "Extraer" : "Extract"}
                </>
              )}
            </Button>
          </div>

          {transcript && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  {language === "es" ? "Transcripción" : "Transcript"}
                </label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(transcript)} className="h-7 text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {language === "es" ? "Copiar" : "Copy"}
                </Button>
              </div>
              <Textarea value={transcript} readOnly className="min-h-[100px] font-mono text-xs" />

              {structuredScript && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">
                    {language === "es" ? "Estructura del guión" : "Script structure"}
                  </label>
                  {structuredScript.map((section: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-medium">
                          {getSectionEmoji(section.type)} {section.label}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => handleCopy(section.content)} className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

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
