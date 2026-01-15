import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Clock, 
  Target, 
  Sparkles,
  ExternalLink,
  CheckCircle,
  Zap
} from "lucide-react";
import type { Campaign } from "@/hooks/useCampaigns";

interface CampaignCardPublicProps {
  campaign: Campaign;
  hasApplied: boolean;
  isCreator: boolean;
  onApply: () => void;
}

const CampaignCardPublic = ({
  campaign,
  hasApplied,
  isCreator,
  onApply,
}: CampaignCardPublicProps) => {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const objectiveLabels: Record<string, string> = {
    awareness: language === "es" ? "Awareness" : "Awareness",
    sales: language === "es" ? "Ventas" : "Sales",
    engagement: language === "es" ? "Engagement" : "Engagement",
  };

  const brandName = (campaign as any).brand_name || campaign.brand_profiles?.company_name || "Marca";
  const brandLogo = (campaign as any).brand_logo_url || campaign.brand_profiles?.logo_url;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 group">
      {/* Header with brand */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className="w-10 h-10 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {campaign.title}
            </h3>
            <p className="text-xs text-muted-foreground">{brandName}</p>
          </div>
          {campaign.brand_profiles?.verified && (
            <Badge variant="secondary" className="text-xs shrink-0">
              <CheckCircle className="h-3 w-3 mr-1" />
              {language === "es" ? "Verificada" : "Verified"}
            </Badge>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-4">
        <div className="flex gap-3">
          {campaign.product_image_url && (
            <img
              src={campaign.product_image_url}
              alt={campaign.product_name}
              className="w-16 h-16 rounded-lg object-cover border border-border shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {campaign.product_name}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                {objectiveLabels[campaign.objective] || campaign.objective}
              </Badge>
              {campaign.requires_spark_code && (
                <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Spark Code
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Payment & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-sm font-semibold text-foreground">
              ${campaign.min_payment_mxn} - ${campaign.max_payment_mxn}
            </p>
            <p className="text-xs text-muted-foreground">MXN</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
            <p className="text-sm font-semibold text-foreground">
              {campaign.video_duration_min}-{campaign.video_duration_max}s
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "es" ? "Duración" : "Duration"}
            </p>
          </div>
        </div>

        {/* Brief */}
        <div>
          <p className={`text-sm text-muted-foreground ${!expanded && "line-clamp-2"}`}>
            {campaign.brief}
          </p>
          {campaign.brief.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {expanded 
                ? (language === "es" ? "Ver menos" : "See less")
                : (language === "es" ? "Ver más" : "See more")}
            </button>
          )}
        </div>

        {/* Product Link */}
        {campaign.product_url && (
          <a
            href={campaign.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {language === "es" ? "Ver producto en TikTok Shop" : "View product on TikTok Shop"}
          </a>
        )}

        {/* Apply Button */}
        {hasApplied ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              {language === "es" ? "Ya aplicaste" : "Already applied"}
            </span>
          </div>
        ) : (
          <Button
            onClick={onApply}
            className="w-full bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90"
            disabled={!isCreator}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isCreator
              ? (language === "es" ? "Aplicar a esta campaña" : "Apply to this campaign")
              : (language === "es" ? "Regístrate como creador primero" : "Register as creator first")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CampaignCardPublic;
