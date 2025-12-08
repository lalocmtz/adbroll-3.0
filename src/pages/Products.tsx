import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star, Heart, Play, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";
import { useBlurGateContext } from "@/contexts/BlurGateContext";

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
        
        {/* Category Dropdown - Locked for visitors */}
        {!isLoggedIn ? (
          <div 
            className="h-8 px-3 rounded-full border border-border/50 bg-muted/60 flex items-center gap-1.5 text-xs text-muted-foreground opacity-60 cursor-pointer"
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

        <span className="text-xs text-muted-foreground ml-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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
                    <div className="blur-sm pointer-events-none bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-5">
                      <div className="aspect-square bg-muted rounded-2xl mb-4" />
                      <div className="h-4 bg-muted rounded mb-2 w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-[20px]">
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
                  key={product.id}
                  className="bg-white dark:bg-card rounded-[20px] border border-[#E2E8F0] dark:border-border p-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                >
                  {/* Product Image - 1:1 aspect ratio */}
                  <div className="relative aspect-square bg-muted rounded-2xl overflow-hidden mb-4">
                    <img
                      src={product.imagen_url || PLACEHOLDER_IMAGE}
                      alt={product.producto_nombre}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    
                    {/* Top bar */}
                    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
                      <span className={`text-[13px] font-bold px-2.5 py-1 rounded-full shadow-lg ${
                        isTop5 
                          ? 'bg-gradient-to-r from-[#F31260] to-[#DA0C5E] text-white' 
                          : 'bg-white/95 text-[#0F172A] border border-[#E2E8F0]'
                      }`}>
                        #{displayRank} {isTop5 && '🔥'}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        {product.producto_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(product.producto_url!, '_blank');
                            }}
                            className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                          >
                            <ExternalLink className="h-[18px] w-[18px] text-[#CBD5E1] hover:text-[#1E293B] transition-colors" />
                          </button>
                        )}
                        
                        <button
                          onClick={(e) => toggleFavorite(product.id, e)}
                          className="h-8 w-8 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-md hover:bg-white transition-colors"
                        >
                          <Heart className={`h-[18px] w-[18px] transition-colors ${isFav ? 'text-[#F31260] fill-[#F31260]' : 'text-[#CBD5E1] hover:text-[#1E293B]'}`} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Rating badge */}
                    {product.rating && (
                      <span className="absolute bottom-3 right-3 bg-white/95 text-[#0F172A] text-xs font-medium px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {product.rating.toFixed(1)}
                      </span>
                    )}
                    
                    {/* Earnings badge */}
                    {earningsPerSale > 0 && (
                      <span className="absolute bottom-3 left-3 z-10 bg-[#EEF2FF] text-[#6366F1] text-xs font-medium px-2 py-1 rounded-md shadow-sm">
                        💰 Gana {formatCurrency(earningsPerSale)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <div>
                      <h3 
                        className="text-[15px] font-semibold text-[#0F172A] dark:text-foreground truncate cursor-help"
                        title={product.producto_nombre}
                      >
                        {product.producto_nombre}
                      </h3>
                      {product.categoria && (
                        <p className="text-[13px] text-[#94A3B8] mt-1">{product.categoria}</p>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-[#ECFDF5] dark:bg-success/10">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-[#475569]" />
                          <span className="text-[11px] text-[#94A3B8]">Ingresos 30D</span>
                        </div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                          {formatCurrency(getRevenue(product))}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShoppingCart className="h-3.5 w-3.5 text-[#475569]" />
                          <span className="text-[11px] text-[#94A3B8]">Ventas 30D</span>
                        </div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                          {formatNumber(getSales(product))}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-muted/50">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="h-3.5 w-3.5 text-[#475569]" />
                          <span className="text-[11px] text-[#94A3B8]">Precio</span>
                        </div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                          {formatCurrency(price)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/30">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Percent className="h-3.5 w-3.5 text-[#475569]" />
                          <span className="text-[11px] text-[#94A3B8]">Comisión</span>
                        </div>
                        <p className="text-sm font-bold text-[#0F172A] dark:text-foreground">
                          {product.commission ? `${product.commission}%` : "6%"}
                        </p>
                      </div>
                    </div>

                    {(product.creators_count || 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-[13px] text-[#94A3B8]">
                        <Users className="h-3.5 w-3.5 text-[#475569]" />
                        <span>{product.creators_count} creadores</span>
                      </div>
                    )}

                    <Button
                      className="w-full h-10"
                      onClick={() => navigate(`/videos/product/${product.id}`)}
                    >
                      <Play className="h-4 w-4" />
                      Ver videos
                    </Button>
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

export default Products;
