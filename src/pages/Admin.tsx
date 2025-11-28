import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Admin = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkFounderRole();
  }, []);

  const checkFounderRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "founder")
        .maybeSingle();

      if (error || !data) {
        toast({
          title: "Acceso denegado",
          description: "Solo el fundador puede acceder a este panel.",
          variant: "destructive",
        });
        navigate("/app");
        return;
      }

      setIsFounder(true);
    } catch (error) {
      console.error("Error checking founder role:", error);
      navigate("/app");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data, error } = await supabase.functions.invoke("process-kalodata", {
        body: formData,
      });

      if (error) throw error;

      const successCount = data.processed || 0;
      const totalCount = data.total || 0;
      const aiProcessed = data.ai_processed || 0;
      const aiFailed = data.ai_failed || 0;

      toast({
        title: "¡Archivo procesado exitosamente!",
        description: `${successCount} videos cargados. IA: ${aiProcessed} procesados, ${aiFailed > 0 ? `${aiFailed} fallaron.` : 'todos exitosos.'}`,
      });

      // Wait a bit before redirecting to show the success message
      setTimeout(() => {
        navigate("/app");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error al procesar archivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Verificando permisos...</p>
      </div>
    );
  }

  if (!isFounder) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
          <Button variant="ghost" onClick={() => navigate("/app")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Subir Datos de Kalodata
              </CardTitle>
              <CardDescription>
                Carga el archivo Excel exportado desde Kalodata. Este reemplazará completamente
                los datos actuales del feed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">Archivo Excel (.xlsx)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {file.name}
                  </p>
                )}
              </div>

              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {isUploading ? "Procesando..." : "Procesar y Actualizar Feed"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-muted">
            <CardHeader>
              <CardTitle className="text-lg">Proceso de Actualización</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Se eliminan todos los registros existentes</li>
                <li>Se leen y validan las columnas del archivo</li>
                <li>Se ordenan por ingresos descendente</li>
                <li>Se seleccionan los Top 20 videos</li>
                <li>Se guardan los datos iniciales en la base de datos</li>
                <li>Se transcribe el contenido con IA (Lovable AI)</li>
                <li>Se reescribe el guión con IA para ventas (Gemini 2.5 Flash)</li>
                <li>Se actualizan los videos con los scripts generados</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
