import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft, Video, Package, Users, Plus, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const [isUploadingProducts, setIsUploadingProducts] = useState(false);
  const [isUploadingCreators, setIsUploadingCreators] = useState(false);
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

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleProductFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProductFile(e.target.files[0]);
    }
  };

  const handleCreatorFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCreatorFile(e.target.files[0]);
    }
  };

  const handleUploadVideos = async () => {
    if (!videoFile) return;

    setIsUploadingVideos(true);
    try {
      const formData = new FormData();
      formData.append("file", videoFile);

      const { data, error } = await supabase.functions.invoke("process-kalodata", {
        body: formData,
      });

      if (error) throw error;

      const successCount = data.processed || 0;
      const aiProcessed = data.ai_processed || 0;
      const aiFailed = data.ai_failed || 0;

      toast({
        title: "¡Videos procesados exitosamente!",
        description: `${successCount} videos cargados. IA: ${aiProcessed} procesados, ${aiFailed > 0 ? `${aiFailed} fallaron.` : 'todos exitosos.'}`,
      });

      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error al procesar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideos(false);
      setVideoFile(null);
    }
  };

  const handleUploadProducts = async () => {
    if (!productFile) return;

    setIsUploadingProducts(true);
    try {
      const formData = new FormData();
      formData.append("file", productFile);

      const { data, error } = await supabase.functions.invoke("process-kalodata-products", {
        body: formData,
      });

      if (error) throw error;

      const successCount = data.processed || 0;

      toast({
        title: "¡Productos procesados exitosamente!",
        description: `${successCount} productos cargados en la base de datos.`,
      });

      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error al procesar productos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingProducts(false);
      setProductFile(null);
    }
  };

  const handleUploadCreators = async () => {
    if (!creatorFile) return;

    setIsUploadingCreators(true);
    try {
      const formData = new FormData();
      formData.append("file", creatorFile);

      const { data, error } = await supabase.functions.invoke("process-kalodata-creators", {
        body: formData,
      });

      if (error) throw error;

      const successCount = data.processed || 0;

      toast({
        title: "¡Creadores procesados exitosamente!",
        description: `${successCount} creadores cargados en la base de datos.`,
      });

      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error al procesar creadores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCreators(false);
      setCreatorFile(null);
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
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="videos" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
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
            </TabsList>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Subir Datos de Videos
                  </CardTitle>
                  <CardDescription>
                    Carga el archivo Excel con los Top 20 videos exportado desde Kalodata. 
                    Este reemplazará completamente los datos actuales del feed de videos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="video-file">Archivo Excel (.xlsx)</Label>
                    <Input
                      id="video-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleVideoFileChange}
                    />
                    {videoFile && (
                      <p className="text-sm text-muted-foreground">
                        Archivo seleccionado: {videoFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadVideos} 
                    disabled={!videoFile || isUploadingVideos}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingVideos ? "Procesando..." : "Procesar y Actualizar Videos"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-lg">Proceso de Videos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Se eliminan todos los registros de videos existentes</li>
                    <li>Se leen y validan las columnas del archivo</li>
                    <li>Se ordenan por ingresos descendente</li>
                    <li>Se seleccionan los Top 20 videos</li>
                    <li>Se guardan los datos iniciales en la base de datos</li>
                    <li>Se transcribe el contenido con IA (Lovable AI)</li>
                    <li>Se reescribe el guión con IA para ventas (Gemini 2.5 Flash)</li>
                    <li>Se actualizan los videos con los scripts generados</li>
                  </ol>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Subir Datos de Productos
                  </CardTitle>
                  <CardDescription>
                    Carga el archivo Excel con información de productos exportado desde Kalodata. 
                    Este reemplazará completamente los datos actuales de productos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-file">Archivo Excel (.xlsx)</Label>
                    <Input
                      id="product-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleProductFileChange}
                    />
                    {productFile && (
                      <p className="text-sm text-muted-foreground">
                        Archivo seleccionado: {productFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadProducts} 
                    disabled={!productFile || isUploadingProducts}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingProducts ? "Procesando..." : "Procesar y Actualizar Productos"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-lg">Proceso de Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Se eliminan todos los registros de productos existentes</li>
                    <li>Se leen y validan las columnas del archivo</li>
                    <li>Se ordenan por ingresos totales descendente</li>
                    <li>Se seleccionan los Top 50 productos</li>
                    <li>Se guardan en la base de datos con métricas agregadas</li>
                    <li>Columnas incluidas: nombre, URL, categoría, precio, ventas, ingresos, ROAS</li>
                  </ol>
                </CardContent>
              </Card>

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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Subir Datos de Creadores
                  </CardTitle>
                  <CardDescription>
                    Carga el archivo Excel con información de creadores exportado desde Kalodata. 
                    Este reemplazará completamente los datos actuales de creadores.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="creator-file">Archivo Excel (.xlsx)</Label>
                    <Input
                      id="creator-file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleCreatorFileChange}
                    />
                    {creatorFile && (
                      <p className="text-sm text-muted-foreground">
                        Archivo seleccionado: {creatorFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadCreators} 
                    disabled={!creatorFile || isUploadingCreators}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingCreators ? "Procesando..." : "Procesar y Actualizar Creadores"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-lg">Proceso de Creadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Se eliminan todos los registros de creadores existentes</li>
                    <li>Se leen y validan las columnas del archivo</li>
                    <li>Se ordenan por ingresos totales descendente</li>
                    <li>Se seleccionan los Top 100 creadores</li>
                    <li>Se guardan en la base de datos con métricas agregadas</li>
                    <li>Columnas incluidas: usuario, nombre, seguidores, videos, ventas, ingresos, ROAS</li>
                  </ol>
                </CardContent>
              </Card>
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
