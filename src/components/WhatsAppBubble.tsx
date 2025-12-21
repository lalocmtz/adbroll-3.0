import { MessageCircle } from "lucide-react";

const WhatsAppBubble = () => {
  const phoneNumber = "522213267653";
  const message = "Hola! Tengo una pregunta sobre Adbroll";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 animate-fade-in"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="h-7 w-7" fill="white" />
    </a>
  );
};

export default WhatsAppBubble;
