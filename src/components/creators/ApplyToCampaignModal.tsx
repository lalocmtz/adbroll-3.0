import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Sparkles, MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ApplyToCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTitle: string;
  brandName: string;
  campaignId: string;
  isLoggedInCreator: boolean;
  onSuccess: () => void;
}

const NICHES = [
  "Belleza",
  "Skincare",
  "Moda",
  "Fitness",
  "Tecnología",
  "Hogar",
  "Comida",
  "Lifestyle",
  "Gaming",
  "Finanzas",
  "Educación",
  "Mascotas",
];

const CONTENT_TYPES = [
  "UGC",
  "Reviews",
  "Unboxing",
  "Tutoriales",
  "Vlogs",
  "Comedy",
  "ASMR",
  "POV",
];

const ApplyToCampaignModal = ({
  open,
  onOpenChange,
  campaignTitle,
  brandName,
  campaignId,
  isLoggedInCreator,
  onSuccess,
}: ApplyToCampaignModalProps) => {
  const { language } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form for new visitors
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    tiktok_username: "",
    whatsapp: "",
    niche: "",
    content_type: "",
  });

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.tiktok_username || !form.whatsapp) {
      toast.error(language === "es" ? "Completa los campos requeridos" : "Complete required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if creator already exists
      const { data: existingCreator } = await supabase
        .from("creator_directory")
        .select("id")
        .eq("email", form.email.toLowerCase())
        .maybeSingle();

      let creatorId: string;

      if (existingCreator) {
        creatorId = existingCreator.id;
      } else {
        // Create new creator entry
        const { data: newCreator, error: createError } = await supabase
          .from("creator_directory")
          .insert({
            full_name: form.full_name,
            email: form.email.toLowerCase(),
            tiktok_username: form.tiktok_username.replace("@", ""),
            whatsapp: form.whatsapp,
            niche: form.niche ? [form.niche] : [],
            content_type: form.content_type ? [form.content_type] : [],
            status: "pending",
            tiktok_url: `https://tiktok.com/@${form.tiktok_username.replace("@", "")}`,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        creatorId = newCreator.id;
      }

      // Create campaign application
      const { error: appError } = await supabase
        .from("campaign_applications")
        .insert({
          campaign_id: campaignId,
          creator_directory_id: creatorId,
        });

      if (appError) {
        if (appError.code === "23505") {
          toast.error(language === "es" ? "Ya aplicaste a esta campaña" : "Already applied to this campaign");
          return;
        }
        throw appError;
      }

      setShowSuccess(true);
      onSuccess();
    } catch (err) {
      console.error("Error applying:", err);
      toast.error(language === "es" ? "Error al aplicar" : "Error applying");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success view
  if (showSuccess || isLoggedInCreator) {
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
  }

  // Form view for new visitors
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === "es" ? "Aplica a esta campaña" : "Apply to this campaign"}
          </DialogTitle>
          <DialogDescription>
            {language === "es"
              ? `Completa tus datos para aplicar a "${campaignTitle}" de ${brandName}`
              : `Complete your details to apply to "${campaignTitle}" by ${brandName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>{language === "es" ? "Nombre completo *" : "Full name *"}</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <Label>WhatsApp *</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+52 55 1234 5678"
              />
            </div>

            <div className="col-span-2">
              <Label>TikTok Username *</Label>
              <Input
                value={form.tiktok_username}
                onChange={(e) => setForm({ ...form, tiktok_username: e.target.value })}
                placeholder="@tu_usuario"
              />
            </div>

            <div>
              <Label>{language === "es" ? "Nicho" : "Niche"}</Label>
              <Select value={form.niche} onValueChange={(v) => setForm({ ...form, niche: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "es" ? "Selecciona" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {NICHES.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === "es" ? "Tipo de contenido" : "Content type"}</Label>
              <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === "es" ? "Selecciona" : "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {language === "es" ? "Cancelar" : "Cancel"}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {language === "es" ? "Enviar aplicación" : "Submit application"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplyToCampaignModal;