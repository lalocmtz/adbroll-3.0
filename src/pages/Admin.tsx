import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft, Video, Package, Users, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  // Stats
  const [stats, setStats] = useState({
    videos: 0,
    products: 0,
    creators: 0,
  });

  useEffect(() => {
    checkFounderRole();
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadStats();
    }
  }, [isFounder]);

  const loadStats = async () => {
    const [videosRes, productsRes, creatorsRes] = await Promise.all([
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("creators").select("id", { count: "exact", head: true }),
    ]);

    setStats({
      videos: videosRes.count || 0,
      products: productsRes.count || 0,
      creators: creatorsRes.count || 0,
    });
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

      toast({
        title: "¡Videos importados!",
        description: `${successCount} videos cargados exitosamente.`,
      });

      loadStats();
      setVideoFile(null);
      
      // Reset file input
      const input = document.getElementById('video-file') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error: any) {
      toast({
        title: "Error al procesar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideos(false);
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
        title: "¡Productos importados!",
        description: `${successCount} productos cargados exitosamente.`,
      });

      loadStats();
      setProductFile(null);
      
      const input = document.getElementById('product-file') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error: any) {
      toast({
        title: "Error al procesar productos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingProducts(false);
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
        title: "¡Creadores importados!",
        description: `${successCount} creadores cargados exitosamente.`,
      });

      loadStats();
      setCreatorFile(null);
      
      const input = document.getElementById('creator-file') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error: any) {
      toast({
        title: "Error al procesar creadores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingCreators(false);
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
          <h1 className="text-2xl font-bold text-foreground">Panel de Importación</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Videos
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Videos</p>
                    <p className="text-2xl font-bold">{stats.videos}</p>
                  </div>
                  <Video className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Productos</p>
                    <p className="text-2xl font-bold">{stats.products}</p>
                  </div>
                  <Package className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Creadores</p>
                    <p className="text-2xl font-bold">{stats.creators}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

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
            <TabsContent value="videos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Importar Videos (videos.xlsx)
                  </CardTitle>
                  <CardDescription>
                    Sube el archivo Excel con los videos. Se eliminarán los registros actuales y se insertarán todos los nuevos.
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
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {videoFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadVideos} 
                    disabled={!videoFile || isUploadingVideos}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingVideos ? "Importando..." : "Importar Videos"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Importar Productos (productos.xlsx)
                  </CardTitle>
                  <CardDescription>
                    Sube el archivo Excel con los productos. Se eliminarán los registros actuales y se insertarán todos los nuevos.
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
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {productFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadProducts} 
                    disabled={!productFile || isUploadingProducts}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingProducts ? "Importando..." : "Importar Productos"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Creators Tab */}
            <TabsContent value="creators">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Importar Creadores (creadores.xlsx)
                  </CardTitle>
                  <CardDescription>
                    Sube el archivo Excel con los creadores. Se eliminarán los registros actuales y se insertarán todos los nuevos.
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
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {creatorFile.name}
                      </p>
                    )}
                  </div>

                  <Button 
                    onClick={handleUploadCreators} 
                    disabled={!creatorFile || isUploadingCreators}
                    className="w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    {isUploadingCreators ? "Importando..." : "Importar Creadores"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Instructions */}
          <Card className="mt-6 bg-muted">
            <CardHeader>
              <CardTitle className="text-lg">Instrucciones de Importación</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Cada importación <strong>elimina todos los registros actuales</strong> de esa tabla</li>
                <li>Lee y valida las columnas del archivo Excel</li>
                <li>Inserta <strong>todos los registros</strong> del archivo (sin límite de "Top X")</li>
                <li>Los videos se ordenarán por ingresos, productos y creadores por fecha</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
