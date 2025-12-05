import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Video, Package, Users, CheckCircle, Zap, FileSpreadsheet, RefreshCw, Link2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const Admin = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processPhase, setProcessPhase] = useState("");
  const [processProgress, setProcessProgress] = useState(0);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  const [stats, setStats] = useState({
    videos: 0,
    products: 0,
    creators: 0,
    videosWithProduct: 0,
    videosDownloaded: 0,
    pendingMatch: 0,
  });

  useEffect(() => {
    checkFounderRole();
    // Load last sync from localStorage
    const saved = localStorage.getItem("adbroll_last_sync");
    if (saved) setLastSync(saved);
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadStats();
    }
  }, [isFounder]);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const [videosRes, productsRes, creatorsRes] = await Promise.all([
        supabase.from("videos").select("id, product_id, video_mp4_url"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("creators").select("id", { count: "exact", head: true }),
      ]);

      const videos = videosRes.data || [];
      const withProduct = videos.filter(v => v.product_id).length;
      
      setStats({
        videos: videos.length,
        products: productsRes.count || 0,
        creators: creatorsRes.count || 0,
        videosWithProduct: withProduct,
        videosDownloaded: videos.filter(v => v.video_mp4_url).length,
        pendingMatch: videos.length - withProduct,
      });
    } finally {
      setIsRefreshing(false);
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

  const saveLastSync = () => {
    const now = new Date().toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    localStorage.setItem("adbroll_last_sync", now);
    setLastSync(now);
  };

  // Match only pending videos
  const handleMatchPending = async () => {
    if (stats.pendingMatch === 0) {
      toast({ title: "Todo vinculado", description: "No hay videos pendientes." });
      return;
    }

    setIsMatching(true);
    let totalMatched = 0;

    try {
      let complete = false;
      while (!complete) {
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { batchSize: 100, threshold: 0.5 }
        });

        if (error) throw error;
        
        totalMatched += data.matchedInBatch || 0;
        complete = data.complete;
      }

      saveLastSync();
      toast({
        title: "Vinculación completada",
        description: `${totalMatched} videos vinculados con productos.`,
      });
      await loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMatching(false);
    }
  };

  // Main process: Import all files → Download videos → Match products
  const handleProcessAll = async () => {
    if (!videoFile && !productFile && !creatorFile) {
      toast({
        title: "Sin archivos",
        description: "Selecciona al menos un archivo para procesar.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);

    try {
      // Step 1: Import Products (if file exists)
      if (productFile) {
        setProcessPhase("Importando productos...");
        setProcessProgress(10);
        
        const formData = new FormData();
        formData.append("file", productFile);
        
        const { error } = await supabase.functions.invoke("process-kalodata-products", {
          body: formData,
        });
        if (error) throw new Error(`Error en productos: ${error.message}`);
        setProductFile(null);
      }

      // Step 2: Import Creators (if file exists)
      if (creatorFile) {
        setProcessPhase("Importando creadores...");
        setProcessProgress(20);
        
        const formData = new FormData();
        formData.append("file", creatorFile);
        
        const { error } = await supabase.functions.invoke("process-kalodata-creators", {
          body: formData,
        });
        if (error) throw new Error(`Error en creadores: ${error.message}`);
        setCreatorFile(null);
      }

      // Step 3: Import Videos (if file exists)
      if (videoFile) {
        setProcessPhase("Importando videos...");
        setProcessProgress(30);
        
        const formData = new FormData();
        formData.append("file", videoFile);
        
        const { error } = await supabase.functions.invoke("process-kalodata", {
          body: formData,
        });
        if (error) throw new Error(`Error en videos: ${error.message}`);
        setVideoFile(null);
      }

      // Step 4: Download pending videos
      setProcessPhase("Descargando videos de TikTok...");
      setProcessProgress(40);
      
      let downloadedCount = 0;
      let continueDownload = true;
      
      while (continueDownload) {
        const { data, error } = await supabase.functions.invoke("download-videos-batch", {
          body: { batchSize: 5 },
        });
        
        if (error) {
          console.warn("Download batch error:", error.message);
          break;
        }
        
        if (!data || data.processed === 0 || data.remaining === 0) {
          continueDownload = false;
        } else {
          downloadedCount += data.successful || 0;
          const progress = 40 + Math.min(30, (downloadedCount / 50) * 30);
          setProcessProgress(progress);
          setProcessPhase(`Descargando videos... (${downloadedCount} completados)`);
          await new Promise(r => setTimeout(r, 500));
          
          if (downloadedCount >= 100) break;
        }
      }

      // Step 5: Match all videos with products
      setProcessPhase("Vinculando videos con productos...");
      setProcessProgress(75);
      
      let matchComplete = false;
      let totalMatched = 0;
      
      while (!matchComplete) {
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { batchSize: 100, threshold: 0.5 }
        });
        
        if (error) {
          console.warn("Match error:", error.message);
          break;
        }
        
        totalMatched += data.matchedInBatch || 0;
        matchComplete = data.complete;
        
        const progress = 75 + Math.min(20, (totalMatched / 100) * 20);
        setProcessProgress(progress);
        setProcessPhase(`Vinculando productos... (${totalMatched} vinculados)`);
      }

      // Done!
      setProcessProgress(100);
      setProcessPhase("¡Proceso completado!");
      saveLastSync();
      
      toast({
        title: "¡Proceso completado!",
        description: `${downloadedCount} videos descargados, ${totalMatched} productos vinculados.`,
      });

      await loadStats();
      
      // Reset file inputs
      const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => input.value = '');

    } catch (error: any) {
      toast({
        title: "Error en el proceso",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessPhase("");
      setProcessProgress(0);
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

  const matchPercent = stats.videos > 0 ? ((stats.videosWithProduct / stats.videos) * 100).toFixed(0) : 0;
  const downloadPercent = stats.videos > 0 ? ((stats.videosDownloaded / stats.videos) * 100).toFixed(0) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Panel de Importación</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Last Sync & Quick Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Última sincronización: {lastSync || "Nunca"}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadStats}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMatchPending}
              disabled={isMatching || stats.pendingMatch === 0}
            >
              <Link2 className={`h-4 w-4 mr-1 ${isMatching ? 'animate-pulse' : ''}`} />
              {isMatching ? "Vinculando..." : `Vincular (${stats.pendingMatch})`}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Videos</p>
                  <p className="text-xl font-bold">{stats.videos}</p>
                  <p className="text-xs text-green-600">{downloadPercent}% MP4</p>
                </div>
                <Video className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Productos</p>
                  <p className="text-xl font-bold">{stats.products}</p>
                  <p className="text-xs text-green-600">{matchPercent}% vinculados</p>
                </div>
                <Package className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Creadores</p>
                  <p className="text-xl font-bold">{stats.creators}</p>
                </div>
                <Users className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* File Upload Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Archivos de Kalodata
            </CardTitle>
            <CardDescription>
              Sube archivos nuevos o actualizaciones de datos existentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Videos File */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="video-file" className="text-sm font-medium">Videos</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {videoFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            {/* Products File */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="product-file" className="text-sm font-medium">Productos</Label>
                <Input
                  id="product-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setProductFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {productFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            {/* Creators File */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="creator-file" className="text-sm font-medium">Creadores</Label>
                <Input
                  id="creator-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setCreatorFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {creatorFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Los archivos actualizan datos existentes sin duplicar registros (upsert inteligente)
            </p>
          </CardContent>
        </Card>

        {/* Process Button */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6 pb-6 space-y-4">
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{processPhase}</span>
                  <span className="text-muted-foreground">{processProgress}%</span>
                </div>
                <Progress value={processProgress} className="h-2" />
              </div>
            )}
            
            <Button 
              onClick={handleProcessAll}
              disabled={isProcessing || (!videoFile && !productFile && !creatorFile)}
              size="lg"
              className="w-full h-14 text-lg font-semibold"
            >
              {isProcessing ? (
                <>
                  <Zap className="h-5 w-5 mr-2 animate-pulse" />
                  {processPhase || "Procesando..."}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  🚀 Procesar Todo
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Importa → Descarga MP4 → Vincula productos automáticamente
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
