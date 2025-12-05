import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft, Video, Package, Users, CheckCircle, Download, RefreshCw, AlertCircle, Sparkles, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const Admin = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [isUploadingVideos, setIsUploadingVideos] = useState(false);
  const [isUploadingProducts, setIsUploadingProducts] = useState(false);
  const [isUploadingCreators, setIsUploadingCreators] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchStats, setMatchStats] = useState({ matched: 0, unmatched: 0, total: 0 });
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    videos: 0,
    products: 0,
    creators: 0,
  });

  // Download stats
  const [downloadStats, setDownloadStats] = useState({
    total: 0,
    downloaded: 0,
    pending: 0,
    failed: 0,
  });

  useEffect(() => {
    checkFounderRole();
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadStats();
      loadDownloadStats();
      loadMatchStats();
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

  const loadDownloadStats = async () => {
    const { data: videos } = await supabase
      .from("videos")
      .select("processing_status, video_mp4_url");

    if (videos) {
      const total = videos.length;
      const downloaded = videos.filter(v => v.video_mp4_url).length;
      const pending = videos.filter(v => !v.video_mp4_url && v.processing_status === 'pending').length;
      const failed = videos.filter(v => 
        ['download_failed', 'no_mp4_url', 'upload_failed'].includes(v.processing_status || '')
      ).length;

      setDownloadStats({ total, downloaded, pending, failed });
    }
  };

  const loadMatchStats = async () => {
    const { data: videos } = await supabase
      .from("videos")
      .select("id, product_id");

    if (videos) {
      const total = videos.length;
      const matched = videos.filter(v => v.product_id).length;
      const unmatched = total - matched;
      setMatchStats({ matched, unmatched, total });
    }
  };

  const handleSmartMatch = async () => {
    setIsMatching(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-match-videos-products");

      if (error) throw error;

      toast({
        title: "Matching completado",
        description: `${data.matchedCount || 0} videos vinculados, ${data.updatedCount || 0} actualizados.`,
      });

      loadMatchStats();
      loadStats();
    } catch (error: any) {
      toast({
        title: "Error en matching",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
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

      toast({
        title: "¡Videos importados!",
        description: `${successCount} videos cargados. Iniciando vinculación automática...`,
      });

      loadStats();
      loadDownloadStats();
      setVideoFile(null);
      
      // Reset file input
      const input = document.getElementById('video-file') as HTMLInputElement;
      if (input) input.value = '';

      // Auto-trigger smart matching
      setIsMatching(true);
      toast({ title: "Vinculando productos...", description: "Este proceso puede tardar unos segundos." });
      
      const { data: matchData } = await supabase.functions.invoke("auto-match-videos-products");
      
      toast({
        title: "Vinculación completada",
        description: `${matchData?.matchedCount || 0} videos vinculados con productos.`,
      });
      
      loadMatchStats();
      
    } catch (error: any) {
      toast({
        title: "Error al procesar videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingVideos(false);
      setIsMatching(false);
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
        description: `${successCount} productos cargados. Iniciando vinculación automática...`,
      });

      loadStats();
      setProductFile(null);
      
      const input = document.getElementById('product-file') as HTMLInputElement;
      if (input) input.value = '';

      // Auto-trigger smart matching after products upload
      setIsMatching(true);
      const { data: matchData } = await supabase.functions.invoke("auto-match-videos-products");
      
      toast({
        title: "Vinculación completada",
        description: `${matchData?.matchedCount || 0} videos vinculados con productos.`,
      });
      
      loadMatchStats();
      
    } catch (error: any) {
      toast({
        title: "Error al procesar productos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingProducts(false);
      setIsMatching(false);
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

  const handleDownloadBatch = async () => {
    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("download-videos-batch", {
        body: { batchSize: 5 },
      });

      if (error) throw error;

      toast({
        title: "Lote procesado",
        description: `${data.successful || 0} descargados, ${data.failed || 0} fallidos. Quedan ${data.remaining || 0} pendientes.`,
      });

      loadDownloadStats();
      
    } catch (error: any) {
      toast({
        title: "Error al descargar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    
    try {
      // Keep downloading batches until no more pending
      while (true) {
        const { data, error } = await supabase.functions.invoke("download-videos-batch", {
          body: { batchSize: 5 },
        });

        if (error) throw error;

        if (data.processed === 0) {
          break; // No more videos to process
        }

        totalProcessed += data.processed || 0;
        totalSuccess += data.successful || 0;
        totalFailed += data.failed || 0;

        // Update stats after each batch
        await loadDownloadStats();

        toast({
          title: "Progreso de descarga",
          description: `${totalSuccess} descargados, ${totalFailed} fallidos. Quedan ${data.remaining || 0}...`,
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Safety limit - stop after 200 videos
        if (totalProcessed >= 200) {
          toast({
            title: "Límite alcanzado",
            description: "Descarga pausada después de 200 videos. Haz clic de nuevo para continuar.",
          });
          break;
        }
      }

      toast({
        title: "Descarga completada",
        description: `Total: ${totalSuccess} descargados, ${totalFailed} fallidos.`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error en descarga masiva",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      loadDownloadStats();
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

  const downloadProgress = downloadStats.total > 0 
    ? (downloadStats.downloaded / downloadStats.total) * 100 
    : 0;

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

          {/* MP4 Download Status */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Estado de Descarga de MP4
              </CardTitle>
              <CardDescription>
                Descarga los videos de TikTok para reproducción local sin embeds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{downloadStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{downloadStats.downloaded}</p>
                  <p className="text-xs text-muted-foreground">Descargados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{downloadStats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{downloadStats.failed}</p>
                  <p className="text-xs text-muted-foreground">Fallidos</p>
                </div>
              </div>

              <Progress value={downloadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {downloadProgress.toFixed(1)}% completado
              </p>

              <div className="flex gap-2">
                <Button 
                  onClick={handleDownloadBatch} 
                  disabled={isDownloading || downloadStats.pending === 0}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                  Descargar 5 videos
                </Button>
                <Button 
                  onClick={handleDownloadAll} 
                  disabled={isDownloading || downloadStats.pending === 0}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? "Descargando..." : "Descargar todos"}
                </Button>
              </div>

              {downloadStats.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span>Algunos videos fallaron. Haz clic en "Descargar todos" para reintentar.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Product Matching */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Link className="h-5 w-5 mr-2" />
                Vinculación Inteligente de Productos
              </CardTitle>
              <CardDescription>
                Vincula automáticamente videos con productos usando matching avanzado con IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-foreground">{matchStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Videos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{matchStats.matched}</p>
                  <p className="text-xs text-muted-foreground">Con Producto</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-500">{matchStats.unmatched}</p>
                  <p className="text-xs text-muted-foreground">Sin Producto</p>
                </div>
              </div>

              <Progress 
                value={matchStats.total > 0 ? (matchStats.matched / matchStats.total) * 100 : 0} 
                className="h-2" 
              />
              <p className="text-sm text-muted-foreground text-center">
                {matchStats.total > 0 ? ((matchStats.matched / matchStats.total) * 100).toFixed(1) : 0}% vinculados
              </p>

              <Button 
                onClick={handleSmartMatch} 
                disabled={isMatching || matchStats.total === 0}
                className="w-full"
              >
                <Sparkles className={`h-4 w-4 mr-2 ${isMatching ? 'animate-pulse' : ''}`} />
                {isMatching ? "Vinculando productos..." : "Ejecutar Vinculación Inteligente"}
              </Button>

              {matchStats.unmatched > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                  <Sparkles className="h-4 w-4" />
                  <span>Haz clic para vincular {matchStats.unmatched} videos con sus productos correspondientes.</span>
                </div>
              )}
            </CardContent>
          </Card>

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
                        <CheckCircle className="h-4 w-4 text-green-500" />
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
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
                        <CheckCircle className="h-4 w-4 text-green-500" />
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
                <li><strong>Después de importar videos</strong>, usa "Descargar todos" para obtener los MP4</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
