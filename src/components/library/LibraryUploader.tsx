import { useCallback, useState } from "react";
import { Upload, X, FileVideo, FileAudio, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LibraryUploaderProps {
  onUpload: (files: FileList | File[]) => Promise<void>;
  uploading: boolean;
  className?: string;
}

const ACCEPTED_TYPES = {
  "video/*": [".mp4", ".mov", ".webm", ".avi"],
  "audio/*": [".mp3", ".wav", ".m4a", ".ogg"],
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
  "text/*": [".txt", ".md"],
};

const LibraryUploader = ({ onUpload, uploading, className }: LibraryUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
    setSelectedFiles([]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) return <FileVideo className="h-4 w-4 text-red-500" />;
    if (type.startsWith("audio/")) return <FileAudio className="h-4 w-4 text-purple-500" />;
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-amber-500" />;
    return <FileText className="h-4 w-4 text-emerald-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-primary/50",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          multiple
          accept="video/*,audio/*,image/*,.txt,.md"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center",
            isDragging ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-7 w-7",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Suelta los archivos aquí" : "Arrastra archivos o haz clic para seleccionar"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Videos, audios, imágenes y guiones (máx. 100MB cada uno)
            </p>
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} archivo(s) seleccionado(s)
            </p>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? "Subiendo..." : "Subir archivos"}
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {uploading && (
            <Progress value={undefined} className="h-1" />
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryUploader;
