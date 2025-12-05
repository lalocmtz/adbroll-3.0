import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Eye, TrendingUp, ExternalLink, Flame, Video, ShoppingCart, Film, Heart, Play, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";

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

const Creators = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => setSortBy(v as SortOption)}
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {sortedCreators.length} creadores
        </span>
      </div>

      {sortedCreators.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
          <p className="text-muted-foreground text-lg">
            No hay creadores disponibles.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedCreators.map((creator, pageIndex) => {
              const tiktokUrl = getTikTokUrl(creator);
              const globalIndex = startIndex + pageIndex;
              const ranking = globalIndex + 1;
              const isFav = favorites.has(creator.id);

              return (
                <Card
                  key={creator.id}
                  className="overflow-hidden transition-all duration-300 hover:shadow-lg bg-card border-border"
                >
                  <CardContent className="p-3">
                    {/* Header: Avatar + Name + Ranking + Favorite */}
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <div className="relative">
                        <Avatar className="h-10 w-10 border-2 border-primary/20 shrink-0 shadow-md">
                          <AvatarImage src={getAvatarUrl(creator)} alt={creator.nombre_completo || creator.usuario_creador} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xs">
                            {getInitials(creator.nombre_completo, creator.usuario_creador)}
                          </AvatarFallback>
                        </Avatar>
                        {isTop5(globalIndex) && (
                          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-0.5 shadow-lg">
                            <Flame className="h-2 w-2 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground line-clamp-1 text-xs">
                          {creator.nombre_completo || creator.usuario_creador}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          @{creator.creator_handle || creator.usuario_creador}
                        </p>
                        <Badge
                          variant="outline"
                          className={`mt-0.5 text-[10px] font-bold px-1.5 py-0 ${
                            isTop5(globalIndex)
                              ? "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 text-orange-600"
                              : "bg-primary/10 border-primary/30 text-primary"
                          }`}
                        >
                          #{ranking} {isTop5(globalIndex) && '🔥'}
                        </Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 shrink-0 ${isFav ? 'text-red-500' : ''}`}
                        onClick={(e) => toggleFavorite(creator.id, e)}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </Button>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="flex gap-3 mb-2.5 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        <span>{formatNumber(creator.seguidores)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-2.5 w-2.5" />
                        <span>{formatNumber(creator.promedio_visualizaciones)} views</span>
                      </div>
                    </div>

                    {/* Primary Revenue Cards */}
                    <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 text-center">
                        <DollarSign className="h-2.5 w-2.5 text-emerald-600 mx-auto mb-0.5" />
                        <p className="text-[8px] text-muted-foreground uppercase">GMV Total</p>
                        <p className="text-xs font-bold text-emerald-600">
                          {formatCurrency(creator.total_ingresos_mxn)}
                        </p>
                      </div>
                      
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 text-center">
                        <TrendingUp className="h-2.5 w-2.5 text-emerald-600 mx-auto mb-0.5" />
                        <p className="text-[8px] text-muted-foreground uppercase">Comisión Est.</p>
                        <p className="text-xs font-bold text-emerald-600">
                          {calculateCommission(creator.total_ingresos_mxn)}
                        </p>
                      </div>
                    </div>

                    {/* Activity Metrics */}
                    <div className="grid grid-cols-3 gap-1 mb-2.5">
                      <div className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/30 text-center">
                        <Video className="h-2.5 w-2.5 text-purple-500 mx-auto mb-0.5" />
                        <p className="text-[7px] text-muted-foreground uppercase">Lives</p>
                        <p className="text-[10px] font-bold text-purple-600">
                          {creator.total_live_count ? formatNumber(creator.total_live_count) : "—"}
                        </p>
                      </div>
                      
                      <div className="p-1 rounded-md bg-muted text-center">
                        <ShoppingCart className="h-2.5 w-2.5 text-foreground mx-auto mb-0.5" />
                        <p className="text-[7px] text-muted-foreground uppercase">GMV Lives</p>
                        <p className="text-[10px] font-bold text-foreground">
                          {formatCurrency(creator.gmv_live_mxn)}
                        </p>
                      </div>
                      
                      <div className="p-1 rounded-md bg-blue-50 dark:bg-blue-950/30 text-center">
                        <Film className="h-2.5 w-2.5 text-blue-600 mx-auto mb-0.5" />
                        <p className="text-[7px] text-muted-foreground uppercase">GMV Videos</p>
                        <p className="text-[10px] font-bold text-blue-600">
                          {formatCurrency(creator.revenue_videos)}
                        </p>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-1.5">
                      <Button
                        className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                        onClick={() => navigate(`/app?creator=${encodeURIComponent(creator.creator_handle || creator.usuario_creador)}`)}
                      >
                        <Play className="h-3.5 w-3.5 mr-1.5" />
                        Ver videos
                      </Button>
                      
                      <div className="flex gap-1.5">
                        <Button
                          variant="outline"
                          className="flex-1 h-7 text-[10px]"
                          onClick={() => navigate(`/products?creator=${encodeURIComponent(creator.creator_handle || creator.usuario_creador)}`)}
                        >
                          <Package className="h-3 w-3 mr-1" />
                          Productos
                        </Button>
                        
                        {tiktokUrl && (
                          <Button
                            variant="outline"
                            className="flex-1 h-7 text-[10px]"
                            onClick={() => window.open(tiktokUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            TikTok
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
