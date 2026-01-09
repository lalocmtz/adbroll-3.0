import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VideoCredits {
  id: string;
  user_id: string;
  credits_total: number;
  credits_used: number;
  credits_monthly: number;
  credits_purchased: number;
  last_monthly_reset: string | null;
  created_at: string;
  updated_at: string;
}

export const useVideoCredits = () => {
  const [credits, setCredits] = useState<VideoCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCredits(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('video_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setCredits(data || null);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching video credits:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredits();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCredits();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCredits]);

  // Calculate available credits: (monthly + purchased) - used
  const monthlyCredits = credits?.credits_monthly || 0;
  const purchasedCredits = credits?.credits_purchased || 0;
  const usedCredits = credits?.credits_used || 0;
  const availableCredits = Math.max(0, (monthlyCredits + purchasedCredits) - usedCredits);

  const hasCredits = (required: number = 1) => availableCredits >= required;

  const getCreditsForDuration = (duration: string): number => {
    return duration === '25' ? 2 : 1;
  };

  return {
    credits,
    availableCredits,
    monthlyCredits,
    purchasedCredits,
    usedCredits,
    loading,
    error,
    hasCredits,
    getCreditsForDuration,
    refetch: fetchCredits,
  };
};
