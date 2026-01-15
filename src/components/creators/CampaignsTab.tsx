import { useLanguage } from "@/contexts/LanguageContext";
import { Megaphone, Sparkles } from "lucide-react";

const CampaignsTab = () => {
  const { language } = useLanguage();

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
};

export default CampaignsTab;
