import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Package, Video } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Metrics {
  totalVideos: number;
  videosWithProduct: number;
  videosMatchedByUrl: number;
  videosMatchedByStub: number;
  videosUnmatched: number;
  totalProducts: number;
  productStubs: number;
  productsWithVideos: number;
  lastVideoImport: string | null;
}

interface ImportRow {
  id: string;
  created_at: string | null;
  kind: string | null;
  file_name: string | null;
  total_rows: number | null;
  videos_imported: number | null;
  products_imported: number | null;
  creators_imported: number | null;
  matched_count: number | null;
  stub_count: number | null;
  unmatched_count: number | null;
  duration_ms: number | null;
  detected_format: string | null;
}

const INITIAL: Metrics = {
  totalVideos: 0,
  videosWithProduct: 0,
  videosMatchedByUrl: 0,
  videosMatchedByStub: 0,
  videosUnmatched: 0,
  totalProducts: 0,
  productStubs: 0,
  productsWithVideos: 0,
  lastVideoImport: null,
};

// Cliente sin tipar para columnas legacy que no existen en los tipos
// generados (matched_by, from_video, video_count, last_import).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function DataQualityPanel() {
  const [metrics, setMetrics] = useState<Metrics>(INITIAL);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const [
        videosTotal,
        videosWithProduct,
        videosByUrl,
        videosByStub,
        videosNone,
        productsTotal,
        productsStub,
        productsWithVideos,
        lastImport,
        importsHistory,
      ] = await Promise.all([
        supabase.from("daily_feed").select("*", { count: "exact", head: true }),
        supabase.from("daily_feed").select("*", { count: "exact", head: true }).not("product_id", "is", null),
        // Estas columnas son legacy/opcionales y no están en los tipos
        // generados; se consultan con un cliente sin tipar para no romper
        // el typecheck cuando no existen en el esquema actual.
        db.from("daily_feed").select("*", { count: "exact", head: true }).eq("matched_by", "product_url"),
        db.from("daily_feed").select("*", { count: "exact", head: true }).eq("matched_by", "stub"),
        db.from("daily_feed").select("*", { count: "exact", head: true }).or("matched_by.eq.none,matched_by.is.null"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        db.from("products").select("*", { count: "exact", head: true }).eq("from_video", true),
        db.from("products").select("*", { count: "exact", head: true }).gt("video_count", 0),
        db
          .from("daily_feed")
          .select("last_import")
          .not("last_import", "is", null)
          .order("last_import", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("imports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setMetrics({
        totalVideos: videosTotal.count ?? 0,
        videosWithProduct: videosWithProduct.count ?? 0,
        videosMatchedByUrl: videosByUrl.count ?? 0,
        videosMatchedByStub: videosByStub.count ?? 0,
        videosUnmatched: videosNone.count ?? 0,
        totalProducts: productsTotal.count ?? 0,
        productStubs: productsStub.count ?? 0,
        productsWithVideos: productsWithVideos.count ?? 0,
        lastVideoImport: (lastImport.data?.last_import as string | null) ?? null,
      });
      setImports((importsHistory.data ?? []) as unknown as ImportRow[]);
    } catch (error) {
      console.error("[DataQualityPanel] load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const matchRate =
    metrics.totalVideos > 0
      ? Math.round((metrics.videosWithProduct / metrics.totalVideos) * 100)
      : 0;

  const healthLabel =
    matchRate >= 90 ? "Excelente" : matchRate >= 70 ? "Bueno" : matchRate >= 40 ? "Aceptable" : "Bajo";
  const healthColor =
    matchRate >= 90 ? "bg-green-500" : matchRate >= 70 ? "bg-blue-500" : matchRate >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" /> Calidad de datos
            </CardTitle>
            <CardDescription>
              Salud de la ingestión Kalodata — matching, stubs y últimas importaciones.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={loadMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              icon={<Video className="h-4 w-4" />}
              label="Videos totales"
              value={metrics.totalVideos.toLocaleString()}
              hint={
                metrics.lastVideoImport
                  ? `Último import ${formatDistanceToNow(new Date(metrics.lastVideoImport), { addSuffix: true, locale: es })}`
                  : "Sin imports recientes"
              }
            />
            <MetricCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Con producto enlazado"
              value={`${metrics.videosWithProduct.toLocaleString()} (${matchRate}%)`}
              hint={`${metrics.videosMatchedByUrl} por URL, ${metrics.videosMatchedByStub} stubs`}
            />
            <MetricCard
              icon={<Package className="h-4 w-4" />}
              label="Productos totales"
              value={metrics.totalProducts.toLocaleString()}
              hint={`${metrics.productsWithVideos} tienen videos asociados`}
            />
            <MetricCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Stubs pendientes"
              value={metrics.productStubs.toLocaleString()}
              hint="Productos creados desde videos — enriquecer manualmente"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Match rate videos→productos</span>
              <span className="font-medium">
                {healthLabel} · {matchRate}%
              </span>
            </div>
            <Progress value={matchRate} className={healthColor} />
            {metrics.videosUnmatched > 0 && (
              <p className="text-xs text-muted-foreground">
                {metrics.videosUnmatched} videos sin match. Revisa los títulos o sube
                el archivo de productos con la columna <code>URL del producto</code>.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de importaciones</CardTitle>
          <CardDescription>Últimas 10 cargas con métricas de calidad.</CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Sin imports registrados todavía.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Archivo</TableHead>
                    <TableHead className="text-right">Filas</TableHead>
                    <TableHead className="text-right">Match</TableHead>
                    <TableHead className="text-right">Stubs</TableHead>
                    <TableHead className="text-right">Sin match</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead className="text-right">ms</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {imports.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {row.created_at
                          ? formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: es })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {row.kind ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs" title={row.file_name ?? ""}>
                        {row.file_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {row.total_rows ?? 0}
                      </TableCell>
                      <TableCell className="text-right text-xs text-green-600">
                        {row.matched_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-blue-600">
                        {row.stub_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-orange-600">
                        {row.unmatched_count ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {row.detected_format ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {row.duration_ms ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
