import { useLanguage } from "@/contexts/LanguageContext";
import GlobalHeader from "@/components/GlobalHeader";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const About = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const content = {
    es: {
      title: "Sobre TokXray",
      backButton: "Volver al inicio",
      intro: "Grabar toma tiempo. Elegir qué producto mostrar y qué decir no debería empezar siempre desde cero. TokXray reúne referencias de TikTok Shop México, sus ventas reportadas y herramientas para entender y adaptar sus guiones. Tú eliges qué probar con tu audiencia.",
      company: "TokXray forma parte de **Ecom Genius LLC**, una compañía registrada en Delaware, Estados Unidos.",
      address: "**Dirección legal:** 16192 Coastal Highway, Lewes, Delaware 19958, United States.",
      mission: "Queremos ayudarte a dejar de grabar a ciegas: elige una referencia, haz tuyo el guion y prueba tu versión. El catálogo se actualiza semanalmente; consulta el período de cada reporte. TokXray no está afiliado a TikTok ni garantiza ventas.",
      contact: "Si tienes preguntas o necesitas soporte, puedes escribirnos a:",
      cta: "Crear mi cuenta gratis"
    },
    en: {
      title: "About TokXray",
      backButton: "Back to home",
      intro: "Filming takes time. Choosing a product and deciding what to say should not mean starting from scratch. TokXray brings together TikTok Shop Mexico references, their reported sales and tools to understand and adapt their scripts. You choose what to test with your audience.",
      company: "TokXray is part of **Ecom Genius LLC**, a company registered in Delaware, United States.",
      address: "**Legal address:** 16192 Coastal Highway, Lewes, Delaware 19958, United States.",
      mission: "Choose a reference, make the script your own and test your version. The catalog is updated weekly; check each reporting period. TokXray is independent of TikTok and does not guarantee sales.",
      contact: "If you have questions or need support, you can write to us at:",
      cta: "Create my free account"
    }
  };

  const data = content[language];

  // Helper to render bold text
  const renderText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => 
      index % 2 === 1 ? <strong key={index}>{part}</strong> : part
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GlobalHeader showMenu={false} />
      
      <main className="flex-1 container mx-auto px-4 md:px-6 py-12 max-w-3xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {data.backButton}
          </Button>
        </Link>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {data.title}
          </h1>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground leading-relaxed text-lg">
            {data.intro}
          </p>

          <p className="text-muted-foreground leading-relaxed">
            {renderText(data.company)}
          </p>

          <p className="text-muted-foreground leading-relaxed">
            {renderText(data.address)}
          </p>

          <p className="text-muted-foreground leading-relaxed">
            {data.mission}
          </p>

          <div className="pt-4">
            <p className="text-muted-foreground mb-2">{data.contact}</p>
            <a 
              href="mailto:contacto@tokxray.com" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              contacto@tokxray.com
            </a>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Button size="lg" onClick={() => navigate("/register")}>
            {data.cta}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
