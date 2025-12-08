import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, TrendingUp, ExternalLink, Flame, Video, ShoppingCart, Film, Heart, Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { openTikTokLink } from "@/lib/tiktokDeepLink";
import { useBlurGateContext } from "@/contexts/BlurGateContext";

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
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sortedCreators, setSortedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("revenue");
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCreators();
    fetchFavorites();
  }, []);

  useEffect(() => {
    applySorting();
    setCurrentPage(1);
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
    if (creator.avatar_url && creator.avatar_url.startsWith("http")) {
      return creator.avatar_url;
    }
    const name = encodeURIComponent(creator.nombre_completo || creator.usuario_creador);
    return `https://ui-avatars.com/api/?name=${name}&background=0D8ABC&color=fff&bold=true&size=128`;
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

  return (
    <div className="pt-5 pb-6 px-4 md:px-6">
      {/* Minimal header */}
      <DataSubtitle />

      {/* Filter Pills - Locked for visitors */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isLoggedIn ? (
          <div 
            className="flex flex-wrap gap-1.5 opacity-60 cursor-pointer"
            onClick={() => {
              navigate("/unlock");
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {SORT_OPTIONS.map((option, i) => (
              <span
                key={option.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium h-8 flex items-center gap-1.5 ${
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
        <span className="text-xs text-muted-foreground ml-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                    <div className="blur-sm pointer-events-none bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-5">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="h-12 w-12 rounded-full bg-muted" />
                        <div className="flex-1">
                          <div className="h-4 bg-muted rounded mb-2 w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="h-16 bg-muted rounded-xl" />
                        <div className="h-16 bg-muted rounded-xl" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-background/40 flex items-center justify-center rounded-[20px]">
                      <div className="text-center p-4">
                        <Lock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">Desbloquear</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={creator.id}
                  className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                >
                  {/* Header: Avatar + Name + Ranking + Favorite */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-[#F31260]/20 shrink-0 shadow-md transition-transform duration-300 group-hover:scale-[1.02]">
                        <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                        <AvatarFallback className="bg-gradient-to-br from-[#F31260]/80 to-[#F31260] text-white font-bold text-sm">
                          {getInitials(creator.nombre_completo, creator.usuario_creador)}
                        </AvatarFallback>
                      </Avatar>
                      {isTop5(globalIndex) && (
                        <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1 shadow-lg">
                          <Flame className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-[15px] font-semibold text-[#0F172A] dark:text-foreground truncate cursor-help"
                        title={creator.nombre_completo || creator.usuario_creador}
                      >
                        {creator.nombre_completo || creator.usuario_creador}
                      </h3>
                      <p className="text-[13px] text-[#94A3B8]">
                        @{creator.creator_handle || creator.usuario_creador}
                      </p>
                      <span className={`inline-block mt-1.5 text-[12px] font-bold px-2.5 py-0.5 rounded-full ${
                        isTop5(globalIndex)
                          ? 'bg-gradient-to-r from-[#F31260] to-[#DA0C5E] text-white'
                          : 'bg-[#F1F5F9] text-[#0F172A] border border-[#E2E8F0]'
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
                      className="h-9 w-9 rounded-full bg-[#F8FAFC] flex items-center justify-center hover:bg-[#F1F5F9] transition-colors"
                    >
                      <Heart className={`h-[18px] w-[18px] transition-colors ${isFav ? 'text-[#F31260] fill-[#F31260]' : 'text-[#CBD5E1] hover:text-[#1E293B]'}`} />
                    </button>
                  </div>

                  {/* Secondary Metrics */}
                  <div className="flex gap-4 mb-4 text-[13px] text-[#94A3B8]">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#475569]" />
                      <span>{formatNumber(creator.seguidores)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-[#475569]" />
                      <span>{formatNumber(creator.promedio_visualizaciones)} views</span>
                    </div>
                  </div>

                  {/* Primary Revenue Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-success/10 text-center">
                      <DollarSign className="h-4 w-4 text-[#475569] mx-auto mb-1" />
                      <p className="text-[10px] text-[#94A3B8] uppercase">GMV Total</p>
                      <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                        {formatCurrency(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-success/10 text-center">
                      <TrendingUp className="h-4 w-4 text-[#475569] mx-auto mb-1" />
                      <p className="text-[10px] text-[#94A3B8] uppercase">Comisión Est.</p>
                      <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                        {calculateCommission(creator.total_ingresos_mxn)}
                      </p>
                    </div>
                  </div>

                  {/* Activity Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-2.5 rounded-xl bg-[#F5F3FF] dark:bg-purple-950/30 text-center">
                      <Video className="h-3.5 w-3.5 text-[#475569] mx-auto mb-0.5" />
                      <p className="text-[9px] text-[#94A3B8] uppercase">Lives</p>
                      <p className="text-xs font-bold text-[#0F172A] dark:text-foreground">
                        {creator.total_live_count ? formatNumber(creator.total_live_count) : "—"}
                      </p>
                    </div>
                    
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-muted/50 text-center">
                      <ShoppingCart className="h-3.5 w-3.5 text-[#475569] mx-auto mb-0.5" />
                      <p className="text-[9px] text-[#94A3B8] uppercase">GMV Lives</p>
                      <p className="text-xs font-bold text-[#0F172A] dark:text-foreground">
                        {formatCurrency(creator.gmv_live_mxn)}
                      </p>
                    </div>
                    
                    <div className="p-2.5 rounded-xl bg-[#F0F9FF] dark:bg-blue-950/30 text-center">
                      <Film className="h-3.5 w-3.5 text-[#475569] mx-auto mb-0.5" />
                      <p className="text-[9px] text-[#94A3B8] uppercase">GMV Videos</p>
                      <p className="text-xs font-bold text-[#0F172A] dark:text-foreground">
                        {formatCurrency(creator.revenue_videos)}
                      </p>
                    </div>
                  </div>

                  {/* CTA Buttons - Improved spacing */}
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 h-10"
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate("/unlock");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }
                        navigate(`/videos/creator/${creator.id}`);
                      }}
                    >
                      <Play className="h-4 w-4" />
                      Ver videos
                    </Button>
                    
                    {tiktokUrl && (
                      <Button
                        variant="secondary"
                        className="h-10 px-4"
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
              <CompactPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Creators;
