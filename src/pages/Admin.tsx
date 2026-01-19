import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, Package, CheckCircle, Zap, FileSpreadsheet, RefreshCw, Link2, Clock, Sparkles, Globe, PlayCircle, Pause, BarChart3, Upload, Megaphone, Camera, Rocket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { PendingLinks } from "@/components/PendingLinks";
import { AssetUploader } from "@/components/AssetUploader";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { EmailLeadsList } from "@/components/admin/EmailLeadsList";
import { ApiUsageMonitor } from "@/components/admin/ApiUsageMonitor";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";
import { CreditAnalytics } from "@/components/admin/CreditAnalytics";
import CreatorDirectoryManager from "@/components/admin/CreatorDirectoryManager";
import CampaignManager from "@/components/admin/CampaignManager";
import { ParallelProgressPanel } from "@/components/admin/ParallelProgressPanel";
import { useParallelPipeline } from "@/hooks/useParallelPipeline";

type Market = "mx" | "us";

const Admin = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [creatorFile, setCreatorFile] = useState<File | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market>("mx");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processPhase, setProcessPhase] = useState("");
  const [processProgress, setProcessProgress] = useState(0);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useParallelMode, setUseParallelMode] = useState(true);
  const { toast } = useToast();
  const shouldStopRef = useRef(false);
  
  // Parallel pipeline hook
  const { state: pipelineState, startParallelPipeline, stopPipeline, loadCurrentStats } = useParallelPipeline();

  const [stats, setStats] = useState({
    videos: 0,
    products: 0,
    creators: 0,
    readyToShow: 0,
    pendingDownload: 0,
    pendingTranscription: 0,
    pendingMatch: 0,
    pendingAvatars: 0,
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
        supabase.from("videos").select("id, product_id, video_mp4_url, transcript, processing_status, download_attempts"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("creators").select("id, avatar_url, avatar_storage_url"),
      ]);

      const videos = videosRes.data || [];
      const creators = creatorsRes.data || [];
      const withProduct = videos.filter(v => v.product_id).length;
      const readyToShow = videos.filter(v => v.video_mp4_url && v.product_id).length;
      const pendingTranscription = videos.filter(v => v.video_mp4_url && !v.transcript).length;
      
      // Exclude permanently_failed and videos with max attempts from pending count
      const pendingDownload = videos.filter(v => 
        !v.video_mp4_url && 
        v.processing_status !== 'permanently_failed' &&
        (v.download_attempts || 0) < 5
      ).length;
      
      // Count creators with avatar_url but no avatar_storage_url
      const pendingAvatars = creators.filter(c => 
        c.avatar_url && !c.avatar_storage_url
      ).length;
      
      setStats({
        videos: videos.length,
        products: productsRes.count || 0,
        creators: creators.length,
        readyToShow,
        pendingDownload,
        pendingTranscription,
        pendingMatch: videos.length - withProduct,
        pendingAvatars,
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

  const MAX_CONSECUTIVE_ERRORS = 3;

  // MASTER BUTTON: Process all pending using parallel pipeline
  const handleProcessPending = async () => {
    const totalPending = stats.pendingDownload + stats.pendingTranscription + stats.pendingMatch + stats.pendingAvatars;
    if (totalPending === 0) {
      toast({ title: "Todo listo", description: "No hay pendientes por procesar." });
      return;
    }

    try {
      const result = await startParallelPipeline(useAI);
      
      saveLastSync();
      await loadStats();

      const summary = [];
      if (result.downloads.processed > 0) summary.push(`${result.downloads.processed} descargados`);
      if (result.transcriptions.processed > 0) summary.push(`${result.transcriptions.processed} transcritos`);
      if (result.matching.processed > 0) summary.push(`${result.matching.processed} vinculados`);
      if (result.avatars.processed > 0) summary.push(`${result.avatars.processed} fotos`);

      toast({
        title: pipelineState.isPaused ? "⏸️ Proceso pausado" : "✅ Proceso completado",
        description: summary.join(", ") || "Sin cambios",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePauseProcess = () => {
    stopPipeline();
    toast({
      title: "Pausando proceso",
      description: "Esperando a que termine el batch actual...",
    });
  };

  // Process all from file upload - AUTOMATIC FULL PIPELINE
  const handleProcessAll = async () => {
    if (!videoFile && !productFile && !creatorFile) {
      toast({
        title: "Sin archivos",
        description: "Selecciona al menos un archivo para procesar.",
        variant: "destructive",
      });
      return;
    }

    shouldStopRef.current = false;
    setIsProcessing(true);
    setProcessProgress(0);

    let downloadStats = { successful: 0, failed: 0, skipped: false };
    let transcriptionStats = { successful: 0, failed: 0, skipped: false };
    let matchStats = { successful: 0, failed: 0, skipped: false };
    let avatarStats = { successful: 0, failed: 0, skipped: false };

    try {
      // ========== PHASE 1: Import Creators ==========
      if (creatorFile) {
        setProcessPhase("1/8 Importando creadores...");
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

      if (shouldStopRef.current) throw new Error("Proceso pausado por el usuario");

      // ========== PHASE 2: Import Products ==========
      if (productFile) {
        setProcessPhase("2/8 Importando productos...");
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

      if (shouldStopRef.current) throw new Error("Proceso pausado por el usuario");

      // ========== PHASE 3: Import Videos ==========
      if (videoFile) {
        setProcessPhase("3/8 Importando videos...");
        setProcessProgress(15);
        
        const formData = new FormData();
        formData.append("file", videoFile);
        formData.append("market", selectedMarket);
        
        const { error } = await supabase.functions.invoke("process-kalodata", {
          body: formData,
        });
        if (error) throw new Error(`Error en videos: ${error.message}`);
        setVideoFile(null);
      }

      // Reset file inputs
      const inputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      inputs.forEach(input => input.value = '');

      // Reload stats after import
      await loadStats();

      if (shouldStopRef.current) throw new Error("Proceso pausado por el usuario");

      // ========== PHASE 4: Download Videos ==========
      if (stats.pendingDownload > 0 && !shouldStopRef.current) {
        setProcessPhase(`4/8 Descargando ${stats.pendingDownload} videos...`);
        setProcessProgress(20);

        let consecutiveErrors = 0;
        let noProgressCount = 0;
        
        while (!shouldStopRef.current) {
          const { data, error } = await supabase.functions.invoke("download-videos-batch", {
            body: { batchSize: 5 },
          });

          if (error) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              downloadStats.skipped = true;
              break;
            }
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          consecutiveErrors = 0;
          
          if (!data || data.processed === 0 || data.remaining === 0) break;
          
          if (data.successful === 0 && data.failed > 0) {
            noProgressCount++;
            if (noProgressCount >= 3) {
              downloadStats.skipped = true;
              break;
            }
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          
          noProgressCount = 0;
          downloadStats.successful += data.successful || 0;
          downloadStats.failed += data.permanentlyFailed || 0;
          
          setProcessPhase(`4/8 Descargando... (${downloadStats.successful} OK, ${data.remaining} pendientes)`);
          setProcessProgress(20 + Math.min(15, (downloadStats.successful / Math.max(stats.pendingDownload, 1)) * 15));
          await new Promise(r => setTimeout(r, 500));
        }
      }

      await loadStats();

      // ========== PHASE 5: Transcribe Videos ==========
      if ((stats.pendingTranscription > 0 || downloadStats.successful > 0) && !shouldStopRef.current) {
        setProcessPhase("5/8 Transcribiendo scripts...");
        setProcessProgress(40);

        let consecutiveErrors = 0;
        
        while (!shouldStopRef.current) {
          const { data, error } = await supabase.functions.invoke("transcribe-videos-batch", {
            body: { batchSize: 3 },
          });

          if (error) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              transcriptionStats.skipped = true;
              break;
            }
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          consecutiveErrors = 0;

          if (!data || data.processed === 0 || data.remaining === 0 || data.complete) break;
          
          transcriptionStats.successful += data.successful || 0;
          setProcessPhase(`5/8 Transcribiendo... (${transcriptionStats.successful} completados, ${data.remaining} pendientes)`);
          setProcessProgress(40 + Math.min(20, (transcriptionStats.successful / Math.max(stats.pendingTranscription, 1)) * 20));
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      await loadStats();

      // ========== PHASE 6: Match Products ==========
      if (stats.pendingMatch > 0 && !shouldStopRef.current) {
        setProcessPhase(`6/8 Vinculando productos${useAI ? " (con IA)" : ""}...`);
        setProcessProgress(65);

        let consecutiveErrors = 0;
        let noProgressCount = 0;

        while (!shouldStopRef.current) {
          const { data, error } = await supabase.functions.invoke("auto-match-videos-products", {
            body: { batchSize: useAI ? 10 : 50, threshold: 0.5, useAI },
          });

          if (error) {
            consecutiveErrors++;
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
              matchStats.skipped = true;
              break;
            }
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          consecutiveErrors = 0;
          matchStats.successful += data.matchedInBatch || 0;

          if (data.matchedInBatch === 0 && data.batchProcessed > 0) {
            noProgressCount++;
            if (noProgressCount >= 3) break;
            await new Promise(r => setTimeout(r, 500));
            continue;
          }
          
          noProgressCount = 0;
          if (data.complete) break;

          setProcessPhase(`6/8 Vinculando... (${matchStats.successful} vinculados)`);
          setProcessProgress(65 + Math.min(15, (matchStats.successful / Math.max(stats.pendingMatch, 1)) * 15));
          
          if (data.timedOut) await new Promise(r => setTimeout(r, 300));
        }
      }

      await loadStats();

      // ========== PHASE 7: Download Avatars ==========
      if (stats.pendingAvatars > 0 && !shouldStopRef.current) {
        setProcessPhase(`7/8 Descargando ${stats.pendingAvatars} fotos de creadores...`);
        setProcessProgress(85);

        try {
          const { data, error } = await supabase.functions.invoke("download-creator-avatars");
          
          if (error) {
            avatarStats.skipped = true;
          } else if (data) {
            avatarStats.successful = data.successCount || 0;
            avatarStats.failed = data.errorCount || 0;
          }
        } catch (err) {
          avatarStats.skipped = true;
        }
      }

      // ========== PHASE 8: Finalize ==========
      setProcessPhase("8/8 Actualizando rankings...");
      setProcessProgress(95);
      
      await loadStats();

      // Build summary
      const summary = [];
      if (downloadStats.successful > 0) summary.push(`${downloadStats.successful} videos descargados`);
      if (transcriptionStats.successful > 0) summary.push(`${transcriptionStats.successful} scripts`);
      if (matchStats.successful > 0) summary.push(`${matchStats.successful} vinculados`);
      if (avatarStats.successful > 0) summary.push(`${avatarStats.successful} fotos`);
      
      const warnings = [];
      if (downloadStats.skipped) warnings.push("descargas");
      if (transcriptionStats.skipped) warnings.push("scripts");
      if (matchStats.skipped) warnings.push("vinculación");
      if (avatarStats.skipped) warnings.push("fotos");

      setProcessProgress(100);
      setProcessPhase("✅ Pipeline completado");
      saveLastSync();

      toast({
        title: "✅ Importación y procesamiento completados",
        description: summary.length > 0 
          ? summary.join(", ") + (warnings.length > 0 ? ` (⚠️ saltados: ${warnings.join(", ")})` : "")
          : "Datos importados correctamente. Rankings actualizados.",
      });

    } catch (error: any) {
      const isPaused = error.message?.includes("pausado");
      toast({
        title: isPaused ? "⏸️ Proceso pausado" : "Error en el proceso",
        description: isPaused ? "Puedes continuar con 'Procesar Pendientes'" : error.message,
        variant: isPaused ? "default" : "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessPhase("");
      setProcessProgress(0);
      await loadStats();
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

  const totalPending = stats.pendingDownload + stats.pendingTranscription + stats.pendingMatch + stats.pendingAvatars;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Panel de Admin</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Campañas
            </TabsTrigger>
            <TabsTrigger value="creators" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Creadores
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importación
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Quick Overview */}
            <AnalyticsDashboard />
            
            {/* Financial Dashboard */}
            <FinancialDashboard />
            
            {/* Funnel + Traffic Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
              <ConversionFunnel />
              <TrafficAnalytics />
            </div>
            
            {/* Credits + Leads Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
              <CreditAnalytics />
              <EmailLeadsList />
            </div>
            
            {/* API Usage Monitor */}
            <ApiUsageMonitor />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <CampaignManager />
          </TabsContent>

          {/* Creator Program Tab */}
          <TabsContent value="creators" className="space-y-6">
            <CreatorDirectoryManager />
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-6">
        {/* Last Sync & Refresh */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Última sincronización: {lastSync || "Nunca"}</span>
          </div>
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

        {/* Simplified Stats: 5 Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">✅ Completos</p>
                  <p className="text-2xl font-bold text-green-600">{stats.readyToShow}</p>
                  <p className="text-xs text-green-600">Listos para mostrar</p>
                </div>
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">📥 Sin MP4</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.pendingDownload}</p>
                  <p className="text-xs text-orange-600">Pendientes descarga</p>
                </div>
                <Video className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">📝 Sin script</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.pendingTranscription}</p>
                  <p className="text-xs text-blue-600">Pendientes transcribir</p>
                </div>
                <FileSpreadsheet className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">🔗 Sin producto</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.pendingMatch}</p>
                  <p className="text-xs text-purple-600">Pendientes vincular</p>
                </div>
                <Link2 className="h-6 w-6 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-pink-200 bg-pink-50/50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">📷 Sin foto</p>
                  <p className="text-2xl font-bold text-pink-600">{stats.pendingAvatars}</p>
                  <p className="text-xs text-pink-600">Pendientes descargar</p>
                </div>
                <Camera className="h-6 w-6 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MASTER BUTTON: Procesar Pendientes (Parallel) */}
        <Card className="mb-6 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="pt-6 pb-6 space-y-4">
            {/* AI Toggle - Inline */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Usar IA en vinculación</p>
                  <p className="text-xs text-muted-foreground">GPT-4 como fallback si fuzzy falla</p>
                </div>
              </div>
              <Switch
                checked={useAI}
                onCheckedChange={setUseAI}
                disabled={isProcessing || pipelineState.isRunning}
              />
            </div>

            {/* Parallel Progress Panel */}
            {pipelineState.isRunning && (
              <div className="space-y-3">
                <ParallelProgressPanel 
                  stats={pipelineState.stats} 
                  isRunning={pipelineState.isRunning}
                  phase={pipelineState.phase}
                />
                
                {/* Pause Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePauseProcess}
                  disabled={pipelineState.isPaused}
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {pipelineState.isPaused ? "Pausando..." : "Pausar proceso"}
                </Button>
              </div>
            )}

            {/* Main Button */}
            <Button
              onClick={handleProcessPending}
              disabled={pipelineState.isRunning || isProcessing || totalPending === 0}
              size="lg"
              className="w-full h-14 text-lg font-semibold"
            >
              {pipelineState.isRunning ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  {pipelineState.phase || "Procesando en paralelo..."}
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5 mr-2" />
                  ⚡ Procesar Paralelo ({totalPending})
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Ejecuta en paralelo: Descargas + Transcripciones + Vinculación + Fotos{useAI ? " (con IA)" : ""}
            </p>
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
              Sube nuevos archivos para agregar datos al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market Selector */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <Label className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Globe className="h-4 w-4" />
                Mercado del archivo:
              </Label>
              <RadioGroup
                value={selectedMarket}
                onValueChange={(value) => setSelectedMarket(value as Market)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mx" id="market-mx" />
                  <Label htmlFor="market-mx" className="cursor-pointer font-medium">
                    🇲🇽 México
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="us" id="market-us" />
                  <Label htmlFor="market-us" className="cursor-pointer font-medium">
                    🇺🇸 Estados Unidos
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* File Inputs */}
            <div className="grid gap-3">
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
            </div>

            {/* Import Button */}
            {(videoFile || productFile || creatorFile) && (
              <div className="pt-2">
                {isProcessing && (
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{processPhase}</span>
                      <span className="text-muted-foreground">{processProgress}%</span>
                    </div>
                    <Progress value={processProgress} className="h-2" />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleProcessAll}
                    disabled={isProcessing || pipelineState.isRunning}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-pulse" />
                        {processPhase || "Procesando..."}
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        🚀 Importar y Procesar Todo
                      </>
                    )}
                  </Button>
                  
                  {isProcessing && (
                    <Button
                      variant="outline"
                      onClick={handlePauseProcess}
                    >
                      <Pause className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
              <p className="font-medium">🚀 Pipeline automático: Importar → Descargar MP4 → Transcribir → Vincular → Fotos</p>
              <p>💡 Los datos existentes se actualizan, los nuevos se crean. Rankings se recalculan.</p>
            </div>
          </CardContent>
        </Card>

        {/* Asset Uploader */}
        <AssetUploader />

        {/* Pending Links Section (Manual Assignment) */}
        {stats.pendingMatch > 0 && (
          <PendingLinks />
        )}

        {/* Summary Stats */}
        <Card className="mt-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total en base de datos:</span>
              <span>{stats.videos} videos • {stats.products} productos • {stats.creators} creadores</span>
            </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
