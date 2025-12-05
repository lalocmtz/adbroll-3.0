import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star, Filter, ChevronLeft, ChevronRight, Heart, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

type SortOption = "revenue_30d" | "sales_30d" | "commission" | "creators_count" | "rating";

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Filters
  const [sortBy, setSortBy] = useState<SortOption>("revenue_30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minCommission, setMinCommission] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  
  // Categories for filter
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
    fetchFavorites();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, sortBy, categoryFilter, minCommission, minRating]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("rank", { ascending: true, nullsFirst: false });

      if (error) throw error;
      
      setProducts(data || []);
      
      // Extract unique categories
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
    
    // Apply category filter
    if (categoryFilter !== "all") {
      result = result.filter(p => p.categoria === categoryFilter);
    }
    
    // Apply minimum commission filter
    if (minCommission) {
      const minComm = parseFloat(minCommission);
      if (!isNaN(minComm)) {
        result = result.filter(p => (p.commission || 0) >= minComm);
      }
    }
    
    // Apply minimum rating filter
    if (minRating) {
      const minRate = parseFloat(minRating);
      if (!isNaN(minRate)) {
        result = result.filter(p => (p.rating || 0) >= minRate);
      }
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "revenue_30d":
          return (getRevenue(b) || 0) - (getRevenue(a) || 0);
        case "sales_30d":
          return (getSales(b) || 0) - (getSales(a) || 0);
        case "commission":
          return (b.commission || 0) - (a.commission || 0);
        case "creators_count":
          return (b.creators_count || 0) - (a.creators_count || 0);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });
    
    setFilteredProducts(result);
    setCurrentPage(1);
  };

  const formatCurrency = (num: number | null) => {
    if (num === null || num === undefined) return "—";
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
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

  const getCommissionAmount = (product: Product): number | null => {
    if (product.commission_amount) return product.commission_amount;
    const price = product.price || product.precio_mxn;
    const rate = product.commission || 6;
    if (!price) return null;
    return price * (rate / 100);
  };

  const getRevenue = (product: Product): number | null => {
    return product.revenue_30d || product.total_ingresos_mxn;
  };

  const getSales = (product: Product): number | null => {
    return product.sales_7d || product.total_ventas;
  };

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="py-4 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
          Productos TikTok Shop
        </h1>
          <p className="text-muted-foreground">
            Los productos más rentables para promocionar como creador
          </p>
          <Badge variant="secondary" className="mt-2">
            📊 Datos basados en los últimos 30 días
          </Badge>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Sort By */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ordenar por</label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue_30d">Mayor ingresos (30D)</SelectItem>
                  <SelectItem value="sales_30d">Mayor ventas (30D)</SelectItem>
                  <SelectItem value="commission">Mayor comisión %</SelectItem>
                  <SelectItem value="creators_count">Más creadores activos</SelectItem>
                  <SelectItem value="rating">Mejor calificación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Category Filter */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Categoría</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Min Commission */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Comisión mín. %</label>
              <Input
                type="number"
                placeholder="Ej: 5"
                value={minCommission}
                onChange={(e) => setMinCommission(e.target.value)}
                className="w-[100px]"
              />
            </div>
            
            {/* Min Rating */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rating mín.</label>
              <Input
                type="number"
                placeholder="Ej: 4"
                step="0.1"
                min="0"
                max="5"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-[100px]"
              />
            </div>
            
            {/* Results count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {filteredProducts.length} productos
            </div>
          </div>
        </Card>

        {filteredProducts.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              {products.length === 0 
                ? "No hay productos disponibles. El administrador debe importar el archivo de productos."
                : "No hay productos que coincidan con los filtros seleccionados."}
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product, index) => {
                const displayRank = (currentPage - 1) * PRODUCTS_PER_PAGE + index + 1;
                const isFav = favorites.has(product.id);
                const isTop5 = displayRank <= 5;
                
                return (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden hover:shadow-xl transition-all duration-300 bg-card border-border"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      <img
                        src={product.imagen_url || PLACEHOLDER_IMAGE}
                        alt={product.producto_nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      
                      {/* Top Icons Bar */}
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
                        
                        <div className="flex items-center gap-1.5">
                          {product.producto_url && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(product.producto_url!, '_blank');
                              }}
                              title="Ver en TikTok Shop"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-8 w-8 rounded-full shadow-md backdrop-blur-sm bg-background/80 hover:bg-background/90 ${isFav ? 'text-red-500' : ''}`}
                            onClick={(e) => toggleFavorite(product.id, e)}
                            title={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
                          >
                            <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
                          </Button>
                        </div>
                      </div>
                      
                      {product.rating && (
                        <Badge variant="secondary" className="absolute bottom-2 right-2 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {product.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-3 space-y-2">
                      {/* Product Name */}
                      <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]" title={product.producto_nombre}>
                        {product.producto_nombre}
                      </h3>
                      
                      {/* Category */}
                      {product.categoria && (
                        <Badge variant="outline" className="text-xs">
                          {product.categoria}
                        </Badge>
                      )}

                      {/* Metrics Grid - 2x2 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className="h-3 w-3 text-emerald-600" />
                            <span className="text-[10px] text-muted-foreground">Ingresos 30D</span>
                          </div>
                          <p className="text-sm font-bold text-emerald-600">
                            {formatCurrency(getRevenue(product))}
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <ShoppingCart className="h-3 w-3 text-foreground" />
                            <span className="text-[10px] text-muted-foreground">Ventas 30D</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {formatNumber(getSales(product))}
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-muted">
                          <div className="flex items-center gap-1 mb-0.5">
                            <DollarSign className="h-3 w-3 text-foreground" />
                            <span className="text-[10px] text-muted-foreground">Precio</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(product.price || product.precio_mxn)}
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] text-muted-foreground">Comisión</span>
                          </div>
                          <p className="text-sm font-bold text-amber-600">
                            {product.commission ? `${product.commission}%` : "6%"}
                          </p>
                        </div>
                      </div>

                      {/* Creators count */}
                      {product.creators_count && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{formatNumber(product.creators_count)} creadores activos</span>
                        </div>
                      )}

                      {/* CTA Button - Ver Videos */}
                      <Button
                        className="w-full h-9 text-sm font-semibold bg-primary hover:bg-primary/90"
                        onClick={() => navigate(`/app?productName=${encodeURIComponent(product.producto_nombre)}`)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Ver videos de este producto
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default Products;
