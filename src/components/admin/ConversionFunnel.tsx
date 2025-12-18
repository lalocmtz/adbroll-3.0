import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Eye, UserPlus, Mail, CreditCard, CheckCircle } from "lucide-react";

interface FunnelStep {
  label: string;
  count: number;
  icon: React.ReactNode;
  percentage?: number;
  color: string;
}

export const ConversionFunnel = () => {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunnelData();
  }, []);

  const loadFunnelData = async () => {
    try {
      // Get date 30 days ago for visitor tracking
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [usersRes, emailsRes, subsRes, pageViewsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("email_captures").select("id, converted_at"),
        supabase.from("subscriptions").select("id, status"),
        supabase.from("page_views")
          .select("session_id")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const totalUsers = usersRes.count || 0;
      const emails = emailsRes.data || [];
      const subs = subsRes.data || [];
      const pageViews = pageViewsRes.data || [];

      const emailsCaptured = emails.length;
      const emailsConverted = emails.filter(e => e.converted_at).length;
      const activeSubs = subs.filter(s => s.status === "active").length;

      // Count unique visitors by session_id
      const uniqueSessions = new Set(pageViews.map(v => v.session_id).filter(Boolean));
      const uniqueVisitors = uniqueSessions.size;

      // Use real data if we have page views, otherwise show 0
      const displayVisitors = uniqueVisitors > 0 ? uniqueVisitors : 0;

      const funnelSteps: FunnelStep[] = [
        {
          label: "Visitantes (30d)",
          count: displayVisitors,
          icon: <Eye className="h-5 w-5" />,
          color: "bg-slate-100 text-slate-600 border-slate-200",
        },
        {
          label: "Registros",
          count: totalUsers,
          icon: <UserPlus className="h-5 w-5" />,
          percentage: displayVisitors > 0 ? Math.round((totalUsers / displayVisitors) * 100) : undefined,
          color: "bg-blue-50 text-blue-600 border-blue-200",
        },
        {
          label: "Email capturado",
          count: emailsCaptured,
          icon: <Mail className="h-5 w-5" />,
          percentage: totalUsers > 0 ? Math.round((emailsCaptured / totalUsers) * 100) : 0,
          color: "bg-orange-50 text-orange-600 border-orange-200",
        },
        {
          label: "Checkout iniciado",
          count: emailsCaptured,
          icon: <CreditCard className="h-5 w-5" />,
          percentage: 100,
          color: "bg-purple-50 text-purple-600 border-purple-200",
        },
        {
          label: "Pago completado",
          count: activeSubs,
          icon: <CheckCircle className="h-5 w-5" />,
          percentage: emailsCaptured > 0 ? Math.round((activeSubs / emailsCaptured) * 100) : 0,
          color: "bg-green-50 text-green-600 border-green-200",
        },
      ];

      setSteps(funnelSteps);
    } catch (error) {
      console.error("Error loading funnel data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Embudo de Conversión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          📊 Embudo de Conversión
        </CardTitle>
        {steps[0].count === 0 && (
          <p className="text-xs text-muted-foreground">
            Los visitantes se empezarán a registrar automáticamente
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.label}>
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${step.color}`}
                style={{
                  width: `${Math.max(40, 100 - index * 12)}%`,
                  marginLeft: "auto",
                  marginRight: "auto",
                }}
              >
                <div className="flex items-center gap-2">
                  {step.icon}
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">{step.count}</span>
                  {step.percentage !== undefined && (
                    <span className="text-xs ml-1 opacity-70">({step.percentage}%)</span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">📈 Insights:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {steps[4].count === 0 && steps[2].count > 0 && (
              <li>• Tienes {steps[2].count} emails sin convertir - envía seguimiento</li>
            )}
            {steps[1].count > 0 && steps[4].percentage !== undefined && steps[4].percentage < 20 && (
              <li>• Conversión a pago baja ({steps[4].percentage}%) - revisar pricing/copy</li>
            )}
            {steps[1].count === 0 && (
              <li>• Sin registros todavía - activa campañas de adquisición</li>
            )}
            {steps[0].count > 0 && steps[1].count > 0 && (
              <li>• Tasa de registro: {Math.round((steps[1].count / steps[0].count) * 100)}% de visitantes</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
