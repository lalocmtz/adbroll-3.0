import { AdminCatalogProcessing } from "@/components/admin/AdminCatalogProcessing";
import { UserAffiliateOverview } from "@/components/admin/UserAffiliateOverview";
import ApifyBatchImport from "@/components/admin/ApifyBatchImport";
import CreatorPresentationUploader from "@/components/admin/CreatorPresentationUploader";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Video, CheckCircle, FileSpreadsheet, RefreshCw, Link2, Clock, Sparkles, BarChart3, Upload, Megaphone, Camera, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PendingLinks } from "@/components/PendingLinks";
import { AssetUploader } from "@/components/AssetUploader";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ConversionFunnel } from "@/components/admin/ConversionFunnel";
import { EmailLeadsList } from "@/components/admin/EmailLeadsList";
import { ApiUsageMonitor } from "@/components/admin/ApiUsageMonitor";
import { ManualAffiliatePayments } from "@/components/admin/ManualAffiliatePayments";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { TrafficAnalytics } from "@/components/admin/TrafficAnalytics";
import { CreditAnalytics } from "@/components/admin/CreditAnalytics";
import CreatorDirectoryManager from "@/components/admin/CreatorDirectoryManager";
import CampaignManager from "@/components/admin/CampaignManager";
import { MatchAuditPanel } from "@/components/admin/MatchAuditPanel";
import KalodataImportPanel from "@/components/admin/KalodataImportPanel";
import MatchReviewQueue from "@/components/admin/MatchReviewQueue";
import CreatorLeadsDashboard from "@/components/admin/CreatorLeadsDashboard";

type Market = "mx" | "us";

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab = ["users", "analytics", "leads", "campaigns", "creators", "import"].includes(searchParams.get("tab") || "") ? searchParams.get("tab")! : "users";
  const selectedMarket: Market = "mx";
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();


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

  }, []);

  useEffect(() => {
    if (isFounder) {
      loadStats();
    }
  }, [isFounder]);

  const loadStats = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.rpc("get_catalog_admin_stats");
      if (error) throw error;
      if (data) {
        setStats(data);
        setLastSync(data.lastSync ? new Date(data.lastSync).toLocaleString("es-MX") : null);
      }
    } catch {
      toast({ title: "No se pudo actualizar el catálogo", variant: "destructive" });
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
          <h1 className="text-2xl font-bold text-foreground">Panel de Admin</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <Tabs value={selectedTab} onValueChange={tab => setSearchParams({ tab }, { replace: true })} className="space-y-6">
          <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-max justify-start">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />Usuarios y afiliados
            </TabsTrigger>
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
          </div>

          <TabsContent value="users" className="space-y-6">
            <UserAffiliateOverview />
            <ManualAffiliatePayments />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Quick Overview */}
            <AnalyticsDashboard />
            
            {/* Financial Dashboard */}
            <FinancialDashboard />
            <ManualAffiliatePayments />
            
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
        <AdminCatalogProcessing />
        <ApifyBatchImport />
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

        <Card><CardContent className="pt-6 space-y-2 text-sm">
          <p className="font-semibold">Cómo alimentar el catálogo</p>
          <p>1. Importa el Excel: conserva ventas, fechas e IDs originales.</p>
          <p>2. Ejecuta un lote en Apify con los enlaces y la descarga de MP4 activada. Importa el ID del lote terminado en el panel de arriba.</p>
          <p>3. Los guiones y análisis se preparan en segundo plano y quedan disponibles para todos los usuarios con acceso. Las variantes se generan solo cuando el usuario las solicita.</p>
          <p className="text-muted-foreground">Los contadores incluyen todo el histórico. Un video sin MP4 no aparece en las listas públicas; un ID de producto ausente requiere su Excel de productos o una asignación manual verificada.</p>
        </CardContent></Card>

        {/* Importación: dropzone única con autodetección */}
        <KalodataImportPanel onImported={loadStats} />

        {/* Cola de confirmación 1-clic (matches sugeridos por IA) */}
        <MatchReviewQueue onResolved={loadStats} />

        {/* Asset Uploader */}
        <CreatorPresentationUploader />
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
