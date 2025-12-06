import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift } from "lucide-react";

const Register = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Validate referral code on change
  useEffect(() => {
    const validateCode = async () => {
      if (!referralCode || referralCode.length < 4) {
        setReferralValid(null);
        return;
      }

      const { data } = await supabase
        .from("affiliate_codes")
        .select("id")
        .eq("code", referralCode.toUpperCase())
        .maybeSingle();

      setReferralValid(!!data);
    };

    const timeout = setTimeout(validateCode, 500);
    return () => clearTimeout(timeout);
  }, [referralCode]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // If referral code is valid, apply it
      if (referralCode && referralValid && signUpData.user) {
        await supabase.rpc("apply_referral_code", {
          p_user_id: signUpData.user.id,
          p_code: referralCode,
        });
      }

      toast({
        title: "¡Cuenta creada!",
        description: referralValid
          ? "Descuento de 50% aplicado al primer mes 🎉"
          : "Redirigiendo a los planes...",
      });

      // Redirect to pricing page with referral code if valid
      const redirect = searchParams.get("redirect");
      if (redirect) {
        setTimeout(() => navigate(redirect), 1000);
      } else {
        const refParam = referralCode && referralValid ? `?ref=${referralCode}` : "";
        setTimeout(() => navigate(`/pricing${refParam}`), 1000);
      }
    } catch (error: any) {
      toast({
        title: "Error al registrarse",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center landing-gradient p-4">
      <Card className="w-full max-w-md bg-white/5 backdrop-blur-md border-white/10">
        <CardHeader>
          <div className="text-center mb-4">
            <h1
              className="text-3xl font-bold mb-2 cursor-pointer hover:text-primary transition-colors text-gradient"
              onClick={() => navigate("/")}
            >
              adbroll
            </h1>
          </div>
          <CardTitle className="text-white">Crear cuenta</CardTitle>
          <CardDescription className="text-white/60">
            Accede a los videos más rentables de TikTok Shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-white/80">Nombre completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
              />
            </div>

            {/* Referral Code Input */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="flex items-center gap-2 text-white/80">
                <Gift className="h-4 w-4 text-primary" />
                Código de referido (opcional)
              </Label>
              <Input
                id="referralCode"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className={`bg-white/10 border-white/20 text-white placeholder:text-white/40 ${
                  referralValid === true
                    ? "border-green-500 focus-visible:ring-green-500"
                    : referralValid === false
                    ? "border-red-500 focus-visible:ring-red-500"
                    : ""
                }`}
              />
              {referralValid === true && (
                <p className="text-sm text-green-400 flex items-center gap-1">
                  🎉 Código válido - ¡50% off en tu primer mes!
                </p>
              )}
              {referralValid === false && (
                <p className="text-sm text-red-400">
                  Código no válido
                </p>
              )}
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary-hover" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta gratuita"}
            </Button>
            <p className="text-sm text-center text-white/60">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
