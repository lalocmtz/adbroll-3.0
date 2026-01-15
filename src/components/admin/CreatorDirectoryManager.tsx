import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RefreshCw, CheckCircle2, XCircle, Clock, Eye, EyeOff, Users, UserCheck, UserX, Shield } from "lucide-react";
import { format } from "date-fns";

interface DirectoryCreator {
  id: string;
  full_name: string;
  tiktok_username: string;
  avatar_url: string | null;
  email: string;
  whatsapp: string;
  country: string;
  niche: string[];
  content_type: string[];
  tiktok_url: string | null;
  status: string;
  verified: boolean;
  created_at: string;
}

const CreatorDirectoryManager = () => {
  const { toast } = useToast();
  const [creators, setCreators] = useState<DirectoryCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCreators();
  }, [filter]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("creator_directory")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCreators((data as DirectoryCreator[]) || []);
    } catch (error: any) {
      toast({
        title: "Error al cargar creadores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("creator_directory")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );

      toast({
        title: "✓ Estado actualizado",
        description: `Creador movido a "${newStatus}"`,
      });
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

  const toggleVerified = async (id: string, currentValue: boolean) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("creator_directory")
        .update({ verified: !currentValue })
        .eq("id", id);

      if (error) throw error;

      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, verified: !currentValue } : c))
      );

      toast({
        title: !currentValue ? "✓ Creador verificado" : "Verificación removida",
      });
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aplicado":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Aplicado
          </Badge>
        );
      case "publico":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Eye className="h-3 w-3 mr-1" />
            Público
          </Badge>
        );
      case "circulo_interno":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Shield className="h-3 w-3 mr-1" />
            Círculo Interno
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = (creator: DirectoryCreator): string => {
    if (creator.avatar_url) return creator.avatar_url;
    const name = encodeURIComponent(creator.full_name);
    return `https://ui-avatars.com/api/?name=${name}&background=F31260&color=fff&bold=true&size=64&format=svg`;
  };

  // Count by status
  const statusCounts = {
    all: creators.length,
    aplicado: creators.filter((c) => c.status === "aplicado").length,
    publico: creators.filter((c) => c.status === "publico").length,
    circulo_interno: creators.filter((c) => c.status === "circulo_interno").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.all}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.aplicado}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.publico}</p>
                <p className="text-xs text-muted-foreground">Públicos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statusCounts.circulo_interno}</p>
                <p className="text-xs text-muted-foreground">Círculo Int.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Directorio de Creadores</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({statusCounts.all})</SelectItem>
                <SelectItem value="aplicado">Aplicado ({statusCounts.aplicado})</SelectItem>
                <SelectItem value="publico">Público ({statusCounts.publico})</SelectItem>
                <SelectItem value="circulo_interno">Círculo Int. ({statusCounts.circulo_interno})</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchCreators} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : creators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay creadores con este filtro
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creador</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creators.map((creator) => (
                  <TableRow key={creator.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={getAvatarUrl(creator)} alt={creator.full_name} />
                          <AvatarFallback>{getInitials(creator.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{creator.full_name}</p>
                          <p className="text-xs text-muted-foreground">@{creator.tiktok_username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {creator.niche.slice(0, 2).map((n) => (
                          <Badge key={n} variant="secondary" className="text-[10px]">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(creator.status)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={creator.verified}
                        onCheckedChange={() => toggleVerified(creator.id, creator.verified)}
                        disabled={processingId === creator.id}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(creator.created_at), "dd/MM/yy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {creator.status === "aplicado" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateStatus(creator.id, "publico")}
                              disabled={processingId === creator.id}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Publicar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(creator.id, "circulo_interno")}
                              disabled={processingId === creator.id}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              Círculo
                            </Button>
                          </>
                        )}
                        {creator.status === "publico" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(creator.id, "circulo_interno")}
                            disabled={processingId === creator.id}
                          >
                            <EyeOff className="h-3 w-3 mr-1" />
                            Ocultar
                          </Button>
                        )}
                        {creator.status === "circulo_interno" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus(creator.id, "publico")}
                            disabled={processingId === creator.id}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Publicar
                          </Button>
                        )}
                      </div>
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

export default CreatorDirectoryManager;
