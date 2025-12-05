import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, Eye, TrendingUp, ExternalLink, Video, Search, ShoppingCart, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  promedio_roas: number | null; // Used for conversion rate
  promedio_visualizaciones: number | null;
  mejor_video_url: string | null;
  country: string | null;
}

type SortOption = "revenue" | "followers" | "views" | "sales" | "conversion";

const Creators = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [filteredCreators, setFilteredCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("revenue");

  useEffect(() => {
    fetchCreators();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [creators, searchQuery, sortBy]);

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

  const applyFiltersAndSort = () => {
    let result = [...creators];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.nombre_completo?.toLowerCase().includes(query) ||
        c.usuario_creador?.toLowerCase().includes(query) ||
        c.creator_handle?.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return (b.total_ingresos_mxn || 0) - (a.total_ingresos_mxn || 0);
        case "followers":
          return (b.seguidores || 0) - (a.seguidores || 0);
        case "views":
          return (b.promedio_visualizaciones || 0) - (a.promedio_visualizaciones || 0);
        case "sales":
          return (b.total_ventas || 0) - (a.total_ventas || 0);
        case "conversion":
          return (b.promedio_roas || 0) - (a.promedio_roas || 0);
        default:
          return 0;
      }
    });
    
    setFilteredCreators(result);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const getInitials = (name: string | null, handle: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return handle.substring(0, 2).toUpperCase();
  };

  const handleViewVideos = (creatorHandle: string) => {
    // Navigate to videos section filtering by this creator
    navigate(`/app?creator=${encodeURIComponent(creatorHandle)}`);
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
            Creadores Relevantes en TikTok Shop (Top 50)
          </h1>
          <p className="text-muted-foreground">
            Los creadores con mejor rendimiento en los últimos 30 días. Datos en tiempo real importados desde Kalodata.
          </p>
          <Badge variant="secondary" className="mt-2">
            📊 Últimos 30 días
          </Badge>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o @usuario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Sort By */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ordenar por</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Más ingresos</SelectItem>
                  <SelectItem value="followers">Más seguidores</SelectItem>
                  <SelectItem value="views">Más vistas</SelectItem>
                  <SelectItem value="sales">Más ventas</SelectItem>
                  <SelectItem value="conversion">Mayor conversión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              {filteredCreators.length} creadores
            </div>
          </div>
        </Card>

        {/* Creator Cards */}
        {filteredCreators.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              {creators.length === 0 
                ? "No hay creadores disponibles. Importa datos desde el panel de administración."
                : "No hay creadores que coincidan con la búsqueda."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCreators.map((creator, index) => (
              <Card 
                key={creator.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-card"
              >
                <CardContent className="p-4">
                  {/* Header - Avatar + Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-14 w-14 border-2 border-primary/20 ring-2 ring-background">
                      <AvatarImage 
                        src={creator.mejor_video_url?.includes('tiktok.com') ? undefined : creator.mejor_video_url || undefined} 
                        alt={creator.nombre_completo || creator.usuario_creador}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-lg">
                        {getInitials(creator.nombre_completo, creator.usuario_creador)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
                          {creator.nombre_completo || creator.usuario_creador}
                        </h3>
                        <Badge variant="outline" className="shrink-0 text-[10px] h-5">
                          #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{creator.creator_handle || creator.usuario_creador}
                      </p>
                      {creator.country && (
                        <Badge variant="secondary" className="mt-1 text-[10px] h-4 px-1.5">
                          <Globe className="h-2.5 w-2.5 mr-0.5" />
                          {creator.country}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Main Metrics - 3 columns */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <DollarSign className="h-3 w-3 text-primary mx-auto mb-0.5" />
                      <p className="text-[10px] text-muted-foreground uppercase">Ingresos</p>
                      <p className="text-xs font-bold text-primary">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
                      <Users className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[10px] text-muted-foreground uppercase">Seguidores</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatNumber(creator.seguidores)}
                      </p>
                    </div>
                    
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border text-center">
                      <Eye className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[10px] text-muted-foreground uppercase">Views</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatNumber(creator.promedio_visualizaciones)}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ventas</p>
                        <p className="text-xs font-semibold">{formatNumber(creator.total_ventas)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Conversión</p>
                        <p className="text-xs font-semibold">
                          {creator.promedio_roas ? `${creator.promedio_roas.toFixed(1)}%` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Buttons */}
                  <div className="flex gap-2">
                    {creator.mejor_video_url && creator.mejor_video_url.includes('tiktok.com') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => window.open(creator.mejor_video_url!, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver Perfil
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleViewVideos(creator.creator_handle || creator.usuario_creador)}
                    >
                      <Video className="h-3 w-3 mr-1" />
                      Ver Videos
                    </Button>
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
