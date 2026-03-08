import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Sparkles, PlayCircle, TrendingUp, ArrowRight, UserCheck, Clock, Edit } from "lucide-react";
import QuickSignupModal from "./QuickSignupModal";

const NICHES = [
  { value: "belleza", labelEs: "Belleza", labelEn: "Beauty" },
  { value: "fitness", labelEs: "Fitness", labelEn: "Fitness" },
  { value: "moda", labelEs: "Moda", labelEn: "Fashion" },
  { value: "tecnologia", labelEs: "Tecnología", labelEn: "Technology" },
  { value: "hogar", labelEs: "Hogar", labelEn: "Home" },
  { value: "otros", labelEs: "Otros", labelEn: "Others" },
];

const CONTENT_TYPES = [
  { value: "ugc", labelEs: "UGC (Contenido generado por usuario)", labelEn: "UGC (User Generated Content)" },
  { value: "review", labelEs: "Review de productos", labelEn: "Product Reviews" },
  { value: "live", labelEs: "Lives / Transmisiones", labelEn: "Lives / Streams" },
];

const COUNTRIES = [
  { value: "mx", labelEs: "México", labelEn: "Mexico" },
  { value: "us", labelEs: "Estados Unidos", labelEn: "United States" },
];

const formSchema = z.object({
  full_name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  tiktok_username: z.string().min(2, "El usuario de TikTok es requerido"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  country: z.string().min(1, "Selecciona un país"),
  niche: z.array(z.string()).min(1, "Selecciona al menos un nicho"),
  content_type: z.array(z.string()).min(1, "Selecciona al menos un tipo de contenido"),
  terms_accepted: z.boolean().refine((val) => val === true, "Debes aceptar los términos"),
});

type FormData = z.infer<typeof formSchema>;

interface ExistingCreator {
  id: string;
  full_name: string;
  tiktok_username: string;
  email: string;
  whatsapp: string;
  country: string;
  niche: string[];
  content_type: string[];
  status: string;
  created_at: string;
  avatar_url: string | null;
}

const CreatorApplicationForm = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<FormData | null>(null);
  const [existingCreator, setExistingCreator] = useState<ExistingCreator | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      tiktok_username: "",
      email: "",
      whatsapp: "",
      country: "mx",
      niche: [],
      content_type: [],
      terms_accepted: false,
    },
  });

  // Check if user already has a creator profile
  useEffect(() => {
    const checkExistingCreator = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          setIsLoading(false);
          return;
        }

        const { data: creatorData } = await supabase
          .from("creator_directory")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (creatorData) {
          setExistingCreator(creatorData as ExistingCreator);
          setIsEditMode(true);
          // Pre-populate form with existing data
          form.reset({
            full_name: creatorData.full_name,
            tiktok_username: creatorData.tiktok_username,
            email: creatorData.email,
            whatsapp: creatorData.whatsapp,
            country: creatorData.country,
            niche: creatorData.niche || [],
            content_type: creatorData.content_type || [],
            terms_accepted: true,
          });
        }
      } catch (error) {
        console.error("Error checking existing creator:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingCreator();
  }, [form]);

  // Check if returning from OAuth with pending application
  useEffect(() => {
    const checkPendingApplication = async () => {
      const hasPending = localStorage.getItem("pendingCreatorApplication");
      if (hasPending) {
        localStorage.removeItem("pendingCreatorApplication");
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // User just signed up/logged in via OAuth, show success
          setIsSubmitted(true);
          toast({
            title: language === "es" ? "¡Bienvenido!" : "Welcome!",
            description: language === "es"
              ? "Tu cuenta ha sido creada. Completa el formulario para postularte."
              : "Your account has been created. Complete the form to apply.",
          });
        }
      }
    };
    
    checkPendingApplication();
  }, [language, toast]);

  const submitApplication = async (data: FormData, userId?: string) => {
    setIsSubmitting(true);

    try {
      // Build TikTok URL
      const tiktokUrl = `https://www.tiktok.com/@${data.tiktok_username.replace("@", "")}`;

      // Insert into creator_directory
      const { error } = await supabase.from("creator_directory").insert({
        full_name: data.full_name,
        tiktok_username: data.tiktok_username.replace("@", ""),
        email: data.email,
        whatsapp: data.whatsapp,
        country: data.country,
        niche: data.niche,
        content_type: data.content_type,
        tiktok_url: tiktokUrl,
        status: "aplicado",
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            language === "es"
              ? "Ya existe una aplicación con este usuario de TikTok"
              : "An application with this TikTok username already exists"
          );
        }
        throw error;
      }

      // Try to fetch avatar and update the record
      try {
        const { data: avatarData } = await supabase.functions.invoke("fetch-creator-avatar", {
          body: { tiktok_url: tiktokUrl },
        });
        
        // If avatar was found, update the creator_directory record
        if (avatarData?.avatar_url) {
          await supabase
            .from("creator_directory")
            .update({ avatar_url: avatarData.avatar_url })
            .eq("email", data.email);
        }
      } catch (avatarError) {
        console.log("Could not fetch avatar, using fallback");
      }

      setIsSubmitted(true);
      toast({
        title: language === "es" ? "¡Aplicación enviada!" : "Application submitted!",
        description:
          language === "es"
            ? "El equipo de adbroll revisará tu perfil pronto."
            : "The adbroll team will review your profile soon.",
      });
    } catch (error: any) {
      toast({
        title: language === "es" ? "Error al enviar" : "Error submitting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCreatorProfile = async (data: FormData) => {
    if (!existingCreator) return;
    
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("creator_directory")
        .update({
          full_name: data.full_name,
          whatsapp: data.whatsapp,
          country: data.country,
          niche: data.niche,
          content_type: data.content_type,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingCreator.id);

      if (error) throw error;

      toast({
        title: language === "es" ? "¡Datos actualizados!" : "Profile updated!",
        description:
          language === "es"
            ? "Tu información de creador ha sido actualizada."
            : "Your creator information has been updated.",
      });

      // Update local state
      setExistingCreator({
        ...existingCreator,
        full_name: data.full_name,
        whatsapp: data.whatsapp,
        country: data.country,
        niche: data.niche,
        content_type: data.content_type,
      });
    } catch (error: any) {
      toast({
        title: language === "es" ? "Error al actualizar" : "Error updating",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    // If in edit mode, update instead of insert
    if (isEditMode && existingCreator) {
      await updateCreatorProfile(data);
      return;
    }

    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Save form data and show signup modal
      setPendingApplication(data);
      setShowSignupModal(true);
      return;
    }

    // User is authenticated, submit directly
    await submitApplication(data, session.user.id);
  };

  const handleSignupSuccess = async (userId: string) => {
    setShowSignupModal(false);
    
    if (pendingApplication) {
      await submitApplication(pendingApplication, userId);
      setPendingApplication(null);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "publico") {
      return (
        <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {language === "es" ? "Aprobado" : "Approved"}
        </Badge>
      );
    }
    if (status === "rechazado") {
      return (
        <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
          <Clock className="h-3 w-3 mr-1" />
          {language === "es" ? "Rechazado" : "Rejected"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <Clock className="h-3 w-3 mr-1" />
        {language === "es" ? "Revisión en proceso" : "Under review"}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isSubmitted) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            {language === "es" ? "¡Gracias por postularte!" : "Thank you for applying!"}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            {language === "es"
              ? "El equipo de adbroll revisará tu perfil. Te notificaremos cuando tu perfil sea publicado en el directorio."
              : "The adbroll team will review your profile. We'll notify you when your profile is published in the directory."}
          </p>
          
          {/* CTAs to explore platform */}
          <div className="bg-muted/30 rounded-xl p-6 max-w-md mx-auto">
            <p className="text-sm font-medium mb-4">
              {language === "es" 
                ? "Mientras esperas, explora la plataforma:" 
                : "While you wait, explore the platform:"}
            </p>
            <div className="space-y-3">
              <Button
                variant="default"
                className="w-full justify-between"
                onClick={() => navigate("/app")}
              >
                <span className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {language === "es" ? "Ver videos más vendedores" : "See top-selling videos"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => navigate("/opportunities")}
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {language === "es" ? "Productos con alta comisión" : "High-commission products"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode ? (
            <>
              <UserCheck className="h-5 w-5 text-primary" />
              <CardTitle>
                {language === "es" ? "Tu Perfil de Creador" : "Your Creator Profile"}
              </CardTitle>
              {existingCreator && getStatusBadge(existingCreator.status)}
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>
                {language === "es" ? "Postúlate como Creador" : "Apply as a Creator"}
              </CardTitle>
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                {language === "es" ? "GRATIS" : "FREE"}
              </Badge>
            </>
          )}
        </div>
        <CardDescription>
          {isEditMode
            ? language === "es"
              ? "Actualiza tu información de creador. Email y usuario de TikTok no pueden cambiarse."
              : "Update your creator information. Email and TikTok username cannot be changed."
            : language === "es"
              ? "Tu registro es gratuito. Completa el formulario para aparecer en el directorio de creadores de adbroll."
              : "Registration is free. Complete the form to appear in the adbroll creator directory."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Edit Mode Banner */}
        {isEditMode && existingCreator && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {language === "es" ? "Ya estás registrado como creador" : "You're already registered as a creator"}
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {language === "es" 
                ? `Estado: ${existingCreator.status === 'publico' ? 'Aprobado — visible en el directorio' : 'Revisión en proceso'}`
                : `Status: ${existingCreator.status === 'publico' ? 'Approved — visible in directory' : 'Under review'}`}
            </p>
            {existingCreator.status !== 'publico' && (
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                {language === "es" 
                  ? "Nuestro equipo revisa tu perfil antes de activarte para campañas."
                  : "Our team reviews your profile before activating you for campaigns."}
              </p>
            )}
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
              {language === "es" 
                ? `Registrado el ${format(new Date(existingCreator.created_at), 'dd/MM/yyyy')}`
                : `Registered on ${format(new Date(existingCreator.created_at), 'MM/dd/yyyy')}`}
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "es" ? "Nombre completo" : "Full name"}</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TikTok Username */}
            <FormField
              control={form.control}
              name="tiktok_username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "es" ? "Usuario de TikTok" : "TikTok username"}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="@tucuenta" 
                      {...field} 
                      disabled={isEditMode}
                      className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  <FormDescription>
                    {isEditMode
                      ? language === "es"
                        ? "No puedes cambiar tu usuario de TikTok"
                        : "You cannot change your TikTok username"
                      : language === "es"
                        ? "Sin el @, solo tu nombre de usuario"
                        : "Without the @, just your username"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email & WhatsApp in grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="tu@email.com" 
                        {...field} 
                        disabled={isEditMode}
                        className={isEditMode ? "bg-muted cursor-not-allowed" : ""}
                      />
                    </FormControl>
                    {isEditMode && (
                      <FormDescription>
                        {language === "es" ? "No puedes cambiar tu email" : "You cannot change your email"}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp</FormLabel>
                    <FormControl>
                      <Input placeholder="+52 55 1234 5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Country */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "es" ? "País" : "Country"}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={language === "es" ? "Selecciona tu país" : "Select your country"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {language === "es" ? country.labelEs : country.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Niche (checkboxes) */}
            <FormField
              control={form.control}
              name="niche"
              render={() => (
                <FormItem>
                  <FormLabel>{language === "es" ? "Nicho principal" : "Main niche"}</FormLabel>
                  <FormDescription>
                    {language === "es"
                      ? "Selecciona los nichos en los que creas contenido"
                      : "Select the niches you create content for"}
                  </FormDescription>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {NICHES.map((niche) => (
                      <FormField
                        key={niche.value}
                        control={form.control}
                        name="niche"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(niche.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, niche.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== niche.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {language === "es" ? niche.labelEs : niche.labelEn}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Type (checkboxes) */}
            <FormField
              control={form.control}
              name="content_type"
              render={() => (
                <FormItem>
                  <FormLabel>{language === "es" ? "Tipo de contenido" : "Content type"}</FormLabel>
                  <FormDescription>
                    {language === "es"
                      ? "Selecciona los tipos de contenido que produces"
                      : "Select the types of content you produce"}
                  </FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                    {CONTENT_TYPES.map((type) => (
                      <FormField
                        key={type.value}
                        control={form.control}
                        name="content_type"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(type.value)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, type.value]);
                                  } else {
                                    field.onChange(current.filter((v) => v !== type.value));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {language === "es" ? type.labelEs : type.labelEn}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms Acceptance - only show for new applications */}
            {!isEditMode && (
              <FormField
                control={form.control}
                name="terms_accepted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {language === "es"
                          ? "Acepto que mi perfil sea visible para marcas en adbroll y acepto los términos del servicio"
                          : "I agree to have my profile visible to brands on adbroll and accept the terms of service"}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode
                    ? language === "es" ? "Actualizando..." : "Updating..."
                    : language === "es" ? "Enviando..." : "Submitting..."}
                </>
              ) : isEditMode ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  {language === "es" ? "Actualizar datos" : "Update profile"}
                </>
              ) : (
                <>{language === "es" ? "Enviar postulación" : "Submit application"}</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      {/* Quick Signup Modal */}
      <QuickSignupModal
        open={showSignupModal}
        onOpenChange={setShowSignupModal}
        email={pendingApplication?.email || ""}
        fullName={pendingApplication?.full_name || ""}
        onSuccess={handleSignupSuccess}
      />
    </Card>
  );
};

export default CreatorApplicationForm;
