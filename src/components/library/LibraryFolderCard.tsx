import { useState } from "react";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LibraryFolder } from "@/hooks/useLibrary";

interface LibraryFolderCardProps {
  folder: LibraryFolder;
  onClick: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

const folderIcons: Record<string, string> = {
  folder: "📁",
  video: "🎬",
  audio: "🎵",
  script: "📝",
  image: "🖼️",
  project: "📦",
};

const LibraryFolderCard = ({ folder, onClick, onRename, onDelete }: LibraryFolderCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center p-4 rounded-xl border bg-card cursor-pointer",
        "hover:border-primary/50 hover:shadow-md transition-all duration-200"
      )}
      onClick={isEditing ? undefined : onClick}
    >
      {/* Options Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
            <Pencil className="h-4 w-4 mr-2" />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); onDelete(folder.id); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Folder Icon */}
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-3"
        style={{ backgroundColor: `${folder.color}20` }}
      >
        {folderIcons[folder.icon] || <Folder className="h-8 w-8" style={{ color: folder.color }} />}
      </div>

      {/* Folder Name */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          className="text-sm font-medium text-center bg-transparent border-b border-primary outline-none w-full"
        />
      ) : (
        <p className="text-sm font-medium text-foreground text-center truncate w-full">
          {folder.name}
        </p>
      )}

      {/* File Count */}
      <p className="text-xs text-muted-foreground mt-1">
        {folder.file_count || 0} {folder.file_count === 1 ? "archivo" : "archivos"}
      </p>
    </div>
  );
};

export default LibraryFolderCard;
