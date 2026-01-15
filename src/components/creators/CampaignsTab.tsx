import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CampaignCardPublic from "./CampaignCardPublic";
import ApplyToCampaignModal from "./ApplyToCampaignModal";
import { useCampaignApplications } from "@/hooks/useCampaignApplications";
import type { Campaign } from "@/hooks/useCampaigns";

const CampaignsTab = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [appliedCampaign, setAppliedCampaign] = useState<Campaign | null>(null);

  const {
    userCreatorId,
    hasApplied,
    applyToCampaign,
    appliedCampaignIds,
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
    if (!userCreatorId) {
      // Redirect to register as creator
      navigate("/talento?tab=aplicar");
      return;
    }

    const success = await applyToCampaign(campaign.id);
    if (success) {
      setAppliedCampaign(campaign);
      setShowSuccessModal(true);
    }
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
              ? "Aquí aparecerán las campañas disponibles de marcas aliadas con adbroll. Los creadores verificados podrán aplicar directamente."
              : "Available campaigns from adbroll partner brands will appear here. Verified creators will be able to apply directly."}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-primary">
            <Sparkles className="h-4 w-4" />
            <span>{language === "es" ? "Exclusivo para creadores verificados" : "Exclusive for verified creators"}</span>
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
        {!userCreatorId && (
          <Button variant="outline" onClick={() => navigate("/talento?tab=aplicar")}>
            <Sparkles className="h-4 w-4 mr-2" />
            {language === "es" ? "Regístrate como creador" : "Register as creator"}
          </Button>
        )}
      </div>

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
              isCreator={!!userCreatorId}
              onApply={() => handleApply(campaign)}
            />
          ))}
        </div>
      )}

      {/* Success Modal */}
      {appliedCampaign && (
        <ApplyToCampaignModal
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
          campaignTitle={appliedCampaign.title}
          brandName={appliedCampaign.brand_profiles?.company_name || "Marca"}
        />
      )}
    </div>
  );
};

export default CampaignsTab;
