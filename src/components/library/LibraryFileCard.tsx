import { useState } from "react";
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  FolderInput, 
  Play, 
  FileText, 
  Music, 
  Image as ImageIcon,
  File
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LibraryFile, LibraryFolder } from "@/hooks/useLibrary";

interface LibraryFileCardProps {
  file: LibraryFile;
  folders: LibraryFolder[];
  onClick: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, url: string) => void;
  onMove: (id: string, folderId: string | null) => void;
  viewMode?: "grid" | "list";
}

const fileTypeIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-6 w-6" />,
  audio: <Music className="h-6 w-6" />,
  script: <FileText className="h-6 w-6" />,
  image: <ImageIcon className="h-6 w-6" />,
  other: <File className="h-6 w-6" />,
};

const fileTypeColors: Record<string, string> = {
  video: "#EF4444",
  audio: "#8B5CF6",
  script: "#10B981",
  image: "#F59E0B",
  other: "#6B7280",
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const LibraryFileCard = ({
  file,
  folders,
  onClick,
  onRename,
  onDelete,
  onMove,
  viewMode = "grid",
}: LibraryFileCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(file.name);

  const handleRename = () => {
    if (editName.trim() && editName !== file.name) {
      onRename(file.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") {
      setEditName(file.name);
      setIsEditing(false);
    }
  };

  const color = fileTypeColors[file.file_type] || fileTypeColors.other;

  if (viewMode === "list") {
    return (
      <div
        className={cn(
          "group flex items-center gap-4 p-3 rounded-lg border bg-card cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
        )}
        onClick={isEditing ? undefined : onClick}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {fileTypeIcons[file.file_type] || fileTypeIcons.other}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="text-sm font-medium bg-transparent border-b border-primary outline-none w-full"
            />
          ) : (
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.file_size)}
            {file.duration_seconds && ` • ${formatDuration(file.duration_seconds)}`}
          </p>
        </div>

        {/* Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
              <Pencil className="h-4 w-4 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="h-4 w-4 mr-2" />
                Mover a
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(file.id, null); }}>
                  📁 Raíz
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    onClick={(e) => { e.stopPropagation(); onMove(file.id, folder.id); }}
                  >
                    📁 {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(file.id, file.file_url); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Grid view
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card cursor-pointer overflow-hidden",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200"
      )}
      onClick={isEditing ? undefined : onClick}
    >
      {/* Thumbnail / Preview */}
      <div className="aspect-video w-full bg-muted relative flex items-center justify-center">
        {file.file_type === "video" && file.thumbnail_url ? (
          <img src={file.thumbnail_url} alt={file.name} className="w-full h-full object-cover" />
        ) : file.file_type === "image" ? (
          <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {fileTypeIcons[file.file_type] || fileTypeIcons.other}
          </div>
        )}

        {/* Duration badge for video/audio */}
        {file.duration_seconds && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
            {formatDuration(file.duration_seconds)}
          </span>
        )}

        {/* Type badge */}
        <span
          className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium rounded-full text-white"
          style={{ backgroundColor: color }}
        >
          {file.file_type === "video" ? "Video" : 
           file.file_type === "audio" ? "Audio" : 
           file.file_type === "script" ? "Guión" : 
           file.file_type === "image" ? "Imagen" : "Archivo"}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            className="text-sm font-medium bg-transparent border-b border-primary outline-none w-full"
          />
        ) : (
          <p className="text-sm font-medium text-foreground truncate" title={file.name}>
            {file.name}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatFileSize(file.file_size)}
        </p>
      </div>

      {/* Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="h-4 w-4 mr-2" />
              Mover a
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(file.id, null); }}>
                📁 Raíz
              </DropdownMenuItem>
              {folders.map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={(e) => { e.stopPropagation(); onMove(file.id, folder.id); }}
                >
                  📁 {folder.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(file.id, file.file_url); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default LibraryFileCard;
