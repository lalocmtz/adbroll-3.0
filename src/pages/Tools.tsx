import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Sparkles, Copy, Loader2 } from "lucide-react";
import { DataSubtitle } from "@/components/FilterPills";

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
    <div className="pt-5 pb-6 px-4 md:px-6 max-w-4xl">
      <DataSubtitle />

      {/* Script Extractor Tool */}
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
                ? "Extrae el guión de cualquier video de TikTok"
                : "Extract the script from any TikTok video"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block">
              {language === "es" ? "URL del video de TikTok" : "TikTok Video URL"}
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.tiktok.com/@user/video/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="flex-1 h-9 text-sm"
              />
              <Button onClick={handleExtract} disabled={loading} className="h-9 text-sm">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    {language === "es" ? "Extraer" : "Extract"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {transcript && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  {language === "es" ? "Guión extraído" : "Extracted Script"}
                </label>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  {language === "es" ? "Copiar" : "Copy"}
                </Button>
              </div>
              <Textarea
                value={transcript}
                readOnly
                className="min-h-[160px] font-mono text-xs"
              />
            </div>
          )}
        </div>
      </Card>

      {/* More tools coming soon */}
      <div className="mt-4 p-4 rounded-lg border border-dashed border-border text-center">
        <Sparkles className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
        <p className="text-xs text-muted-foreground">
          {language === "es"
            ? "Más herramientas próximamente..."
            : "More tools coming soon..."}
        </p>
      </div>
    </div>
  );
};

export default Tools;
