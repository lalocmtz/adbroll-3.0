import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CreatorLifetimeCapacityData {
  limit: number;
  claimed: number;
  remaining: number;
  is_open: boolean;
}
export interface CreatorLifetimeCapacityState {
  capacity: CreatorLifetimeCapacityData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function parseCapacity(value: unknown): CreatorLifetimeCapacityData {
  const data = value as CreatorLifetimeCapacityData | null;
  if (!data || data.limit !== 100 || !Number.isInteger(data.claimed) || !Number.isInteger(data.remaining)
    || data.claimed < 0 || data.remaining < 0 || data.claimed + data.remaining !== data.limit
    || data.is_open !== (data.remaining > 0)) {
    throw new Error("Invalid capacity response");
  }
  return data;
}

export function useCreatorLifetimeCapacity(): CreatorLifetimeCapacityState {
  const [capacity, setCapacity] = useState<CreatorLifetimeCapacityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("get_creator_lifetime_capacity");
      if (rpcError) throw rpcError;
      const result = parseCapacity(data);
      if (mounted.current && sequence.current === request) setCapacity(result);
    } catch {
      if (mounted.current && sequence.current === request) {
        setCapacity(null);
        setError("No pudimos verificar los accesos disponibles. Intenta de nuevo antes de enviar tu solicitud.");
      }
    } finally {
      if (mounted.current && sequence.current === request) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState !== "hidden") void refresh(); }, 30_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => {
      mounted.current = false;
      sequence.current += 1;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return { capacity, loading, error, refresh };
}
