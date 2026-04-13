import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type UploadState = "idle" | "uploading" | "success" | "error";

export interface KalodataUploaderProps {
  kind: "videos" | "products" | "creators";
  title: string;
  description: string;
  edgeFunction: string;
  steps: string[];
  onUploaded?: () => void;
}

const KIND_LABEL: Record<KalodataUploaderProps["kind"], string> = {
  videos: "Top Videos",
  products: "Top Productos",
  creators: "Top Creadores",
};

export const KalodataUploader = ({
  kind,
  title,
  description,
  edgeFunction,
  steps,
  onUploaded,
}: KalodataUploaderProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<{
    processed?: number;
    aiProcessed?: number;
    aiFailed?: number;
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const accept = ".xlsx,.xls";

  const validateFile = (f: File): string | null => {
    const name = f.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      return "El archivo debe ser .xlsx o .xls";
    }
    if (f.size > 25 * 1024 * 1024) {
      return "El archivo supera los 25 MB";
    }
    return null;
  };

  const handleSelect = (f: File | null) => {
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      toast({ title: "Archivo inválido", description: err, variant: "destructive" });
      return;
    }
    setFile(f);
    setState("idle");
    setResult(null);
    setErrorMessage(null);
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleSelect(dropped);
  }, []);

  const upload = async () => {
    if (!file) return;
    setState("uploading");
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error } = await supabase.functions.invoke(edgeFunction, {
        body: formData,
      });
      if (error) throw error;
      setState("success");
      setResult({
        processed: data?.processed,
        aiProcessed: data?.ai_processed,
        aiFailed: data?.ai_failed,
        message: data?.message,
      });
      toast({
        title: `¡${KIND_LABEL[kind]} procesados!`,
        description: `${data?.processed ?? 0} registros cargados correctamente.`,
      });
      onUploaded?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState("error");
      setErrorMessage(message);
      toast({
        title: `Error al procesar ${KIND_LABEL[kind]}`,
        description: message,
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setFile(null);
    setState("idle");
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border">
        <div className="p-5 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] whitespace-nowrap">
            {KIND_LABEL[kind]}
          </Badge>
        </div>

        <div className="p-5 space-y-4">
          <label
            htmlFor={`file-${kind}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`block rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              isDragging
                ? "border-primary bg-primary/5"
                : file
                  ? "border-success/50 bg-success/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <input
              id={`file-${kind}`}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => handleSelect(e.target.files?.[0] ?? null)}
              disabled={state === "uploading"}
            />
            <div className="px-6 py-10 text-center space-y-3">
              {file ? (
                <>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold break-all">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB · Listo para subir
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Arrastra el XLSX de Kalodata aquí
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      o haz clic para seleccionar · .xlsx hasta 25 MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>

          {state === "uploading" && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    Procesando archivo...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Validando columnas, upsert determinístico por ID de TikTok.
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          )}

          {state === "success" && result && (
            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-success">
                    Procesado correctamente
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                    <ResultStat label="Registros" value={result.processed ?? 0} />
                    {kind === "videos" && (
                      <>
                        <ResultStat
                          label="IA ok"
                          value={result.aiProcessed ?? 0}
                          accent="success"
                        />
                        <ResultStat
                          label="IA falló"
                          value={result.aiFailed ?? 0}
                          accent={result.aiFailed ? "destructive" : "muted"}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {state === "error" && errorMessage && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-destructive">
                    No se pudo procesar el archivo
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {file && state !== "uploading" && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4 mr-2" />
                Quitar
              </Button>
            )}
            <Button
              onClick={upload}
              disabled={!file || state === "uploading"}
              className="flex-1"
            >
              {state === "uploading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : state === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Subir otro archivo
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Procesar {KIND_LABEL[kind]}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="bg-muted/40 border-dashed">
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Qué hace el pipeline
          </p>
          <ol className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-background border border-border text-[10px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
};

const ResultStat = ({
  label,
  value,
  accent = "muted",
}: {
  label: string;
  value: number;
  accent?: "muted" | "success" | "destructive";
}) => {
  const color =
    accent === "success"
      ? "text-success"
      : accent === "destructive"
        ? "text-destructive"
        : "text-foreground";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
};
