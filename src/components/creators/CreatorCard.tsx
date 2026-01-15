import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { MessageCircle, Mail, ExternalLink, CheckCircle2 } from "lucide-react";
import { openTikTokLink } from "@/lib/tiktokDeepLink";

interface DirectoryCreator {
  id: string;
  full_name: string;
  tiktok_username: string;
  avatar_url: string | null;
  email: string;
  whatsapp: string;
  country: string;
  niche: string[];
  content_type: string[];
  tiktok_url: string | null;
  verified: boolean;
}

interface CreatorCardProps {
  creator: DirectoryCreator;
}

const NICHE_LABELS: Record<string, { es: string; en: string }> = {
  belleza: { es: "Belleza", en: "Beauty" },
  fitness: { es: "Fitness", en: "Fitness" },
  moda: { es: "Moda", en: "Fashion" },
  tecnologia: { es: "Tecnología", en: "Technology" },
  hogar: { es: "Hogar", en: "Home" },
  otros: { es: "Otros", en: "Others" },
};

const CONTENT_TYPE_LABELS: Record<string, { es: string; en: string }> = {
  ugc: { es: "UGC", en: "UGC" },
  review: { es: "Review", en: "Review" },
  live: { es: "Live", en: "Live" },
};

const CreatorCard = ({ creator }: CreatorCardProps) => {
  const { language } = useLanguage();

  const getInitials = (name: string): string => {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarUrl = (): string => {
    if (creator.avatar_url) return creator.avatar_url;
    const name = encodeURIComponent(creator.full_name);
    return `https://ui-avatars.com/api/?name=${name}&background=F31260&color=fff&bold=true&size=128&format=svg`;
  };

  const getTikTokUrl = (): string => {
    if (creator.tiktok_url) return creator.tiktok_url;
    return `https://www.tiktok.com/@${creator.tiktok_username.replace("@", "")}`;
  };

  const handleWhatsApp = () => {
    const phone = creator.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleEmail = () => {
    window.open(`mailto:${creator.email}`, "_blank");
  };

  const handleTikTok = () => {
    openTikTokLink(getTikTokUrl());
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-all duration-300">
      {/* Header: Avatar + Name */}
      <div className="flex items-start gap-3 mb-4">
        <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
          <AvatarImage src={getAvatarUrl()} alt={creator.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-bold text-sm">
            {getInitials(creator.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {creator.full_name}
            </h3>
            {creator.verified && (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            @{creator.tiktok_username.replace("@", "")}
          </p>
        </div>
      </div>

      {/* Verified Badge */}
      {creator.verified && (
        <div className="mb-3">
          <Badge className="bg-gradient-to-r from-primary/10 to-pink-500/10 text-primary border-primary/20 text-[10px]">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {language === "es" ? "Creador Verificado adbroll" : "Verified adbroll Creator"}
          </Badge>
        </div>
      )}

      {/* Niche & Content Type Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {creator.niche.slice(0, 2).map((n) => (
          <Badge key={n} variant="secondary" className="text-[10px] px-2 py-0.5">
            {language === "es" ? NICHE_LABELS[n]?.es : NICHE_LABELS[n]?.en || n}
          </Badge>
        ))}
        {creator.content_type.slice(0, 2).map((ct) => (
          <Badge key={ct} variant="outline" className="text-[10px] px-2 py-0.5">
            {language === "es" ? CONTENT_TYPE_LABELS[ct]?.es : CONTENT_TYPE_LABELS[ct]?.en || ct}
          </Badge>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1 h-9"
          onClick={handleWhatsApp}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3"
          onClick={handleEmail}
        >
          <Mail className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 px-3"
          onClick={handleTikTok}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CreatorCard;
