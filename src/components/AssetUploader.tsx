import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Video, Check, Copy, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadedAsset {
  name: string;
  url: string;
  size: number;
}

export const AssetUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El límite es 100MB por archivo.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const filename = `landing-video-${Date.now()}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("assets")
        .upload(filename, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("assets")
        .getPublicUrl(filename);

      const newAsset: UploadedAsset = {
        name: file.name,
        url: urlData.publicUrl,
        size: file.size,
      };

      setUploadedAssets(prev => [newAsset, ...prev]);

      toast({
        title: "¡Video subido!",
        description: "La URL está lista para usar.",
      });

      // Reset input
      e.target.value = "";
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error al subir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({ title: "URL copiada" });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Assets de Landing
        </CardTitle>
        <CardDescription>
          Sube videos MP4 para la landing page (máx 100MB)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Input */}
        <div className="space-y-2">
          <Label htmlFor="asset-upload">Subir video MP4</Label>
          <div className="flex gap-2">
            <Input
              id="asset-upload"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Subiendo...</span>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded Assets List */}
        {uploadedAssets.length > 0 && (
          <div className="space-y-2">
            <Label>Videos subidos</Label>
            <div className="space-y-2">
              {uploadedAssets.map((asset, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(asset.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyUrl(asset.url)}
                    className="flex-shrink-0"
                  >
                    {copiedUrl === asset.url ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar URL
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700">
            <strong>Uso:</strong> Sube el video, copia la URL y pégala en el código del componente NativeVideoPlayer en Landing.tsx
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
