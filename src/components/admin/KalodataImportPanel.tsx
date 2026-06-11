import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";

// =============================================================================
// KalodataImportPanel: UNA dropzone para 1-3 archivos de Kalodata.
// Autodetecta tipo (Video/Product/Creator) y mercado (MX/US) por nombre de
// archivo; si no matchea, selects manuales inline por archivo.
// "Importar y procesar" orquesta EN ORDEN: creators -> products -> videos
// (mismas edge functions del flujo previo) y al final corre match-videos en
// loop (limit 100) hasta agotar pendientes.
// =============================================================================

type FileKind = "creators" | "products" | "videos";
type Market = "mx" | "us";

interface DetectedFile {
  file: File;
  kind: FileKind | null;
  market: Market | null;
}

interface StageState {
  label: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  detail?: string;
}

interface ImportSummary {
  imported: Partial<Record<FileKind, number>>;
  nuevos: number | null;
  actualizados: number | null;
  exact: number;
  fuzzy: number;
  ai: number;
  review: number;
  none: number;
}

const KIND_META: Record<FileKind, { emoji: string; label: string; fn: string }> = {
  videos: { emoji: "🎬", label: "Videos", fn: "process-kalodata" },
  products: { emoji: "📦", label: "Productos", fn: "process-kalodata-products" },
  creators: { emoji: "👤", label: "Creadores", fn: "process-kalodata-creators" },
};

const MARKET_META: Record<Market, { emoji: string; label: string }> = {
  mx: { emoji: "🇲🇽", label: "MX" },
  us: { emoji: "🇺🇸", label: "US" },
};

// Orden de procesamiento: primero creadores, luego productos, al final videos.
const KIND_ORDER: FileKind[] = ["creators", "products", "videos"];

// ---------------------------------------------------------------------------
// Autodetección por nombre: /Kalodata_(Video|Product|Creator).*_(MX|US)\.xlsx/i
// tolerante a sufijos de fecha, espacios, guiones y "(1)" del navegador.
// ---------------------------------------------------------------------------
export function detectKalodataFile(fileName: string): { kind: FileKind | null; market: Market | null } {
  const name = fileName.toLowerCase();

  let kind: FileKind | null = null;
  if (/video/i.test(name)) kind = "videos";
  else if (/product|producto/i.test(name)) kind = "products";
  else if (/creator|creador/i.test(name)) kind = "creators";

  // Mercado: última aparición de mx/us como token aislado (no dentro de palabras).
  let market: Market | null = null;
  const base = name.replace(/\.xlsx?$/i, "");
  const tokens = base.match(/(?:^|[^a-z])(mx|us)(?=[^a-z]|$)/gi);
  if (tokens && tokens.length > 0) {
    const last = tokens[tokens.length - 1].match(/(mx|us)/i);
    if (last) market = last[1].toLowerCase() as Market;
  }

  return { kind, market };
}

export const KalodataImportPanel = ({ onImported }: { onImported?: () => void }) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<DetectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<StageState[]>([]);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const next: DetectedFile[] = [];
    for (const f of Array.from(incoming)) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
        toast({
          title: "Archivo ignorado",
          description: `"${f.name}" no es un .xlsx de Kalodata.`,
          variant: "destructive",
        });
        continue;
      }
      if (f.size > 25 * 1024 * 1024) {
        toast({
          title: "Archivo demasiado grande",
          description: `"${f.name}" supera los 25 MB.`,
          variant: "destructive",
        });
        continue;
      }
      const { kind, market } = detectKalodataFile(f.name);
      next.push({ file: f, kind, market });
    }
    if (next.length > 0) {
      setFiles((prev) => [...prev, ...next]);
      setSummary(null);
      setErrorMessage(null);
    }
  }, [toast]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFile = (index: number, patch: Partial<DetectedFile>) => {
    setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  };

  const allResolved = useMemo(
    () => files.length > 0 && files.every((f) => f.kind && f.market),
    [files]
  );

  // ---------------------------------------------------------------------------
  // Orquestación: creators -> products -> videos -> match-videos en loop.
  // ---------------------------------------------------------------------------
  const runImport = async () => {
    if (!allResolved || isRunning) return;
    setIsRunning(true);
    setSummary(null);
    setErrorMessage(null);

    const ordered = KIND_ORDER.flatMap((kind) => files.filter((f) => f.kind === kind));
    const hasVideos = ordered.some((f) => f.kind === "videos");
    const markets = [...new Set(ordered.map((f) => f.market as Market))];

    const stageList: StageState[] = ordered.map((f) => ({
      label: `${KIND_META[f.kind as FileKind].emoji} ${KIND_META[f.kind as FileKind].label} · ${MARKET_META[f.market as Market].emoji} ${MARKET_META[f.market as Market].label}`,
      status: "pending" as const,
    }));
    if (hasVideos) {
      stageList.push({ label: "🔗 Vinculación automática (match-videos)", status: "pending" });
    }
    setStages(stageList);
    setProgress(2);

    const result: ImportSummary = {
      imported: {},
      nuevos: null,
      actualizados: null,
      exact: 0,
      fuzzy: 0,
      ai: 0,
      review: 0,
      none: 0,
    };

    const setStage = (i: number, patch: Partial<StageState>) => {
      setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    };

    const totalStages = stageList.length;

    try {
      // ---- Etapas de import (en orden) ----
      for (let i = 0; i < ordered.length; i++) {
        const f = ordered[i];
        const kind = f.kind as FileKind;
        setStage(i, { status: "running" });
        setProgress(Math.round(((i + 0.5) / totalStages) * 100));

        const formData = new FormData();
        formData.append("file", f.file);
        formData.append("market", f.market as Market);

        const { data, error } = await supabase.functions.invoke(KIND_META[kind].fn, {
          body: formData,
        });
        if (error) {
          setStage(i, { status: "error", detail: error.message });
          throw new Error(`Error importando ${KIND_META[kind].label}: ${error.message}`);
        }

        const processed = data?.processed ?? 0;
        result.imported[kind] = (result.imported[kind] || 0) + processed;
        // Telemetría nuevos/actualizados si la function la devuelve
        if (data?.new_rows != null || data?.inserted != null) {
          result.nuevos = (result.nuevos || 0) + (data?.new_rows ?? data?.inserted ?? 0);
        }
        if (data?.updated_rows != null || data?.updated != null) {
          result.actualizados = (result.actualizados || 0) + (data?.updated_rows ?? data?.updated ?? 0);
        }

        setStage(i, { status: "done", detail: `${processed} registros` });
        setProgress(Math.round(((i + 1) / totalStages) * 100));
      }

      // ---- Etapa final: match-videos en loop por mercado ----
      if (hasVideos) {
        const matchStageIdx = totalStages - 1;
        setStage(matchStageIdx, { status: "running" });

        for (const market of markets) {
          let cycles = 0;
          const MAX_CYCLES = 30;
          while (cycles < MAX_CYCLES) {
            cycles++;
            const { data, error } = await supabase.functions.invoke("match-videos", {
              body: { market, limit: 100 },
            });
            if (error) {
              throw new Error(`Error en la vinculación automática: ${error.message}`);
            }

            const processed = data?.processed ?? 0;
            result.exact += data?.exact ?? 0;
            result.fuzzy += data?.fuzzy ?? 0;
            result.ai += data?.ai ?? 0;
            result.review += data?.review ?? 0;
            result.none += data?.none ?? 0;

            setStage(matchStageIdx, {
              status: "running",
              detail: `${result.exact + result.fuzzy + result.ai} vinculados · ${result.review} en revisión`,
            });

            // Detener cuando no quedan pendientes o el lote devolvió solo review/none
            const matchedThisRound = (data?.exact ?? 0) + (data?.fuzzy ?? 0) + (data?.ai ?? 0);
            if (processed === 0 || matchedThisRound === 0) break;
          }
        }

        setStage(matchStageIdx, {
          status: "done",
          detail: `${result.exact} exactos · ${result.fuzzy} fuzzy · ${result.ai} IA · ${result.review} en revisión`,
        });
      }

      setProgress(100);
      setSummary(result);
      setFiles([]);
      onImported?.();

      toast({
        title: "✅ Importación completada",
        description: hasVideos
          ? `${result.exact + result.fuzzy + result.ai} videos vinculados, ${result.review} esperan tu confirmación.`
          : "Datos importados correctamente.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      toast({
        title: "Error en la importación",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          Archivos de Kalodata (.xlsx)
        </CardTitle>
        <CardDescription>
          Suelta 1-3 archivos de golpe. El tipo y el mercado se detectan solos por el nombre del archivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone única */}
        <label
          htmlFor="kalodata-dropzone"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`block rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            id="kalodata-dropzone"
            type="file"
            accept=".xlsx,.xls"
            multiple
            className="hidden"
            disabled={isRunning}
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="px-6 py-8 text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold">Arrastra aquí los XLSX de Kalodata</p>
            <p className="text-xs text-muted-foreground">
              o toca para seleccionar · Videos, Productos y Creadores · MX o US · hasta 25 MB c/u
            </p>
          </div>
        </label>

        {/* Archivos detectados */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={`${f.file.name}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2.5"
              >
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-medium break-all flex-1 min-w-[120px]">{f.file.name}</span>

                {/* Chip de detección o select manual */}
                {f.kind ? (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                    {KIND_META[f.kind].emoji} {KIND_META[f.kind].label}
                  </span>
                ) : (
                  <Select
                    value=""
                    onValueChange={(v) => updateFile(i, { kind: v as FileKind })}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 w-[130px] text-xs">
                      <SelectValue placeholder="¿Tipo?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="videos">🎬 Videos</SelectItem>
                      <SelectItem value="products">📦 Productos</SelectItem>
                      <SelectItem value="creators">👤 Creadores</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {f.market ? (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-muted text-foreground border border-border whitespace-nowrap">
                    {MARKET_META[f.market].emoji} {MARKET_META[f.market].label}
                  </span>
                ) : (
                  <Select
                    value=""
                    onValueChange={(v) => updateFile(i, { market: v as Market })}
                    disabled={isRunning}
                  >
                    <SelectTrigger className="h-9 w-[110px] text-xs">
                      <SelectValue placeholder="¿Mercado?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mx">🇲🇽 MX</SelectItem>
                      <SelectItem value="us">🇺🇸 US</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <button
                  onClick={() => removeFile(i)}
                  disabled={isRunning}
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  title="Quitar archivo"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
            {!allResolved && (
              <p className="text-xs text-amber-600">
                Falta indicar tipo o mercado en algún archivo (el nombre no se reconoció).
              </p>
            )}
          </div>
        )}

        {/* Progreso por etapa */}
        {(isRunning || stages.some((s) => s.status === "error")) && stages.length > 0 && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Progress value={progress} className="h-2" />
            <ul className="space-y-1.5">
              {stages.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  {s.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />}
                  {s.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />}
                  {s.status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                  {s.status === "pending" && <span className="h-3.5 w-3.5 rounded-full border border-border flex-shrink-0" />}
                  <span className={s.status === "pending" ? "text-muted-foreground" : "text-foreground"}>
                    {s.label}
                  </span>
                  {s.detail && <span className="text-muted-foreground">· {s.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {errorMessage && !isRunning && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">No se pudo completar la importación</p>
                <p className="text-xs text-muted-foreground mt-0.5 break-all">{errorMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Puedes volver a intentar: los datos ya importados no se duplican.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Resumen final */}
        {summary && !isRunning && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="text-sm font-semibold text-success mb-2">Resumen de la importación</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(Object.keys(summary.imported) as FileKind[]).map((k) => (
                <div key={k}>
                  <p className="text-muted-foreground">{KIND_META[k].emoji} {KIND_META[k].label}</p>
                  <p className="text-lg font-bold tabular-nums">{summary.imported[k]}</p>
                </div>
              ))}
              {summary.nuevos != null && (
                <div>
                  <p className="text-muted-foreground">Nuevos</p>
                  <p className="text-lg font-bold tabular-nums">{summary.nuevos}</p>
                </div>
              )}
              {summary.actualizados != null && (
                <div>
                  <p className="text-muted-foreground">Actualizados</p>
                  <p className="text-lg font-bold tabular-nums">{summary.actualizados}</p>
                </div>
              )}
              {summary.exact + summary.fuzzy + summary.ai + summary.review > 0 && (
                <>
                  <div>
                    <p className="text-muted-foreground">Vinculados</p>
                    <p className="text-lg font-bold tabular-nums">
                      {summary.exact + summary.fuzzy + summary.ai}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {summary.exact} exactos · {summary.fuzzy} fuzzy · {summary.ai} IA
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">En revisión</p>
                    <p className="text-lg font-bold tabular-nums text-amber-600">{summary.review}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Botón único */}
        <Button
          onClick={runImport}
          disabled={!allResolved || isRunning}
          className="w-full h-12 text-sm font-semibold"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importando y procesando...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Importar y procesar
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
          <p className="font-medium">Orden automático: Creadores → Productos → Videos → Vinculación</p>
          <p>Los datos existentes se actualizan, los nuevos se crean. Los videos sin match claro quedan en la cola de confirmación de abajo.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default KalodataImportPanel;
