import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package, Plus, Trash2, Edit, ExternalLink, DollarSign, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  precio_mxn: number | null;
  price: number | null;
  commission: number | null;
  categoria: string | null;
  descripcion: string | null;
  total_ingresos_mxn: number | null;
  total_ventas: number | null;
}

const Products = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFounder, setIsFounder] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    producto_nombre: "",
    imagen_url: "",
    producto_url: "",
    price: "",
    commission: "",
    categoria: "",
    descripcion: "",
  });

  useEffect(() => {
    fetchProducts();
    checkFounderRole();
  }, []);

  const checkFounderRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();
      setIsFounder(!!data);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setProducts(data || []);
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

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      producto_nombre: "",
      imagen_url: "",
      producto_url: "",
      price: "",
      commission: "",
      categoria: "",
      descripcion: "",
    });
    setShowProductDialog(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      producto_nombre: product.producto_nombre,
      imagen_url: product.imagen_url || "",
      producto_url: product.producto_url || "",
      price: product.price?.toString() || product.precio_mxn?.toString() || "",
      commission: product.commission?.toString() || "",
      categoria: product.categoria || "",
      descripcion: product.descripcion || "",
    });
    setShowProductDialog(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error al eliminar producto",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Producto eliminado exitosamente" });
      fetchProducts();
    }
  };

  const handleSaveProduct = async () => {
    const productData = {
      producto_nombre: productForm.producto_nombre,
      imagen_url: productForm.imagen_url || null,
      producto_url: productForm.producto_url || null,
      price: productForm.price ? parseFloat(productForm.price) : null,
      precio_mxn: productForm.price ? parseFloat(productForm.price) : null,
      commission: productForm.commission ? parseFloat(productForm.commission) : null,
      categoria: productForm.categoria || null,
      descripcion: productForm.descripcion || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({
          title: "Error al actualizar producto",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Producto actualizado exitosamente" });
        setShowProductDialog(false);
        fetchProducts();
      }
    } else {
      const { error } = await supabase.from("products").insert([productData]);

      if (error) {
        toast({
          title: "Error al crear producto",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Producto creado exitosamente" });
        setShowProductDialog(false);
        fetchProducts();
      }
    }
  };

  const formatCurrency = (num: number | null) => {
    if (num === null) return "—";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />

      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Top 20 Productos TikTok Shop
            </h1>
            <p className="text-muted-foreground">
              Productos más rentables para promocionar
            </p>
          </div>
          {isFounder && (
            <Button onClick={handleAddProduct} className="mt-4 md:mt-0">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          )}
        </div>

        {products.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 text-muted-foreground mb-4 mx-auto" />
            <p className="text-muted-foreground text-lg">
              No hay productos disponibles. {isFounder && "Agrega productos manualmente."}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Product Image */}
                <div className="relative aspect-square bg-muted">
                  {product.imagen_url ? (
                    <img
                      src={product.imagen_url}
                      alt={product.producto_nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                    #{index + 1}
                  </Badge>
                  {isFounder && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {product.producto_nombre}
                    </h3>
                    {product.categoria && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {product.categoria}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1 mb-0.5">
                        <DollarSign className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground">Precio</span>
                      </div>
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(product.price || product.precio_mxn)}
                      </p>
                    </div>

                    <div className="p-2 rounded bg-accent/5 border border-accent/10">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Percent className="h-3 w-3 text-accent" />
                        <span className="text-[10px] text-muted-foreground">Comisión</span>
                      </div>
                      <p className="text-sm font-bold text-accent">
                        {product.commission ? `${product.commission}%` : "6%"}
                      </p>
                    </div>
                  </div>

                  {product.producto_url && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(product.producto_url!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver en TikTok Shop
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Producto" : "Agregar Producto"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del producto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del producto *</Label>
              <Input
                id="nombre"
                value={productForm.producto_nombre}
                onChange={(e) =>
                  setProductForm({ ...productForm, producto_nombre: e.target.value })
                }
                placeholder="Nombre del producto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imagen">URL de imagen</Label>
              <Input
                id="imagen"
                value={productForm.imagen_url}
                onChange={(e) =>
                  setProductForm({ ...productForm, imagen_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL del producto</Label>
              <Input
                id="url"
                value={productForm.producto_url}
                onChange={(e) =>
                  setProductForm({ ...productForm, producto_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Precio (MXN)</Label>
                <Input
                  id="price"
                  type="number"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                  placeholder="299"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Comisión (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  value={productForm.commission}
                  onChange={(e) =>
                    setProductForm({ ...productForm, commission: e.target.value })
                  }
                  placeholder="6"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={productForm.categoria}
                onChange={(e) =>
                  setProductForm({ ...productForm, categoria: e.target.value })
                }
                placeholder="Belleza, Hogar, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={productForm.descripcion}
                onChange={(e) =>
                  setProductForm({ ...productForm, descripcion: e.target.value })
                }
                placeholder="Descripción del producto..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProduct} disabled={!productForm.producto_nombre}>
              {editingProduct ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
