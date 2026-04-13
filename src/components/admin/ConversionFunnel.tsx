import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Eye, UserPlus, Mail, CreditCard, CheckCircle, TrendingDown } from "lucide-react";

interface FunnelStep {
  label: string;
  count: number;
  icon: React.ReactNode;
  percentage?: number;
  dropOff?: number;
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
      const emailsNotConverted = emails.filter(e => !e.converted_at).length;
      const activeSubs = subs.filter(s => s.status === "active").length;

      // Count unique visitors by session_id
      const uniqueSessions = new Set(pageViews.map(v => v.session_id).filter(Boolean));
      const uniqueVisitors = uniqueSessions.size;

      // Calculate drop-off percentages
      const calcDropOff = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return Math.round(((previous - current) / previous) * 100);
      };

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
          dropOff: calcDropOff(totalUsers, displayVisitors),
          color: "bg-blue-50 text-blue-600 border-blue-200",
        },
        {
          label: "Email capturado",
          count: emailsCaptured,
          icon: <Mail className="h-5 w-5" />,
          percentage: totalUsers > 0 ? Math.round((emailsCaptured / totalUsers) * 100) : 0,
          dropOff: calcDropOff(emailsCaptured, totalUsers),
          color: "bg-orange-50 text-orange-600 border-orange-200",
        },
        {
          label: "Checkout iniciado",
          count: emailsCaptured,
          icon: <CreditCard className="h-5 w-5" />,
          percentage: 100,
          dropOff: 0,
          color: "bg-purple-50 text-purple-600 border-purple-200",
        },
        {
          label: "Pago completado",
          count: activeSubs,
          icon: <CheckCircle className="h-5 w-5" />,
          percentage: emailsCaptured > 0 ? Math.round((activeSubs / emailsCaptured) * 100) : 0,
          dropOff: calcDropOff(activeSubs, emailsCaptured),
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

  // Calculate key insights
  const visitorToSignup = steps[0].count > 0 ? Math.round((steps[1].count / steps[0].count) * 100) : 0;
  const signupToEmail = steps[1].count > 0 ? Math.round((steps[2].count / steps[1].count) * 100) : 0;
  const emailToPaid = steps[2].count > 0 ? Math.round((steps[4].count / steps[2].count) * 100) : 0;
  const overallConversion = steps[0].count > 0 ? Math.round((steps[4].count / steps[0].count) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          🔄 Embudo de Conversión
        </CardTitle>
        {steps[0].count === 0 && (
          <p className="text-xs text-muted-foreground">
            Los visitantes se empezarán a registrar automáticamente
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
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
                <div className="text-right flex items-center gap-2">
                  <span className="text-lg font-bold">{step.count}</span>
                  {step.percentage !== undefined && (
                    <span className="text-xs opacity-70">({step.percentage}%)</span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex items-center justify-center py-0.5 gap-1">
                  <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  {step.dropOff !== undefined && step.dropOff > 0 && (
                    <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                      <TrendingDown className="h-2.5 w-2.5" />
                      -{step.dropOff}%
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Key Metrics Summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-blue-50 rounded border border-blue-100">
            <p className="text-muted-foreground">Visitante → Registro</p>
            <p className="font-bold text-blue-600">{visitorToSignup}%</p>
          </div>
          <div className="p-2 bg-orange-50 rounded border border-orange-100">
            <p className="text-muted-foreground">Registro → Email</p>
            <p className="font-bold text-orange-600">{signupToEmail}%</p>
          </div>
          <div className="p-2 bg-green-50 rounded border border-green-100">
            <p className="text-muted-foreground">Email → Pago</p>
            <p className="font-bold text-green-600">{emailToPaid}%</p>
          </div>
          <div className="p-2 bg-purple-50 rounded border border-purple-100">
            <p className="text-muted-foreground">Conversión total</p>
            <p className="font-bold text-purple-600">{overallConversion}%</p>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs">
          <p className="font-medium mb-1">💡 Insights:</p>
          <ul className="text-muted-foreground space-y-1">
            {steps[4].count === 0 && steps[2].count > 0 && (
              <li className="text-amber-600">
                • {steps[2].count} emails sin convertir - considera enviar seguimiento
              </li>
            )}
            {emailToPaid > 0 && emailToPaid < 20 && (
              <li className="text-amber-600">
                • Conversión a pago baja ({emailToPaid}%) - revisa pricing/copy
              </li>
            )}
            {visitorToSignup > 0 && visitorToSignup < 5 && (
              <li className="text-amber-600">
                • Pocos visitantes se registran ({visitorToSignup}%) - optimiza landing
              </li>
            )}
            {steps[4].count > 0 && (
              <li className="text-green-600">
                • Tienes {steps[4].count} suscriptores activos 🎉
              </li>
            )}
            {steps[0].count === 0 && (
              <li>• Activa tracking de visitantes para ver métricas completas</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
