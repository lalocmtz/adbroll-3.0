import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, History } from "lucide-react";

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="original">📝 Original</TabsTrigger>
            <TabsTrigger value="ia">✨ IA</TabsTrigger>
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
