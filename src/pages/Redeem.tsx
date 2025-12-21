import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Gift, CheckCircle, Loader2, ArrowRight } from "lucide-react";

const Redeem = () => {
  const [searchParams] = useSearchParams();
  const [grantCode, setGrantCode] = useState(searchParams.get("code") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [grantData, setGrantData] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Verify code when it changes
  useEffect(() => {
    const verifyCode = async () => {
      if (!grantCode || grantCode.length < 10) {
        setCodeValid(null);
        setGrantData(null);
        return;
      }

      setIsVerifying(true);
      try {
        const { data, error } = await supabase
          .from("creator_program_applications")
          .select("*")
          .eq("grant_code", grantCode.toUpperCase())
          .eq("status", "approved")
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCodeValid(true);
          setGrantData(data);
        } else {
          setCodeValid(false);
          setGrantData(null);
        }
      } catch (error) {
        console.error("Error verifying code:", error);
        setCodeValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    const timeout = setTimeout(verifyCode, 500);
    return () => clearTimeout(timeout);
  }, [grantCode]);

  const handleRedeem = async () => {
    if (!codeValid || !grantData) {
      toast({
        title: "Código inválido",
        description: "Verifica que el código sea correcto",
        variant: "destructive",
      });
      return;
    }

    // If not logged in, redirect to register with the grant code
    if (!session) {
      navigate(`/register?grant=${grantCode}`);
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + (grantData.granted_days || 30) * 24 * 60 * 60 * 1000);

      // Create subscription with granted status
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: session.user.id,
          status: "active",
          price_usd: 0,
          renew_at: endDate.toISOString(),
        });

      if (subError && subError.code !== "23505") {
        throw subError;
      }

      // Update grant to active
      const { error: grantError } = await supabase
        .from("creator_program_applications")
        .update({
          status: "active",
          user_id: session.user.id,
          subscription_starts_at: now.toISOString(),
          subscription_ends_at: endDate.toISOString(),
        })
        .eq("grant_code", grantCode.toUpperCase());

      if (grantError) throw grantError;

      toast({
        title: "¡Código canjeado!",
        description: `Tienes ${grantData.granted_days || 30} días de acceso completo. ¡Disfruta!`,
      });

      // Redirect to app
      setTimeout(() => navigate("/app"), 1500);
    } catch (error: any) {
      console.error("Redeem error:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo canjear el código",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center landing-light p-4">
      <Card className="w-full max-w-md card-landing-light">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Canjear código</CardTitle>
          <CardDescription>
            Ingresa tu código del programa de creadores para activar tu acceso gratuito
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="grantCode">Código de acceso</Label>
            <Input
              id="grantCode"
              value={grantCode}
              onChange={(e) => setGrantCode(e.target.value.toUpperCase())}
              placeholder="CREATOR-XXXXXX"
              className={`text-center text-lg font-mono tracking-wider ${
                codeValid === true
                  ? "border-green-500 focus-visible:ring-green-500"
                  : codeValid === false
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
            />
            {isVerifying && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando código...
              </p>
            )}
            {codeValid === true && grantData && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                ¡Código válido! {grantData.granted_days || 30} días de acceso
              </p>
            )}
            {codeValid === false && (
              <p className="text-sm text-destructive">
                Código no válido o ya utilizado
              </p>
            )}
          </div>

          {codeValid && grantData && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Detalles del acceso:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {grantData.granted_days || 30} días de acceso completo</li>
                <li>• Todas las funciones desbloqueadas</li>
                <li>• Podrás crear tu código de afiliado</li>
              </ul>
            </div>
          )}

          <Button
            onClick={handleRedeem}
            className="w-full"
            disabled={!codeValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activando...
              </>
            ) : !session ? (
              <>
                Crear cuenta y activar
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Activar acceso
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {!session && (
            <p className="text-xs text-center text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={() => navigate(`/login?redirect=/canjear?code=${grantCode}`)}
                className="text-primary hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Redeem;
