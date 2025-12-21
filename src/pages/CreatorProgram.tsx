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
import { CheckCircle, Gift, Video, DollarSign, Users, Send, MessageCircle, Download, ExternalLink, Loader2 } from "lucide-react";
import { z } from "zod";

const applicationSchema = z.object({
  full_name: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  whatsapp: z.string().min(10, "WhatsApp debe tener al menos 10 dígitos").max(20).optional().or(z.literal("")),
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
          description: "Ahora crea tu video siguiendo el brief abajo.",
        });
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

  const briefSteps = [
    "Menciona el problema: \"¿Te cuesta encontrar productos que vendan en TikTok Shop?\"",
    "Presenta la solución: \"Descubrí Adbroll, una herramienta que te muestra los videos más rentables\"",
    "Muestra la app: Graba tu pantalla navegando por el dashboard",
    "Call to action: \"Link en mi bio para probarlo gratis\"",
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

        <div className="grid md:grid-cols-2 gap-8">
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
                      <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                      <Input
                        id="whatsapp"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleInputChange}
                        placeholder="+52 55 1234 5678"
                      />
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
                        Crea tu video siguiendo el brief de la derecha y pega el link aquí:
                      </p>
                      <Input
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="https://tiktok.com/@tuusuario/video/..."
                      />
                      <Button 
                        onClick={handleSubmitVideoUrl} 
                        className="w-full"
                        disabled={isSubmitting || !videoUrl}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Enviar link del video"
                        )}
                      </Button>
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

            {/* WhatsApp Contact */}
            <Card className="mt-4 border-green-500/30 bg-green-500/5">
              <CardContent className="py-4">
                <a
                  href="https://wa.me/5215512345678?text=Hola!%20Quiero%20unirme%20al%20programa%20de%20creadores%20de%20Adbroll"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-medium">¿Dudas? Contáctanos por WhatsApp</span>
                  <ExternalLink className="h-4 w-4 ml-auto" />
                </a>
              </CardContent>
            </Card>
          </div>

          {/* Brief & Resources */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Brief del video
                </CardTitle>
                <CardDescription>
                  Sigue esta estructura para tu video (30-60 segundos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {briefSteps.map((step, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="text-sm text-muted-foreground">{step}</p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Recursos
                </CardTitle>
                <CardDescription>
                  Descarga estos assets para tu video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href="/src/assets/logo-dark.png"
                  download="adbroll-logo.png"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                    <img src="/src/assets/logo-dark.png" alt="Logo" className="h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Logo Adbroll</p>
                    <p className="text-xs text-muted-foreground">PNG transparente</p>
                  </div>
                  <Download className="h-4 w-4 ml-auto text-muted-foreground" />
                </a>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Tips para el video:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Formato vertical (9:16)</li>
                    <li>• Muestra tu cara + pantalla de la app</li>
                    <li>• Usa música trending de TikTok</li>
                    <li>• Menciona "TikTok Shop" y "Adbroll"</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProgram;
