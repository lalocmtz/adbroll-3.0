import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const services = [
  { name: "Gemini · análisis audiovisual", cost: "Según tokens de entrada y salida", note: "El catálogo prepara el guion y análisis en segundo plano. Reabrirlos no genera otra llamada; las variantes se solicitan por separado.", url: "https://aistudio.google.com/usage" },
  { name: "Apify · descarga de TikTok", cost: "Piloto del 10/oct/2026: US$0.42", note: "100 enlaces solicitados; 89 MP4 publicados. Consulta el costo y los resultados de cada lote antes de ampliarlo.", url: "https://console.apify.com/actors/runs" },
  { name: "Supabase · datos y archivos", cost: "Plan, almacenamiento y transferencia", note: "El tráfico de reproducción también consume transferencia. Las cuotas se comparten dentro de la organización.", url: "https://supabase.com/dashboard" },
  { name: "Stripe · cobros", cost: "Comisiones según la cuenta y el pago", note: "Consulta las comisiones reales en cada transacción; no se presupone una tarifa estadounidense.", url: "https://dashboard.stripe.com" },
  { name: "Resend · correo", cost: "Según el plan y los envíos", note: "Correo transaccional de la plataforma.", url: "https://resend.com/overview" },
];
export const ApiUsageMonitor = () => (
  <Card><CardHeader><CardTitle>Servicios y costos</CardTitle><p className="text-sm text-muted-foreground">Referencias operativas; consulta el consumo y la facturación en cada proveedor.</p></CardHeader>
    <CardContent className="space-y-3">{services.map(service => <div key={service.name} className="rounded-lg border p-4 space-y-1">
      <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{service.name}</p><p className="text-sm">{service.cost}</p></div>
      <p className="text-sm text-muted-foreground">{service.note}</p><a href={service.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Ver consumo y facturación</a>
    </div>)}</CardContent>
  </Card>
);
