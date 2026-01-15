import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, MessageCircle } from "lucide-react";

interface ApplyToCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTitle: string;
  brandName: string;
}

const ApplyToCampaignModal = ({
  open,
  onOpenChange,
  campaignTitle,
  brandName,
}: ApplyToCampaignModalProps) => {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <DialogTitle className="text-xl">
            {language === "es" ? "¡Felicidades!" : "Congratulations!"}
          </DialogTitle>
          <DialogDescription className="text-center space-y-2 pt-2">
            <p>
              {language === "es"
                ? `Has aplicado exitosamente a la campaña "${campaignTitle}" de ${brandName}.`
                : `You have successfully applied to the "${campaignTitle}" campaign by ${brandName}.`}
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 my-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {language === "es"
                ? "Tu perfil será revisado por la marca."
                : "Your profile will be reviewed by the brand."}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {language === "es"
                ? "Si tu perfil es de su interés, te contactarán directamente vía WhatsApp."
                : "If your profile matches their needs, they will contact you directly via WhatsApp."}
            </p>
          </div>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          {language === "es" ? "Entendido" : "Got it"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyToCampaignModal;
