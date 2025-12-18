import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star, Heart, Play, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Product {
  id: string;
  rank: number | null;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  precio_mxn: number | null;
  price: number | null;
  commission: number | null;
  commission_amount: number | null;
  categoria: string | null;
  revenue_30d: number | null;
  total_ingresos_mxn: number | null;
  sales_7d: number | null;
  total_ventas: number | null;
  creators_count: number | null;
  rating: number | null;
}

const PLACEHOLDER_IMAGE = "/placeholder.svg";
const PRODUCTS_PER_PAGE = 20;

const SORT_OPTIONS = [
  { value: "revenue_30d", label: "Más ingresos" },
  { value: "commission", label: "Más comisión" },
  { value: "creators_count", label: "Más creadores" },
];

type SortOption = "revenue_30d" | "commission" | "creators_count";

const FREE_PREVIEW_LIMIT = 3;

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useBlurGateContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  const [sortBy, setSortBy] = useState<SortOption>("revenue_30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchFavorites();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, sortBy, categoryFilter]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("rank", { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      setProducts(data || []);
      
      const uniqueCategories = [...new Set((data || [])
        .map(p => p.categoria)
        .filter(Boolean))] as string[];
      setCategories(uniqueCategories);
    } catch (error: any) {
      toast({
        title: "Error al cargar productos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("favorites_products")
      .select("product_id")
      .eq("user_id", user.id);

    if (data) {
      setFavorites(new Set(data.map(f => f.product_id)));
    }
  };

  const toggleFavorite = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes iniciar sesión para guardar favoritos" });
      navigate("/login");
      return;
    }

    const isFav = favorites.has(productId);
    
    try {
      if (isFav) {
        const { error } = await supabase
          .from("favorites_products")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        toast({ title: "✓ Eliminado de favoritos" });
      } else {
        const product = products.find(p => p.id === productId);
        const { error } = await supabase
          .from("favorites_products")
          .insert({
            user_id: user.id,
            product_id: productId,
            product_data: product || {},
          });
        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, productId]));
        toast({ title: "✓ Guardado en favoritos" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const applyFiltersAndSort = () => {
    let result = [...products];
    
    if (categoryFilter !== "all") {
      result = result.filter(p => p.categoria === categoryFilter);
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case "revenue_30d":
          return (getRevenue(b) || 0) - (getRevenue(a) || 0);
        case "commission":
          return (b.commission || 0) - (a.commission || 0);
        case "creators_count":
          return (b.creators_count || 0) - (a.creators_count || 0);
        default:
          return 0;
      }
    });
    
    setFilteredProducts(result);
    setCurrentPage(1);
  };

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    return new Intl.NumberFormat("es-MX").format(Math.round(num));
  };

  const getRevenue = (product: Product): number | null => {
    return product.revenue_30d || product.total_ingresos_mxn;
  };

  const getSales = (product: Product): number | null => {
    return product.sales_7d || product.total_ventas;
  };

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  const marketLabel = 'México';
  const todayFormatted = format(new Date(), "d 'de' MMMM", { locale: es });

  return (
    <div className="pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Mobile Hero Section - Dynamic Date */}
      <div className="mb-3 md:mb-4 py-1 md:py-0">
        <div className="md:hidden">
          <h1 className="text-base font-bold text-foreground leading-tight">
            🛒 Productos que más venden HOY
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayFormatted} · TikTok Shop {marketLabel}
          </p>
        </div>
        
        {/* Desktop minimal header */}
        <div className="hidden md:block">
          <h1 className="text-lg font-bold text-foreground leading-tight">
            🛒 Productos que más venden HOY, {todayFormatted}
          </h1>
          <p className="text-xs text-muted-foreground">
            TikTok Shop {marketLabel} · Encuentra productos de alta comisión
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
          
          {/* Category Dropdown - Locked for visitors */}
          {!isLoggedIn ? (
            <div 
              className="h-8 px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 cursor-pointer whitespace-nowrap"
              onClick={() => {
                navigate("/unlock");
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Lock className="h-3 w-3" />
              Categorías
            </div>
          ) : (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-auto h-8 text-xs px-3 rounded-full border-border/50 bg-muted/60">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Categorías</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Count below filters */}
        <span className="text-[11px] text-muted-foreground block mt-1.5 md:hidden">
          {filteredProducts.length} productos
        </span>
        <span className="text-xs text-muted-foreground hidden md:block mt-2">
          {filteredProducts.length} productos
        </span>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
          <p className="text-muted-foreground text-lg">
            {products.length === 0 
              ? "No hay productos disponibles."
              : "No hay productos que coincidan con los filtros."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
            {paginatedProducts.map((product, index) => {
              const globalIndex = (currentPage - 1) * PRODUCTS_PER_PAGE + index;
              const displayRank = globalIndex + 1;
              const isFav = favorites.has(product.id);
              const isTop5 = displayRank <= 5;
              const price = product.price || product.precio_mxn || 0;
              const commissionRate = product.commission || 6;
              const earningsPerSale = price * (commissionRate / 100);
              const isLocked = !isLoggedIn && globalIndex >= FREE_PREVIEW_LIMIT;
              
              if (isLocked) {
                return (
                  <div 
                    key={product.id}
                    className="relative cursor-pointer group"
                    onClick={() => {
                      navigate("/unlock");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="blur-[6px] pointer-events-none bg-white dark:bg-card rounded-2xl md:rounded-[20px] border border-border/50 dark:border-border p-3 md:p-5 shadow-sm">
                      {/* Product Image - 1:1 aspect ratio */}
                      <div className="relative aspect-square bg-muted rounded-xl md:rounded-2xl overflow-hidden mb-2 md:mb-4">
                        <img
                          src={product.imagen_url || PLACEHOLDER_IMAGE}
                          alt={product.producto_nombre}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                          }}
                        />
                        <span className={`absolute top-2 md:top-3 left-2 md:left-3 text-[11px] md:text-[13px] font-bold px-2 py-0.5 md:py-1 rounded-full shadow-lg ${
                          isTop5 
                            ? 'bg-gradient-to-r from-primary to-primary/80 text-white' 
                            : 'bg-white/95 text-foreground border border-border'
                        }`}>
                          #{displayRank} {isTop5 && '🔥'}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="space-y-2 md:space-y-3">
                        <h3 className="text-[13px] md:text-[15px] font-semibold text-foreground truncate leading-tight">
                          {product.producto_nombre}
                        </h3>
                        {product.categoria && (
                          <p className="text-[11px] md:text-[13px] text-muted-foreground truncate">{product.categoria}</p>
                        )}
                        <div className="grid grid-cols-2 gap-1.5 md:gap-3">
                          <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                            <p className="text-[9px] md:text-[11px] text-muted-foreground">Ingresos</p>
                            <p className="text-[11px] md:text-sm font-bold text-foreground">{formatCurrency(getRevenue(product))}</p>
                          </div>
                          <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-muted">
                            <p className="text-[9px] md:text-[11px] text-muted-foreground">Ventas</p>
                            <p className="text-[11px] md:text-sm font-bold text-foreground">{formatNumber(getSales(product))}</p>
                          </div>
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
                  key={product.id}
                  className="bg-white dark:bg-card rounded-2xl md:rounded-[20px] border border-border/50 dark:border-border p-3 md:p-5 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  {/* Product Image - 1:1 aspect ratio */}
                  <div className="relative aspect-square bg-muted rounded-xl md:rounded-2xl overflow-hidden mb-2 md:mb-4">
                    <img
                      src={product.imagen_url || PLACEHOLDER_IMAGE}
                      alt={product.producto_nombre}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    
                    {/* Top bar */}
                    <div className="absolute top-2 md:top-3 left-2 md:left-3 right-2 md:right-3 z-10 flex items-center justify-between">
                      <span className={`text-[11px] md:text-[13px] font-bold px-2 py-0.5 md:py-1 rounded-full shadow-lg ${
                        isTop5 
                          ? 'bg-gradient-to-r from-primary to-primary/80 text-white' 
                          : 'bg-white/95 text-foreground border border-border'
                      }`}>
                        #{displayRank} {isTop5 && '🔥'}
                      </span>
                      
                      <div className="flex items-center gap-1 md:gap-2">
                        {product.producto_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isLoggedIn) {
                                navigate("/unlock");
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                return;
                              }
                              window.open(product.producto_url!, '_blank');
                            }}
                            className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5 md:h-[18px] md:w-[18px] text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isLoggedIn) {
                              navigate("/unlock");
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              return;
                            }
                            toggleFavorite(product.id, e);
                          }}
                          className="h-6 w-6 md:h-8 md:w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                        >
                          <Heart className={`h-3.5 w-3.5 md:h-[18px] md:w-[18px] transition-colors ${isFav ? 'text-primary fill-primary' : 'text-muted-foreground hover:text-foreground'}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Earnings badge - Only on desktop */}
                    {earningsPerSale > 0 && (
                      <span className="absolute bottom-2 md:bottom-3 left-2 md:left-3 z-10 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded-md shadow-sm">
                        💰 {formatCurrency(earningsPerSale)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-2 md:space-y-4">
                    <div>
                      <h3 
                        className="text-[13px] md:text-[15px] font-semibold text-foreground truncate cursor-help leading-tight"
                        title={product.producto_nombre}
                      >
                        {product.producto_nombre}
                      </h3>
                      {product.categoria && (
                        <p className="text-[11px] md:text-[13px] text-muted-foreground mt-0.5 md:mt-1 truncate">{product.categoria}</p>
                      )}
                    </div>

                    {/* Metrics Grid - Compact on mobile */}
                    <div className="grid grid-cols-2 gap-1.5 md:gap-3">
                      <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                        <div className="hidden md:flex items-center gap-1.5 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">Ingresos</span>
                        </div>
                        <p className="text-[9px] md:hidden text-muted-foreground">Ingresos</p>
                        <p className="text-[11px] md:text-sm font-bold text-foreground">
                          {formatCurrency(getRevenue(product))}
                        </p>
                      </div>

                      <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-muted">
                        <div className="hidden md:flex items-center gap-1.5 mb-1">
                          <ShoppingCart className="h-3.5 w-3.5 text-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">Ventas</span>
                        </div>
                        <p className="text-[9px] md:hidden text-muted-foreground">Ventas</p>
                        <p className="text-[11px] md:text-sm font-bold text-foreground">
                          {formatNumber(getSales(product))}
                        </p>
                      </div>

                      {/* Price and Commission - Hidden on mobile */}
                      <div className="hidden md:block p-3 rounded-xl bg-muted">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">Precio</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(price)}
                        </p>
                      </div>

                      <div className="hidden md:block p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Percent className="h-3.5 w-3.5 text-foreground/60" />
                          <span className="text-[11px] text-muted-foreground">Comisión</span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {product.commission ? `${product.commission}%` : "6%"}
                        </p>
                      </div>
                    </div>

                    {/* Creators count - Hidden on mobile */}
                    {(product.creators_count || 0) > 0 && (
                      <div className="hidden md:flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <Users className="h-3.5 w-3.5 text-foreground/60" />
                        <span>{product.creators_count} creadores</span>
                      </div>
                    )}

                    <Button
                      className="w-full h-8 md:h-10 text-xs md:text-sm"
                      onClick={() => {
                        if (!isLoggedIn) {
                          navigate("/unlock");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          return;
                        }
                        navigate(`/videos/product/${product.id}`);
                      }}
                    >
                      <Play className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-1.5" />
                      Ver videos
                    </Button>
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
                  <span className="text-sm text-muted-foreground">Ver más productos</span>
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

export default Products;
