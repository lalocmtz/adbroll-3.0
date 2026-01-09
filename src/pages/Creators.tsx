import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, TrendingUp, ExternalLink, Flame, Video, ShoppingCart, Film, Heart, Play, Lock, Sparkles } from "lucide-react";
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

const ITEMS_PER_PAGE = 12;
const FREE_PREVIEW_LIMIT = 3;

const Creators = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const { market, marketLabel, marketCountry } = useMarket();
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
  }, [market]); // Re-fetch when market changes

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
        .eq("country", market) // Filter by market (lowercase 'mx' or 'us')
        .order("total_ingresos_mxn", { ascending: false })
        .limit(50);

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
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
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
    // Always return ui-avatars as primary since TikTok CDN images often fail
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
      {/* Mobile Hero Section - Dynamic Date */}
      <div className="mb-3 md:mb-4 py-1 md:py-0">
        <div className="md:hidden">
          <h1 className="text-base font-bold text-foreground leading-tight">
            ⭐ Creadores que más venden HOY
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayFormatted} · TikTok Shop {marketLabel}
          </p>
        </div>
        
        {/* Desktop minimal header */}
        <div className="hidden md:block">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            ⭐ Creadores que más venden HOY, {todayFormatted}
          </h1>
          <p className="text-xs text-muted-foreground">
            TikTok Shop {marketLabel} · Descubre quiénes están dominando
          </p>
        </div>
      </div>

      {/* Filter Pills - Horizontal Scroll on Mobile */}
      <div className="mb-4 md:mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-3">
          {!isLoggedIn ? (
            <div 
              className="flex gap-1.5 flex-nowrap"
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
        
        {/* Count below filters */}
        <span className="text-[11px] text-muted-foreground block mt-1.5 md:hidden">
          {sortedCreators.length} creadores
        </span>
        <span className="text-xs text-muted-foreground hidden md:block mt-2">
          {sortedCreators.length} creadores
        </span>
      </div>

      {sortedCreators.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
          <p className="text-muted-foreground text-lg">
            No hay creadores disponibles.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
            {paginatedCreators.map((creator, pageIndex) => {
              const tiktokUrl = getTikTokUrl(creator);
              const globalIndex = startIndex + pageIndex;
              const ranking = globalIndex + 1;
              const isFav = favorites.has(creator.id);
              const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;

              if (isLocked) {
                return (
                  <div 
                    key={creator.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      navigate("/unlock");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="blur-[6px] pointer-events-none bg-white dark:bg-card rounded-2xl md:rounded-[20px] border border-border/50 dark:border-border p-3 md:p-5 shadow-sm">
                      {/* Header: Avatar + Name + Ranking */}
                      <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                        <div className="relative">
                          <Avatar className="h-9 w-9 md:h-12 md:w-12 border-2 border-primary/20 shrink-0 shadow-md">
                            <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                            <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-bold text-xs md:text-sm">
                              {getInitials(creator.nombre_completo, creator.usuario_creador)}
                            </AvatarFallback>
                          </Avatar>
                          {isTop5(globalIndex) && (
                            <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-0.5 md:p-1 shadow-lg">
                              <Flame className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] md:text-[15px] font-semibold text-foreground truncate leading-tight">
                            {creator.nombre_completo || creator.usuario_creador}
                          </h3>
                          <p className="text-[11px] md:text-[13px] text-muted-foreground truncate">
                            @{creator.creator_handle || creator.usuario_creador}
                          </p>
                          <span className={`inline-block mt-1 md:mt-1.5 text-[10px] md:text-[12px] font-bold px-2 md:px-2.5 py-0.5 rounded-full ${
                            isTop5(globalIndex)
                              ? 'bg-gradient-to-r from-primary to-primary/80 text-white'
                              : 'bg-muted text-foreground border border-border'
                          }`}>
                            #{ranking} {isTop5(globalIndex) && '🔥'}
                          </span>
                        </div>
                      </div>
                      {/* Primary Revenue Cards */}
                      <div className="grid grid-cols-2 gap-1.5 md:gap-3">
                        <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">GMV</p>
                          <p className="text-[11px] md:text-sm font-bold text-foreground">
                            {formatCurrency(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                        <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Comisión</p>
                          <p className="text-[11px] md:text-sm font-bold text-foreground">
                            {calculateCommission(creator.total_ingresos_mxn)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-background/30 flex items-center justify-center rounded-2xl md:rounded-[20px]">
                      <div className="text-center p-3 md:p-4">
                        <Lock className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-1.5 md:mb-2 text-muted-foreground" />
                        <p className="text-xs md:text-sm font-medium text-foreground">Desbloquear</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={creator.id}
                  className="bg-white dark:bg-card rounded-2xl md:rounded-[20px] border border-border/50 dark:border-border p-3 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  {/* Header: Avatar + Name + Ranking + Favorite */}
                  <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="relative">
                      <Avatar className="h-9 w-9 md:h-12 md:w-12 border-2 border-primary/20 shrink-0 shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                        <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-bold text-xs md:text-sm">
                          {getInitials(creator.nombre_completo, creator.usuario_creador)}
                        </AvatarFallback>
                      </Avatar>
                      {isTop5(globalIndex) && (
                        <div className="absolute -top-0.5 -right-0.5 md:-top-1 md:-right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-0.5 md:p-1 shadow-lg">
                          <Flame className="h-2.5 w-2.5 md:h-3 md:w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-[13px] md:text-[15px] font-semibold text-foreground truncate cursor-help leading-tight"
                        title={creator.nombre_completo || creator.usuario_creador}
                      >
                        {creator.nombre_completo || creator.usuario_creador}
                      </h3>
                      <p className="text-[11px] md:text-[13px] text-muted-foreground truncate">
                        @{creator.creator_handle || creator.usuario_creador}
                      </p>
                      <span className={`inline-block mt-1 md:mt-1.5 text-[10px] md:text-[12px] font-bold px-2 md:px-2.5 py-0.5 rounded-full ${
                        isTop5(globalIndex)
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white'
                          : 'bg-muted text-foreground border border-border'
                      }`}>
                        #{ranking} {isTop5(globalIndex) && '🔥'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoggedIn) {
                          navigate("/unlock");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }
                        toggleFavorite(creator.id, e);
                      }}
                      className="h-7 w-7 md:h-9 md:w-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                    >
                      <Heart className={`h-3.5 w-3.5 md:h-[18px] md:w-[18px] transition-colors ${isFav ? 'text-primary fill-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                    </button>
                  </div>

                  {/* Secondary Metrics - Hidden on mobile */}
                  <div className="hidden md:flex gap-4 mb-4 text-[13px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-foreground/60" />
                      <span>{formatNumber(creator.seguidores)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-foreground/60" />
                      <span>{formatNumber(creator.promedio_visualizaciones)} views</span>
                    </div>
                  </div>

                  {/* Primary Revenue Cards */}
                  <div className="grid grid-cols-2 gap-1.5 md:gap-3 mb-3 md:mb-4">
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-center">
                      <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-foreground/60 mx-auto mb-0.5 md:mb-1 hidden md:block" />
                      <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">GMV</p>
                      <p className="text-[11px] md:text-sm font-bold text-foreground">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-amber-50 dark:bg-amber-950/30 text-center">
                      <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-foreground/60 mx-auto mb-0.5 md:mb-1 hidden md:block" />
                      <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">Comisión</p>
                      <p className="text-[11px] md:text-sm font-bold text-foreground">
                        {calculateCommission(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                  </div>

                  {/* Activity Metrics - Hidden on mobile */}
                  <div className="hidden md:grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-center">
                      <Video className="h-3.5 w-3.5 text-foreground/60 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">Lives</p>
                      <p className="text-xs font-bold text-foreground">
                        {creator.total_live_count ? formatNumber(creator.total_live_count) : "—"}
                      </p>
                    </div>
                    
                    <div className="p-2.5 rounded-xl bg-muted text-center">
                      <ShoppingCart className="h-3.5 w-3.5 text-foreground/60 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">GMV Lives</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatCurrency(creator.gmv_live_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-center">
                      <Film className="h-3.5 w-3.5 text-foreground/60 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground uppercase">GMV Videos</p>
                      <p className="text-xs font-bold text-foreground">
                        {formatCurrency(creator.revenue_videos)}
                      </p>
                    </div>
                  </div>

                  {/* CTA Buttons - Compact on mobile */}
                  <div className="flex gap-2 md:gap-3">
                    <Button
                      className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate("/unlock");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }
                        navigate(`/videos/creator/${creator.id}`);
                      }}
                    >
                      <Play className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-1.5" />
                      <span className="md:inline">Ver videos</span>
                    </Button>
                    
                    {tiktokUrl && (
                      <Button
                        variant="secondary"
                        className="h-8 md:h-10 px-3 md:px-4 hidden md:flex"
                        onClick={() => {
                          if (!isLoggedIn) {
                            navigate("/unlock");
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            return;
                          }
                          openTikTokLink(tiktokUrl);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        TikTok
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
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
