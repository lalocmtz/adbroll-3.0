import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, Mail, TrendingUp, UserCheck, XCircle, Clock } from "lucide-react";

interface AnalyticsData {
  totalUsers: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
  emailsCaptured: number;
  emailsConverted: number;
  conversionRate: number;
  recentSignups: number;
  brandsCount: number;
}

export const AnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData>({
    totalUsers: 0,
    activeSubscriptions: 0,
    canceledSubscriptions: 0,
    emailsCaptured: 0,
    emailsConverted: 0,
    conversionRate: 0,
    recentSignups: 0,
    brandsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [usersRes, subsRes, emailsRes, brandsRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at"),
        supabase.from("subscriptions").select("id, status, created_at"),
        supabase.from("email_captures").select("id, converted_at, created_at"),
        supabase.from("brand_profiles").select("id", { count: "exact", head: true }),
      ]);

      const users = usersRes.data || [];
      const subs = subsRes.data || [];
      const emails = emailsRes.data || [];

      // Calculate recent signups (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentSignups = users.filter(u => new Date(u.created_at) > weekAgo).length;

      // Subscription counts
      const activeSubscriptions = subs.filter(s => s.status === "active").length;
      const canceledSubscriptions = subs.filter(s => s.status === "canceled").length;

      // Email metrics
      const emailsCaptured = emails.length;
      const emailsConverted = emails.filter(e => e.converted_at).length;
      const conversionRate = users.length > 0 
        ? Math.round((activeSubscriptions / users.length) * 100) 
        : 0;

      setData({
        totalUsers: users.length,
        activeSubscriptions,
        canceledSubscriptions,
        emailsCaptured,
        emailsConverted,
        conversionRate,
        recentSignups,
        brandsCount: brandsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">👥 Usuarios</p>
                <p className="text-2xl font-bold text-blue-600">{data.totalUsers}</p>
                <p className="text-xs text-blue-600">+{data.recentSignups} esta semana</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">💰 Suscrip. Activas</p>
                <p className="text-2xl font-bold text-green-600">{data.activeSubscriptions}</p>
                <p className="text-xs text-green-600">${(data.activeSubscriptions * 14.99).toFixed(2)} MRR</p>
              </div>
              <CreditCard className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">📧 Emails Capturados</p>
                <p className="text-2xl font-bold text-orange-600">{data.emailsCaptured}</p>
                <p className="text-xs text-orange-600">{data.emailsConverted} convertidos</p>
              </div>
              <Mail className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">🎯 Conversión</p>
                <p className="text-2xl font-bold text-purple-600">{data.conversionRate}%</p>
                <p className="text-xs text-purple-600">usuarios → pago</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Canceladas</p>
                <p className="text-lg font-semibold">{data.canceledSubscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-xs text-muted-foreground">Marcas</p>
                <p className="text-lg font-semibold">{data.brandsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Leads pendientes</p>
                <p className="text-lg font-semibold">{data.emailsCaptured - data.emailsConverted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
