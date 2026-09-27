import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export default function CreatorPresentationUploader() {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "video/mp4" || file.size > 50 * 1024 * 1024) {
      toast({ title: "Usa un MP4 de hasta 50 MB", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.storage.from("assets").upload("creator-program/presentation.mp4", file, { upsert: true, contentType: "video/mp4", cacheControl: "60" });
      if (error) throw error;
      toast({ title: "Presentación actualizada", description: "Tu video aparecerá en la landing del programa. La actualización puede tardar un minuto." });
      event.target.value = "";
    } catch (error) { toast({ title: "No se pudo subir el video", description: error instanceof Error ? error.message : "Revisa tus permisos de administrador.", variant: "destructive" }); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Tu presentación para creadores</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">Sube aquí el video que explica la oportunidad. Reemplaza la presentación actual de la landing.</p><Label htmlFor="creator-presentation">Video MP4, hasta 50 MB</Label><Input id="creator-presentation" type="file" accept="video/mp4" onChange={upload} disabled={busy} />{busy && <p role="status">Subiendo presentación…</p>}<a href="/programa-creadores" target="_blank" rel="noreferrer" className="inline-block text-primary underline">Ver landing de creadores</a></CardContent></Card>;
}
