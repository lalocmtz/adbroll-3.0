import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star, Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FilterPills, DataSubtitle } from "@/components/FilterPills";
import { CompactPagination } from "@/components/CompactPagination";

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

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
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

      {/* Filter Pills */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <FilterPills
          options={SORT_OPTIONS}
          value={sortBy}
          onChange={(v) => setSortBy(v as SortOption)}
        />
        
        {/* Category Dropdown */}
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

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredProducts.length} productos
        </span>
      </div>

      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
          <p className="text-muted-foreground text-lg">
            {products.length === 0 
              ? "No hay productos disponibles."
              : "No hay productos que coincidan con los filtros."}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedProducts.map((product, index) => {
              const displayRank = (currentPage - 1) * PRODUCTS_PER_PAGE + index + 1;
              const isFav = favorites.has(product.id);
              const isTop5 = displayRank <= 5;
              
              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border-border"
                >
                  <div className="relative aspect-square bg-muted overflow-hidden">
                    <img
                      src={product.imagen_url || PLACEHOLDER_IMAGE}
                      alt={product.producto_nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    
                    <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                      <Badge 
                        className={`font-bold text-xs px-2 py-0.5 shadow-lg ${
                          isTop5 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-background/90 text-foreground border'
                        }`}
                      >
                        #{displayRank} {isTop5 && '🔥'}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        {product.producto_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(product.producto_url!, '_blank');
                            }}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-7 w-7 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 ${isFav ? 'text-red-500' : ''}`}
                          onClick={(e) => toggleFavorite(product.id, e)}
                        >
                          <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    
                    {product.rating && (
                      <Badge variant="secondary" className="absolute bottom-2 right-2 flex items-center gap-1 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {product.rating.toFixed(1)}
                      </Badge>
                    )}
                    
                    {/* Earnings per sale badge - bottom left */}
                    {(() => {
                      const price = product.price || product.precio_mxn || 0;
                      const commissionRate = product.commission || 6;
                      const earningsPerSale = price * (commissionRate / 100);
                      return earningsPerSale > 0 ? (
                        <Badge className="absolute bottom-2 left-2 z-10 bg-black text-white text-[10px] font-semibold px-2 py-1 shadow-lg">
                          💰 Gana {formatCurrency(earningsPerSale)} por venta
                        </Badge>
                      ) : null;
                    })()}
                  </div>

                  <CardContent className="p-2.5 space-y-2">
                    <h3 className="font-semibold text-xs text-foreground line-clamp-2 min-h-[2rem]">
                      {product.producto_nombre}
                    </h3>
                    
                    {product.categoria && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {product.categoria}
                      </Badge>
                    )}

                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                        <div className="flex items-center gap-1 mb-0.5">
                          <TrendingUp className="h-2.5 w-2.5 text-emerald-600" />
                          <span className="text-[9px] text-muted-foreground">Ingresos 30D</span>
                        </div>
                        <p className="text-xs font-bold text-emerald-600">
                          {formatCurrency(getRevenue(product))}
                        </p>
                      </div>

                      <div className="p-1.5 rounded-md bg-muted">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ShoppingCart className="h-2.5 w-2.5 text-foreground" />
                          <span className="text-[9px] text-muted-foreground">Ventas 30D</span>
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          {formatNumber(getSales(product))}
                        </p>
                      </div>

                      <div className="p-1.5 rounded-md bg-muted">
                        <div className="flex items-center gap-1 mb-0.5">
                          <DollarSign className="h-2.5 w-2.5 text-foreground" />
                          <span className="text-[9px] text-muted-foreground">Precio</span>
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          {formatCurrency(product.price || product.precio_mxn)}
                        </p>
                      </div>

                      <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Percent className="h-2.5 w-2.5 text-amber-600" />
                          <span className="text-[9px] text-muted-foreground">Comisión</span>
                        </div>
                        <p className="text-xs font-bold text-amber-600">
                          {product.commission ? `${product.commission}%` : "6%"}
                        </p>
                      </div>
                    </div>

                    {(product.creators_count || 0) > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{product.creators_count} creadores activos</span>
                      </div>
                    )}

                    <Button
                      className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                      onClick={() => navigate(`/videos/product/${product.id}`)}
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Ver videos
                    </Button>
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

export default Products;
