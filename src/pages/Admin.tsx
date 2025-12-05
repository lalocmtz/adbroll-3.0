import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Video, Package, Users, CheckCircle, Zap, FileSpreadsheet, RefreshCw, Link2, Clock, Sparkles, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { PendingLinks } from "@/components/PendingLinks";

const Admin = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isAIMatching, setIsAIMatching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processPhase, setProcessPhase] = useState("");
  const [processProgress, setProcessProgress] = useState(0);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [lastMatchStats, setLastMatchStats] = useState<{
    fuzzy: number;
    ai: number;
    total: number;
  } | null>(null);
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
    const saved = localStorage.getItem("adbroll_last_sync");
    if (saved) setLastSync(saved);
    const savedAI = localStorage.getItem("adbroll_use_ai");
    if (savedAI !== null) setUseAI(savedAI === "true");
  }, []);

  useEffect(() => {
    if (isFounder) {
      loadStats();
    }
  }, [isFounder]);

  useEffect(() => {
    localStorage.setItem("adbroll_use_ai", String(useAI));
  }, [useAI]);

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

  // Standard matching (fuzzy only)
  const handleMatchPending = async () => {
    if (stats.pendingMatch === 0) {
      toast({ title: "Todo vinculado", description: "No hay videos pendientes." });
      return;
    }

    setIsMatching(true);
    let totalMatched = 0;
    let fuzzyTotal = 0;
    let aiTotal = 0;

    try {
      let complete = false;
      while (!complete) {
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { batchSize: 100, threshold: 0.5, useAI: false } // Fuzzy only
        });

        if (error) throw error;
        
        totalMatched += data.matchedInBatch || 0;
        fuzzyTotal += data.fuzzyMatches || 0;
        complete = data.complete;
      }

      setLastMatchStats({ fuzzy: fuzzyTotal, ai: 0, total: totalMatched });
      saveLastSync();
      toast({
        title: "Vinculación completada",
        description: `${totalMatched} videos vinculados (fuzzy matching).`,
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

  // AI-powered matching
  const handleAIMatch = async () => {
    if (stats.pendingMatch === 0) {
      toast({ title: "Todo vinculado", description: "No hay videos pendientes." });
      return;
    }

    setIsAIMatching(true);
    let totalMatched = 0;
    let fuzzyTotal = 0;
    let aiTotal = 0;

    try {
      let complete = false;
      while (!complete) {
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { batchSize: 50, threshold: 0.5, useAI: true } // With AI fallback
        });

        if (error) throw error;
        
        totalMatched += data.matchedInBatch || 0;
        fuzzyTotal += data.fuzzyMatches || 0;
        aiTotal += data.aiMatches || 0;
        complete = data.complete;
      }

      setLastMatchStats({ fuzzy: fuzzyTotal, ai: aiTotal, total: totalMatched });
      saveLastSync();
      toast({
        title: "Vinculación IA completada",
        description: `${totalMatched} videos vinculados (${fuzzyTotal} fuzzy, ${aiTotal} IA).`,
      });
      await loadStats();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAIMatching(false);
    }
  };

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
      // Step 1: Import Creators FIRST
      if (creatorFile) {
        setProcessPhase("1/5 Importando creadores...");
        setProcessProgress(5);
        
        const formData = new FormData();
        formData.append("file", creatorFile);
        
        const { error } = await supabase.functions.invoke("process-kalodata-creators", {
          body: formData,
        });
        if (error) throw new Error(`Error en creadores: ${error.message}`);
        setCreatorFile(null);
      }

      // Step 2: Import Products SECOND
      if (productFile) {
        setProcessPhase("2/5 Importando productos...");
        setProcessProgress(15);
        
        const formData = new FormData();
        formData.append("file", productFile);
        
        const { error } = await supabase.functions.invoke("process-kalodata-products", {
          body: formData,
        });
        if (error) throw new Error(`Error en productos: ${error.message}`);
        setProductFile(null);
      }

      // Step 3: Import Videos THIRD
      if (videoFile) {
        setProcessPhase("3/5 Importando videos...");
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
      setProcessPhase("4/5 Descargando videos de TikTok...");
      setProcessProgress(45);
      
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
          const progress = 45 + Math.min(25, (downloadedCount / 50) * 25);
          setProcessProgress(progress);
          setProcessPhase(`4/5 Descargando videos... (${downloadedCount} completados)`);
          await new Promise(r => setTimeout(r, 500));
          
          if (downloadedCount >= 100) break;
        }
      }

      // Step 5: Match all videos with products (using AI toggle setting)
      setProcessPhase(`5/5 Vinculando videos ${useAI ? "(con IA)" : "(fuzzy)"}...`);
      setProcessProgress(75);
      
      let matchComplete = false;
      let totalMatched = 0;
      let fuzzyTotal = 0;
      let aiTotal = 0;
      
      while (!matchComplete) {
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { batchSize: useAI ? 50 : 100, threshold: 0.5, useAI }
        });
        
        if (error) {
          console.warn("Match error:", error.message);
          break;
        }
        
        totalMatched += data.matchedInBatch || 0;
        fuzzyTotal += data.fuzzyMatches || 0;
        aiTotal += data.aiMatches || 0;
        matchComplete = data.complete;
        
        const progress = 75 + Math.min(20, (totalMatched / 100) * 20);
        setProcessProgress(progress);
        setProcessPhase(`5/5 Vinculando... (${totalMatched} vinculados${aiTotal > 0 ? `, ${aiTotal} IA` : ""})`);
      }

      setLastMatchStats({ fuzzy: fuzzyTotal, ai: aiTotal, total: totalMatched });

      // Done!
      setProcessProgress(100);
      setProcessPhase("¡Proceso completado!");
      saveLastSync();
      
      toast({
        title: "¡Proceso completado!",
        description: `${downloadedCount} videos descargados, ${totalMatched} productos vinculados${aiTotal > 0 ? ` (${aiTotal} con IA)` : ""}.`,
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
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

        {/* AI Matching Section */}
        <Card className="mb-6 border-purple-200 bg-gradient-to-r from-purple-50/50 to-indigo-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-base">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Vinculación Inteligente
            </CardTitle>
            <CardDescription>
              La IA analiza títulos de videos y encuentra coincidencias semánticas cuando el matching normal falla
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Usar IA en procesamiento</p>
                  <p className="text-xs text-muted-foreground">
                    OpenAI GPT-4o-mini como fallback cuando fuzzy matching falla
                  </p>
                </div>
              </div>
              <Switch
                checked={useAI}
                onCheckedChange={setUseAI}
                disabled={isProcessing || isMatching || isAIMatching}
              />
            </div>

            {/* Matching Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleMatchPending}
                disabled={isMatching || isAIMatching || stats.pendingMatch === 0}
                className="h-12"
              >
                <Link2 className={`h-4 w-4 mr-2 ${isMatching ? 'animate-pulse' : ''}`} />
                {isMatching ? "Vinculando..." : `Fuzzy (${stats.pendingMatch})`}
              </Button>
              <Button
                onClick={handleAIMatch}
                disabled={isMatching || isAIMatching || stats.pendingMatch === 0}
                className="h-12 bg-purple-600 hover:bg-purple-700"
              >
                <Brain className={`h-4 w-4 mr-2 ${isAIMatching ? 'animate-pulse' : ''}`} />
                {isAIMatching ? "IA procesando..." : `🤖 Vincular con IA (${stats.pendingMatch})`}
              </Button>
            </div>

            {/* Last Match Stats */}
            {lastMatchStats && lastMatchStats.total > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                <span>Último match:</span>
                <span className="text-foreground font-medium">{lastMatchStats.total} total</span>
                <span>•</span>
                <span>{lastMatchStats.fuzzy} fuzzy</span>
                {lastMatchStats.ai > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-purple-600 font-medium">{lastMatchStats.ai} IA</span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg">
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Archivos de Kalodata (.xlsx)
            </CardTitle>
            <CardDescription>
              Orden de procesamiento: Creadores → Productos → Videos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Creators File - FIRST */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
              <div className="flex-1">
                <Label htmlFor="creator-file" className="text-sm font-medium">Creadores</Label>
                <Input
                  id="creator-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setCreatorFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {creatorFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            {/* Products File - SECOND */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
              <div className="flex-1">
                <Label htmlFor="product-file" className="text-sm font-medium">Productos</Label>
                <Input
                  id="product-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setProductFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {productFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            {/* Videos File - THIRD */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</div>
              <div className="flex-1">
                <Label htmlFor="video-file" className="text-sm font-medium">Videos</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
              {videoFile && <CheckCircle className="h-5 w-5 text-green-500 mt-6" />}
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
              <p className="font-medium">💡 Importación inteligente (UPSERT):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Creadores: match por <code className="bg-muted px-1 rounded">username</code></li>
                <li>Productos: match por <code className="bg-muted px-1 rounded">nombre + URL</code></li>
                <li>Videos: match por <code className="bg-muted px-1 rounded">URL de TikTok</code></li>
              </ul>
              <p className="mt-2">Los datos existentes se actualizan, los nuevos se crean.</p>
            </div>
          </CardContent>
        </Card>

        {/* Process Button */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 mb-6">
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
                  🚀 Procesar Todo {useAI && <span className="ml-2 text-xs bg-purple-500/20 px-2 py-0.5 rounded">+ IA</span>}
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Creadores → Productos → Videos → Descarga MP4 → Vinculación {useAI ? "(con IA)" : "(fuzzy)"}
            </p>
          </CardContent>
        </Card>

        {/* Pending Links Section */}
        {stats.pendingMatch > 0 && (
          <PendingLinks />
        )}
      </main>
    </div>
  );
};

export default Admin;
