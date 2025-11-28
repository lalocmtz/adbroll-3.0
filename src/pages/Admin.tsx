import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Database, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Admin = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    // Aquí irá la lógica de procesamiento del archivo
    console.log("Uploading file:", file.name);
    
    // Simular procesamiento
    setTimeout(() => {
      setIsUploading(false);
      setFile(null);
      alert("Archivo procesado exitosamente. Los datos se han actualizado.");
    }, 2000);
  };

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
                <li>Se transcribe el audio con Whisper API</li>
                <li>Se reescribe el guión con GPT-4 Turbo</li>
                <li>Se guardan todos los datos en la base de datos</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
