import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountType } from "@/hooks/useAccountType";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useSubmissions } from "@/hooks/useSubmissions";
import { 
  LayoutDashboard, 
  Megaphone, 
  Video, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Plus,
  ArrowRight
} from "lucide-react";

const BrandDashboard = () => {
  const navigate = useNavigate();
  const { accountType, isBrand, brandProfile, isLoading: accountLoading } = useAccountType();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns({ 
    brandId: brandProfile?.id 
  });
  const { submissions, isLoading: submissionsLoading } = useSubmissions({ 
    forBrand: true 
  });

  useEffect(() => {
    if (!accountLoading && !isBrand) {
      navigate("/app");
    }
  }, [accountLoading, isBrand, navigate]);

  if (accountLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isBrand) return null;

  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalSubmissions = submissions.length;
  const pendingReview = submissions.filter(s => s.status === "pending_review").length;
  const totalSpent = campaigns.reduce((sum, c) => sum + (c.total_spent_mxn || 0), 0);

  const recentSubmissions = submissions
    .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Marca</h1>
          <p className="text-muted-foreground">
            Bienvenido, {brandProfile?.company_name}
          </p>
        </div>
        <Button onClick={() => navigate("/brand/campaigns")} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Campaña
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Campañas Activas
            </CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              de {campaigns.length} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos Recibidos
            </CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              en todas las campañas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendientes de Revisión
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingReview}</div>
            <p className="text-xs text-muted-foreground">
              videos por revisar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Invertido
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalSpent.toLocaleString()} MXN
            </div>
            <p className="text-xs text-muted-foreground">
              en todas las campañas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => navigate("/brand/campaigns")}
            >
              <span className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Ver mis campañas
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            {pendingReview > 0 && (
              <Button 
                variant="outline" 
                className="w-full justify-between border-yellow-200 bg-yellow-50 hover:bg-yellow-100"
                onClick={() => {
                  const campaignWithPending = campaigns.find(c => 
                    submissions.some(s => s.campaign_id === c.id && s.status === "pending_review")
                  );
                  if (campaignWithPending) {
                    navigate(`/brand/campaigns/${campaignWithPending.id}/submissions`);
                  }
                }}
              >
                <span className="flex items-center gap-2 text-yellow-700">
                  <Clock className="h-4 w-4" />
                  Revisar {pendingReview} videos pendientes
                </span>
                <ArrowRight className="h-4 w-4 text-yellow-700" />
              </Button>
            )}
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => navigate("/creadores")}
            >
              <span className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Explorar creadores
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Recent Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {submissionsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay actividad reciente
              </p>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div 
                    key={submission.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        submission.status === "pending_review" ? "bg-yellow-500" :
                        submission.status === "approved" ? "bg-green-500" :
                        submission.status === "rejected" ? "bg-red-500" :
                        "bg-blue-500"
                      }`} />
                      <div>
                        <p className="text-sm font-medium">
                          {submission.campaigns?.title || "Campaña"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ${submission.proposed_price_mxn} MXN
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.created_at || "").toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandDashboard;
