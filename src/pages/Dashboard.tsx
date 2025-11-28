import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import VideoCard from "@/components/VideoCard";

// Mock data para demostración visual
const mockVideos = [
  {
    id: "1",
    ranking: 1,
    tiktok_url: "https://www.tiktok.com/@example/video/123",
    descripcion_video: "Tutorial de maquillaje viral que generó altas ventas",
    creador: "@beautyguru",
    ingresos_mxn: 125000,
    ventas: 450,
    visualizaciones: 2500000,
    cpa_mxn: 277.78,
    roas: 4.5,
    duracion: "0:45",
    fecha_publicacion: "2025-01-15",
  },
  {
    id: "2",
    ranking: 2,
    tiktok_url: "https://www.tiktok.com/@example/video/124",
    descripcion_video: "Review de producto tech con llamado a la acción directo",
    creador: "@techreview",
    ingresos_mxn: 98500,
    ventas: 320,
    visualizaciones: 1800000,
    cpa_mxn: 307.81,
    roas: 3.8,
    duracion: "1:20",
    fecha_publicacion: "2025-01-14",
  },
  {
    id: "3",
    ranking: 3,
    tiktok_url: "https://www.tiktok.com/@example/video/125",
    descripcion_video: "Unboxing y prueba de producto fitness",
    creador: "@fitlife",
    ingresos_mxn: 87200,
    ventas: 280,
    visualizaciones: 1500000,
    cpa_mxn: 311.43,
    roas: 3.5,
    duracion: "0:55",
    fecha_publicacion: "2025-01-14",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Aquí irá la lógica de logout
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">adbroll</h1>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Top 20 Videos del Día
          </h2>
          <p className="text-muted-foreground">
            Última actualización: {new Date().toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
          {/* Placeholder cards para mostrar estructura completa */}
          {Array.from({ length: 17 }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="aspect-[9/16] bg-muted rounded-lg flex items-center justify-center"
            >
              <p className="text-muted-foreground">Video #{i + 4}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
