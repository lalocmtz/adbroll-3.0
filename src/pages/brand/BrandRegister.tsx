import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Mail, Globe, FileText, Briefcase, Loader2, CheckCircle2, Megaphone, Users, TrendingUp } from "lucide-react";

const industries = [
  { value: "technology", labelEs: "Tecnología / Apps", labelEn: "Technology / Apps" },
  { value: "ecommerce", labelEs: "E-commerce", labelEn: "E-commerce" },
  { value: "finance", labelEs: "Finanzas / Fintech", labelEn: "Finance / Fintech" },
  { value: "health", labelEs: "Salud y Bienestar", labelEn: "Health & Wellness" },
  { value: "education", labelEs: "Educación", labelEn: "Education" },
  { value: "entertainment", labelEs: "Entretenimiento", labelEn: "Entertainment" },
  { value: "food", labelEs: "Alimentos y Bebidas", labelEn: "Food & Beverage" },
  { value: "fashion", labelEs: "Moda y Belleza", labelEn: "Fashion & Beauty" },
  { value: "travel", labelEs: "Viajes y Turismo", labelEn: "Travel & Tourism" },
  { value: "services", labelEs: "Servicios Profesionales", labelEn: "Professional Services" },
  { value: "other", labelEs: "Otro", labelEn: "Other" },
];

const BrandRegister = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactEmail: "",
    website: "",
    industry: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName || !formData.contactEmail || !formData.industry) {
      toast({
        title: language === "es" ? "Campos requeridos" : "Required fields",
        description: language === "es" 
          ? "Por favor completa nombre, email e industria" 
          : "Please complete name, email and industry",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: language === "es" ? "Debes iniciar sesión" : "You must be logged in",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      // Create brand profile
      const { error: profileError } = await supabase
        .from("brand_profiles")
        .insert({
          user_id: user.id,
          company_name: formData.companyName,
          contact_email: formData.contactEmail,
          website: formData.website || null,
          industry: formData.industry,
          description: formData.description || null,
          verified: false,
        });

      if (profileError) {
        // Check if profile already exists
        if (profileError.code === "23505") {
          toast({
            title: language === "es" ? "Ya tienes un perfil de marca" : "You already have a brand profile",
            description: language === "es" 
              ? "Redirigiendo al panel de marca..." 
              : "Redirecting to brand panel...",
          });
          navigate("/brand/dashboard");
          return;
        }
        throw profileError;
      }

      // Assign brand role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "brand",
        });

      if (roleError && roleError.code !== "23505") {
        console.error("Role assignment error:", roleError);
        // Don't throw - profile was created successfully
      }

      toast({
        title: language === "es" ? "¡Registro exitoso!" : "Registration successful!",
        description: language === "es" 
          ? "Tu perfil de marca ha sido creado" 
          : "Your brand profile has been created",
      });

      // Navigate to brand dashboard
      navigate("/brand/dashboard");
      
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: "Error",
        description: language === "es" 
          ? "No se pudo crear el perfil de marca" 
          : "Could not create brand profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-5 pb-10 px-4 md:px-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 mb-4">
          <Building2 className="h-8 w-8 text-violet-500" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {language === "es" ? "Registra tu marca" : "Register your brand"}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          {language === "es" 
            ? "Crea campañas y conecta con creadores de TikTok para promocionar tu producto o servicio digital"
            : "Create campaigns and connect with TikTok creators to promote your digital product or service"}
        </p>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 border-border/50 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <Megaphone className="h-6 w-6 text-blue-500 mb-2" />
          <h3 className="font-semibold text-sm mb-1">
            {language === "es" ? "Lanza campañas" : "Launch campaigns"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "es" 
              ? "Crea briefs creativos y define tu presupuesto"
              : "Create creative briefs and define your budget"}
          </p>
        </Card>
        
        <Card className="p-4 border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <Users className="h-6 w-6 text-green-500 mb-2" />
          <h3 className="font-semibold text-sm mb-1">
            {language === "es" ? "Recibe videos UGC" : "Receive UGC videos"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "es" 
              ? "Creadores envían sus videos para tu revisión"
              : "Creators submit their videos for your review"}
          </p>
        </Card>
        
        <Card className="p-4 border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <TrendingUp className="h-6 w-6 text-amber-500 mb-2" />
          <h3 className="font-semibold text-sm mb-1">
            {language === "es" ? "Escala con SparkCode" : "Scale with SparkCode"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {language === "es" 
              ? "Usa el contenido aprobado en tus campañas de ads"
              : "Use approved content in your ad campaigns"}
          </p>
        </Card>
      </div>

      {/* Registration Form */}
      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {language === "es" ? "Nombre de la empresa *" : "Company name *"}
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder={language === "es" ? "Ej: MiApp Inc." : "E.g: MyApp Inc."}
              required
            />
          </div>

          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {language === "es" ? "Email de contacto *" : "Contact email *"}
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
              placeholder="marketing@empresa.com"
              required
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {language === "es" ? "Sitio web (opcional)" : "Website (optional)"}
            </Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://tuempresa.com"
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              {language === "es" ? "Industria *" : "Industry *"}
            </Label>
            <Select 
              value={formData.industry} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === "es" ? "Selecciona una industria" : "Select an industry"} />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {language === "es" ? ind.labelEs : ind.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {language === "es" ? "Descripción del negocio (opcional)" : "Business description (optional)"}
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={language === "es" 
                ? "Cuéntanos sobre tu producto o servicio..."
                : "Tell us about your product or service..."}
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {language === "es" ? "Registrando..." : "Registering..."}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {language === "es" ? "Crear perfil de marca" : "Create brand profile"}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {language === "es" 
              ? "Al registrarte, aceptas nuestros términos de servicio para marcas"
              : "By registering, you accept our terms of service for brands"}
          </p>
        </form>
      </Card>
    </div>
  );
};

export default BrandRegister;