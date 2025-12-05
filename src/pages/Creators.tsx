import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, ShoppingCart, ExternalLink, Percent } from "lucide-react";
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
  promedio_visualizaciones: number | null;
  mejor_video_url: string | null; // Used for avatar URL
  country: string | null;
}

type SortOption = "revenue" | "followers" | "views" | "sales";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "revenue", label: "Más ingresos" },
  { value: "followers", label: "Más seguidores" },
  { value: "views", label: "Más views" },
  { value: "sales", label: "Más ventas" },
];

const Creators = () => {
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sortedCreators, setSortedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("revenue");

  useEffect(() => {
    fetchCreators();
  }, []);

  useEffect(() => {
    applySorting();
  }, [creators, sortBy]);

  const fetchCreators = async () => {
    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .order("total_ingresos_mxn", { ascending: false })
        .limit(50);

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

  const applySorting = () => {
    const result = [...creators].sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0);
        case "followers":
          return (b.seguidores || 0) - (a.seguidores || 0);
        case "views":
          return (b.promedio_visualizaciones || 0) - (a.promedio_visualizaciones || 0);
        case "sales":
          return (b.total_ventas || 0) - (a.total_ventas || 0);
        default:
          return 0;
      }
    });
    setSortedCreators(result);
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || amount === 0) return "$0";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${new Intl.NumberFormat("es-MX").format(Math.round(amount))}`;
  };

  const calculateCommission = (revenue: number | null): string => {
    if (!revenue || revenue === 0) return "$0";
    const commission = revenue * 0.10;
    return formatCurrency(commission);
  };

  const getAvatarUrl = (creator: Creator): string => {
    // If mejor_video_url contains an actual image URL (not a TikTok link)
    if (creator.mejor_video_url && !creator.mejor_video_url.includes('tiktok.com') && !creator.mejor_video_url.includes('kalodata.com')) {
      return creator.mejor_video_url;
    }
    // Generate fallback avatar using ui-avatars
    const name = encodeURIComponent(creator.nombre_completo || creator.usuario_creador);
    return `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff&bold=true&size=128`;
  };

  const getTikTokUrl = (creator: Creator): string => {
    const handle = creator.creator_handle || creator.usuario_creador;
    return `https://www.tiktok.com/@${handle}`;
  };

  const getInitials = (name: string | null, handle: string): string => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return handle.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando creadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Creadores Top 50 TikTok Shop
          </h1>
          <p className="text-muted-foreground">
            Los creadores con mejor rendimiento. Datos importados desde Kalodata.
          </p>
          <Badge variant="secondary" className="mt-2">
            📊 Últimos 30 días
          </Badge>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSortBy(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                sortBy === option.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">
            {sortedCreators.length} creadores
          </span>
        </div>

        {/* Creator Cards */}
        {sortedCreators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay creadores disponibles. Importa datos desde el panel de administración.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedCreators.map((creator, index) => (
              <Card 
                key={creator.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card border"
              >
                <CardContent className="p-4">
                  {/* Header - Avatar + Name + Rank */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20 shrink-0">
                      <AvatarImage 
                        src={getAvatarUrl(creator)} 
                        alt={creator.nombre_completo || creator.usuario_creador}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold">
                        {getInitials(creator.nombre_completo, creator.usuario_creador)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
                          {creator.nombre_completo || creator.usuario_creador}
                        </h3>
                        <Badge variant="outline" className="shrink-0 text-[10px] h-5 bg-primary/10 border-primary/30 text-primary">
                          #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{creator.creator_handle || creator.usuario_creador}
                      </p>
                    </div>
                  </div>

                  {/* Primary Metrics Row 1 */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <DollarSign className="h-3 w-3 text-primary mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">Ingresos 30D</p>
                      <p className="text-xs font-bold text-primary">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
                      <Users className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">Seguidores</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatNumber(creator.seguidores)}
                      </p>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
                      <Eye className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">Views 30D</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatNumber(creator.promedio_visualizaciones)}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Metrics Row 2 */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-border/50">
                      <ShoppingCart className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase">Ventas 30D</p>
                        <p className="text-xs font-semibold">{formatNumber(creator.total_ventas)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-border/50">
                      <Percent className="h-3 w-3 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-muted-foreground uppercase">Comisión Est.</p>
                        <p className="text-xs font-semibold text-green-600">
                          {calculateCommission(creator.total_ingresos_mxn)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(getTikTokUrl(creator), '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver perfil
                  </Button>
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
