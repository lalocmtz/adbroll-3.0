import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Video, Package, Users, Plus, Trash2, Edit, Activity, Database, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataQualityPanel } from "@/components/admin/DataQualityPanel";
import { KalodataUploader } from "@/components/admin/KalodataUploader";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  producto_nombre: string;
  imagen_url: string | null;
  producto_url: string | null;
  price: number | null;
  commission: number | null;
  categoria: string | null;
  descripcion: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Manual product management states
  const [products, setProducts] = useState<Product[]>([]);
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
    checkFounderRole();
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadProducts();
    }
  }, [isFounder]);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProducts(data);
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
      price: product.price?.toString() || "",
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
      loadProducts();
    }
  };

  const handleSaveProduct = async () => {
    const productData = {
      producto_nombre: productForm.producto_nombre,
      imagen_url: productForm.imagen_url || null,
      producto_url: productForm.producto_url || null,
      price: productForm.price ? parseFloat(productForm.price) : null,
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
        loadProducts();
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
        loadProducts();
      }
    }
  };

  const checkFounderRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Acceso denegado",
          description: "Solo el fundador puede acceder a este panel.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setIsFounder(true);
    } catch (error) {
      console.error("Error checking founder role:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isFounder) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Centro de Datos</h1>
              <p className="text-xs text-muted-foreground">
                Panel de administración · solo fundador
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            <Database className="h-3 w-3 mr-1" />
            Supabase · edge functions
          </Badge>
        </div>
      </header>

      {/* Hero section — primary upload zone */}
      <section className="border-b border-border bg-gradient-to-b from-primary/[0.04] to-transparent">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-5xl mx-auto">
            <Badge
              variant="secondary"
              className="mb-4 border border-primary/20 bg-primary/5 text-primary"
            >
              <Sparkles className="h-3 w-3 mr-1.5" />
              Ingesta manual de Kalodata
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-balance">
              Sube los exports XLSX de Kalodata para alimentar la plataforma
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Tres archivos distintos (videos, productos, creadores). Cada uno
              se procesa con upsert determinístico por ID de TikTok — no hay
              duplicados, solo actualizaciones limpias del dataset existente.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="videos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="videos">
                <Video className="h-4 w-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Productos
              </TabsTrigger>
              <TabsTrigger value="creators">
                <Users className="h-4 w-4 mr-2" />
                Creadores
              </TabsTrigger>
              <TabsTrigger value="quality">
                <Activity className="h-4 w-4 mr-2" />
                Calidad
              </TabsTrigger>
            </TabsList>

            {/* Data Quality Tab */}
            <TabsContent value="quality" className="space-y-6">
              <DataQualityPanel />
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-6">
              <KalodataUploader
                kind="videos"
                title="Top Videos del día"
                description="Export XLSX de Kalodata con los videos de TikTok Shop ordenados por ingresos."
                edgeFunction="process-kalodata"
                steps={[
                  "Valida columnas y formato (soporta v1 y v2 de Kalodata)",
                  "Extrae tiktok_video_id desde la URL del video",
                  "Upsert determinístico en daily_feed sin duplicados",
                  "Transcribe contenido con IA (Lovable AI)",
                  "Reescribe guión con Gemini 2.5 Flash para ventas",
                  "Actualiza contadores y relaciones con productos",
                ]}
              />
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <KalodataUploader
                kind="products"
                title="Top Productos"
                description="Export XLSX con el catálogo de productos más vendidos en TikTok Shop México."
                edgeFunction="process-kalodata-products"
                steps={[
                  "Valida columnas y detecta esquema (v1/v2)",
                  "Extrae tiktok_product_id desde la URL del producto",
                  "Upsert en tabla products sin borrar el dataset existente",
                  "Agrega métricas: precio, ventas, ingresos, ROAS, categoría",
                  "Sincroniza contadores de videos asociados",
                ]}
              />

              {/* Manual Product Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Gestión Manual de Productos</CardTitle>
                      <CardDescription>Agrega, edita o elimina productos manualmente</CardDescription>
                    </div>
                    <Button onClick={handleAddProduct}>
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay productos. Agrega uno para comenzar.
                    </p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Imagen</TableHead>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Comisión</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map((product) => (
                            <TableRow key={product.id}>
                              <TableCell>
                                {product.imagen_url ? (
                                  <img
                                    src={product.imagen_url}
                                    alt={product.producto_nombre}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded bg-muted" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {product.producto_nombre}
                              </TableCell>
                              <TableCell>
                                {product.price ? `$${product.price}` : "-"}
                              </TableCell>
                              <TableCell>
                                {product.commission ? `${product.commission}%` : "-"}
                              </TableCell>
                              <TableCell>{product.categoria || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditProduct(product)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Creators Tab */}
            <TabsContent value="creators" className="space-y-6">
              <KalodataUploader
                kind="creators"
                title="Top Creadores"
                description="Export XLSX con los creadores UGC más rentables en TikTok Shop México."
                edgeFunction="process-kalodata-creators"
                steps={[
                  "Valida columnas y normaliza handles de TikTok",
                  "Upsert en creators con matching por username",
                  "Agrega métricas: seguidores, videos, ventas, ingresos, ROAS",
                  "Conserva datos de contacto si ya existían",
                ]}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Producto" : "Agregar Producto"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del producto
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="producto_nombre">Nombre del Producto *</Label>
              <Input
                id="producto_nombre"
                value={productForm.producto_nombre}
                onChange={(e) =>
                  setProductForm({ ...productForm, producto_nombre: e.target.value })
                }
                placeholder="Ej: iPhone 15 Pro Max"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imagen_url">URL de la Imagen</Label>
              <Input
                id="imagen_url"
                value={productForm.imagen_url}
                onChange={(e) =>
                  setProductForm({ ...productForm, imagen_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="producto_url">Link del Producto</Label>
              <Input
                id="producto_url"
                value={productForm.producto_url}
                onChange={(e) =>
                  setProductForm({ ...productForm, producto_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Precio (MXN)</Label>
                <Input
                  id="price"
                  type="number"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="commission">Comisión (%)</Label>
                <Input
                  id="commission"
                  type="number"
                  value={productForm.commission}
                  onChange={(e) =>
                    setProductForm({ ...productForm, commission: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={productForm.categoria}
                onChange={(e) =>
                  setProductForm({ ...productForm, categoria: e.target.value })
                }
                placeholder="Ej: Electrónica"
              />
            </div>
            <div className="grid gap-2">
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
            <Button
              onClick={handleSaveProduct}
              disabled={!productForm.producto_nombre}
            >
              {editingProduct ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
