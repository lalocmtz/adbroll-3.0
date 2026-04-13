import { useState, useEffect } from "react";
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

  const generateGrantCode = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      // Generate code using database function
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_grant_code");

      if (codeError) throw codeError;

      // Update application with code
      const { error } = await supabase
        .from("creator_program_applications")
        .update({ grant_code: codeData })
        .eq("id", applicationId);

      if (error) throw error;

      toast({
        title: "Código generado",
        description: `Código: ${codeData}`,
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const approveApplication = async (application: Application) => {
    setProcessingId(application.id);
    try {
      // Generate code if not exists
      let grantCode = application.grant_code;
      if (!grantCode) {
        const { data: codeData, error: codeError } = await supabase
          .rpc("generate_grant_code");
        if (codeError) throw codeError;
        grantCode = codeData;
      }

      // Update application
      const { error } = await supabase
        .from("creator_program_applications")
        .update({
          status: "approved",
          grant_code: grantCode,
          approved_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) throw error;

      // Send email with grant code
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: application.email,
            template: "creator_grant_approved",
            templateData: {
              name: application.full_name,
              grantCode: grantCode,
              days: application.granted_days || 30,
            },
          },
        });
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      toast({
        title: "Solicitud aprobada",
        description: `Se envió el código ${grantCode} a ${application.email}`,
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const rejectApplication = async (applicationId: string) => {
    setProcessingId(applicationId);
    try {
      const { error } = await supabase
        .from("creator_program_applications")
        .update({ status: "rejected" })
        .eq("id", applicationId);

      if (error) throw error;

      toast({
        title: "Solicitud rechazada",
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Programa de Creadores
              </CardTitle>
              <CardDescription>
                Gestiona las solicitudes del programa
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
                  <TableHead>Video</TableHead>
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
                      {app.video_url ? (
                        <a
                          href={app.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Ver video
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateGrantCode(app.id)}
                          disabled={processingId === app.id}
                        >
                          {processingId === app.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Generar"
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
                            onClick={() => approveApplication(app)}
                            disabled={processingId === app.id}
                          >
                            {processingId === app.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprobar
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectApplication(app.id)}
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
