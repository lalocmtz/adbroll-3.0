import { X, Download, Copy, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LibraryFile } from "@/hooks/useLibrary";
import { toast } from "@/hooks/use-toast";

interface LibraryFilePreviewerProps {
  file: LibraryFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LibraryFilePreviewer = ({ file, open, onOpenChange }: LibraryFilePreviewerProps) => {
  if (!file) return null;

  const handleDownload = () => {
    window.open(file.file_url, "_blank");
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(file.file_url);
    toast({ title: "URL copiada", description: "Enlace copiado al portapapeles" });
  };

  const renderPreview = () => {
    switch (file.file_type) {
      case "video":
        return (
          <video
            src={file.file_url}
            controls
            autoPlay
            className="max-h-[70vh] w-full rounded-lg"
          >
            Tu navegador no soporta video.
          </video>
        );

      case "audio":
        return (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-6xl">🎵</span>
            </div>
            <audio src={file.file_url} controls autoPlay className="w-full max-w-md">
              Tu navegador no soporta audio.
            </audio>
          </div>
        );

      case "image":
        return (
          <img
            src={file.file_url}
            alt={file.name}
            className="max-h-[70vh] w-auto mx-auto rounded-lg"
          />
        );

      case "script":
        return (
          <div className="p-6 bg-muted rounded-lg max-h-[70vh] overflow-y-auto">
            <iframe
              src={file.file_url}
              className="w-full min-h-[400px] bg-white rounded"
              title={file.name}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-4 p-12">
            <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center">
              <span className="text-4xl">📄</span>
            </div>
            <p className="text-muted-foreground">Vista previa no disponible</p>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar archivo
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{file.name}</h3>
            <p className="text-xs text-muted-foreground">
              {file.file_type === "video" ? "Video" : 
               file.file_type === "audio" ? "Audio" : 
               file.file_type === "script" ? "Guión" : 
               file.file_type === "image" ? "Imagen" : "Archivo"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopyUrl} title="Copiar URL">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Descargar">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.open(file.file_url, "_blank")} title="Abrir en nueva pestaña">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-4 bg-black/5">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LibraryFilePreviewer;
