import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 border border-border rounded-lg p-1">
      <Button
        size="sm"
        variant={language === "es" ? "default" : "ghost"}
        onClick={() => setLanguage("es")}
        className="h-7 px-3 text-xs"
      >
        ES
      </Button>
      <Button
        size="sm"
        variant={language === "en" ? "default" : "ghost"}
        onClick={() => setLanguage("en")}
        className="h-7 px-3 text-xs"
      >
        EN
      </Button>
    </div>
  );
};