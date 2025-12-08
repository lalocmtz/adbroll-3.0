import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Video, Package, Users, CheckCircle, Zap, FileSpreadsheet, RefreshCw, Link2, Clock, Sparkles, Brain, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { PendingLinks } from "@/components/PendingLinks";
import { AssetUploader } from "@/components/AssetUploader";

type Market = "mx" | "us";

const Admin = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market>("mx");
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
    videosTranscribed: 0,
    pendingMatch: 0,
    pendingDownload: 0,
    pendingTranscription: 0,
    readyToShow: 0,
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
        supabase.from("videos").select("id, product_id, video_mp4_url, transcript"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("creators").select("id", { count: "exact", head: true }),
      ]);

      const videos = videosRes.data || [];
      const withProduct = videos.filter(v => v.product_id).length;
      const downloaded = videos.filter(v => v.video_mp4_url).length;
      const transcribed = videos.filter(v => v.transcript).length;
      const readyToShow = videos.filter(v => v.video_mp4_url && v.product_id).length;
      const pendingTranscription = videos.filter(v => v.video_mp4_url && !v.transcript).length;
      
      setStats({
        videos: videos.length,
        products: productsRes.count || 0,
        creators: creatorsRes.count || 0,
        videosWithProduct: withProduct,
        videosDownloaded: downloaded,
        videosTranscribed: transcribed,
        pendingMatch: videos.length - withProduct,
        pendingDownload: videos.length - downloaded,
        pendingTranscription,
        readyToShow,
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

  // AI-powered matching with auto-retry on timeout
  const [aiMatchProgress, setAiMatchProgress] = useState<string>("");
  
  const handleAIMatch = async () => {
    if (stats.pendingMatch === 0) {
      toast({ title: "Todo vinculado", description: "No hay videos pendientes." });
      return;
    }

    setIsAIMatching(true);
    setAiMatchProgress("Iniciando...");
    let totalMatched = 0;
    let fuzzyTotal = 0;
    let aiTotal = 0;
    let batchCount = 0;
    let currentOffset = 0;

    try {
      let complete = false;
      let maxRetries = 100; // Safety limit
      
      while (!complete && maxRetries > 0) {
        maxRetries--;
        batchCount++;
        
        setAiMatchProgress(`Lote ${batchCount}: procesando desde offset ${currentOffset}...`);
        
        const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
          body: { 
            batchSize: 10, // Small batches for AI
            offset: currentOffset,
            threshold: 0.5, 
            useAI: true 
          }
        });

        if (error) throw error;
        
        totalMatched += data.matchedInBatch || 0;
        fuzzyTotal += data.fuzzyMatches || 0;
        aiTotal += data.aiMatches || 0;
        
        // Update progress
        const remaining = data.remainingUnmatched || 0;
        setAiMatchProgress(`Lote ${batchCount}: ${totalMatched} vinculados (${aiTotal} IA), ${remaining} pendientes`);
        
        // Check if complete or need to continue
        if (data.complete) {
          complete = true;
        } else if (data.timedOut && data.nextOffset !== null) {
          // Continue from where we left off
          currentOffset = data.nextOffset;
          // Small delay between batches to avoid overwhelming
          await new Promise(r => setTimeout(r, 300));
        } else if (data.nextOffset !== null) {
          currentOffset = data.nextOffset;
        } else {
          complete = true;
        }
      }

      setLastMatchStats({ fuzzy: fuzzyTotal, ai: aiTotal, total: totalMatched });
      saveLastSync();
      setAiMatchProgress("");
      
      toast({
        title: "Vinculación IA completada",
        description: `${totalMatched} videos vinculados en ${batchCount} lotes (${fuzzyTotal} fuzzy, ${aiTotal} IA).`,
      });
      await loadStats();
    } catch (error: any) {
      setAiMatchProgress("");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAIMatching(false);
      setAiMatchProgress("");
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
        setProcessPhase("1/6 Importando creadores...");
        setProcessProgress(5);
        
        const formData = new FormData();
        formData.append("file", creatorFile);
        formData.append("market", selectedMarket);
        
        const { error } = await supabase.functions.invoke("process-kalodata-creators", {
          body: formData,
        });
        if (error) throw new Error(`Error en creadores: ${error.message}`);
        setCreatorFile(null);
      }

      // Step 2: Import Products SECOND
      if (productFile) {
        setProcessPhase("2/6 Importando productos...");
        setProcessProgress(10);
        
        const formData = new FormData();
        formData.append("file", productFile);
        formData.append("market", selectedMarket);
        
        const { error } = await supabase.functions.invoke("process-kalodata-products", {
          body: formData,
        });
        if (error) throw new Error(`Error en productos: ${error.message}`);
        setProductFile(null);
      }

      // Step 3: Import Videos THIRD
      if (videoFile) {
        setProcessPhase("3/6 Importando videos...");
        setProcessProgress(20);
        
        const formData = new FormData();
        formData.append("file", videoFile);
        formData.append("market", selectedMarket);
        
        const { error } = await supabase.functions.invoke("process-kalodata", {
          body: formData,
        });
        if (error) throw new Error(`Error en videos: ${error.message}`);
        setVideoFile(null);
      }

      // Step 4: Download pending videos
      setProcessPhase("4/6 Descargando videos de TikTok...");
      setProcessProgress(30);
      
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
          const progress = 30 + Math.min(15, (downloadedCount / 50) * 15);
          setProcessProgress(progress);
          setProcessPhase(`4/6 Descargando videos... (${downloadedCount} completados)`);
          await new Promise(r => setTimeout(r, 500));
          
          if (downloadedCount >= 100) break;
        }
      }

      // Step 5: Match all videos with products (using AI toggle setting)
      setProcessPhase(`5/6 Vinculando videos ${useAI ? "(con IA)" : "(fuzzy)"}...`);
      setProcessProgress(50);
      
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
        
        const progress = 50 + Math.min(15, (totalMatched / 100) * 15);
        setProcessProgress(progress);
        setProcessPhase(`5/6 Vinculando... (${totalMatched} vinculados${aiTotal > 0 ? `, ${aiTotal} IA` : ""})`);
      }

      setLastMatchStats({ fuzzy: fuzzyTotal, ai: aiTotal, total: totalMatched });

      // Step 6: Transcribe and analyze all videos with MP4
      setProcessPhase("6/6 Transcribiendo y analizando scripts...");
      setProcessProgress(70);
      
      let transcribedCount = 0;
      let continueTranscription = true;
      
      while (continueTranscription) {
        const { data, error } = await supabase.functions.invoke("transcribe-videos-batch", {
          body: { batchSize: 3 },
        });
        
        if (error) {
          console.warn("Transcription batch error:", error.message);
          break;
        }
        
        if (!data || data.processed === 0 || data.remaining === 0 || data.complete) {
          continueTranscription = false;
        } else {
          transcribedCount += data.successful || 0;
          const progress = 70 + Math.min(25, (transcribedCount / 50) * 25);
          setProcessProgress(progress);
          setProcessPhase(`6/6 Transcribiendo scripts... (${transcribedCount} completados, ${data.remaining} pendientes)`);
          await new Promise(r => setTimeout(r, 1000));
          
          // Limit to 100 videos per run to avoid timeout
          if (transcribedCount >= 100) break;
        }
      }

      // Done!
      setProcessProgress(100);
      setProcessPhase("¡Proceso completado!");
      saveLastSync();
      
      toast({
        title: "¡Proceso completado!",
        description: `${downloadedCount} videos descargados, ${totalMatched} productos vinculados, ${transcribedCount} scripts transcritos.`,
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Listos para mostrar</p>
                  <p className="text-2xl font-bold text-green-600">{stats.readyToShow}</p>
                  <p className="text-xs text-green-600">Videos completos</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes descarga</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingDownload}</p>
                  <p className="text-xs text-orange-600">Sin MP4</p>
                </div>
                <Video className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes transcribir</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pendingTranscription}</p>
                  <p className="text-xs text-blue-600">Sin script</p>
                </div>
                <FileSpreadsheet className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes vincular</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pendingMatch}</p>
                  <p className="text-xs text-purple-600">Sin producto</p>
                </div>
                <Link2 className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total videos</p>
                  <p className="text-2xl font-bold">{stats.videos}</p>
                  <p className="text-xs text-muted-foreground">{stats.videosTranscribed} con script</p>
                </div>
                <Package className="h-6 w-6 text-primary" />
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

            {/* AI Matching Progress */}
            {isAIMatching && aiMatchProgress && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full" />
                <p className="text-sm text-purple-800">{aiMatchProgress}</p>
              </div>
            )}

            {/* Last Match Stats */}
            {!isAIMatching && lastMatchStats && lastMatchStats.total > 0 && (
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
            {/* Market Selector - MANDATORY */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Globe className="h-4 w-4" />
                Selecciona el mercado del archivo:
              </Label>
              <RadioGroup
                value={selectedMarket}
                onValueChange={(value) => setSelectedMarket(value as Market)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mx" id="market-mx" />
                  <Label htmlFor="market-mx" className="cursor-pointer font-medium">
                    🇲🇽 México (MX)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="us" id="market-us" />
                  <Label htmlFor="market-us" className="cursor-pointer font-medium">
                    🇺🇸 Estados Unidos (US)
                  </Label>
                </div>
              </RadioGroup>
            </div>
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

        {/* Asset Uploader */}
        <AssetUploader />

        {/* Pending Links Section */}
        {stats.pendingMatch > 0 && (
          <PendingLinks />
        )}
      </main>
    </div>
  );
};

export default Admin;
