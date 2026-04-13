import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AccountType = "creator" | "brand" | "loading";

interface BrandProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  contact_email: string | null;
  industry: string | null;
  verified: boolean;
}

interface UseAccountTypeReturn {
  accountType: AccountType;
  isBrand: boolean;
  isCreator: boolean;
  isLoading: boolean;
  brandProfile: BrandProfile | null;
  refetch: () => Promise<void>;
}

export const useAccountType = (): UseAccountTypeReturn => {
  const [accountType, setAccountType] = useState<AccountType>("loading");
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccountType = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setAccountType("creator");
        setBrandProfile(null);
        return;
      }

      // Check if user has brand role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "brand")
        .maybeSingle();

      if (roleData) {
        // User has brand role, fetch brand profile
        const { data: profile } = await supabase
          .from("brand_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setBrandProfile(profile as BrandProfile);
          setAccountType("brand");
        } else {
          // Has role but no profile yet
          setAccountType("brand");
          setBrandProfile(null);
        }
      } else {
        // Default to creator
        setAccountType("creator");
        setBrandProfile(null);
      }
    } catch (error) {
      console.error("Error fetching account type:", error);
      setAccountType("creator");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountType();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAccountType();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    accountType,
    isBrand: accountType === "brand",
    isCreator: accountType === "creator",
    isLoading,
    brandProfile,
    refetch: fetchAccountType,
  };
};
