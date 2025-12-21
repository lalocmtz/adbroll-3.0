import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Gift, Video, DollarSign, Users, Send, Loader2 } from "lucide-react";
import { z } from "zod";

const applicationSchema = z.object({
  full_name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  whatsapp: z.string().min(10, "WhatsApp debe tener al menos 10 dígitos").max(20),
  tiktok_url: z.string().url("URL de TikTok inválida").includes("tiktok.com", { message: "Debe ser un link de TikTok" }),
});

const CreatorProgram = () => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    tiktok_url: "",
  });
  const [videoUrl, setVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user already has an application
  useEffect(() => {
    const checkExistingApplication = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data } = await supabase
          .from("creator_program_applications")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();
        
        if (data) {
          setExistingApplication(data);
          setApplicationStatus(data.status);
        }
      }
    };
    checkExistingApplication();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = applicationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("creator_program_applications")
        .insert({
          full_name: result.data.full_name,
          email: result.data.email,
          whatsapp: result.data.whatsapp || null,
          tiktok_url: result.data.tiktok_url,
          status: "pending_video",
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Ya tienes una solicitud",
            description: "Revisa tu email para ver el estado de tu solicitud.",
            variant: "destructive",
          });
          // Fetch existing application
          const { data } = await supabase
            .from("creator_program_applications")
            .select("*")
            .eq("email", result.data.email)
            .maybeSingle();
          if (data) {
            setExistingApplication(data);
            setApplicationStatus(data.status);
          }
        } else {
          throw error;
        }
      } else {
        setApplicationStatus("pending_video");
        toast({
          title: "¡Solicitud enviada!",
          description: "Redirigiendo a WhatsApp...",
        });
        // Redirect to WhatsApp with pre-filled message
        const whatsappMessage = encodeURIComponent("He llenado mi solicitud. Estoy listo para el siguiente paso.");
        window.open(`https://wa.me/522213267653?text=${whatsappMessage}`, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitVideoUrl = async () => {
    if (!videoUrl.includes("tiktok.com")) {
      toast({
        title: "URL inválida",
        description: "Ingresa un link válido de TikTok",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("creator_program_applications")
        .update({
          video_url: videoUrl,
          status: "pending_review",
        })
        .eq("email", formData.email || existingApplication?.email);

      if (error) throw error;

      setApplicationStatus("pending_review");
      toast({
        title: "¡Video enviado!",
        description: "Revisaremos tu video y te contactaremos pronto.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    { icon: Gift, title: "1 mes gratis", description: "Acceso completo a todas las funciones" },
    { icon: DollarSign, title: "30% comisión", description: "De por vida por cada referido que pague" },
    { icon: Video, title: "1-3 videos", description: "Crea contenido sobre Adbroll" },
    { icon: Users, title: "Comunidad", description: "Únete a creadores top de TikTok Shop" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src="/src/assets/logo-dark.png"
            alt="adbroll"
            className="h-10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          />
          <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
            Iniciar sesión
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-5xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            🎉 Programa de Creadores
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Gana acceso gratis + 30% de comisión
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Únete al programa de creadores de Adbroll. Crea 1-3 videos sobre la plataforma
            y recibe 1 mes de acceso completo + tu código de afiliado para ganar comisiones de por vida.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="text-center p-4 border-border/50">
              <benefit.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold text-foreground">{benefit.title}</h3>
              <p className="text-xs text-muted-foreground">{benefit.description}</p>
            </Card>
          ))}
        </div>

        <div className="max-w-md mx-auto">
          {/* Application Form or Status */}
          <div>
            {!applicationStatus ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Solicitar acceso
                  </CardTitle>
                  <CardDescription>
                    Completa el formulario para unirte al programa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitApplication} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nombre completo</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Tu nombre"
                        className={errors.full_name ? "border-destructive" : ""}
                      />
                      {errors.full_name && (
                        <p className="text-sm text-destructive">{errors.full_name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="tu@email.com"
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleInputChange}
                        placeholder="+52 55 1234 5678"
                        className={errors.whatsapp ? "border-destructive" : ""}
                      />
                      {errors.whatsapp && (
                        <p className="text-sm text-destructive">{errors.whatsapp}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tiktok_url">Link de tu perfil de TikTok</Label>
                      <Input
                        id="tiktok_url"
                        name="tiktok_url"
                        value={formData.tiktok_url}
                        onChange={handleInputChange}
                        placeholder="https://tiktok.com/@tuusuario"
                        className={errors.tiktok_url ? "border-destructive" : ""}
                      />
                      {errors.tiktok_url && (
                        <p className="text-sm text-destructive">{errors.tiktok_url}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar solicitud"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {applicationStatus === "approved" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Send className="h-5 w-5 text-primary" />
                    )}
                    Estado de tu solicitud
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <Badge variant={
                      applicationStatus === "approved" ? "default" :
                      applicationStatus === "pending_review" ? "secondary" :
                      "outline"
                    }>
                      {applicationStatus === "pending_video" && "⏳ Esperando video"}
                      {applicationStatus === "pending_review" && "🔍 En revisión"}
                      {applicationStatus === "approved" && "✅ Aprobado"}
                      {applicationStatus === "active" && "🎉 Activo"}
                      {applicationStatus === "rejected" && "❌ Rechazado"}
                    </Badge>
                  </div>

                  {applicationStatus === "pending_video" && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Un asesor te guiará por WhatsApp para los siguientes pasos.
                      </p>
                    </div>
                  )}

                  {applicationStatus === "pending_review" && (
                    <p className="text-sm text-muted-foreground">
                      Estamos revisando tu video. Te contactaremos pronto con tu código de acceso.
                    </p>
                  )}

                  {applicationStatus === "approved" && existingApplication?.grant_code && (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        ¡Felicidades! Tu solicitud fue aprobada. Usa este código para activar tu acceso:
                      </p>
                      <div className="p-4 bg-primary/10 rounded-lg text-center">
                        <p className="text-2xl font-mono font-bold text-primary">
                          {existingApplication.grant_code}
                        </p>
                      </div>
                      <Button 
                        onClick={() => navigate(`/canjear?code=${existingApplication.grant_code}`)}
                        className="w-full"
                      >
                        Canjear código →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProgram;
