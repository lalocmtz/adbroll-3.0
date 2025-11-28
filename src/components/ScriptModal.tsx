import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Save } from "lucide-react";

interface ScriptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    descripcion_video: string;
    creador: string;
  };
}

const ScriptModal = ({ open, onOpenChange, video }: ScriptModalProps) => {
  const [customScript, setCustomScript] = useState("");

  // Mock scripts - en producción vendrán de la base de datos
  const originalScript = `Hola amigos, hoy les voy a mostrar este producto increíble que he estado usando...

[Esto es una transcripción generada automáticamente con Whisper API]

Pueden ver que los resultados son impresionantes y lo mejor de todo es que está en oferta.

No se pierdan esta oportunidad única.`;

  const aiScript = `¿Cansado de [problema]? Te presento la solución perfecta.

Este producto cambió completamente mi rutina y hoy quiero compartirlo contigo.

Mira estos resultados increíbles [mostrar producto].

Está en oferta especial solo por tiempo limitado. ¡No te quedes sin el tuyo!

Link en mi bio o búscalo en TikTok Shop.`;

  const handleSave = () => {
    // Aquí se guardará en la base de datos
    console.log("Saving custom script:", customScript);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Guiones del video</DialogTitle>
          <DialogDescription>
            {video.descripcion_video} • {video.creador}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="ai">IA Optimizado</TabsTrigger>
            <TabsTrigger value="custom">Mi Versión</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-foreground">
                Transcripción Original
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                {originalScript}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Transcrito automáticamente con Whisper API
            </p>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <h4 className="font-semibold mb-2 text-foreground">
                Guión Reescrito por IA
              </h4>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {aiScript}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Optimizado con GPT-4 Turbo para máxima conversión
            </p>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2 text-foreground">
                Tu Versión Personalizada
              </h4>
              <Textarea
                placeholder="Escribe aquí tu adaptación del guión..."
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                className="min-h-[300px] font-mono"
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Guardar mi versión
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ScriptModal;
