import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, Eye, UserPlus, CreditCard, CheckCircle, TrendingDown } from "lucide-react";

interface FunnelStep {
  label: string;
  // null = dato no disponible (se muestra como "—" en vez de inventar 0).
  count: number | null;
  icon: React.ReactNode;
  percentage?: number;
  dropOff?: number;
  color: string;
}

const LANDING_PATHS = ["/"];
// Rutas que indican que el visitante llegó al paywall / flujo de checkout.
const CHECKOUT_PATHS = ["/unlock", "/pricing", "/checkout"];

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
          .select("session_id, page_path")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const totalUsers = usersRes.count ?? 0;
      const emails = emailsRes.data || [];
      const subs = subsRes.data || [];
      const pageViews = pageViewsRes.data || [];
      const hasPageViews = pageViews.length > 0;

      const emailsCaptured = emails.length;
      const activeSubs = subs.filter((s) => s.status === "active").length;

      // Unique visitors that hit the landing page ("/").
      const landingSessions = new Set(
        pageViews
          .filter((v) => LANDING_PATHS.includes(v.page_path))
          .map((v) => v.session_id)
          .filter(Boolean),
      );
      // Unique visitors that reached the paywall / checkout routes.
      const checkoutSessions = new Set(
        pageViews
          .filter((v) =>
            CHECKOUT_PATHS.some((p) => (v.page_path || "").startsWith(p)),
          )
          .map((v) => v.session_id)
          .filter(Boolean),
      );

      // Real data only — when page_views is empty we surface null ("—")
      // instead of fabricating a number from a proxy table.
      const landingVisitors: number | null = hasPageViews
        ? landingSessions.size
        : null;
      const reachedCheckout: number | null = hasPageViews
        ? checkoutSessions.size
        : emailsCaptured > 0
        ? emailsCaptured // fallback proxy until page_views accumulates
        : null;

      // Drop-off only computed when both ends are real numbers.
      const calcDropOff = (current: number | null, previous: number | null) => {
        if (current === null || previous === null || previous === 0) return undefined;
        return Math.round(((previous - current) / previous) * 100);
      };
      const pct = (current: number | null, base: number | null) => {
        if (current === null || base === null || base === 0) return undefined;
        return Math.round((current / base) * 100);
      };

      const funnelSteps: FunnelStep[] = [
        {
          label: "Visitas landing (30d)",
          count: landingVisitors,
          icon: <Eye className="h-5 w-5" />,
          color: "bg-slate-100 text-slate-600 border-slate-200",
        },
        {
          label: "Registros",
          count: totalUsers,
          icon: <UserPlus className="h-5 w-5" />,
          percentage: pct(totalUsers, landingVisitors),
          dropOff: calcDropOff(totalUsers, landingVisitors),
          color: "bg-blue-50 text-blue-600 border-blue-200",
        },
        {
          label: "Llegaron al paywall/checkout",
          count: reachedCheckout,
          icon: <CreditCard className="h-5 w-5" />,
          percentage: pct(reachedCheckout, totalUsers),
          dropOff: calcDropOff(reachedCheckout, totalUsers),
          color: "bg-purple-50 text-purple-600 border-purple-200",
        },
        {
          label: "Suscritos (pago)",
          count: activeSubs,
          icon: <CheckCircle className="h-5 w-5" />,
          percentage: pct(activeSubs, reachedCheckout),
          dropOff: calcDropOff(activeSubs, reachedCheckout),
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

  if (loading || steps.length === 0) {
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

  // Calculate key insights — steps: 0 landing, 1 registros, 2 checkout, 3 pago.
  const ratio = (a: number | null, b: number | null) =>
    a !== null && b !== null && b > 0 ? Math.round((a / b) * 100) : null;
  const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`);
  const fmtCount = (v: number | null) => (v === null ? "—" : v);

  const visitorToSignup = ratio(steps[1].count, steps[0].count);
  const signupToCheckout = ratio(steps[2].count, steps[1].count);
  const checkoutToPaid = ratio(steps[3].count, steps[2].count);
  const overallConversion = ratio(steps[3].count, steps[0].count);

  const landingCount = steps[0].count;
  const checkoutCount = steps[2].count;
  const paidCount = steps[3].count;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          🔄 Embudo de Conversión
        </CardTitle>
        {(steps[0].count === null || steps[0].count === 0) && (
          <p className="text-xs text-muted-foreground">
            Las visitas de landing aparecerán cuando empiece a llegar tráfico
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
                  <span className="text-lg font-bold">{fmtCount(step.count)}</span>
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
            <p className="text-muted-foreground">Visita → Registro</p>
            <p className="font-bold text-blue-600">{fmtPct(visitorToSignup)}</p>
          </div>
          <div className="p-2 bg-orange-50 rounded border border-orange-100">
            <p className="text-muted-foreground">Registro → Checkout</p>
            <p className="font-bold text-orange-600">{fmtPct(signupToCheckout)}</p>
          </div>
          <div className="p-2 bg-green-50 rounded border border-green-100">
            <p className="text-muted-foreground">Checkout → Pago</p>
            <p className="font-bold text-green-600">{fmtPct(checkoutToPaid)}</p>
          </div>
          <div className="p-2 bg-purple-50 rounded border border-purple-100">
            <p className="text-muted-foreground">Conversión total</p>
            <p className="font-bold text-purple-600">{fmtPct(overallConversion)}</p>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg text-xs">
          <p className="font-medium mb-1">💡 Insights:</p>
          <ul className="text-muted-foreground space-y-1">
            {checkoutToPaid !== null && checkoutToPaid > 0 && checkoutToPaid < 20 && (
              <li className="text-amber-600">
                • Conversión a pago baja ({checkoutToPaid}%) - revisa pricing/copy
              </li>
            )}
            {visitorToSignup !== null && visitorToSignup > 0 && visitorToSignup < 5 && (
              <li className="text-amber-600">
                • Pocos visitantes se registran ({visitorToSignup}%) - optimiza landing
              </li>
            )}
            {paidCount !== null && paidCount > 0 && (
              <li className="text-green-600">
                • Tienes {paidCount} suscriptores activos 🎉
              </li>
            )}
            {landingCount === null && (
              <li>• Aún sin datos de page_views — empezarán a registrarse con el primer tráfico</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
