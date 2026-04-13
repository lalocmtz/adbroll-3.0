import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Video, FileText, Link2, Camera } from "lucide-react";
import type { WorkerStats } from "@/hooks/useParallelPipeline";

interface ParallelProgressPanelProps {
  stats: WorkerStats;
  isRunning: boolean;
  phase: string;
}

export function ParallelProgressPanel({ stats, isRunning, phase }: ParallelProgressPanelProps) {
  const workers = [
    {
      key: "downloads",
      label: "Descargas",
      icon: Video,
      color: "orange",
      data: stats.downloads,
    },
    {
      key: "transcriptions",
      label: "Transcripciones",
      icon: FileText,
      color: "blue",
      data: stats.transcriptions,
    },
    {
      key: "matching",
      label: "Vinculaciones",
      icon: Link2,
      color: "purple",
      data: stats.matching,
    },
    {
      key: "avatars",
      label: "Fotos",
      icon: Camera,
      color: "pink",
      data: stats.avatars,
    },
  ];

  const getProgress = (data: WorkerStats[keyof WorkerStats]) => {
    const total = data.processed + data.pending;
    if (total === 0) return 100;
    return Math.round((data.processed / total) * 100);
  };

  const colorClasses: Record<string, { bg: string; bar: string; text: string }> = {
    orange: {
      bg: "bg-orange-50",
      bar: "[&>div]:bg-orange-500",
      text: "text-orange-600",
    },
    blue: {
      bg: "bg-blue-50",
      bar: "[&>div]:bg-blue-500",
      text: "text-blue-600",
    },
    purple: {
      bg: "bg-purple-50",
      bar: "[&>div]:bg-purple-500",
      text: "text-purple-600",
    },
    pink: {
      bg: "bg-pink-50",
      bar: "[&>div]:bg-pink-500",
      text: "text-pink-600",
    },
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-4 pb-4 space-y-4">
        {/* Phase indicator */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{phase}</span>
          {isRunning && (
            <span className="text-xs text-muted-foreground animate-pulse">
              En progreso...
            </span>
          )}
        </div>

        {/* Worker progress bars */}
        <div className="space-y-3">
          {workers.map((worker) => {
            const colors = colorClasses[worker.color];
            const progress = getProgress(worker.data);
            const Icon = worker.icon;
            const isActive = worker.data.pending > 0 || worker.data.processed > 0;

            return (
              <div
                key={worker.key}
                className={`p-2.5 rounded-lg ${colors.bg} transition-opacity ${
                  isActive ? "opacity-100" : "opacity-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                    <span className="text-sm font-medium">{worker.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={colors.text}>
                      {worker.data.processed}
                    </span>
                    {worker.data.pending > 0 && (
                      <span className="text-muted-foreground">
                        / {worker.data.processed + worker.data.pending}
                      </span>
                    )}
                    {worker.data.errors > 0 && (
                      <span className="text-red-500">
                        ({worker.data.errors} ❌)
                      </span>
                    )}
                  </div>
                </div>
                <Progress
                  value={progress}
                  className={`h-2 ${colors.bar}`}
                />
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="text-xs text-center text-muted-foreground pt-1">
          Procesando en paralelo: descargas + transcripciones + vinculación + fotos
        </div>
      </CardContent>
    </Card>
  );
}
