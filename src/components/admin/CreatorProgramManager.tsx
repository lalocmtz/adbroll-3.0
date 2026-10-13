import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, CheckCircle, XCircle, Clock, ExternalLink, Copy, RefreshCw, 
  Loader2, Send, Eye
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Application {
  id: string;
  email: string;
  full_name: string;
  whatsapp: string | null;
  tiktok_url: string;
  video_url: string | null;
  status: string;
  grant_code: string | null;
  granted_days: number;
  access_kind: string;
  video_urls: string[];
  ad_permission_at: string | null;
  ad_license_ends_at: string | null;
  ad_license_months: number | null;
  created_at: string;
  approved_at: string | null;
  subscription_ends_at: string | null;
}

const CreatorProgramManager = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();
  const [previewEmail, setPreviewEmail] = useState("");
  const [previewDays, setPreviewDays] = useState(7);
  const [grantingPreview, setGrantingPreview] = useState(false);

  const grantPreview = async (event: React.FormEvent) => {
    event.preventDefault();
    setGrantingPreview(true);
    try {
      const { error } = await supabase.rpc("grant_creator_preview", { p_email: previewEmail.trim(), p_days: previewDays });
      if (error) throw error;
      toast({ title: "Prueba activada", description: `El creador ya puede entrar durante ${previewDays} días para preparar sus videos. No se generan cargos.` });
      setPreviewEmail("");
      await fetchApplications();
    } catch (error: any) {
      toast({ title: "No se pudo activar la prueba", description: error.message, variant: "destructive" });
    } finally { setGrantingPreview(false); }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("creator_program_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const reviewApplication = async (application: Application, approve: boolean) => {
    setProcessingId(application.id);
    try {
      const { error } = await supabase.rpc("review_creator_lifetime_application", {
        p_application_id: application.id, p_approve: approve,
      });
      if (error) throw error;
      toast({ title: approve ? "Acceso vitalicio activado" : "Entrega devuelta para ajustes",
        description: approve ? "El creador ya puede entrar con su cuenta. Su estado y código están disponibles en la plataforma." : "El creador puede corregir y reenviar su entrega." });
      await fetchApplications();
    } catch (error: any) {
      toast({ title: "No se pudo revisar", description: error.message, variant: "destructive" });
    } finally { setProcessingId(null); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado al portapapeles" });
  };

  const statusCounts = {
    pending_video: applications.filter(a => a.status === "pending_video").length,
    pending_review: applications.filter(a => a.status === "pending_review").length,
    approved: applications.filter(a => a.status === "approved").length,
    active: applications.filter(a => a.status === "active").length,
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      pending_video: { label: "⏳ Esperando video", variant: "outline" },
      pending_review: { label: "🔍 En revisión", variant: "secondary" },
      approved: { label: "✅ Aprobado", variant: "default" },
      active: { label: "🎉 Activo", variant: "default" },
      rejected: { label: "❌ Rechazado", variant: "destructive" },
    };
    const config = configs[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card><CardHeader><CardTitle>Invitar a un creador a probar TokXray</CardTitle><CardDescription>Primero debe crear y verificar su cuenta. Activa una prueba para que grabe; el acceso vitalicio se aprueba después de recibir los tres videos y el permiso de pauta.</CardDescription></CardHeader>
        <CardContent><form onSubmit={grantPreview} className="flex flex-col sm:flex-row gap-3 items-end">
          <label className="text-sm space-y-1 flex-1 w-full">Correo de su cuenta<Input aria-label="Correo del creador invitado" type="email" required value={previewEmail} onChange={e => setPreviewEmail(e.target.value)} placeholder="creador@ejemplo.com" /></label>
          <label className="text-sm space-y-1 w-full sm:w-28">Días de prueba<Input aria-label="Días de prueba" type="number" min={1} max={30} required value={previewDays} onChange={e => setPreviewDays(Number(e.target.value))} /></label>
          <Button type="submit" disabled={grantingPreview} className="w-full sm:w-auto">{grantingPreview ? "Activando…" : "Activar prueba"}</Button>
        </form></CardContent></Card>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter("pending_video")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Esperando video</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.pending_video}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter("pending_review")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">En revisión</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.pending_review}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter("approved")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Aprobados</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.approved}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setFilter("active")}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Activos</span>
            </div>
            <p className="text-2xl font-bold">{statusCounts.active}</p>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Programa de Creadores
              </CardTitle>
              <CardDescription>
                Revisa los tres videos y la autorización de pauta; al aprobar se activa acceso vitalicio en la cuenta verificada. Aprobar no cancela una suscripción de pago existente: el creador debe <Link to="/settings" className="underline text-primary">cancelar la renovación desde Configuración</Link> para evitar cargos futuros.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending_video">Esperando video</SelectItem>
                  <SelectItem value="pending_review">En revisión</SelectItem>
                  <SelectItem value="approved">Aprobados</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchApplications}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay solicitudes {filter !== "all" ? `con estado "${filter}"` : ""}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creador</TableHead>
                  <TableHead>TikTok</TableHead>
                  <TableHead>Videos y permiso de pauta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{app.full_name}</p>
                        <p className="text-xs text-muted-foreground">{app.email}</p>
                        {app.whatsapp && (
                          <p className="text-xs text-green-600">{app.whatsapp}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={app.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Ver perfil
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2 min-w-40">
                        {(app.video_urls?.length ? app.video_urls : app.video_url ? [app.video_url] : []).map((url, index) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">Video {index + 1}<ExternalLink className="h-3 w-3" /></a>
                        ))}
                        <p className="text-xs text-muted-foreground">{app.ad_permission_at ? `Permiso 12 meses aceptado: ${format(new Date(app.ad_permission_at), "dd MMM yyyy", { locale: es })}` : "Falta autorización de pauta"}</p>
                        {app.ad_license_ends_at && <p className="text-xs text-muted-foreground">Pauta hasta {format(new Date(app.ad_license_ends_at), "dd MMM yyyy", { locale: es })}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(app.status)}</TableCell>
                    <TableCell>
                      {app.grant_code ? (
                        <button
                          onClick={() => copyToClipboard(app.grant_code!)}
                          className="font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 flex items-center gap-1"
                        >
                          {app.grant_code}
                          <Copy className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Se crea al aprobar</span>
                      )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(app.created_at), "dd MMM", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === "pending_review" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => reviewApplication(app, true)}
                            disabled={processingId === app.id || app.video_urls?.length !== 3 || !app.ad_permission_at}
                            title="Revisa tres videos originales publicados y permiso de pauta antes de activar"
                          >
                            {processingId === app.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activar vitalicio
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => reviewApplication(app, false)}
                            disabled={processingId === app.id}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {app.status === "approved" && !app.subscription_ends_at && (
                        <span className="text-xs text-muted-foreground">
                          Pendiente de canje
                        </span>
                      )}
                      {app.status === "active" && app.access_kind === "lifetime" && <Badge>Vitalicio</Badge>}
                      {app.status === "active" && app.subscription_ends_at && (
                        <span className="text-xs text-muted-foreground">
                          Hasta {format(new Date(app.subscription_ends_at), "dd MMM yyyy", { locale: es })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorProgramManager;
