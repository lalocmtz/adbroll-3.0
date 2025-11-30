import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, DollarSign, Users } from "lucide-react";
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
            Gana comisiones por cada referido
          </p>
        </div>
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <DashboardNav />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Programa de Afiliados
          </h1>
          <p className="text-muted-foreground">
            Gana $10 USD por cada referido que se suscriba a adbroll Premium
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ganancias Acumuladas
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(affiliate?.usd_earned || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Disponible para Retiro
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(affiliate?.usd_available || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Referidos Activos
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {affiliate?.active_referrals_count || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ref Code Card */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Tu Código de Referido</CardTitle>
                <CardDescription>
                  Comparte este código con otros creadores. Cuando se registren y suscriban usando tu código, ganarás una comisión.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-lg p-4">
                    <code className="text-2xl font-bold tracking-wider">
                      {affiliate?.ref_code || "CARGANDO..."}
                    </code>
                  </div>
                  <Button
                    onClick={copyRefCode}
                    variant="outline"
                    size="lg"
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
              </CardContent>
            </Card>

            {/* Referrals History */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Referidos</CardTitle>
                <CardDescription>
                  Lista de todos tus referidos y sus estados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aún no tienes referidos. ¡Comparte tu código para empezar!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">
                            Referido ID: {referral.referred_user_id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(referral.earned_usd)}
                          </p>
                          <p className={`text-sm ${
                            referral.status === 'active' ? 'text-green-600' :
                            referral.status === 'pending' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {referral.status === 'active' ? 'Activo' :
                             referral.status === 'pending' ? 'Pendiente' :
                             'Cancelado'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Affiliates;
