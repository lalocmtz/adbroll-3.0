import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import BlurOverlay from "@/components/BlurOverlay";
import PaywallModal from "@/components/PaywallModal";
import {
  Search,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  TrendingUp,
  Globe,
} from "lucide-react";

const objectiveLabels: Record<string, { es: string; en: string; icon: typeof Target }> = {
  awareness: { es: "Reconocimiento", en: "Awareness", icon: Globe },
  installs: { es: "Instalaciones", en: "Installs", icon: Zap },
  leads: { es: "Leads", en: "Leads", icon: Users },
  signups: { es: "Registros", en: "Sign ups", icon: TrendingUp },
  sales: { es: "Ventas", en: "Sales", icon: DollarSign },
};

const CampaignCard = ({ campaign, onClick }: { campaign: Campaign; onClick: () => void }) => {
  const { language } = useLanguage();
  const objective = objectiveLabels[campaign.objective] || objectiveLabels.awareness;
  const ObjectiveIcon = objective.icon;

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d MMM", { locale: language === "es" ? es : enUS });
  };

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Image header */}
        <div className="relative h-32 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
          {campaign.product_image_url ? (
            <img
              src={campaign.product_image_url}
              alt={campaign.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Briefcase className="h-12 w-12 text-primary/30" />
            </div>
          )}
          {/* Brand badge */}
          {campaign.brand_profiles && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1">
              {campaign.brand_profiles.logo_url ? (
                <img
                  src={campaign.brand_profiles.logo_url}
                  alt={campaign.brand_profiles.company_name}
                  className="h-4 w-4 rounded-full object-cover"
                />
              ) : (
                <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-primary">
                    {campaign.brand_profiles.company_name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-[10px] font-medium truncate max-w-[80px]">
                {campaign.brand_profiles.company_name}
              </span>
              {campaign.brand_profiles.verified && (
                <Sparkles className="h-3 w-3 text-primary" />
              )}
            </div>
          )}
          {/* Objective badge */}
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[10px] gap-1"
          >
            <ObjectiveIcon className="h-3 w-3" />
            {language === "es" ? objective.es : objective.en}
          </Badge>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
              {campaign.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {campaign.product_name}
            </p>
          </div>

          {/* Brief preview */}
          <p className="text-xs text-muted-foreground line-clamp-2">
            {campaign.brief}
          </p>

          {/* Payment range */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <DollarSign className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              ${campaign.min_payment_mxn.toLocaleString()} - ${campaign.max_payment_mxn.toLocaleString()} MXN
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>
                {campaign.submissions_count} {language === "es" ? "envíos" : "submissions"}
              </span>
            </div>
            {campaign.ends_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {language === "es" ? "Hasta" : "Until"} {formatDate(campaign.ends_at)}
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <Button className="w-full mt-2 group-hover:bg-primary-hover" size="sm">
            {language === "es" ? "Ver campaña" : "View campaign"}
            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const CampaignCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <Skeleton className="h-32 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </CardContent>
  </Card>
);

const Campaigns = () => {
  const { language } = useLanguage();
  const { isLoggedIn, hasPaid } = useBlurGateContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [paywallOpen, setPaywallOpen] = useState(false);

  const { campaigns, isLoading } = useCampaigns({ activeOnly: true });

  // Filter campaigns by search
  const filteredCampaigns = campaigns.filter((campaign) => {
    const query = searchQuery.toLowerCase();
    return (
      campaign.title.toLowerCase().includes(query) ||
      campaign.product_name.toLowerCase().includes(query) ||
      campaign.brief.toLowerCase().includes(query) ||
      campaign.brand_profiles?.company_name.toLowerCase().includes(query)
    );
  });

  const handleCampaignClick = (campaign: Campaign) => {
    // Allow all users to view campaign details
    navigate(`/campaigns/${campaign.id}`);
  };

  const today = new Date();
  const dateStr = format(today, "d 'de' MMMM", { locale: language === "es" ? es : enUS });

  return (
    <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
          📣 {language === "es" ? "Campañas Abiertas" : "Open Campaigns"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {language === "es"
            ? `Campañas activas HOY, ${dateStr} — graba y gana`
            : `Active campaigns TODAY, ${dateStr} — create and earn`}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={language === "es" ? "Buscar campañas..." : "Search campaigns..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Empty state */}
      {!isLoading && filteredCampaigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {language === "es" ? "No hay campañas disponibles" : "No campaigns available"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {language === "es"
              ? "Las marcas publican campañas regularmente. Vuelve pronto para ver nuevas oportunidades."
              : "Brands post campaigns regularly. Check back soon for new opportunities."}
          </p>
        </div>
      )}

      {/* Campaigns grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <CampaignCardSkeleton key={i} />)
          : filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => handleCampaignClick(campaign)}
              />
            ))}
      </div>

      {/* Paywall Modal */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
};

export default Campaigns;
