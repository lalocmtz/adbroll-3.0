import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useCampaigns, Campaign } from "@/hooks/useCampaigns";
import { useSubmissions } from "@/hooks/useSubmissions";
import { useLibrary } from "@/hooks/useLibrary";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaywallModal from "@/components/PaywallModal";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  DollarSign,
  Users,
  Sparkles,
  Target,
  Zap,
  TrendingUp,
  Globe,
  FileVideo,
  Upload,
  Check,
  AlertCircle,
  ExternalLink,
  Timer,
} from "lucide-react";

const objectiveLabels: Record<string, { es: string; en: string; icon: typeof Target }> = {
  awareness: { es: "Reconocimiento", en: "Awareness", icon: Globe },
  installs: { es: "Instalaciones", en: "Installs", icon: Zap },
  leads: { es: "Leads", en: "Leads", icon: Users },
  signups: { es: "Registros", en: "Sign ups", icon: TrendingUp },
  sales: { es: "Ventas", en: "Sales", icon: DollarSign },
};

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isLoggedIn, hasPaid } = useBlurGateContext();

  const { getCampaign } = useCampaigns();
  const { createSubmission } = useSubmissions();
  const { files } = useLibrary();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Submission form state
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedLibraryFile, setSelectedLibraryFile] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState<number>(0);
  const [creatorNote, setCreatorNote] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectLibraryOpen, setSelectLibraryOpen] = useState(false);

  // Fetch campaign
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id) return;
      setIsLoading(true);
      const data = await getCampaign(id);
      if (data) {
        setCampaign(data);
        setProposedPrice(Math.round((data.min_payment_mxn + data.max_payment_mxn) / 2));
      }
      setIsLoading(false);
    };
    fetchCampaign();
  }, [id]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      setPaywallOpen(true);
    }
  }, [isLoading, isLoggedIn]);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return format(new Date(date), "d 'de' MMMM, yyyy", { locale: language === "es" ? es : enUS });
  };

  const handleSubmit = async () => {
    if (!campaign) return;

    if (!videoUrl && !selectedLibraryFile) {
      toast.error(language === "es" ? "Debes agregar un video" : "You must add a video");
      return;
    }

    if (!legalConsent) {
      toast.error(language === "es" ? "Debes aceptar los términos legales" : "You must accept the legal terms");
      return;
    }

    if (proposedPrice < campaign.min_payment_mxn || proposedPrice > campaign.max_payment_mxn) {
      toast.error(language === "es" ? "El precio debe estar dentro del rango" : "Price must be within range");
      return;
    }

    setIsSubmitting(true);

    const result = await createSubmission({
      campaign_id: campaign.id,
      video_url: videoUrl || undefined,
      video_file_url: selectedLibraryFile || undefined,
      proposed_price_mxn: proposedPrice,
      creator_note: creatorNote || undefined,
      legal_consent_accepted: legalConsent,
    });

    setIsSubmitting(false);

    if (result) {
      setShowSubmitForm(false);
      navigate("/my-submissions");
    }
  };

  const handleSelectLibraryFile = (fileUrl: string) => {
    setSelectedLibraryFile(fileUrl);
    setVideoUrl("");
    setSelectLibraryOpen(false);
  };

  const videoFiles = files.filter((f) => f.file_type === "video");

  if (isLoading) {
    return (
      <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
        <Button variant="ghost" onClick={() => navigate("/campaigns")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === "es" ? "Volver" : "Back"}
        </Button>
        <div className="text-center py-16">
          <h2 className="text-lg font-semibold">
            {language === "es" ? "Campaña no encontrada" : "Campaign not found"}
          </h2>
        </div>
      </div>
    );
  }

  const objective = objectiveLabels[campaign.objective] || objectiveLabels.awareness;
  const ObjectiveIcon = objective.icon;

  return (
    <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => navigate("/campaigns")} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {language === "es" ? "Volver a campañas" : "Back to campaigns"}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header card */}
          <Card>
            <CardContent className="p-0">
              {/* Image */}
              <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                {campaign.product_image_url ? (
                  <img
                    src={campaign.product_image_url}
                    alt={campaign.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Briefcase className="h-16 w-16 text-primary/30" />
                  </div>
                )}
                {/* Objective badge */}
                <Badge className="absolute top-3 right-3 gap-1">
                  <ObjectiveIcon className="h-3.5 w-3.5" />
                  {language === "es" ? objective.es : objective.en}
                </Badge>
              </div>

              <div className="p-5">
                {/* Brand info */}
                {campaign.brand_profiles && (
                  <div className="flex items-center gap-2 mb-3">
                    {campaign.brand_profiles.logo_url ? (
                      <img
                        src={campaign.brand_profiles.logo_url}
                        alt={campaign.brand_profiles.company_name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {campaign.brand_profiles.company_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <span className="font-medium">{campaign.brand_profiles.company_name}</span>
                    {campaign.brand_profiles.verified && (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </div>
                )}

                <h1 className="text-xl md:text-2xl font-bold mb-1">{campaign.title}</h1>
                <p className="text-muted-foreground">{campaign.product_name}</p>

                {campaign.product_url && (
                  <a
                    href={campaign.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                  >
                    {language === "es" ? "Ver producto" : "View product"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Brief */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {language === "es" ? "Brief Creativo" : "Creative Brief"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{campaign.brief}</p>
            </CardContent>
          </Card>

          {/* Rules */}
          {campaign.rules && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {language === "es" ? "Reglas y Requisitos" : "Rules & Requirements"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {campaign.rules}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {language === "es" ? "Pago por video" : "Payment per video"}
                </span>
              </div>
              <div className="text-2xl font-bold text-primary mb-1">
                ${campaign.min_payment_mxn.toLocaleString()} - ${campaign.max_payment_mxn.toLocaleString()} MXN
              </div>
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Tú propones el precio dentro del rango"
                  : "You propose the price within the range"}
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {language === "es" ? "Envíos" : "Submissions"}
                </div>
                <span className="font-semibold">{campaign.submissions_count}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4" />
                  {language === "es" ? "Aprobados" : "Approved"}
                </div>
                <span className="font-semibold">{campaign.approved_count}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  {language === "es" ? "Duración video" : "Video duration"}
                </div>
                <span className="font-semibold">
                  {campaign.video_duration_min}-{campaign.video_duration_max}s
                </span>
              </div>

              {campaign.ends_at && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {language === "es" ? "Termina" : "Ends"}
                  </div>
                  <span className="font-semibold text-sm">{formatDate(campaign.ends_at)}</span>
                </div>
              )}

              {campaign.requires_spark_code && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {language === "es"
                      ? "SparkCode obligatorio al aprobar"
                      : "SparkCode required upon approval"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit CTA */}
          {!showSubmitForm ? (
            <Button className="w-full h-12 text-base" onClick={() => setShowSubmitForm(true)}>
              <FileVideo className="h-5 w-5 mr-2" />
              {language === "es" ? "Enviar mi video" : "Submit my video"}
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  {language === "es" ? "Enviar video" : "Submit video"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video source */}
                <div className="space-y-2">
                  <Label>{language === "es" ? "Tu video" : "Your video"}</Label>

                  {selectedLibraryFile ? (
                    <div className="p-3 rounded-lg border bg-muted/50 flex items-center justify-between">
                      <span className="text-sm truncate flex-1">
                        {language === "es" ? "Video de Mi Biblioteca" : "Video from My Library"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLibraryFile(null)}
                      >
                        {language === "es" ? "Cambiar" : "Change"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        placeholder={language === "es" ? "URL del video (TikTok, etc.)" : "Video URL (TikTok, etc.)"}
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                      />
                      {videoFiles.length > 0 && (
                        <>
                          <div className="text-center text-xs text-muted-foreground">
                            {language === "es" ? "o" : "or"}
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSelectLibraryOpen(true)}
                          >
                            {language === "es" ? "Seleccionar de Mi Biblioteca" : "Select from My Library"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Price proposal */}
                <div className="space-y-3">
                  <Label>
                    {language === "es" ? "Tu precio propuesto" : "Your proposed price"}
                  </Label>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary">
                      ${proposedPrice.toLocaleString()} MXN
                    </span>
                  </div>
                  <Slider
                    value={[proposedPrice]}
                    onValueChange={(v) => setProposedPrice(v[0])}
                    min={campaign.min_payment_mxn}
                    max={campaign.max_payment_mxn}
                    step={50}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>${campaign.min_payment_mxn.toLocaleString()}</span>
                    <span>${campaign.max_payment_mxn.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                {/* Note */}
                <div className="space-y-2">
                  <Label>
                    {language === "es" ? "Nota para la marca (opcional)" : "Note to brand (optional)"}
                  </Label>
                  <Textarea
                    placeholder={language === "es" ? "Cuéntales por qué tu video es valioso..." : "Tell them why your video is valuable..."}
                    value={creatorNote}
                    onChange={(e) => setCreatorNote(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                {/* Legal consent */}
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="legal-consent"
                      checked={legalConsent}
                      onCheckedChange={(checked) => setLegalConsent(checked === true)}
                    />
                    <label htmlFor="legal-consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      {language === "es"
                        ? `Al vender este video, autorizo a ${campaign.brand_profiles?.company_name || "la marca"} a utilizarlo mediante SparkCode para fines publicitarios durante un periodo definido, independientemente de que el video permanezca publicado en mi cuenta. Este es un servicio de contenido digital, no involucra productos físicos ni envíos.`
                        : `By selling this video, I authorize ${campaign.brand_profiles?.company_name || "the brand"} to use it via SparkCode for advertising purposes for a defined period, regardless of whether the video remains posted on my account. This is a digital content service, no physical products or shipping involved.`}
                    </label>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowSubmitForm(false)}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!videoUrl && !selectedLibraryFile) || !legalConsent}
                  >
                    {isSubmitting
                      ? language === "es"
                        ? "Enviando..."
                        : "Submitting..."
                      : language === "es"
                      ? "Enviar video"
                      : "Submit video"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Library file selector modal */}
      <Dialog open={selectLibraryOpen} onOpenChange={setSelectLibraryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {language === "es" ? "Seleccionar video de Mi Biblioteca" : "Select video from My Library"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {videoFiles.map((file) => (
              <button
                key={file.id}
                onClick={() => handleSelectLibraryFile(file.file_url)}
                className="relative aspect-[9/16] rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
              >
                {file.thumbnail_url ? (
                  <img
                    src={file.thumbnail_url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <FileVideo className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white truncate">{file.name}</p>
                </div>
              </button>
            ))}
            {videoFiles.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                {language === "es"
                  ? "No tienes videos en tu biblioteca"
                  : "You have no videos in your library"}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Paywall Modal */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
};

export default CampaignDetail;
