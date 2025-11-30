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
  const [customScript, setCustomScript] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedVersions, setSavedVersions] = useState<CustomScript[]>([]);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSavedVersions();
    }
  }, [isOpen, video.id]);

  const fetchSavedVersions = async () => {
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
      setSavedVersions(data || []);
    } catch (error: any) {
      console.error("Error fetching saved versions:", error);
    }
  };

  const handleGenerateVariants = async (numVariants: number) => {
    setIsGenerating(true);
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
          numVariants
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setAiVariants(data.variants);
      
      // Save to database
      const { error: updateError } = await supabase
        .from("daily_feed")
        .update({
          ai_variants: data.variants,
          generated_at: data.generated_at
        })
        .eq("id", video.id);

      if (updateError) throw updateError;

      toast({
        title: "¡Variantes generadas!",
        description: `Se generaron ${data.variants.length} variante(s) con IA.`,
      });
    } catch (error: any) {
      console.error("Error generating variants:", error);
      toast({
        title: "Error al generar variantes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
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

  const handleSave = async () => {
    if (!customScript.trim()) {
      toast({
        title: "Campo vacío",
        description: "Escribe tu guión personalizado antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const nextVersion = savedVersions.length + 1;

      const { error } = await supabase
        .from("guiones_personalizados")
        .insert({
          video_id: video.id,
          user_id: user.id,
          contenido: customScript,
          version_number: nextVersion,
        });

      if (error) throw error;

      toast({
        title: "¡Guión guardado!",
        description: `Versión ${nextVersion} guardada exitosamente.`,
      });

      setCustomScript("");
      fetchSavedVersions();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{video.descripcion_video}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="original" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="original">📝 Original</TabsTrigger>
            <TabsTrigger value="ia">✨ IA Base</TabsTrigger>
            <TabsTrigger value="variantes">
              <Sparkles className="h-4 w-4 mr-1" />
              Variantes IA
            </TabsTrigger>
            <TabsTrigger value="personalizado">✍️ Tuyo</TabsTrigger>
            <TabsTrigger value="historial">
              <History className="h-4 w-4 mr-1" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {video.transcripcion_original || "No disponible"}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="ia" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {video.guion_ia || "No disponible"}
              </pre>
            </div>
            {video.guion_ia && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopyToClipboard(video.guion_ia!)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            )}
          </TabsContent>

          <TabsContent value="variantes" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button 
                onClick={() => handleGenerateVariants(1)}
                disabled={isGenerating}
                variant="default"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generando..." : "Generar 1 Variante"}
              </Button>
              <Button 
                onClick={() => handleGenerateVariants(3)}
                disabled={isGenerating}
                variant="secondary"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGenerating ? "Generando..." : "Generar 3 Variantes"}
              </Button>
            </div>

            {aiVariants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Haz clic en el botón de arriba para generar variantes con IA</p>
              </div>
            ) : (
              <div className="space-y-4">
                {aiVariants.map((variant, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Badge variant="secondary">
                        Variante {index + 1}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleCopyToClipboard(variant)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap font-mono text-sm">
                        {variant}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="personalizado" className="space-y-4">
            <Textarea
              placeholder="Adapta el guión a tu producto..."
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              className="min-h-[300px] font-mono"
            />
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar Nueva Versión"}
            </Button>
          </TabsContent>

          <TabsContent value="historial" className="space-y-4">
            {savedVersions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aún no tienes versiones guardadas
              </p>
            ) : (
              <div className="space-y-4">
                {savedVersions.map((version) => (
                  <div key={version.id} className="bg-muted p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">
                        Versión {version.version_number}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-sm">
                      {version.contenido}
                    </pre>
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
