import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Sparkles, Loader2, Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampaignCardPublic from "./CampaignCardPublic";
import ApplyToCampaignModal from "./ApplyToCampaignModal";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import type { Campaign } from "@/hooks/useCampaigns";

const CampaignsTab = () => {
  const { language } = useLanguage();
  const { hasPaid, isLoggedIn, openPaywall } = useBlurGateContext();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const {
    userCreatorId,
    hasApplied,
    applyToCampaign,
    appliedCampaignIds,
    refetchUserApplications,
  } = useCampaignApplications();

  useEffect(() => {
    fetchActiveCampaigns();
  }, []);

  const fetchActiveCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brand_profiles (
            company_name,
            logo_url,
            verified
          )
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (campaign: Campaign) => {
    // Check if user has paid subscription
    if (!hasPaid) {
      openPaywall("campaign_apply");
      return;
    }

    setSelectedCampaign(campaign);
    
    // If user is already a registered creator, apply directly
    if (userCreatorId) {
      const success = await applyToCampaign(campaign.id);
      if (success) {
        setShowApplyModal(true);
      }
    } else {
      // Show form modal for new visitors
      setShowApplyModal(true);
    }
  };

  const handleApplicationSuccess = () => {
    refetchUserApplications();
  };

  // Filter out campaigns user has already applied to
  const availableCampaigns = campaigns.filter(
    (c) => !appliedCampaignIds.includes(c.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-primary/10 to-pink-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {language === "es" ? "Próximamente: Campañas" : "Coming Soon: Campaigns"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            {language === "es" 
              ? "Aquí aparecerán las campañas disponibles de marcas aliadas con adbroll. Los creadores podrán aplicar directamente."
              : "Available campaigns from adbroll partner brands will appear here. Creators will be able to apply directly."}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <Sparkles className="h-4 w-4" />
            <span>{language === "es" ? "Abierto para todos los creadores" : "Open for all creators"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {language === "es" ? "Campañas Disponibles" : "Available Campaigns"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === "es"
              ? `${availableCampaigns.length} campañas activas`
              : `${availableCampaigns.length} active campaigns`}
          </p>
        </div>
      </div>

      {/* Subscription notice for non-subscribers */}
      {!hasPaid && (
        <div className="bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/20 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">
                {language === "es"
                  ? "Suscríbete para aplicar a campañas"
                  : "Subscribe to apply to campaigns"}
              </p>
            </div>
            <Button 
              size="sm" 
              className="gap-2 shrink-0"
              onClick={() => openPaywall("campaign_apply")}
            >
              <Crown className="h-3 w-3" />
              {language === "es" ? "Desbloquear $14.99/mes" : "Unlock $14.99/mo"}
            </Button>
          </div>
        </div>
      )}

      {/* Already Applied Section */}
      {appliedCampaignIds.length > 0 && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <p className="text-sm text-green-600">
            {language === "es"
              ? `Has aplicado a ${appliedCampaignIds.length} campaña(s). Las marcas te contactarán si tu perfil es de interés.`
              : `You have applied to ${appliedCampaignIds.length} campaign(s). Brands will contact you if your profile matches.`}
          </p>
        </div>
      )}

      {/* Campaigns Grid */}
      {availableCampaigns.length === 0 && appliedCampaignIds.length > 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {language === "es"
              ? "Ya has aplicado a todas las campañas disponibles. ¡Espera más pronto!"
              : "You've applied to all available campaigns. More coming soon!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCampaigns.map((campaign) => (
            <CampaignCardPublic
              key={campaign.id}
              campaign={campaign}
              hasApplied={hasApplied(campaign.id)}
              isCreator={true}
              onApply={() => handleApply(campaign)}
              showPaywallHint={!hasPaid}
            />
          ))}
        </div>
      )}

      {/* Apply Modal */}
      {selectedCampaign && (
        <ApplyToCampaignModal
          open={showApplyModal}
          onOpenChange={setShowApplyModal}
          campaignTitle={selectedCampaign.title}
          brandName={(selectedCampaign as any).brand_name || selectedCampaign.brand_profiles?.company_name || "Marca"}
          campaignId={selectedCampaign.id}
          isLoggedInCreator={!!userCreatorId}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </div>
  );
};

export default CampaignsTab;
