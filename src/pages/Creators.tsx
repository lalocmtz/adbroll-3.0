import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, TrendingUp, DollarSign, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/hooks/use-toast";

interface Creator {
  id: string;
  usuario_creador: string;
  nombre_completo: string | null;
  seguidores: number | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  total_videos: number | null;
  promedio_roas: number | null;
  promedio_visualizaciones: number | null;
  mejor_video_url: string | null;
  created_at: string | null;
}

const Creators = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("total_ingresos_mxn", { ascending: false });

      if (error) throw error;

      setCreators(data || []);
      
      if (data && data.length > 0 && data[0].created_at) {
        setLastUpdate(new Date(data[0].created_at));
      }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleViewCreatorVideos = (creatorUsername: string) => {
    navigate(`/app?creator=${encodeURIComponent(creatorUsername)}`);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "N/A";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return new Intl.NumberFormat("es-MX").format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando creadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Creadores TikTok Shop México
          </h2>
          <p className="text-muted-foreground mb-2">
            Top creadores rankeados por ingresos totales
          </p>
          {lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Última actualización:{" "}
              {lastUpdate.toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {creators.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">
                No hay creadores disponibles. Sube un archivo desde el panel de administración.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant="secondary" className="text-sm">
                {creators.length} creadores encontrados
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creators.map((creator, index) => (
                <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">
                          {creator.nombre_completo || creator.usuario_creador}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          @{creator.usuario_creador}
                        </p>
                      </div>
                      <Badge className="ml-2">#{index + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Seguidores</p>
                          <p className="font-semibold text-foreground">
                            {formatNumber(creator.seguidores)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Ingresos Totales</p>
                          <p className="font-semibold text-positive">
                            {formatCurrency(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Ventas Totales</p>
                          <p className="font-semibold text-foreground">
                            {formatNumber(creator.total_ventas)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Total Videos</p>
                          <p className="font-semibold text-foreground">
                            {creator.total_videos ?? "N/A"}
                          </p>
                        </div>
                      </div>

                      {creator.promedio_roas !== null && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-muted-foreground">ROAS Promedio</p>
                          <p className="font-bold text-lg text-foreground">
                            {creator.promedio_roas.toFixed(2)}x
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => handleViewCreatorVideos(creator.usuario_creador)}
                      >
                        Ver videos de este creador
                      </Button>
                      {creator.mejor_video_url && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(creator.mejor_video_url!, "_blank")}
                          title="Ver mejor video"
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Creators;
