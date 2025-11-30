import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Users, TrendingUp, DollarSign, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
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

  const handleViewCreatorVideos = (creatorId: string) => {
    navigate(`/videos/creator/${creatorId}`);
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
      <GlobalHeader />
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Creadores TikTok Shop México
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
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
          <Badge variant="secondary" className="mt-2">
            {creators.length} creadores encontrados
          </Badge>
        </div>

        {creators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay creadores disponibles. Sube un archivo desde el panel de administración.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator, index) => (
              <Card key={creator.id} className="card-premium">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                            {creator.usuario_creador.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg line-clamp-1">
                            {creator.nombre_completo || creator.usuario_creador}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            @{creator.usuario_creador}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Badge className="shrink-0">#{index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-foreground" />
                        <span className="text-xs text-muted-foreground">Seguidores</span>
                      </div>
                      <p className="text-base font-bold text-foreground">
                        {formatNumber(creator.seguidores)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Ingresos</span>
                      </div>
                      <p className="text-base font-bold text-success">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2 mb-1">
                        <Video className="h-4 w-4 text-foreground" />
                        <span className="text-xs text-muted-foreground">Ventas</span>
                      </div>
                      <p className="text-base font-bold text-foreground">
                        {formatNumber(creator.total_ventas)}
                      </p>
                    </div>

                    {creator.promedio_roas !== null && (
                      <div className="p-3 rounded-lg bg-accent/5 border border-accent/10">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-4 w-4 text-accent" />
                          <span className="text-xs text-muted-foreground">ROAS</span>
                        </div>
                        <p className="text-base font-bold text-foreground">
                          {creator.promedio_roas.toFixed(2)}x
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="default" 
                      className="flex-1"
                      onClick={() => handleViewCreatorVideos(creator.id)}
                    >
                      Ver videos
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
        )}
      </main>
    </div>
  );
};

export default Creators;
