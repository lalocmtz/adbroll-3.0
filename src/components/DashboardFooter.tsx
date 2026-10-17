import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandContactLinks } from "@/components/BrandContactLinks";

const DashboardFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur py-4 px-4 md:px-6">
      <div className="flex flex-col items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Logo and Copyright */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TokXray
          </span>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TokXray
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center items-center gap-4 text-xs">
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("aboutTokXray")}
          </Link>
          <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("faq")}
          </Link>
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("privacyPolicy")}
          </Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("termsConditions")}
          </Link>
        </div>

        <BrandContactLinks className="justify-center text-muted-foreground" />
      </div>
    </footer>
  );
};

export default DashboardFooter;
