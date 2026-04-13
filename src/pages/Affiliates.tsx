import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, DollarSign, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/DashboardNav";
import GlobalHeader from "@/components/GlobalHeader";
import { useAffiliate } from "@/hooks/useAffiliate";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Affiliates = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { affiliate, referrals, loading } = useAffiliate();
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const copyRefCode = () => {
    if (affiliate?.ref_code) {
      navigator.clipboard.writeText(affiliate.ref_code);
      setCopied(true);
      toast({
        title: "¡Código copiado!",
        description: "Tu código de referido ha sido copiado al portapapeles.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader />
      <DashboardNav />
      
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Programa de Afiliados
          </h1>
          <p className="text-lg text-muted-foreground">
            Gana comisiones por cada referido que se suscriba
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card className="card-premium p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </Card>
            <Card className="card-premium p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </Card>
            <Card className="card-premium p-6">
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-12 w-full" />
            </Card>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total ganado</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(affiliate?.usd_earned || 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Disponible</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(affiliate?.usd_available || 0)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Referidos activos</p>
                    <p className="text-2xl font-bold text-foreground">
                      {affiliate?.active_referrals_count || 0}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="card-premium p-6 mb-8">
              <h3 className="text-lg font-bold mb-4">Tu código de referido</h3>
              <div className="flex gap-3">
                <div className="flex-1 p-4 rounded-lg bg-primary/5 border-2 border-primary/20 font-mono text-lg font-bold text-center">
                  {affiliate?.ref_code || "Cargando..."}
                </div>
                <Button 
                  size="lg"
                  onClick={copyRefCode}
                  disabled={!affiliate?.ref_code}
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5 mr-2" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="card-premium p-6">
              <h3 className="text-lg font-bold mb-6">Historial de Referidos</h3>
              {referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    Aún no tienes referidos. Comparte tu código para empezar a ganar comisiones.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="p-4 rounded-lg bg-muted flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.date || referral.created_at).toLocaleDateString("es-MX")}
                        </p>
                        <Badge
                          variant={referral.status === "active" ? "default" : "secondary"}
                          className="mt-1"
                        >
                          {referral.status === "active" ? "Activo" : "Pendiente"}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-success">
                        +{formatCurrency(referral.earned_usd)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Affiliates;
