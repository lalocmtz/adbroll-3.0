import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ExternalLink, Flame, Heart, Play, Lock, Sparkles, Video, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { openTikTokLink } from "@/lib/tiktokDeepLink";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useMarket } from "@/contexts/MarketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const SORT_OPTIONS = [
  { value: "revenue", label: "Más ingresos" },
  { value: "followers", label: "Más seguidores" },
  { value: "views", label: "Más vistas" },
  { value: "lives", label: "Más lives" },
  { value: "gmv_live", label: "Más ventas por live" },
];

const ITEMS_PER_PAGE = 20;
const FREE_PREVIEW_LIMIT = 3;

const Creators = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const { market, marketLabel } = useMarket();
  const { language } = useLanguage();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sortedCreators, setSortedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("revenue");
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCreators();
    fetchFavorites();
  }, [market]);

  useEffect(() => {
    applySorting();
    setCurrentPage(1);
  }, [creators, sortBy]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("country", market)
        .order("total_ingresos_mxn", { ascending: false })
        .limit(100);

      if (error) throw error;
      setCreators(data || []);
    } catch (error: any) {
      toast({
        title: "Error al cargar creadores",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites")
      .select("item_id")
      .eq("user_id", user.id)
      .eq("item_type", "creator");

    if (data) {
      setFavorites(new Set(data.map(f => f.item_id)));
    }
  };

  const toggleFavorite = async (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para guardar favoritos" });
      navigate("/login");
      return;
    }

    const isFav = favorites.has(creatorId);
    
    try {
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "creator")
          .eq("item_id", creatorId);
        if (error) throw error;
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(creatorId);
          return newSet;
        });
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            item_type: "creator",
            item_id: creatorId,
          });
        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, creatorId]));
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || amount === 0) return "—";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${new Intl.NumberFormat("es-MX").format(Math.round(amount))}`;
  };

  const calculateCommission = (revenue: number | null): string => {
    if (!revenue || revenue === 0) return "—";
    const commission = revenue * 0.08;
    return formatCurrency(commission);
  };

  const getAvatarUrl = (creator: Creator): string => {
    const name = encodeURIComponent(creator.nombre_completo || creator.usuario_creador);
    return `https://ui-avatars.com/api/?name=${name}&background=F31260&color=fff&bold=true&size=128&format=svg`;
  };

  const getTikTokUrl = (creator: Creator): string | null => {
    if (creator.tiktok_url) return creator.tiktok_url;
    const handle = creator.creator_handle || creator.usuario_creador;
    if (handle) return `https://www.tiktok.com/@${handle.replace("@", "")}`;
    return null;
  };

  const getInitials = (name: string | null, handle: string): string => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    }
    return handle.substring(0, 2).toUpperCase();
  };

  const isTop5 = (index: number): boolean => index < 5;

  const totalPages = Math.ceil(sortedCreators.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCreators = sortedCreators.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRowClick = (creator: Creator, isLocked: boolean) => {
    if (isLocked || !isLoggedIn) {
      navigate("/unlock");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(`/videos/creator/${creator.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando creadores...</p>
      </div>
    );
  }

  const todayFormatted = format(new Date(), "d 'de' MMMM", { locale: language === 'es' ? es : enUS });

  return (
    <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Header Section */}
      <div className="mb-3 md:mb-4 py-1 md:py-0">
        <div className="md:hidden">
          <h1 className="text-base font-bold text-foreground leading-tight">
            📊 {language === "es" ? "Ranking de Creadores" : "Creator Rankings"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayFormatted} · TikTok Shop {marketLabel}
          </p>
        </div>
        
        <div className="hidden md:block">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            📊 {language === "es" ? "Ranking de Creadores" : "Creator Rankings"} · {todayFormatted}
          </h1>
          <p className="text-xs text-muted-foreground">
            {language === "es" 
              ? `TikTok Shop ${marketLabel} · Descubre qué creadores están vendiendo más HOY`
              : `TikTok Shop ${marketLabel} · Discover which creators are selling the most TODAY`}
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-3">
          {!isLoggedIn ? (
            <div 
              className="flex gap-1.5 flex-wrap"
              onClick={() => {
                navigate("/unlock");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {SORT_OPTIONS.map((option, i) => (
                <span
                  key={option.value}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium h-8 flex items-center gap-1.5 whitespace-nowrap ${
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground border border-border/50"
                  }`}
                >
                  <Lock className="h-3 w-3" />
                  {option.label}
                </span>
              ))}
            </div>
          ) : (
            <FilterPills
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortOption)}
            />
          )}
        </div>
        
        <span className="text-[11px] text-muted-foreground block mt-1.5">
          {sortedCreators.length} creadores
        </span>
      </div>

      {sortedCreators.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
          <p className="text-muted-foreground text-lg">
            No hay creadores disponibles.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="min-w-[200px]">Creador</TableHead>
                  <TableHead className="text-right">Seguidores</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Comisión 8%</TableHead>
                  <TableHead className="text-right">Lives</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-right w-[120px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCreators.map((creator, pageIndex) => {
                  const tiktokUrl = getTikTokUrl(creator);
                  const globalIndex = startIndex + pageIndex;
                  const ranking = globalIndex + 1;
                  const isFav = favorites.has(creator.id);
                  const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;

                  return (
                    <TableRow 
                      key={creator.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isTop5(globalIndex) && "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20",
                        isLocked && "opacity-50"
                      )}
                      onClick={() => handleRowClick(creator, isLocked)}
                    >
                      {/* Ranking */}
                      <TableCell className="font-bold text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-full text-xs font-bold",
                          isTop5(globalIndex)
                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}>
                          {ranking}{isTop5(globalIndex) && <Flame className="h-3 w-3 ml-0.5" />}
                        </span>
                      </TableCell>

                      {/* Favorite */}
                      <TableCell className="p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked || !isLoggedIn) {
                              navigate("/unlock");
                              return;
                            }
                            toggleFavorite(creator.id, e);
                          }}
                          className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                        >
                          <Heart className={cn("h-4 w-4 transition-colors", isFav ? "text-primary fill-primary" : "text-muted-foreground hover:text-foreground")} />
                        </button>
                      </TableCell>

                      {/* Creator Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                              <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                                {getInitials(creator.nombre_completo, creator.usuario_creador)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate text-foreground">
                              @{creator.creator_handle || creator.usuario_creador}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {creator.nombre_completo || creator.usuario_creador}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Followers */}
                      <TableCell className="text-right font-medium">
                        {isLocked ? "•••" : formatNumber(creator.seguidores)}
                      </TableCell>

                      {/* Revenue */}
                      <TableCell className="text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {isLocked ? "•••" : formatCurrency(creator.total_ingresos_mxn)}
                        </span>
                      </TableCell>

                      {/* Commission */}
                      <TableCell className="text-right">
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          {isLocked ? "•••" : calculateCommission(creator.total_ingresos_mxn)}
                        </span>
                      </TableCell>

                      {/* Lives */}
                      <TableCell className="text-right font-medium">
                        {isLocked ? "•••" : (creator.total_live_count ? formatNumber(creator.total_live_count) : "—")}
                      </TableCell>

                      {/* Views */}
                      <TableCell className="text-right font-medium">
                        {isLocked ? "•••" : formatNumber(creator.promedio_visualizaciones)}
                      </TableCell>

                      {/* TikTok Link */}
                      <TableCell className="p-2">
                        {tiktokUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isLocked || !isLoggedIn) {
                                navigate("/unlock");
                                return;
                              }
                              openTikTokLink(tiktokUrl);
                            }}
                            className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        {isLocked ? (
                          <Button size="sm" variant="outline" className="h-8 text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Desbloquear
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/videos/creator/${creator.id}`);
                            }}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Ver videos
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Table - Compact */}
          <div className="md:hidden bg-card rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border">
                  <TableHead className="w-8 text-center p-2">#</TableHead>
                  <TableHead className="p-2">Creador</TableHead>
                  <TableHead className="text-right p-2">Ingresos</TableHead>
                  <TableHead className="w-8 p-2"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCreators.map((creator, pageIndex) => {
                  const tiktokUrl = getTikTokUrl(creator);
                  const globalIndex = startIndex + pageIndex;
                  const ranking = globalIndex + 1;
                  const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;

                  return (
                    <TableRow 
                      key={creator.id}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isTop5(globalIndex) && "bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20",
                        isLocked && "opacity-50"
                      )}
                      onClick={() => handleRowClick(creator, isLocked)}
                    >
                      {/* Ranking */}
                      <TableCell className="p-2 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold",
                          isTop5(globalIndex)
                            ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}>
                          {ranking}
                        </span>
                      </TableCell>

                      {/* Creator Info */}
                      <TableCell className="p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                            <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-[10px]">
                              {getInitials(creator.nombre_completo, creator.usuario_creador)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate text-foreground">
                              @{creator.creator_handle || creator.usuario_creador}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              <Users className="h-2.5 w-2.5" />
                              {isLocked ? "•••" : formatNumber(creator.seguidores)}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Revenue */}
                      <TableCell className="p-2 text-right">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          {isLocked ? "•••" : formatCurrency(creator.total_ingresos_mxn)}
                        </span>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">
                          {isLocked ? "•••" : calculateCommission(creator.total_ingresos_mxn)}
                        </p>
                      </TableCell>

                      {/* Action Icon */}
                      <TableCell className="p-2">
                        {isLocked ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Play className="h-4 w-4 text-primary" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              {!isLoggedIn ? (
                <div 
                  className="flex items-center justify-center gap-2 opacity-60 cursor-pointer"
                  onClick={() => {
                    navigate("/unlock");
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Ver más creadores</span>
                </div>
              ) : (
                <CompactPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </div>
          )}
        </>
      )}
      
      {/* Sticky CTA for visitors - Mobile only */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border md:hidden safe-area-bottom">
          <Button 
            className="w-full h-12 text-sm font-semibold shadow-lg" 
            onClick={() => {
              navigate("/unlock");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Desbloquear acceso completo 
          </Button>
        </div>
      )}
    </div>
  );
};

export default Creators;
