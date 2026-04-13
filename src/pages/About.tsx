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
      title: "Sobre Adbroll",
      backButton: "Volver al inicio",
      intro: "Adbroll es una plataforma de análisis creativo diseñada para ayudar a creadores, vendedores y marcas a identificar oportunidades reales dentro de TikTok Shop. Nuestro sistema analiza datos públicos y contenido disponible para mostrar qué productos están vendiendo hoy, qué creadores están generando resultados y qué guiones funcionan mejor.",
      company: "Adbroll forma parte de **Ecom Genius LLC**, una compañía registrada en Delaware, Estados Unidos.",
      address: "**Dirección legal:** 16192 Coastal Highway, Lewes, Delaware 19958, United States.",
      mission: "Nuestra misión es ofrecer claridad, transparencia y datos reales para que cualquier persona pueda crear contenido que funcione sin necesidad de adivinar.",
      contact: "Si tienes preguntas o necesitas soporte, puedes escribirnos a:",
      cta: "Comenzar ahora"
    },
    en: {
      title: "About Adbroll",
      backButton: "Back to home",
      intro: "Adbroll is a creative analytics platform designed to help creators, sellers, and brands identify real opportunities within TikTok Shop. Our system analyzes public data and available content to show which products are selling today, which creators are generating results, and which scripts work best.",
      company: "Adbroll is part of **Ecom Genius LLC**, a company registered in Delaware, United States.",
      address: "**Legal address:** 16192 Coastal Highway, Lewes, Delaware 19958, United States.",
      mission: "Our mission is to offer clarity, transparency, and real data so that anyone can create content that works without having to guess.",
      contact: "If you have questions or need support, you can write to us at:",
      cta: "Get started"
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
              href="mailto:contacto@adbroll.com" 
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <Mail className="h-4 w-4" />
              contacto@adbroll.com
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
