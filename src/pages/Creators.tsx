import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, Heart, TrendingUp, ExternalLink, Flame, Video, Radio } from "lucide-react";
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
  promedio_visualizaciones: number | null;
  avatar_url: string | null;
  likes_30d: number | null;
  revenue_live: number | null;
  revenue_videos: number | null;
  tiktok_url: string | null;
  country: string | null;
}

type SortOption = "revenue" | "followers" | "views" | "likes";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "revenue", label: "Más ingresos" },
  { value: "followers", label: "Más seguidores" },
  { value: "views", label: "Más views" },
  { value: "likes", label: "Más likes" },
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
        case "likes":
          return (b.likes_30d || 0) - (a.likes_30d || 0);
        default:
          return 0;
      }
    });
    setSortedCreators(result);
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || num === 0) return "—";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || amount === 0) return "—";
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${new Intl.NumberFormat("es-MX").format(Math.round(amount))}`;
  };

  const calculateCommission = (revenue: number | null): string => {
    if (!revenue || revenue === 0) return "—";
    const commission = revenue * 0.10;
    return formatCurrency(commission);
  };

  const getRevenueDistribution = (creator: Creator): { live: number; videos: number; livePercent: number; videosPercent: number } | null => {
    const live = creator.revenue_live || 0;
    const videos = creator.revenue_videos || 0;
    const total = live + videos;
    
    if (total === 0) return null;
    
    return {
      live,
      videos,
      livePercent: Math.round((live / total) * 100),
      videosPercent: Math.round((videos / total) * 100),
    };
  };

  const getAvatarUrl = (creator: Creator): string => {
    // Use avatar_url if available
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      return creator.avatar_url;
    }
    // Generate fallback avatar using ui-avatars
    const name = encodeURIComponent(creator.nombre_completo || creator.usuario_creador);
    return `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff&bold=true&size=128`;
  };

  const getTikTokUrl = (creator: Creator): string | null => {
    if (creator.tiktok_url) {
      return creator.tiktok_url;
    }
    const handle = creator.creator_handle || creator.usuario_creador;
    if (handle) {
      return `https://www.tiktok.com/@${handle.replace("@", "")}`;
    }
    return null;
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

  const isTop5 = (index: number): boolean => index < 5;

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
            Los creadores con mejor rendimiento en los últimos 30 días. Datos importados desde Kalodata.
          </p>
          <Badge variant="secondary" className="mt-2">
            📊 Datos actualizados · Últimos 30 días
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
                  : "bg-secondary/50 text-secondary-foreground hover:bg-secondary border border-border"
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
            {sortedCreators.map((creator, index) => {
              const tiktokUrl = getTikTokUrl(creator);
              const distribution = getRevenueDistribution(creator);
              const ranking = index + 1;
              
              return (
                <Card 
                  key={creator.id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card border"
                >
                  <CardContent className="p-4">
                    {/* Header - Avatar + Name + Rank */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="relative">
                        <Avatar className="h-14 w-14 border-2 border-primary/20 shrink-0">
                          <AvatarImage 
                            src={getAvatarUrl(creator)} 
                            alt={creator.nombre_completo || creator.usuario_creador}
                          />
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold">
                            {getInitials(creator.nombre_completo, creator.usuario_creador)}
                          </AvatarFallback>
                        </Avatar>
                        {isTop5(index) && (
                          <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-1">
                            <Flame className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
                            {creator.nombre_completo || creator.usuario_creador}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          @{creator.creator_handle || creator.usuario_creador}
                        </p>
                        <Badge 
                          variant="outline" 
                          className={`mt-1 text-[10px] h-5 ${
                            isTop5(index) 
                              ? "bg-orange-500/10 border-orange-500/30 text-orange-600" 
                              : "bg-primary/10 border-primary/30 text-primary"
                          }`}
                        >
                          #{ranking}
                        </Badge>
                      </div>
                    </div>

                    {/* Primary Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                        <DollarSign className="h-3 w-3 text-green-600 mx-auto mb-0.5" />
                        <p className="text-[9px] text-muted-foreground uppercase">Ingresos 30D</p>
                        <p className="text-xs font-bold text-green-600">
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

                    {/* Secondary Metrics Row */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {creator.likes_30d && creator.likes_30d > 0 ? (
                        <div className="flex items-center gap-2 p-2 rounded bg-pink-500/10 border border-pink-500/20">
                          <Heart className="h-3 w-3 text-pink-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] text-muted-foreground uppercase">Likes 30D</p>
                            <p className="text-xs font-semibold text-pink-600">{formatNumber(creator.likes_30d)}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-border/50">
                          <Heart className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[9px] text-muted-foreground uppercase">Likes 30D</p>
                            <p className="text-xs font-semibold">—</p>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground uppercase">Comisión Est.</p>
                          <p className="text-xs font-semibold text-emerald-600">
                            {calculateCommission(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Revenue Distribution (if available) */}
                    {distribution && (
                      <div className="mb-3 p-2 rounded bg-muted/30 border border-border/50">
                        <p className="text-[9px] text-muted-foreground uppercase mb-1.5">📊 Distribución de ingresos</p>
                        <div className="flex gap-2 text-[10px]">
                          <div className="flex items-center gap-1">
                            <Video className="h-3 w-3 text-blue-500" />
                            <span className="text-foreground font-medium">Videos: {formatCurrency(distribution.videos)}</span>
                            <span className="text-muted-foreground">({distribution.videosPercent}%)</span>
                          </div>
                        </div>
                        <div className="flex gap-2 text-[10px] mt-1">
                          <div className="flex items-center gap-1">
                            <Radio className="h-3 w-3 text-red-500" />
                            <span className="text-foreground font-medium">Live: {formatCurrency(distribution.live)}</span>
                            <span className="text-muted-foreground">({distribution.livePercent}%)</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Button */}
                    {tiktokUrl && (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full text-xs bg-primary hover:bg-primary/90"
                        onClick={() => window.open(tiktokUrl, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        🔗 Ver perfil en TikTok
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Creators;
