import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Package, ExternalLink, DollarSign, Percent, TrendingUp, ShoppingCart, Users, Star, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [sortBy, setSortBy] = useState<SortOption>("revenue_30d");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minCommission, setMinCommission] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  
  // Categories for filter
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
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
    setCurrentPage(1); // Reset to first page when filters change
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
    return product.sales_7d || product.total_ventas; // sales_7d actually contains 30d data
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
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedProducts.map((product, index) => {
                const displayRank = (currentPage - 1) * PRODUCTS_PER_PAGE + index + 1;
                
                return (
                  <Card 
                    key={product.id} 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-card"
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-muted">
                      <img
                        src={product.imagen_url || PLACEHOLDER_IMAGE}
                        alt={product.producto_nombre}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                        }}
                      />
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground font-bold">
                        #{displayRank}
                      </Badge>
                      {product.rating && (
                        <Badge variant="secondary" className="absolute top-2 right-2 flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {product.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {/* Product Name */}
                      <h3 className="font-semibold text-foreground line-clamp-1" title={product.producto_nombre}>
                        {product.producto_nombre}
                      </h3>
                      
                      {/* Category */}
                      {product.categoria && (
                        <Badge variant="outline" className="text-xs">
                          {product.categoria}
                        </Badge>
                      )}

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Revenue 30d - Ingresos */}
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="flex items-center gap-1 mb-0.5">
                            <TrendingUp className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-muted-foreground uppercase">Ingresos 30D</span>
                          </div>
                          <p className="text-sm font-bold text-primary">
                            {formatCurrency(getRevenue(product))}
                          </p>
                        </div>

                        {/* Sales 30d - Ventas */}
                        <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                          <div className="flex items-center gap-1 mb-0.5">
                            <ShoppingCart className="h-3 w-3 text-accent-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase">Ventas 30D</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {formatNumber(getSales(product))}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-center gap-1 mb-0.5">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase">Precio</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {formatCurrency(product.price || product.precio_mxn)}
                          </p>
                        </div>

                        {/* Commission */}
                        <div className="p-2 rounded-lg bg-secondary/50 border border-border">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Percent className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase">Comisión</span>
                          </div>
                          <p className="text-sm font-bold text-foreground">
                            {product.commission ? `${product.commission}%` : "6%"} 
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              ({formatCurrency(getCommissionAmount(product))})
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Creators count */}
                      {product.creators_count && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{formatNumber(product.creators_count)} creadores activos</span>
                        </div>
                      )}

                      {/* CTA Button */}
                      {product.producto_url && (
                        <Button
                          variant="default"
                          className="w-full"
                          onClick={() => window.open(product.producto_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver en TikTok Shop
                        </Button>
                      )}
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
      </main>
    </div>
  );
};

export default Products;
