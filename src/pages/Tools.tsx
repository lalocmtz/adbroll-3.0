import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Wrench, FileText, Sparkles, Copy, Loader2 } from "lucide-react";

const Tools = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState("");

  const handleExtract = async () => {
    if (!videoUrl.trim()) {
      toast({
        title: "Error",
        description: language === "es" ? "Ingresa una URL de TikTok" : "Enter a TikTok URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Simulate extraction - in real implementation this would call the transcription API
    setTimeout(() => {
      setTranscript(
        language === "es"
          ? "Este es un ejemplo de guión extraído. La funcionalidad completa de extracción de guiones estará disponible próximamente."
          : "This is an example extracted script. Full script extraction functionality coming soon."
      );
      setLoading(false);
      toast({
        title: language === "es" ? "Guión extraído" : "Script extracted",
        description: language === "es" ? "El guión ha sido procesado" : "The script has been processed",
      });
    }, 2000);
  };

  const handleCopy = async () => {
    if (transcript) {
      await navigator.clipboard.writeText(transcript);
      toast({
        title: language === "es" ? "Copiado" : "Copied",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {language === "es" ? "Herramientas" : "Tools"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {language === "es"
            ? "Herramientas de análisis y extracción para creadores"
            : "Analysis and extraction tools for creators"}
        </p>
      </div>

      {/* Script Extractor Tool */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/10">
            <FileText className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              {language === "es" ? "Extractor de Guiones" : "Script Extractor"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === "es"
                ? "Extrae el guión de cualquier video de TikTok"
                : "Extract the script from any TikTok video"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {language === "es" ? "URL del video de TikTok" : "TikTok Video URL"}
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.tiktok.com/@user/video/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleExtract} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {language === "es" ? "Extraer" : "Extract"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {transcript && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {language === "es" ? "Guión extraído" : "Extracted Script"}
                </label>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {language === "es" ? "Copiar" : "Copy"}
                </Button>
              </div>
              <Textarea
                value={transcript}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}
        </div>
      </Card>

      {/* More tools coming soon */}
      <div className="mt-6 p-6 rounded-xl border border-dashed border-border text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          {language === "es"
            ? "Más herramientas próximamente..."
            : "More tools coming soon..."}
        </p>
      </div>
    </div>
  );
};

export default Tools;
