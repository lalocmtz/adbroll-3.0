import { CatalogHeader, CatalogInfo, CatalogFilterBar } from "@/components/CatalogToolbar";
import { useEffect, useRef, useState } from "react";
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
import { Users, ExternalLink, Flame, Heart, Play, Lock, Sparkles, Video, Radio, ShoppingBag, Eye, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { openTikTokLink } from "@/lib/tiktokDeepLink";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useMarket } from "@/contexts/MarketContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface Creator {
  available_video_count: number;
  id: string;
  usuario_creador: string;
  nombre_completo: string | null;
  creator_handle: string | null;
  seguidores: number | null;
  total_ingresos_mxn: number | null;
  promedio_visualizaciones: number | null;
  avatar_url: string | null;
  avatar_storage_url: string | null;
  total_live_count: number | null;
  gmv_live_mxn: number | null;
  revenue_live: number | null;
  revenue_videos: number | null;
  tiktok_url: string | null;
  country: string | null;
  total_videos: number | null;
  total_ventas: number | null;
  views_30d: number | null;
  sales_30d: number | null;
  likes_30d: number | null;
}

type SortOption = "revenue" | "followers" | "views" | "lives" | "gmv_live" | "gmv_videos";

const SORT_OPTIONS = [
  { value: "gmv_videos", label: "Ventas en videos" },
  { value: "followers", label: "Seguidores" },
  { value: "views", label: "Vistas" },
];

const ITEMS_PER_PAGE = 20;
const FREE_PREVIEW_LIMIT = 3;

const Creators = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const { market, marketLabel } = useMarket();
  const { language } = useLanguage();
  const requestVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [sortedCreators, setSortedCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("gmv_videos");
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (creatorId: string) => {
    setImageErrors(prev => new Set(prev).add(creatorId));
  };

  useEffect(() => {
    fetchCreators();
    fetchFavorites();
    return () => { requestVersion.current++; };
  }, [market]);

  useEffect(() => {
    applySorting();
    setCurrentPage(1);
  }, [creators, sortBy]);

  const fetchCreators = async () => {
    const version = ++requestVersion.current;
    try {
      setLoading(true);
      setLoadError(false);
      const { data, error } = await supabase.rpc('get_creator_catalog_ranking', { p_country: market });
      if (version !== requestVersion.current) return;
      if (error) throw error;
      const result = data as { rows?: Creator[] } | null;
      if (!Array.isArray(result?.rows)) throw new Error('No se pudo recuperar el ranking disponible.');
      setCreators(result.rows.filter(creator => creator.available_video_count > 0).slice(0, 20));
    } catch (error: any) {
      if (version !== requestVersion.current) return;
      setCreators([]);
      setLoadError(true);
      toast({ title: "Error al cargar creadores", description: "No se pudo cargar el ranking. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
      if (version === requestVersion.current) setLoading(false);
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
        case "gmv_videos":
          return (b.revenue_videos || 0) - (a.revenue_videos || 0);
        default:
          return 0;
      }
    });
    setSortedCreators(result);
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return "—";
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${new Intl.NumberFormat("es-MX").format(Math.round(amount))}`;
  };

  // Calculate video percentage of total GMV
  const getVideoPercentage = (creator: Creator): number => {
    const total = creator.total_ingresos_mxn || 0;
    if (total === 0) return 0;
    const videoRevenue = creator.revenue_videos || 0;
    return Math.round((videoRevenue / total) * 100);
  };

  // Calculate live percentage of total GMV
  const getLivePercentage = (creator: Creator): number => {
    const total = creator.total_ingresos_mxn || 0;
    if (total === 0) return 0;
    const liveRevenue = creator.gmv_live_mxn || 0;
    return Math.round((liveRevenue / total) * 100);
  };

  // Get GMV per live
  const getGmvPerLive = (creator: Creator): string => {
    const lives = creator.total_live_count || 0;
    const gmv = creator.gmv_live_mxn || 0;
    if (lives === 0 || gmv === 0) return "—";
    return formatCurrency(gmv / lives);
  };

  const getReliableAvatarUrl = (creator: Creator): string => {
    // 1. Priority: Use permanently stored avatar from our storage
    if (creator.avatar_storage_url && creator.avatar_storage_url.length > 0) {
      return creator.avatar_storage_url;
    }
    
    // 2. Fallback to TikTok CDN (may fail due to CORS/expired tokens)
    if (creator.avatar_url && creator.avatar_url.length > 0 && !imageErrors.has(creator.id)) {
      return creator.avatar_url;
    }
    
    // 3. Last resort: UI Avatars with initials
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
    if (!(creator.available_video_count > 0)) return;
    if (isLocked || !isLoggedIn) {
      navigate("/pricing");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    navigate(`/videos/creator/${creator.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-[50dvh] flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando creadores...</p>
      </div>
    );
  }


  return (
    <div className="min-w-0 w-full pt-2 pb-24 md:pb-6 px-3 md:px-6">
      <CatalogHeader title="Ranking de creadores" count={`${sortedCreators.length} creadores`}>
        <CatalogInfo>
          <p className="font-semibold">TikTok Shop {marketLabel}</p>
          <p>Ventas del último reporte importado; no son cifras en tiempo real. Abre un creador para consultar sus videos disponibles en el catálogo.</p>
        </CatalogInfo>
      </CatalogHeader>
      <div className="mb-3 rounded-xl border border-brand-cyan-200 bg-brand-cyan-50 p-3 text-brand-ink">
        <h2 className="text-sm font-semibold">Top 20 con videos disponibles</h2>
        <p className="mt-1 text-xs leading-relaxed">Seleccionamos hasta 20 creadores por sus ventas en videos del reporte, entre quienes tienen referencias descargadas. No es el ranking completo de TikTok Shop. Los filtros reordenan esta selección.</p>
      </div>
      <CatalogFilterBar>
        <FilterPills compact options={SORT_OPTIONS} value={sortBy} onChange={(v) => {
          if (!isLoggedIn) { navigate("/pricing"); return; }
          setSortBy(v as SortOption);
        }} />
      </CatalogFilterBar>

      {sortedCreators.length === 0 ? (
        <div className="bg-card rounded-xl border border-border px-4 py-8 text-center">
          <Users className="size-10 text-muted-foreground mb-3 mx-auto" />
          <p className="text-muted-foreground text-lg">
            {loadError ? "No pudimos cargar los creadores." : "Todavía no hay creadores con videos disponibles en este catálogo."}
          </p>
          <Button variant="outline" className="mt-4" onClick={loadError ? fetchCreators : () => navigate("/app")}>{loadError ? "Reintentar" : "Explorar videos"}</Button>
        </div>
      ) : (
        <>
          {/* Desktop Table - Enhanced with horizontal scroll */}
          <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border bg-muted/30">
                    <TableHead className="w-12 text-center sticky left-0 bg-muted/30">#</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[260px]">Creador</TableHead>
                    <TableHead className="text-right">Seguidores</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        Ventas reportadas
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Video className="h-3 w-3 text-blue-500" />
                        Ventas en videos
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Radio className="h-3 w-3 text-rose-500" />
                        Ventas en directos
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Directos</TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3" />
                        Vistas
                      </div>
                    </TableHead>
                    <TableHead className="w-[160px]">
                      <div className="flex items-center gap-1">
                        <Play className="h-3 w-3 text-primary" />
                        Videos
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCreators.map((creator, pageIndex) => {
                    const tiktokUrl = getTikTokUrl(creator);
                    const globalIndex = startIndex + pageIndex;
                    const ranking = globalIndex + 1;
                    const isFav = favorites.has(creator.id);
                    const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
                    const videoPercent = getVideoPercentage(creator);
                    const livePercent = getLivePercentage(creator);

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
                        <TableCell className="font-bold text-center sticky left-0 bg-card">
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
                                navigate("/pricing");
                                return;
                              }
                              toggleFavorite(creator.id, e);
                            }}
                            className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Heart className={cn("h-4 w-4 transition-colors", isFav ? "text-primary fill-primary" : "text-muted-foreground hover:text-foreground")} />
                          </button>
                        </TableCell>

                        {/* Creator Info + Ver cuenta button */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                            <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                                <AvatarImage 
                                  src={getReliableAvatarUrl(creator)} 
                                  alt={creator.nombre_completo || creator.usuario_creador}
                                  onError={() => handleImageError(creator.id)}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                                  {getInitials(creator.nombre_completo, creator.usuario_creador)}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate text-foreground">
                                @{creator.creator_handle || creator.usuario_creador}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {creator.nombre_completo || "—"}
                              </p>
                            </div>
                            {/* Ver cuenta button */}
                            {tiktokUrl && !isLocked && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-xs shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTikTokLink(tiktokUrl);
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver cuenta
                              </Button>
                            )}
                          </div>
                        </TableCell>

                        {/* Followers */}
                        <TableCell className="text-right font-medium">
                          {isLocked ? "•••" : formatNumber(creator.seguidores)}
                        </TableCell>

                        {/* Ventas reportadas */}
                        <TableCell className="text-right">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {isLocked ? "•••" : formatCurrency(creator.total_ingresos_mxn)}
                          </span>
                        </TableCell>

                        {/* Ventas en videos */}
                        <TableCell className="text-right">
                          <div>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {isLocked ? "•••" : formatCurrency(creator.revenue_videos)}
                            </span>
                            {!isLocked && creator.revenue_videos && creator.revenue_videos > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {videoPercent}%
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Ventas en directos */}
                        <TableCell className="text-right">
                          <div>
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              {isLocked ? "•••" : formatCurrency(creator.gmv_live_mxn)}
                            </span>
                            {!isLocked && creator.gmv_live_mxn && creator.gmv_live_mxn > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {livePercent}%
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Lives Count */}
                        <TableCell className="text-right font-medium">
                          <div>
                            {isLocked ? "•••" : (creator.total_live_count ? formatNumber(creator.total_live_count) : "—")}
                            {!isLocked && creator.total_live_count && creator.total_live_count > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {getGmvPerLive(creator)}/live
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* Views */}
                        <TableCell className="text-right font-medium">
                          {isLocked ? "•••" : formatNumber(creator.promedio_visualizaciones)}
                        </TableCell>

                        {/* Videos button */}
                        <TableCell className="p-2">
                          {!isLocked ? (
                            <Button 
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(creator, isLocked);
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Ver videos ({creator.available_video_count})
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Unlock
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile cards keep the video action in view without sideways scrolling. */}
          <div className="grid min-w-0 grid-cols-1 gap-3 md:hidden">
            {paginatedCreators.map((creator, pageIndex) => {
              const globalIndex = startIndex + pageIndex;
              const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
              const handle = (creator.creator_handle || creator.usuario_creador).replace(/^@/, '');
              return <article key={creator.id} aria-label={`Creador @${handle}`} className="min-w-0 rounded-xl border border-border bg-card p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">{globalIndex + 1}</span>
                  <Avatar className="size-10 shrink-0">
                    <AvatarImage src={getReliableAvatarUrl(creator)} alt={creator.nombre_completo || handle} onError={() => handleImageError(creator.id)} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(creator.nombre_completo, handle)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-foreground">@{handle}</h2>
                    {creator.nombre_completo && <p className="truncate text-xs text-muted-foreground">{creator.nombre_completo}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={favorites.has(creator.id) ? `Quitar a @${handle} de favoritos` : `Guardar a @${handle}`} onClick={event => toggleFavorite(creator.id, event)}>
                    <Heart className={cn("size-4", favorites.has(creator.id) && "fill-primary text-primary")} />
                  </Button>
                </div>
                <dl className="grid grid-cols-2 gap-2 my-3 text-xs">
                  <div className="min-w-0 rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">Ventas en videos</dt><dd className="mt-1 font-semibold tabular-nums">{isLocked ? '•••' : formatCurrency(creator.revenue_videos)}</dd></div>
                  <div className="min-w-0 rounded-lg bg-muted/50 p-2"><dt className="text-muted-foreground">Seguidores</dt><dd className="mt-1 font-semibold tabular-nums">{isLocked ? '•••' : formatNumber(creator.seguidores)}</dd></div>
                </dl>
                <p className="mb-2 w-fit rounded-full bg-brand-cyan-50 px-2.5 py-1 text-xs tabular-nums text-brand-ink">{creator.available_video_count} {creator.available_video_count === 1 ? "video disponible" : "videos disponibles"}</p>
                <Button className="w-full min-h-11 text-sm" onClick={() => handleRowClick(creator, isLocked)}>
                  {!isLoggedIn ? <Lock className="mr-1.5 size-4" /> : <Play className="mr-1.5 size-4" />}
                  {!isLoggedIn ? "Desbloquear videos" : "Ver videos"}
                </Button>
              </article>;
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6">
              {!isLoggedIn ? (
                <div 
                  className="flex items-center justify-center gap-2 opacity-60 cursor-pointer"
                  onClick={() => {
                    navigate("/pricing");
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
              navigate("/pricing");
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
