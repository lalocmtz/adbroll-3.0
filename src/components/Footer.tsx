import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { BrandContactLinks } from "@/components/BrandContactLinks";
import { BrandLogo } from "@/components/brand/BrandLogo";

const Footer = () => {
  const { t, language } = useLanguage();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 md:px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <BrandLogo tone="dark" size="md" />
            <p className="text-sm text-muted-foreground">
              Menos adivinar. Más claridad antes de grabar.
            </p>

          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Explora TokXray</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("aboutTokXray")}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("termsConditions")}
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {language === "es" ? "Política de Reembolsos" : "Refund Policy"}
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {language === "es" ? "Soporte" : "Support"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">{t("contact")}</h3>
            <BrandContactLinks className="text-muted-foreground" />
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TokXray. {t("allRightsReserved")}.
          </p>

          <p className="text-xs text-muted-foreground">TokXray es independiente y no está afiliado a TikTok.</p>
          {/* Company Legal Information */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-border/50">
            <p>
              TokXray es un producto operado por <strong>Ecom Genius LLC</strong>, una compañía registrada en el estado de Delaware, Estados Unidos.
            </p>
            <p>
              <strong>Dirección legal:</strong> 16192 Coastal Highway, Lewes, Delaware 19958, United States.
            </p>
            <p>
              <strong>Correo de soporte:</strong> contacto@tokxray.com &nbsp;|&nbsp; <strong>Horario de soporte:</strong> Lunes a viernes, 9:00 am – 6:00 pm CST.
            </p>
            <p>
              Todos los cargos aparecerán en tu estado de cuenta como: <strong>TOKXRAY.COM</strong>.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
