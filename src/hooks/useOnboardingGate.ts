import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useOnboardingGate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const requireAuth = useCallback((action?: string) => {
    if (isAuthenticated) return true;

    const refCode = searchParams.get("ref");
    const refParam = refCode ? `&ref=${refCode}` : "";
    const currentPath = window.location.pathname;
    
    navigate(`/register?redirect=${encodeURIComponent(currentPath)}${refParam}${action ? `&action=${action}` : ""}`);
    return false;
  }, [isAuthenticated, navigate, searchParams]);

  const gateAction = useCallback((callback: () => void, action?: string) => {
    if (requireAuth(action)) {
      callback();
    }
  }, [requireAuth]);

  return {
    isAuthenticated,
    isLoading,
    requireAuth,
    gateAction,
  };
};

export default useOnboardingGate;
