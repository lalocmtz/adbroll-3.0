import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Video, FileText, Calendar, Banknote } from "lucide-react";
import { trackPageView } from "@/lib/analytics";
import { BrandLogo } from "@/components/brand/BrandLogo";

const CONTENT_OPTIONS = [
  "Belleza",
  "Humor",
  "Lifestyle",
  "Fitness",
  "Storytelling",
  "Tendencias TikTok",
  "Otro",
];

const RecruitGDL = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formStarted, setFormStarted] = useState(false);
  const { toast } = useToast();

  // Form fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [contentPreferences, setContentPreferences] = useState<string[]>([]);
  const [comfortableOnCamera, setComfortableOnCamera] = useState<string>("si");

  // Optional account
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    trackPageView("/reclutamiento-gdl");
    // Add noindex meta tag
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const handleFormInteraction = () => {
    if (!formStarted) {
      setFormStarted(true);
      trackPageView("/reclutamiento-gdl#form-started");
    }
  };

  const toggleContentPref = (option: string) => {
    setContentPreferences((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !age || !whatsapp || !email) {
      toast({ title: "Completa los campos requeridos", variant: "destructive" });
      return;
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 99) {
      toast({ title: "Edad inválida", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let userId: string | null = null;

      // Optional account creation
      if (createAccount && password.length >= 6) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (!authError && authData.user) {
          userId = authData.user.id;
        }
      }

      const { error } = await supabase.from("creator_leads").insert({
        name,
        age: ageNum,
        whatsapp,
        email,
        tiktok_username: tiktokUsername || null,
        instagram_username: instagramUsername || null,
        content_preferences: contentPreferences,
        comfortable_on_camera: comfortableOnCamera === "si",
        campaign_tag: "Guadalajara",
        user_id: userId,
      });

      if (error) throw error;

      trackPageView("/reclutamiento-gdl#form-submitted");
      setIsSubmitted(true);
    } catch (error: any) {
      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppClick = () => {
    trackPageView("/reclutamiento-gdl#whatsapp-click");
    window.open("https://whatsapp.com/channel/0029VbB2Vx6KGGGMzWfT5W3Q", "_blank");
  };

  // ─── SUCCESS STATE ────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">¡Gracias por tu registro!</h1>
            <p className="text-muted-foreground">
              Te contactaremos por WhatsApp para próximas grabaciones.
            </p>
            <Button size="lg" className="w-full text-base" onClick={handleWhatsAppClick}>
              📢 Unirme a la comunidad
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── MAIN PAGE ────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <div className="py-6 px-4 flex justify-center">
        <BrandLogo tone="dark" size="md" />
      </div>

      <div className="max-w-lg mx-auto px-4 pb-16 space-y-12">
        {/* ─── HERO ─────────────────────────── */}
        <section className="text-center space-y-4 pt-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            Gana dinero grabando videos para TikTok Shop
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Estamos reclutando hombres y mujeres en Guadalajara. No necesitas experiencia, solo
            sentirte cómodo frente a cámara.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
            {[
              { icon: Banknote, text: "Grabaciones pagadas o intercambio por productos" },
              { icon: FileText, text: "Nosotros te damos los guiones" },
              { icon: Calendar, text: "Grabas varios videos en una sola sesión" },
              { icon: Video, text: "Oportunidad de trabajar constantemente" },
            ].map((b) => (
              <div key={b.text} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40">
                <b.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{b.text}</span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full sm:w-auto mt-4"
            onClick={() => document.getElementById("form-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            Aplicar ahora
          </Button>
        </section>

        {/* ─── FORM ─────────────────────────── */}
        <Card id="form-section">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-lg font-semibold text-foreground mb-6">Tu información</h2>

            <form onSubmit={handleSubmit} className="space-y-5" onFocus={handleFormInteraction}>
              {/* Required fields */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">Edad *</Label>
                <Input id="age" type="number" min={16} max={99} value={age} onChange={(e) => setAge(e.target.value)} placeholder="25" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 33 1234 5678" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" required />
              </div>

              {/* Optional */}
              <div className="space-y-2">
                <Label htmlFor="tiktok">Usuario de TikTok (opcional)</Label>
                <Input id="tiktok" value={tiktokUsername} onChange={(e) => setTiktokUsername(e.target.value)} placeholder="@usuario" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Usuario de Instagram (opcional)</Label>
                <Input id="instagram" value={instagramUsername} onChange={(e) => setInstagramUsername(e.target.value)} placeholder="@usuario" />
              </div>

              {/* Content preferences */}
              <div className="space-y-3">
                <Label>¿Qué tipo de contenido te gusta hacer?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTENT_OPTIONS.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        contentPreferences.includes(option)
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        checked={contentPreferences.includes(option)}
                        onCheckedChange={() => toggleContentPref(option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              </div>

              {/* Camera comfort */}
              <div className="space-y-3">
                <Label>¿Te sientes cómodo/a hablando a cámara?</Label>
                <RadioGroup value={comfortableOnCamera} onValueChange={setComfortableOnCamera} className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="si" id="camera-si" />
                    <Label htmlFor="camera-si" className="font-normal cursor-pointer">Sí</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="camera-no" />
                    <Label htmlFor="camera-no" className="font-normal cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Optional account */}
              <div className="border-t border-border pt-5 space-y-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <Checkbox
                    checked={createAccount}
                    onCheckedChange={(v) => setCreateAccount(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-muted-foreground">
                    Opcional: crea tu cuenta para recibir más oportunidades
                  </span>
                </label>

                {createAccount && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="password">Contraseña (mín. 6 caracteres)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
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
      </div>
    </div>
  );
};

export default RecruitGDL;
