import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, TrendingUp, ExternalLink, Flame, Video, ShoppingCart, Film, ChevronLeft, ChevronRight } from "lucide-react";
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
  total_live_count: number | null;
  gmv_live_mxn: number | null;
  revenue_live: number | null;
  revenue_videos: number | null;
  tiktok_url: string | null;
  country: string | null;
}

type SortOption = "revenue" | "followers" | "views" | "lives" | "gmv_live";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "revenue", label: "Más ingresos" },
  { value: "followers", label: "Más seguidores" },
  { value: "views", label: "Más views" },
  { value: "lives", label: "Más lives" },
  { value: "gmv_live", label: "Más ventas por lives" },
];

const ITEMS_PER_PAGE = 10;

const Creators = () => {
  const { toast } = useToast();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sortedCreators, setSortedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("revenue");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchCreators();
  }, []);

  useEffect(() => {
    applySorting();
    setCurrentPage(1); // Reset to page 1 when sorting changes
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
        case "lives":
          return (b.total_live_count || 0) - (a.total_live_count || 0);
        case "gmv_live":
          return (b.gmv_live_mxn || 0) - (a.gmv_live_mxn || 0);
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

  // 8% commission calculation
  const calculateCommission = (revenue: number | null): string => {
    if (!revenue || revenue === 0) return "—";
    const commission = revenue * 0.08;
    return formatCurrency(commission);
  };

  const getAvatarUrl = (creator: Creator): string => {
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      return creator.avatar_url;
    }
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

  // Pagination logic
  const totalPages = Math.ceil(sortedCreators.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCreators = sortedCreators.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                sortBy === option.value
                  ? "bg-primary text-primary-foreground shadow-lg"
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedCreators.map((creator, pageIndex) => {
                const tiktokUrl = getTikTokUrl(creator);
                const globalIndex = startIndex + pageIndex;
                const ranking = globalIndex + 1;
                
                return (
                  <Card 
                    key={creator.id} 
                    className="overflow-hidden transition-all duration-300 hover:translate-y-[-3px] hover:shadow-xl bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl shadow-lg"
                  >
                    <CardContent className="p-5">
                      {/* Header: Avatar + Name + Ranking */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-primary/20 shrink-0 shadow-md">
                            <AvatarImage 
                              src={getAvatarUrl(creator)} 
                              alt={creator.nombre_completo || creator.usuario_creador}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold">
                              {getInitials(creator.nombre_completo, creator.usuario_creador)}
                            </AvatarFallback>
                          </Avatar>
                          {isTop5(globalIndex) && (
                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1.5 shadow-lg">
                              <Flame className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground line-clamp-1 text-sm">
                            {creator.nombre_completo || creator.usuario_creador}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            @{creator.creator_handle || creator.usuario_creador}
                          </p>
                          <Badge 
                            variant="outline" 
                            className={`mt-1.5 text-xs font-bold ${
                              isTop5(globalIndex) 
                                ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 text-orange-600" 
                                : "bg-primary/10 border-primary/30 text-primary"
                            }`}
                          >
                            #{ranking}
                          </Badge>
                        </div>
                      </div>

                      {/* Secondary Metrics: Followers & Views */}
                      <div className="flex gap-4 mb-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{formatNumber(creator.seguidores)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{formatNumber(creator.promedio_visualizaciones)} views</span>
                        </div>
                      </div>

                      {/* Primary Revenue Cards (2 big green cards) */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <DollarSign className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Ingresos 30D</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {formatCurrency(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                        
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <TrendingUp className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Comisión Est.</p>
                          <p className="text-lg font-bold text-emerald-600">
                            {calculateCommission(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                      </div>

                      {/* Activity Metrics (3 small cards: purple, gray, blue) */}
                      <div className="grid grid-cols-3 gap-1.5 mb-4">
                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
                          <Video className="h-3.5 w-3.5 text-purple-500 mx-auto mb-0.5" />
                          <p className="text-[8px] text-muted-foreground uppercase font-medium">Lives 30D</p>
                          <p className="text-xs font-bold text-purple-600">
                            {creator.total_live_count && creator.total_live_count > 0 
                              ? formatNumber(creator.total_live_count) 
                              : "—"}
                          </p>
                        </div>
                        
                        <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
                          <ShoppingCart className="h-3.5 w-3.5 text-slate-600 mx-auto mb-0.5" />
                          <p className="text-[8px] text-muted-foreground uppercase font-medium">GMV Lives</p>
                          <p className="text-xs font-bold text-slate-600">
                            {formatCurrency(creator.gmv_live_mxn)}
                          </p>
                        </div>
                        
                        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                          <Film className="h-3.5 w-3.5 text-blue-600 mx-auto mb-0.5" />
                          <p className="text-[8px] text-muted-foreground uppercase font-medium">GMV Videos</p>
                          <p className="text-xs font-bold text-blue-600">
                            {formatCurrency(creator.revenue_videos)}
                          </p>
                        </div>
                      </div>

                      {/* CTA Button */}
                      {tiktokUrl && (
                        <Button
                          size="default"
                          className="w-full font-medium text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200 hover:shadow-lg rounded-xl"
                          onClick={() => window.open(tiktokUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver perfil en TikTok
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                
                <div className="flex gap-1">
                  {getPageNumbers().map((page, index) => (
                    typeof page === 'number' ? (
                      <Button
                        key={index}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-9 h-9"
                      >
                        {page}
                      </Button>
                    ) : (
                      <span key={index} className="px-2 self-center text-muted-foreground">
                        {page}
                      </span>
                    )
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Creators;
