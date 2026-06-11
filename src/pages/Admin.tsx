import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, CheckCircle, FileSpreadsheet, RefreshCw, Link2, Clock, Sparkles, Globe, Pause, BarChart3, Upload, Megaphone, Camera, Rocket, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { MatchAuditPanel } from "@/components/admin/MatchAuditPanel";
import KalodataImportPanel from "@/components/admin/KalodataImportPanel";
import MatchReviewQueue from "@/components/admin/MatchReviewQueue";
import { useParallelPipeline } from "@/hooks/useParallelPipeline";
import CreatorLeadsDashboard from "@/components/admin/CreatorLeadsDashboard";

type Market = "mx" | "us";

const Admin = () => {
  const navigate = useNavigate();
  const [selectedMarket, setSelectedMarket] = useState<Market>("mx");
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResettingDownloads, setIsResettingDownloads] = useState(false);
  const [failedDownloadsCount, setFailedDownloadsCount] = useState(0);
  const { toast } = useToast();

  // Parallel pipeline hook
  const { state: pipelineState, startParallelPipeline, stopPipeline, loadCurrentStats } = useParallelPipeline();

  const [stats, setStats] = useState({
    videos: 0,
    products: 0,
    creators: 0,
    readyToShow: 0,
    pendingDownload: 0,
    pendingTranscription: 0,
    failedTranscription: 0,
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
      // `transcript` is REVOKED for `authenticated` at the DB level (premium
      // lockdown), even for the founder via the anon key. The pipeline stats
      // need it to count pending transcriptions, so read full rows through the
      // founder-gated SECURITY DEFINER RPC. This panel only runs for founders.
      const [videosRes, productsRes, creatorsRes] = await Promise.all([
        supabase.rpc("get_videos_admin"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("creators").select("id, avatar_url, avatar_storage_url"),
      ]);

      const videos = videosRes.data || [];
      const creators = creatorsRes.data || [];
      // Pendientes de vincular: sin producto y sin veredicto previo de
      // match-videos ('review' espera confirmación, 'none' ya se descartó).
      const pendingMatchCount = videos.filter(v =>
        !v.product_id && !["review", "none"].includes((v as any).match_source ?? "")
      ).length;
      const readyToShow = videos.filter(v => v.video_mp4_url && v.product_id).length;
      
      // Pending = has MP4, no transcript, NOT failed
      const pendingTranscription = videos.filter(v => 
        v.video_mp4_url && !v.transcript && v.processing_status !== 'transcription_failed'
      ).length;
      
      // Failed = has MP4, no transcript, status is transcription_failed
      const failedTranscription = videos.filter(v => 
        v.video_mp4_url && !v.transcript && v.processing_status === 'transcription_failed'
      ).length;
      
      // Exclude permanently_failed and videos with max attempts from pending count
      const pendingDownload = videos.filter(v => 
        !v.video_mp4_url && 
        v.processing_status !== 'permanently_failed' &&
        v.processing_status !== 'download_failed' &&
        (v.download_attempts || 0) < 5
      ).length;

      // Count failed downloads (permanently_failed + download_failed + download_blocked_quota)
      const failedDownloads = videos.filter(v =>
        v.processing_status === 'permanently_failed' || v.processing_status === 'download_failed' || v.processing_status === 'download_blocked_quota'
      ).length;
      setFailedDownloadsCount(failedDownloads);
      
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
        failedTranscription,
        pendingMatch: pendingMatchCount,
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

  // MASTER BUTTON: Process all pending using parallel pipeline
  const handleProcessPending = async () => {
    const totalPending = stats.pendingDownload + stats.pendingTranscription + stats.pendingMatch + stats.pendingAvatars;
    if (totalPending === 0) {
      toast({ title: "Todo listo", description: "No hay pendientes por procesar." });
      return;
    }

    try {
      const result = await startParallelPipeline(useAI, selectedMarket);
      
      saveLastSync();
      await loadStats();

      const summary = [];
      if (result.downloads.processed > 0) summary.push(`${result.downloads.processed} descargados`);
      if (result.transcriptions.processed > 0) summary.push(`${result.transcriptions.processed} transcritos`);
      if (result.matching.processed > 0) summary.push(`${result.matching.processed} vinculados`);
      if (result.avatars.processed > 0) summary.push(`${result.avatars.processed} fotos`);

      const quotaWarning = pipelineState.quotaExceeded 
        ? " ⚠️ Cuota mensual del API de descargas agotada. Upgrade tu plan en RapidAPI para continuar." 
        : "";

      toast({
        title: pipelineState.isPaused ? "⏸️ Proceso pausado" : pipelineState.quotaExceeded ? "⚠️ Cuota agotada" : "✅ Proceso completado",
        description: (summary.join(", ") || "Sin cambios") + quotaWarning,
        variant: pipelineState.quotaExceeded ? "destructive" : "default",
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="leads" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Leads
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


          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            <CreatorLeadsDashboard />
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
                  <p className="text-xs text-blue-600">
                    Pendientes{stats.failedTranscription > 0 && ` (${stats.failedTranscription} fallidos)`}
                  </p>
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

        {/* Quota Exceeded Warning Banner */}
        {pipelineState.quotaExceeded && (
          <div className="mb-4 p-4 rounded-lg border-2 border-destructive/50 bg-destructive/10">
            <p className="font-semibold text-destructive">⚠️ Cuota mensual agotada</p>
            <p className="text-sm text-destructive/80 mt-1">
              El proveedor de descargas (RapidAPI/llbbmm) ha alcanzado el límite mensual de tu plan.
              Necesitas <strong>upgrade tu plan en RapidAPI</strong> para continuar descargando videos.
              Después, usa "Reintentar descargas" para reanudar.
            </p>
          </div>
        )}

        {/* Reset Failed Downloads Button */}
        {failedDownloadsCount > 0 && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={async () => {
                setIsResettingDownloads(true);
                try {
                  const { data, error } = await supabase.functions.invoke("reset-failed-downloads");
                  if (error) throw new Error(error.message);
                  toast({
                    title: "✅ Descargas reseteadas",
                    description: `${data.resetCount} videos listos para reintentar. Asegúrate de tener cuota disponible en RapidAPI antes de procesar.`,
                  });
                  await loadStats();
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                  });
                } finally {
                  setIsResettingDownloads(false);
                }
              }}
              disabled={isResettingDownloads || pipelineState.isRunning}
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isResettingDownloads ? 'animate-spin' : ''}`} />
              {isResettingDownloads ? "Reseteando..." : `🔄 Reintentar ${failedDownloadsCount} descargas fallidas`}
            </Button>
          </div>
        )}

        {/* MASTER BUTTON: Procesar Pendientes (Parallel) */}
        <Card className="mb-6 border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="pt-6 pb-6 space-y-4">
            {/* Market Selector - usado por Procesar Paralelo y Auditoría */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Globe className="h-4 w-4" />
                Mercado:
              </Label>
              <RadioGroup
                value={selectedMarket}
                onValueChange={(value) => setSelectedMarket(value as Market)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mx" id="market-mx" />
                  <Label htmlFor="market-mx" className="cursor-pointer font-medium">🇲🇽 MX</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="us" id="market-us" />
                  <Label htmlFor="market-us" className="cursor-pointer font-medium">🇺🇸 US</Label>
                </div>
              </RadioGroup>
            </div>

            {/* AI Toggle - Inline */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/80 border">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Usar IA en vinculación</p>
                  <p className="text-xs text-muted-foreground">La capa IA de match-videos decide casos dudosos</p>
                </div>
              </div>
              <Switch
                checked={useAI}
                onCheckedChange={setUseAI}
                disabled={pipelineState.isRunning}
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
              disabled={pipelineState.isRunning || totalPending === 0}
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

        {/* Importación: dropzone única con autodetección */}
        <KalodataImportPanel onImported={loadStats} />

        {/* Cola de confirmación 1-clic (matches sugeridos por IA) */}
        <MatchReviewQueue onResolved={loadStats} />

        {/* Asset Uploader */}
        <AssetUploader />

        {/* Attribution Panel Link */}
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">🎯 Atribución masiva de videos</p>
                <p className="text-xs text-muted-foreground">Asigna videos a productos de forma rápida y en lote</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/attribution")}
              >
                <Link2 className="h-4 w-4 mr-1.5" />
                Abrir panel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match Audit Panel */}
        <MatchAuditPanel 
          market={selectedMarket} 
          onAuditComplete={loadStats}
        />

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
