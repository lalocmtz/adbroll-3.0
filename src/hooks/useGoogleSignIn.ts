import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authCallbackUrl } from "@/lib/auth-destination";

export function useGoogleSignIn(destination: string) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    // Safari can restore this exact component from its back/forward cache after
    // leaving Google. A pending navigation must not leave the button disabled.
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      pending.current = false;
      setIsGoogleLoading(false);
      setGoogleError(null);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  const startGoogleSignIn = async (beforeRedirect?: () => void) => {
    // React state alone does not prevent two taps in the same render frame.
    if (pending.current) return;
    pending.current = true;
    setIsGoogleLoading(true);
    setGoogleError(null);
    try {
      beforeRedirect?.();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authCallbackUrl(destination) },
      });
      if (error) throw error;
    } catch {
      pending.current = false;
      setIsGoogleLoading(false);
      setGoogleError("No pudimos conectar con Google. Inténtalo de nuevo o entra con tu correo.");
    }
  };

  return { isGoogleLoading, googleError, startGoogleSignIn };
}
