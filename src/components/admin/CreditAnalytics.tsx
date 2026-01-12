import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Film, Package, Zap, TrendingUp } from "lucide-react";

interface CreditData {
  totalCreditsSold: number;
  totalRevenue: number;
  totalCreditsUsed: number;
  totalCreditsAvailable: number;
  purchasesByPack: {
    pack: string;
    count: number;
    credits: number;
    revenue: number;
  }[];
  thisMonthPurchases: number;
  thisMonthRevenue: number;
}

export const CreditAnalytics = () => {
  const [data, setData] = useState<CreditData>({
    totalCreditsSold: 0,
    totalRevenue: 0,
    totalCreditsUsed: 0,
    totalCreditsAvailable: 0,
    purchasesByPack: [],
    thisMonthPurchases: 0,
    thisMonthRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCreditData();
  }, []);

  const loadCreditData = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [creditsRes, purchasesRes] = await Promise.all([
        supabase.from("video_credits").select("credits_monthly, credits_purchased, credits_used"),
        supabase.from("credit_purchases").select("pack_type, credits_purchased, amount_usd, created_at"),
      ]);

      const credits = creditsRes.data || [];
      const purchases = purchasesRes.data || [];

      // Total credits from video_credits table
      const totalCreditsUsed = credits.reduce((sum, c) => sum + (c.credits_used || 0), 0);
      const totalCreditsAvailable = credits.reduce((sum, c) => {
        const total = (c.credits_monthly || 0) + (c.credits_purchased || 0);
        const used = c.credits_used || 0;
        return sum + Math.max(0, total - used);
      }, 0);

      // Credits from purchases
      const totalCreditsSold = purchases.reduce((sum, p) => sum + (p.credits_purchased || 0), 0);
      const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount_usd || 0), 0);

      // This month's purchases
      const thisMonthPurchases = purchases.filter(p => 
        new Date(p.created_at) >= startOfMonth
      );
      const thisMonthCount = thisMonthPurchases.length;
      const thisMonthRevenue = thisMonthPurchases.reduce((sum, p) => sum + (p.amount_usd || 0), 0);

      // Group by pack type
      const packGroups: Record<string, { count: number; credits: number; revenue: number }> = {};
      purchases.forEach(p => {
        const pack = p.pack_type || "unknown";
        if (!packGroups[pack]) {
          packGroups[pack] = { count: 0, credits: 0, revenue: 0 };
        }
        packGroups[pack].count += 1;
        packGroups[pack].credits += p.credits_purchased || 0;
        packGroups[pack].revenue += p.amount_usd || 0;
      });

      const packLabels: Record<string, string> = {
        starter: "🚀 Starter (5)",
        pro: "⚡ Pro (15)",
        studio: "🎬 Studio (50)",
        unknown: "Otros",
      };

      const purchasesByPack = Object.entries(packGroups)
        .map(([pack, stats]) => ({
          pack: packLabels[pack] || pack,
          ...stats,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      setData({
        totalCreditsSold,
        totalRevenue,
        totalCreditsUsed,
        totalCreditsAvailable,
        purchasesByPack,
        thisMonthPurchases: thisMonthCount,
        thisMonthRevenue,
      });
    } catch (error) {
      console.error("Error loading credit data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="pt-4 pb-4">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.totalCreditsSold > 0 || data.totalCreditsUsed > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          🎬 Créditos de Video IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-6">
            <Film className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aún no hay compras de créditos
            </p>
          </div>
        ) : (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vendidos</p>
                    <p className="text-xl font-bold text-purple-600">
                      {data.totalCreditsSold}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ingresos</p>
                    <p className="text-xl font-bold text-green-600">
                      ${data.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Usados</p>
                    <p className="text-xl font-bold text-orange-600">
                      {data.totalCreditsUsed}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Film className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Disponibles</p>
                    <p className="text-xl font-bold text-blue-600">
                      {data.totalCreditsAvailable}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* This Month Stats */}
            <div className="p-3 bg-muted/50 rounded-lg mb-4">
              <p className="text-xs font-medium mb-1">📅 Este mes:</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.thisMonthPurchases} compras
                </span>
                <span className="font-medium">
                  ${data.thisMonthRevenue.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Breakdown by Pack */}
            {data.purchasesByPack.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">📦 Por paquete:</p>
                {data.purchasesByPack.map(pack => (
                  <div
                    key={pack.pack}
                    className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                  >
                    <span>{pack.pack}</span>
                    <div className="text-right">
                      <span className="text-muted-foreground">
                        {pack.count} compras • {pack.credits} créditos
                      </span>
                      <span className="ml-2 font-medium">
                        ${pack.revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
