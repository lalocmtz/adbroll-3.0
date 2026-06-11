import { useState } from "react";
import { Folder, Video, Music, FileText, Image as ImageIcon, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FolderCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, icon: string, color: string) => Promise<unknown>;
}

const suggestedFolders = [
  { name: "B-Roll", icon: "video", color: "#EF4444", description: "Clips de video para tus contenidos" },
  { name: "Guiones", icon: "script", color: "#10B981", description: "Scripts y textos para videos" },
  { name: "Audios", icon: "audio", color: "#8B5CF6", description: "Música y efectos de sonido" },
  { name: "Proyectos", icon: "project", color: "#3B82F6", description: "Agrupa archivos por proyecto" },
  { name: "Productos", icon: "project", color: "#F59E0B", description: "Fotos y videos de productos" },
];

const iconOptions = [
  { id: "folder", icon: Folder, label: "Carpeta" },
  { id: "video", icon: Video, label: "Video" },
  { id: "audio", icon: Music, label: "Audio" },
  { id: "script", icon: FileText, label: "Guión" },
  { id: "image", icon: ImageIcon, label: "Imagen" },
  { id: "project", icon: Package, label: "Proyecto" },
];

const colorOptions = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#8B5CF6", // purple
  "#F59E0B", // amber
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#6B7280", // gray
];

const FolderCreateModal = ({ open, onOpenChange, onCreate }: FolderCreateModalProps) => {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await onCreate(name.trim(), selectedIcon, selectedColor);
    setCreating(false);
    setName("");
    setSelectedIcon("folder");
    setSelectedColor("#3B82F6");
    onOpenChange(false);
  };

  const handleSuggestedClick = (folder: typeof suggestedFolders[0]) => {
    setName(folder.name);
    setSelectedIcon(folder.icon);
    setSelectedColor(folder.color);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Suggested Folders */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Sugerencias</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedFolders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => handleSuggestedClick(folder)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    name === folder.name 
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="folder-name">Nombre de la carpeta</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi carpeta"
              autoFocus
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Icono</Label>
            <div className="flex gap-2">
              {iconOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedIcon(option.id)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    selectedIcon === option.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                  title={option.label}
                >
                  <option.icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    selectedColor === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
            >
              {iconOptions.find((o) => o.id === selectedIcon)?.icon && (
                (() => {
                  const IconComponent = iconOptions.find((o) => o.id === selectedIcon)!.icon;
                  return <IconComponent className="h-5 w-5" />;
                })()
              )}
            </div>
            <span className="font-medium">{name || "Mi carpeta"}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating ? "Creando..." : "Crear carpeta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FolderCreateModal;
