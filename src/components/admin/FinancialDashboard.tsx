import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, CreditCard, Users } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface FinancialData {
  mrr: number;
  mrrPro: number;
  mrrPremium: number;
  activeSubs: number;
  proSubs: number;
  premiumSubs: number;
  creditsRevenue: number;
  creditsCount: number;
  totalRevenue: number;
  chartData: { date: string; revenue: number }[];
}

export const FinancialDashboard = () => {
  const [data, setData] = useState<FinancialData>({
    mrr: 0,
    mrrPro: 0,
    mrrPremium: 0,
    activeSubs: 0,
    proSubs: 0,
    premiumSubs: 0,
    creditsRevenue: 0,
    creditsCount: 0,
    totalRevenue: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30);

      const [subsRes, creditsRes] = await Promise.all([
        supabase.from("subscriptions").select("status, price_usd, created_at"),
        supabase.from("credit_purchases").select("amount_usd, credits_purchased, created_at"),
      ]);

      const subs = subsRes.data || [];
      const credits = creditsRes.data || [];

      // Calculate MRR from active subscriptions
      const activeSubs = subs.filter(s => s.status === "active");
      const proSubs = activeSubs.filter(s => (s.price_usd || 0) <= 20);
      const premiumSubs = activeSubs.filter(s => (s.price_usd || 0) > 20);
      
      const mrrPro = proSubs.reduce((sum, s) => sum + (s.price_usd || 14.99), 0);
      const mrrPremium = premiumSubs.reduce((sum, s) => sum + (s.price_usd || 49), 0);
      const mrr = mrrPro + mrrPremium;

      // Calculate credits revenue
      const creditsRevenue = credits.reduce((sum, c) => sum + (c.amount_usd || 0), 0);
      const creditsCount = credits.reduce((sum, c) => sum + (c.credits_purchased || 0), 0);

      // Build chart data for last 30 days
      const chartData: { date: string; revenue: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const day = startOfDay(subDays(new Date(), i));
        const dayStr = format(day, "yyyy-MM-dd");
        
        // Sum subscriptions created/renewed on this day
        const daySubRevenue = subs
          .filter(s => {
            const subDate = new Date(s.created_at);
            return format(subDate, "yyyy-MM-dd") === dayStr;
          })
          .reduce((sum, s) => sum + (s.price_usd || 0), 0);

        // Sum credit purchases on this day
        const dayCreditRevenue = credits
          .filter(c => {
            const creditDate = new Date(c.created_at);
            return format(creditDate, "yyyy-MM-dd") === dayStr;
          })
          .reduce((sum, c) => sum + (c.amount_usd || 0), 0);

        chartData.push({
          date: format(day, "dd MMM", { locale: es }),
          revenue: daySubRevenue + dayCreditRevenue,
        });
      }

      setData({
        mrr,
        mrrPro,
        mrrPremium,
        activeSubs: activeSubs.length,
        proSubs: proSubs.length,
        premiumSubs: premiumSubs.length,
        creditsRevenue,
        creditsCount,
        totalRevenue: mrr + creditsRevenue,
        chartData,
      });
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-4 pb-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="pt-4 pb-4">
            <div className="h-48 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartConfig = {
    revenue: {
      label: "Ingresos",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-4">
      {/* Main Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">💰 MRR</p>
                <p className="text-2xl font-bold text-green-600">
                  ${data.mrr.toFixed(2)}
                </p>
                <p className="text-xs text-green-600">
                  Ingresos recurrentes
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">👥 Suscriptores</p>
                <p className="text-2xl font-bold text-blue-600">{data.activeSubs}</p>
                <p className="text-xs text-blue-600">
                  Pro: {data.proSubs} • Premium: {data.premiumSubs}
                </p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">🎬 Créditos</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${data.creditsRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600">
                  {data.creditsCount} créditos vendidos
                </p>
              </div>
              <CreditCard className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">📈 Total</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${data.totalRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-orange-600">
                  Subs + Créditos
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Ingresos Últimos 30 Días
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-48 w-full">
            <AreaChart data={data.chartData}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Ingresos"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fill="url(#fillRevenue)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>

          {/* Breakdown */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-medium mb-2">📊 Desglose MRR:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suscripciones Pro:</span>
                <span className="font-medium">${data.mrrPro.toFixed(2)} ({data.proSubs})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suscripciones Premium:</span>
                <span className="font-medium">${data.mrrPremium.toFixed(2)} ({data.premiumSubs})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Créditos:</span>
                <span className="font-medium">${data.creditsRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-bold">TOTAL:</span>
                <span className="font-bold">${data.totalRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
