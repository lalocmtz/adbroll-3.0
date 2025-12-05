import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Video, Eye, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";

interface Creator {
  id: string;
  usuario_creador: string;
  nombre_completo: string | null;
  creator_handle: string | null;
  seguidores: number | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  total_videos: number | null;
  promedio_roas: number | null;
  promedio_visualizaciones: number | null;
  created_at: string | null;
}

const Creators = () => {
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("total_ingresos_mxn", { ascending: false })
        .limit(100);

      if (error) throw error;
      setCreators(data || []);
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

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "—";
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

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Top 100 Creadores TikTok Shop
          </h1>
          <p className="text-muted-foreground">
            Los creadores con mejores resultados en México
          </p>
          <Badge variant="secondary" className="mt-2">
            {creators.length} creadores
          </Badge>
        </div>

        {creators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay creadores disponibles. Importa datos desde el panel de administración.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map((creator, index) => (
              <Card key={creator.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {(creator.usuario_creador || "?").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-1">
                        {creator.nombre_completo || creator.usuario_creador}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        @{creator.creator_handle || creator.usuario_creador}
                      </p>
                    </div>
                    <Badge className="shrink-0">#{index + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1 mb-0.5">
                        <DollarSign className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground">Ingresos</span>
                      </div>
                      <p className="text-sm font-bold text-success">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>

                    <div className="p-2 rounded bg-muted">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Users className="h-3 w-3 text-foreground" />
                        <span className="text-[10px] text-muted-foreground">Seguidores</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatNumber(creator.seguidores)}
                      </p>
                    </div>

                    <div className="p-2 rounded bg-muted">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Eye className="h-3 w-3 text-foreground" />
                        <span className="text-[10px] text-muted-foreground">Vistas prom.</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatNumber(creator.promedio_visualizaciones)}
                      </p>
                    </div>

                    <div className="p-2 rounded bg-accent/5 border border-accent/10">
                      <div className="flex items-center gap-1 mb-0.5">
                        <TrendingUp className="h-3 w-3 text-accent" />
                        <span className="text-[10px] text-muted-foreground">ROAS</span>
                      </div>
                      <p className="text-sm font-bold text-accent">
                        {creator.promedio_roas ? `${creator.promedio_roas.toFixed(1)}x` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span className="flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      {creator.total_videos ?? 0} videos
                    </span>
                    <span>
                      {formatNumber(creator.total_ventas)} ventas
                    </span>
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
