import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface PageVisit {
  page_path: string;
  count: number;
}

interface TrafficData {
  uniqueVisitors: number;
  totalPageViews: number;
  topPages: PageVisit[];
  dailyVisits: { date: string; visits: number }[];
  hasData: boolean;
}

export const TrafficAnalytics = () => {
  const [data, setData] = useState<TrafficData>({
    uniqueVisitors: 0,
    totalPageViews: 0,
    topPages: [],
    dailyVisits: [],
    hasData: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrafficData();
  }, []);

  const loadTrafficData = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7);

      const { data: pageViews, error } = await supabase
        .from("page_views")
        .select("session_id, page_path, created_at")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) throw error;

      if (!pageViews || pageViews.length === 0) {
        setData({ ...data, hasData: false });
        setLoading(false);
        return;
      }

      // Unique visitors by session_id
      const uniqueSessions = new Set(pageViews.map(v => v.session_id).filter(Boolean));
      const uniqueVisitors = uniqueSessions.size;

      // Top pages
      const pageCounts: Record<string, number> = {};
      pageViews.forEach(v => {
        const path = v.page_path || "/unknown";
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      });

      const topPages: PageVisit[] = Object.entries(pageCounts)
        .map(([page_path, count]) => ({ page_path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Daily visits for chart
      const dailyVisits: { date: string; visits: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = startOfDay(subDays(new Date(), i));
        const dayStr = format(day, "yyyy-MM-dd");
        
        const dayVisits = pageViews.filter(v => {
          const viewDate = new Date(v.created_at);
          return format(viewDate, "yyyy-MM-dd") === dayStr;
        }).length;

        dailyVisits.push({
          date: format(day, "EEE", { locale: es }),
          visits: dayVisits,
        });
      }

      setData({
        uniqueVisitors,
        totalPageViews: pageViews.length,
        topPages,
        dailyVisits,
        hasData: true,
      });
    } catch (error) {
      console.error("Error loading traffic data:", error);
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

  const chartConfig = {
    visits: {
      label: "Visitas",
      color: "hsl(var(--primary))",
    },
  };

  if (!data.hasData) {
    return (
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            📈 Analytics de Tráfico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
            <p className="text-sm font-medium text-amber-700 mb-1">
              Sin datos de tráfico interno
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-sm">
              La tabla page_views está vacía. Verifica que trackPageView() se esté ejecutando correctamente o consulta Google Analytics.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("https://analytics.google.com", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Google Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          📈 Analytics de Tráfico (7 días)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Visitantes únicos</p>
                <p className="text-xl font-bold text-blue-600">{data.uniqueVisitors}</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Page views</p>
                <p className="text-xl font-bold text-green-600">{data.totalPageViews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Chart */}
        <ChartContainer config={chartConfig} className="h-32 w-full mb-4">
          <BarChart data={data.dailyVisits}>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="visits"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Top Pages */}
        <div className="space-y-2">
          <p className="text-sm font-medium">📄 Páginas más visitadas:</p>
          {data.topPages.map((page, i) => (
            <div
              key={page.page_path}
              className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
            >
              <span className="truncate max-w-[200px]">
                {i + 1}. {page.page_path}
              </span>
              <span className="font-medium text-muted-foreground">
                {page.count} visitas
              </span>
            </div>
          ))}
        </div>

        {/* External Analytics Link */}
        <div className="mt-4 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => window.open("https://analytics.google.com", "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Ver más detalles en Google Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
