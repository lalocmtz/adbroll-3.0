import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, History, Sparkles, Copy } from "lucide-react";

interface ScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    transcripcion_original: string | null;
    guion_ia: string | null;
    descripcion_video: string;
  };
}

interface CustomScript {
  id: string;
  contenido: string;
  version_number: number;
  created_at: string;
}

const ScriptModal = ({ isOpen, onClose, video }: ScriptModalProps) => {
  const [savedScripts, setSavedScripts] = useState<CustomScript[]>([]);
  const [variantUrgencia, setVariantUrgencia] = useState("");
  const [variantEmocional, setVariantEmocional] = useState("");
  const [variantComercial, setVariantComercial] = useState("");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSavedScripts();
    }
  }, [isOpen, video.id]);

  const fetchSavedScripts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("guiones_personalizados")
        .select("*")
        .eq("video_id", video.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedScripts(data || []);
    } catch (error: any) {
      console.error("Error fetching saved scripts:", error);
    }
  };

  const handleGenerateVariant = async (variantType: 'urgencia' | 'emocional' | 'comercial') => {
    setIsGenerating(variantType);
    try {
      const originalScript = video.transcripcion_original || video.guion_ia;
      if (!originalScript) {
        toast({
          title: "No hay guión disponible",
          description: "No se puede generar variantes sin un guión original.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-script-variants', {
        body: {
          originalScript,
          videoTitle: video.descripcion_video,
          variantType
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Set the variant based on type
      if (variantType === 'urgencia') setVariantUrgencia(data.variant);
      if (variantType === 'emocional') setVariantEmocional(data.variant);
      if (variantType === 'comercial') setVariantComercial(data.variant);

      toast({
        title: "¡Variante generada!",
        description: `Variante ${variantType} creada con éxito.`,
      });
    } catch (error: any) {
      console.error("Error generating variant:", error);
      toast({
        title: "Error al generar variante",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "¡Copiado!",
        description: "Guión copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar al portapapeles.",
        variant: "destructive",
      });
    }
  };

  const handleSaveScript = async (content: string) => {
    if (!content.trim()) {
      toast({
        title: "No hay contenido",
        description: "Selecciona un guión para guardar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const nextVersion = savedScripts.length + 1;

      const { data: scriptData, error: scriptError } = await supabase
        .from("guiones_personalizados")
        .insert({
          video_id: video.id,
          user_id: user.id,
          contenido: content,
          version_number: nextVersion,
        })
        .select()
        .single();

      if (scriptError) throw scriptError;

      // Also save to favorites_scripts
      const { error: favError } = await supabase
        .from("favorites_scripts")
        .insert({
          user_id: user.id,
          script_id: scriptData.id,
          script_data: scriptData,
        });

      if (favError && favError.code !== '23505') { // Ignore unique constraint errors
        console.error("Error saving to favorites:", favError);
      }

      toast({
        title: "✓ Guardado en tus guiones",
        description: "El guión se agregó a tu colección.",
      });

      fetchSavedScripts();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatTranscript = (text: string) => {
    // Simple timestamp formatting - in real app, you'd get this from video metadata
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map((line, index) => {
      const seconds = index * 3; // Mock: 3 seconds per line
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      const timestamp = `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}]`;
      return `${timestamp} ${line}`;
    }).join('\n');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video.descripcion_video}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="transcripcion" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="transcripcion">Transcripción</TabsTrigger>
            <TabsTrigger value="ia-base">IA Base</TabsTrigger>
            <TabsTrigger value="variantes">Variantes</TabsTrigger>
            <TabsTrigger value="guardar">Guardar</TabsTrigger>
            <TabsTrigger value="guardados">Guardados</TabsTrigger>
          </TabsList>

          {/* TRANSCRIPCIÓN */}
          <TabsContent value="transcripcion" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {video.transcripcion_original 
                  ? formatTranscript(video.transcripcion_original)
                  : "Transcripción no disponible"}
              </pre>
            </div>
            {video.transcripcion_original && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopyToClipboard(formatTranscript(video.transcripcion_original!))}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            )}
          </TabsContent>

          {/* IA BASE */}
          <TabsContent value="ia-base" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {video.guion_ia || "Guión IA no disponible"}
              </pre>
            </div>
            <div className="flex gap-2">
              {video.guion_ia && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyToClipboard(video.guion_ia!)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => handleSaveScript(video.guion_ia!)}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* VARIANTES IA */}
          <TabsContent value="variantes" className="space-y-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button 
                onClick={() => handleGenerateVariant('urgencia')}
                disabled={isGenerating !== null}
                variant={variantUrgencia ? "secondary" : "default"}
                size="sm"
              >
                {isGenerating === 'urgencia' ? "Generando..." : "Variante Urgencia"}
              </Button>
              <Button 
                onClick={() => handleGenerateVariant('emocional')}
                disabled={isGenerating !== null}
                variant={variantEmocional ? "secondary" : "default"}
                size="sm"
              >
                {isGenerating === 'emocional' ? "Generando..." : "Variante Emocional"}
              </Button>
              <Button 
                onClick={() => handleGenerateVariant('comercial')}
                disabled={isGenerating !== null}
                variant={variantComercial ? "secondary" : "default"}
                size="sm"
              >
                {isGenerating === 'comercial' ? "Generando..." : "Variante Comercial"}
              </Button>
            </div>

            {!variantUrgencia && !variantEmocional && !variantComercial ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Genera variantes optimizadas con IA</p>
              </div>
            ) : (
              <div className="space-y-4">
                {variantUrgencia && (
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="destructive">Urgencia</Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyToClipboard(variantUrgencia)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSaveScript(variantUrgencia)}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {variantUrgencia}
                      </pre>
                    </div>
                  </div>
                )}

                {variantEmocional && (
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary">Emocional</Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyToClipboard(variantEmocional)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSaveScript(variantEmocional)}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {variantEmocional}
                      </pre>
                    </div>
                  </div>
                )}

                {variantComercial && (
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Badge>Comercial</Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleCopyToClipboard(variantComercial)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSaveScript(variantComercial)}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                        {variantComercial}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* GUARDAR (Quick save section) */}
          <TabsContent value="guardar" className="space-y-4">
            <div className="text-center py-8">
              <Save className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Usa los botones "Guardar" en las otras pestañas para guardar guiones
              </p>
              <p className="text-sm text-muted-foreground">
                Tus guiones guardados aparecerán en la pestaña "Guardados"
              </p>
            </div>
          </TabsContent>

          {/* GUARDADOS */}
          <TabsContent value="guardados" className="space-y-4">
            {savedScripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tienes guiones guardados aún</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedScripts.map((script) => (
                  <div key={script.id} className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm">
                        Guardado #{script.version_number}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(script.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                      {script.contenido}
                    </pre>
                    <div className="mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCopyToClipboard(script.contenido)}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptModal;
