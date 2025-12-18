import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ExternalLink, Cpu, Mic, Video, Mail, DollarSign } from "lucide-react";

interface ApiService {
  name: string;
  icon: React.ReactNode;
  estimatedUsage: string;
  estimatedCost: string;
  status: "active" | "warning" | "inactive";
  dashboardUrl: string;
  notes: string;
}

export const ApiUsageMonitor = () => {
  // These are estimates based on typical usage patterns
  // In a production system, you'd track actual API calls
  const services: ApiService[] = [
    {
      name: "OpenAI (GPT-4o-mini)",
      icon: <Cpu className="h-5 w-5" />,
      estimatedUsage: "~50K tokens/día",
      estimatedCost: "~$0.50/mes",
      status: "active",
      dashboardUrl: "https://platform.openai.com/usage",
      notes: "Análisis de scripts, hooks, variantes",
    },
    {
      name: "AssemblyAI",
      icon: <Mic className="h-5 w-5" />,
      estimatedUsage: "~100 min/semana",
      estimatedCost: "~$4/mes",
      status: "active",
      dashboardUrl: "https://www.assemblyai.com/app",
      notes: "Transcripción de videos TikTok",
    },
    {
      name: "RapidAPI (TikTok)",
      icon: <Video className="h-5 w-5" />,
      estimatedUsage: "~200 descargas/semana",
      estimatedCost: "Gratis (BASIC)",
      status: "active",
      dashboardUrl: "https://rapidapi.com/developer/dashboard",
      notes: "Descarga de videos MP4",
    },
    {
      name: "Resend",
      icon: <Mail className="h-5 w-5" />,
      estimatedUsage: "~50 emails/mes",
      estimatedCost: "Gratis (<100/día)",
      status: "active",
      dashboardUrl: "https://resend.com/overview",
      notes: "Emails transaccionales",
    },
    {
      name: "Stripe",
      icon: <DollarSign className="h-5 w-5" />,
      estimatedUsage: "Por transacción",
      estimatedCost: "2.9% + $0.30",
      status: "active",
      dashboardUrl: "https://dashboard.stripe.com",
      notes: "Procesamiento de pagos",
    },
  ];

  const getStatusColor = (status: ApiService["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "warning":
        return "bg-orange-500";
      case "inactive":
        return "bg-red-500";
    }
  };

  // Estimated monthly cost total
  const estimatedMonthlyCost = 4.50; // Rough estimate

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            🔌 Monitor de APIs y Servicios
          </CardTitle>
          <Badge variant="outline" className="bg-green-50 text-green-600">
            ~${estimatedMonthlyCost.toFixed(2)}/mes
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Costos estimados basados en uso típico. Visita cada dashboard para datos exactos.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  {service.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{service.name}</p>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">{service.notes}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{service.estimatedCost}</p>
                  <p className="text-xs text-muted-foreground">{service.estimatedUsage}</p>
                </div>
                <a
                  href={service.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">💰 Desglose de Costos Mensuales (estimado)</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>OpenAI</span>
              <span>$0.50</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>AssemblyAI</span>
              <span>$4.00</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>RapidAPI</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Resend</span>
              <span>$0.00</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-medium">
              <span>Total (sin Stripe)</span>
              <span>~$4.50/mes</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Stripe cobra por transacción. Con $14.99/mes por usuario, recibes ~$14.25 neto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
