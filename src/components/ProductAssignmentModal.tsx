import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useProductSearch, ProductSearchResult } from '@/hooks/useProductSearch';
import { useToast } from '@/hooks/use-toast';
import { Search, Package, Sparkles, Check, X, Loader2, Ban, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  video_url: string;
  product_id?: string | null;
  product_name?: string | null;
  visual_keywords?: string[] | null;
  visual_product_detected?: string | null;
  thumbnail_url?: string | null;
}

interface ProductAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
  onProductAssigned?: (productId: string | null, productName: string | null) => void;
}

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

const ProductAssignmentModal = ({ isOpen, onClose, video, onProductAssigned }: ProductAssignmentModalProps) => {
  const { toast } = useToast();
  const { results, popularProducts, isSearching, isLoadingPopular, search, searchQuery, clearSearch } = useProductSearch();
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<ProductSearchResult[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load AI suggestions based on visual keywords
  useEffect(() => {
    if (!isOpen) return;
    
    const loadAiSuggestions = async () => {
      if (!video.visual_keywords?.length && !video.visual_product_detected) {
        setAiSuggestions([]);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        // Build search terms from visual analysis
        const searchTerms: string[] = [];
        if (video.visual_product_detected) {
          searchTerms.push(video.visual_product_detected);
        }
        if (video.visual_keywords?.length) {
          searchTerms.push(...video.visual_keywords.slice(0, 3));
        }

        // Search for each term and combine results
        const allResults: ProductSearchResult[] = [];
        
        for (const term of searchTerms) {
          const { data } = await supabase
            .from('products')
            .select('id, producto_nombre, imagen_url, total_ingresos_mxn, categoria, commission, price, rank')
            .ilike('producto_nombre', `%${term}%`)
            .order('total_ingresos_mxn', { ascending: false, nullsFirst: false })
            .limit(5);
          
          if (data) allResults.push(...data);
        }

        // Deduplicate by id
        const uniqueResults = [...new Map(allResults.map(p => [p.id, p])).values()];
        setAiSuggestions(uniqueResults.slice(0, 5));
      } catch (error) {
        console.error('Error loading AI suggestions:', error);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    loadAiSuggestions();
  }, [isOpen, video.visual_keywords, video.visual_product_detected]);

  const handleAnalyzeWithAI = async () => {
    if (!video.thumbnail_url && !video.video_url) {
      toast({ title: "Sin imagen", description: "Este video no tiene thumbnail para analizar", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-thumbnail-product', {
        body: { 
          videoId: video.id,
          imageUrl: video.thumbnail_url || video.video_url
        }
      });

      if (error) throw error;

      toast({ title: "✓ Análisis completado", description: "Revisa las nuevas sugerencias" });
      
      // Refresh suggestions with new visual data
      if (data?.keywords?.length || data?.productDetected) {
        const searchTerms = [data.productDetected, ...(data.keywords || [])].filter(Boolean).slice(0, 4);
        const allResults: ProductSearchResult[] = [];
        
        for (const term of searchTerms) {
          const { data: products } = await supabase
            .from('products')
            .select('id, producto_nombre, imagen_url, total_ingresos_mxn, categoria, commission, price, rank')
            .ilike('producto_nombre', `%${term}%`)
            .order('total_ingresos_mxn', { ascending: false, nullsFirst: false })
            .limit(5);
          
          if (products) allResults.push(...products);
        }

        const uniqueResults = [...new Map(allResults.map(p => [p.id, p])).values()];
        setAiSuggestions(uniqueResults.slice(0, 5));
      }
    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast({ title: "Error en análisis", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: Record<string, any> = {
        product_id: selectedProduct?.id || null,
        product_name: selectedProduct?.producto_nombre || null,
        manual_match: true,
        manual_matched_at: new Date().toISOString(),
        manual_matched_by: user?.id || null
      };

      const { error } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', video.id);

      if (error) throw error;

      toast({ 
        title: selectedProduct ? "✓ Producto asignado" : "✓ Producto removido",
        description: selectedProduct ? selectedProduct.producto_nombre : "El video ya no tiene producto asociado"
      });

      onProductAssigned?.(selectedProduct?.id || null, selectedProduct?.producto_nombre || null);
      onClose();
    } catch (error: any) {
      console.error('Error saving product assignment:', error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProduct = async () => {
    setSelectedProduct(null);
  };

  const ProductCard = ({ product, isSelected, onClick }: { product: ProductSearchResult; isSelected: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left",
        isSelected 
          ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      {product.imagen_url ? (
        <img 
          src={product.imagen_url} 
          alt={product.producto_nombre} 
          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-border"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-1">{product.producto_nombre}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {product.total_ingresos_mxn && (
            <span className="text-xs text-muted-foreground">GMV: {formatCurrency(product.total_ingresos_mxn)}</span>
          )}
          {product.rank && (
            <Badge variant="outline" className="text-[10px] h-4">#{product.rank}</Badge>
          )}
        </div>
      </div>
      {isSelected && (
        <Check className="h-5 w-5 text-primary flex-shrink-0" />
      )}
    </button>
  );

  const displayProducts = searchQuery ? results : (aiSuggestions.length > 0 ? [] : popularProducts);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 md:p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cambiar Producto
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 md:p-6 pt-4 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto por nombre..."
              value={searchQuery}
              onChange={(e) => search(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* AI Suggestions Section */}
          {!searchQuery && (aiSuggestions.length > 0 || video.visual_keywords?.length || video.thumbnail_url) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Sugerencias IA</span>
                  {isLoadingSuggestions && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>
                {video.thumbnail_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeWithAI}
                    disabled={isAnalyzing}
                    className="h-7 text-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Brain className="h-3 w-3 mr-1" />
                        Analizar con IA
                      </>
                    )}
                  </Button>
                )}
              </div>

              {video.visual_keywords?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {video.visual_keywords.map((keyword, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {aiSuggestions.length > 0 ? (
                <div className="grid gap-2">
                  {aiSuggestions.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProduct?.id === product.id}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              ) : !isLoadingSuggestions && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No hay sugerencias. Usa el buscador o analiza con IA.
                </p>
              )}
            </div>
          )}

          {/* Search Results or Popular Products */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {searchQuery 
                  ? `Resultados (${results.length})`
                  : aiSuggestions.length === 0 ? 'Productos Populares' : ''
                }
              </span>
              {(isSearching || isLoadingPopular) && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {displayProducts.length > 0 ? (
                <div className="grid gap-2">
                  {displayProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isSelected={selectedProduct?.id === product.id}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              ) : searchQuery && !isSearching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron productos</p>
                </div>
              ) : null}
            </ScrollArea>
          </div>

          {/* Selected Product Preview */}
          {selectedProduct && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium flex-1">Seleccionado: {selectedProduct.producto_nombre}</span>
              <button onClick={() => setSelectedProduct(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 p-4 md:p-6 pt-0 border-t mt-4">
          <Button
            variant="ghost"
            onClick={handleRemoveProduct}
            disabled={isSaving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Ban className="h-4 w-4 mr-2" />
            Sin producto
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductAssignmentModal;
