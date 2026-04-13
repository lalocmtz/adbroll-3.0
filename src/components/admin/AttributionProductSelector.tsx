import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Globe } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarket } from "@/contexts/MarketContext";

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
  market?: string;
}

interface Props {
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

const formatCurrency = (num: number | null | undefined): string => {
  if (!num) return '$0';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

export const AttributionProductSelector = ({ selectedProduct, onSelectProduct }: Props) => {
  const { market } = useMarket();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [market]);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, producto_nombre, imagen_url, total_ingresos_mxn, total_ventas, market")
      .eq("market", market)
      .order("total_ingresos_mxn", { ascending: false, nullsFirst: false })
      .limit(200);
    setProducts(data || []);
    setLoading(false);
  };

  const filtered = search.trim()
    ? products.filter(p => 
        p.producto_nombre.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">
          <Globe className="h-3 w-3 mr-1" />
          {market === 'mx' ? '🇲🇽 MX' : '🇺🇸 US'}
        </Badge>
        <span className="text-xs text-muted-foreground">{products.length} productos</span>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Buscar producto en ${market.toUpperCase()}...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {selectedProduct && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            {selectedProduct.imagen_url ? (
              <img src={selectedProduct.imagen_url} alt="" className="w-10 h-10 rounded object-cover" />
            ) : (
              <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{selectedProduct.producto_nombre}</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(selectedProduct.total_ingresos_mxn)} • {selectedProduct.total_ventas || 0} ventas
              </p>
            </div>
            <Badge variant="default" className="text-xs">Seleccionado</Badge>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
          ) : (
            filtered.map(product => (
              <button
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className={`w-full text-left p-2.5 rounded-lg flex items-center gap-3 transition-colors hover:bg-accent/50 ${
                  selectedProduct?.id === product.id ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                }`}
              >
                {product.imagen_url ? (
                  <img src={product.imagen_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{product.producto_nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(product.total_ingresos_mxn)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
