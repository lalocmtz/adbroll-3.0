import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Globe, DollarSign } from "lucide-react";

export const LanguageSelector = () => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Globe className="h-4 w-4" />
          <span className="font-medium">{language.toUpperCase()}</span>
          <span className="text-muted-foreground">|</span>
          <DollarSign className="h-3 w-3" />
          <span className="font-medium">{currency}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("language")}
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => setLanguage("es")}
          className={language === "es" ? "bg-accent" : ""}
        >
          🇲🇽 Español
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage("en")}
          className={language === "en" ? "bg-accent" : ""}
        >
          🇺🇸 English
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("currency")}
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => setCurrency("MXN")}
          className={currency === "MXN" ? "bg-accent" : ""}
        >
          $ MXN (Peso)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setCurrency("USD")}
          className={currency === "USD" ? "bg-accent" : ""}
        >
          $ USD (Dólar)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
