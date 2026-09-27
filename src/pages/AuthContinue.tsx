import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authDestination } from "@/lib/auth-destination";
import { getStoredRefCode } from "@/lib/attribution";

export default function AuthContinue() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const destination = authDestination(params.get("redirect"));
  const [message, setMessage] = useState("Preparando tu cuenta…");
  useEffect(() => {
    let active = true;
    async function finish() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!active) return;
      if (error || !user) { setMessage("Confirma tu correo e inicia sesión para continuar."); return; }
      const code = getStoredRefCode();
      if (code) {
        const { error: referralError } = await supabase.rpc("apply_referral_code", { p_user_id: user.id, p_code: code });
        if (referralError) console.error("Referral will be revalidated at checkout", referralError.code);
      }
      if (active) navigate(destination, { replace: true });
    }
    void finish();
    return () => { active = false; };
  }, [destination, navigate]);
  return <main className="min-h-screen flex flex-col items-center justify-center gap-5 p-8 text-center"><h1 className="text-2xl font-semibold">Ya casi estás dentro</h1><p role="status">{message}</p><Link className="text-primary underline" to={`/login?redirect=${encodeURIComponent(destination)}`}>Continuar con mi cuenta</Link></main>;
}
