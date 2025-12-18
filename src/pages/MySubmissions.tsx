import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBlurGateContext } from "@/contexts/BlurGateContext";
import { useMySubmissions, Submission, SubmissionStatus } from "@/hooks/useSubmissions";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PaywallModal from "@/components/PaywallModal";
import {
  FileVideo,
  Clock,
  Check,
  X,
  Sparkles,
  DollarSign,
  MessageSquare,
  ExternalLink,
  Send,
  AlertCircle,
} from "lucide-react";

const statusConfig: Record<
  SubmissionStatus,
  { label: { es: string; en: string }; color: string; icon: typeof Clock }
> = {
  pending_review: {
    label: { es: "En revisión", en: "Under review" },
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  approved: {
    label: { es: "Aprobado", en: "Approved" },
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: Check,
  },
  rejected: {
    label: { es: "Rechazado", en: "Rejected" },
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: X,
  },
  changes_requested: {
    label: { es: "Cambios solicitados", en: "Changes requested" },
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    icon: MessageSquare,
  },
  pending_sparkcode: {
    label: { es: "Pendiente SparkCode", en: "Pending SparkCode" },
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    icon: Sparkles,
  },
  completed: {
    label: { es: "Completado", en: "Completed" },
    color: "bg-primary/10 text-primary",
    icon: Check,
  },
  cancelled: {
    label: { es: "Cancelado", en: "Cancelled" },
    color: "bg-muted text-muted-foreground",
    icon: X,
  },
};

const SubmissionCard = ({
  submission,
  onSparkCodeClick,
}: {
  submission: Submission;
  onSparkCodeClick: (submission: Submission) => void;
}) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const status = statusConfig[submission.status];
  const StatusIcon = status.icon;

  const formatDate = (date: string) => {
    return format(new Date(date), "d MMM yyyy", { locale: language === "es" ? es : enUS });
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Thumbnail */}
          <div className="w-full sm:w-32 h-32 sm:h-auto bg-muted flex-shrink-0">
            {submission.thumbnail_url ? (
              <img
                src={submission.thumbnail_url}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileVideo className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="font-semibold line-clamp-1">
                  {submission.campaigns?.title || "Campaign"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {submission.campaigns?.product_name}
                </p>
              </div>
              <Badge className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {language === "es" ? status.label.es : status.label.en}
              </Badge>
            </div>

            {/* Brand info */}
            {submission.campaigns?.brand_profiles && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                {submission.campaigns.brand_profiles.logo_url ? (
                  <img
                    src={submission.campaigns.brand_profiles.logo_url}
                    alt=""
                    className="h-4 w-4 rounded-full"
                  />
                ) : null}
                <span>{submission.campaigns.brand_profiles.company_name}</span>
              </div>
            )}

            {/* Price info */}
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {language === "es" ? "Propuesto:" : "Proposed:"}{" "}
                  <span className="font-semibold">
                    ${submission.proposed_price_mxn.toLocaleString()} MXN
                  </span>
                </span>
              </div>
              {submission.approved_price_mxn && (
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                    {language === "es" ? "Aprobado:" : "Approved:"}{" "}
                    <span className="font-semibold">
                      ${submission.approved_price_mxn.toLocaleString()} MXN
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Feedback */}
            {submission.brand_feedback && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 mb-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {submission.brand_feedback}
                </p>
              </div>
            )}

            {/* Actions based on status */}
            <div className="flex items-center gap-2 flex-wrap">
              {submission.status === "pending_sparkcode" && (
                <Button size="sm" onClick={() => onSparkCodeClick(submission)}>
                  <Send className="h-4 w-4 mr-1" />
                  {language === "es" ? "Enviar SparkCode" : "Submit SparkCode"}
                </Button>
              )}

              {submission.video_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(submission.video_url!, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {language === "es" ? "Ver video" : "View video"}
                </Button>
              )}

              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(submission.created_at)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SubmissionCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-0">
      <div className="flex flex-col sm:flex-row">
        <Skeleton className="w-full sm:w-32 h-32" />
        <div className="flex-1 p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const MySubmissions = () => {
  const { language } = useLanguage();
  const { isLoggedIn } = useBlurGateContext();
  const navigate = useNavigate();
  const { submissions, isLoading, submitSparkCode, getStats } = useMySubmissions();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [sparkCodeModal, setSparkCodeModal] = useState<Submission | null>(null);
  const [sparkCodeValue, setSparkCodeValue] = useState("");
  const [isSubmittingSparkCode, setIsSubmittingSparkCode] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Redirect if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            {language === "es" ? "Inicia sesión para ver tus envíos" : "Sign in to see your submissions"}
          </h2>
          <Button onClick={() => navigate("/login")}>
            {language === "es" ? "Iniciar sesión" : "Sign in"}
          </Button>
        </div>
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
      </div>
    );
  }

  const stats = getStats();

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return s.status === "pending_review";
    if (activeTab === "approved") return s.status === "approved" || s.status === "pending_sparkcode";
    if (activeTab === "completed") return s.status === "completed";
    if (activeTab === "rejected") return s.status === "rejected";
    return true;
  });

  const handleSparkCodeSubmit = async () => {
    if (!sparkCodeModal || !sparkCodeValue.trim()) return;

    setIsSubmittingSparkCode(true);
    const success = await submitSparkCode(sparkCodeModal.id, sparkCodeValue.trim());
    setIsSubmittingSparkCode(false);

    if (success) {
      setSparkCodeModal(null);
      setSparkCodeValue("");
    }
  };

  return (
    <div className="min-h-screen pt-2 pb-24 md:pb-6 px-3 md:px-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
          📤 {language === "es" ? "Mis Envíos" : "My Submissions"}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {language === "es"
            ? "Videos que has enviado a campañas"
            : "Videos you've submitted to campaigns"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <Card className="p-3">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">
            {language === "es" ? "Total" : "Total"}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-xs text-muted-foreground">
            {language === "es" ? "Pendientes" : "Pending"}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-emerald-600">{stats.approved}</div>
          <div className="text-xs text-muted-foreground">
            {language === "es" ? "Aprobados" : "Approved"}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-primary">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">
            {language === "es" ? "Completados" : "Completed"}
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="grid grid-cols-5 w-full max-w-lg">
          <TabsTrigger value="all" className="text-xs">
            {language === "es" ? "Todos" : "All"}
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            {language === "es" ? "Pendientes" : "Pending"}
          </TabsTrigger>
          <TabsTrigger value="approved" className="text-xs">
            {language === "es" ? "Aprobados" : "Approved"}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            {language === "es" ? "Completados" : "Completed"}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            {language === "es" ? "Rechazados" : "Rejected"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Empty state */}
      {!isLoading && filteredSubmissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileVideo className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            {language === "es" ? "No tienes envíos" : "No submissions yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {language === "es"
              ? "Explora campañas abiertas y envía tu primer video para comenzar a ganar."
              : "Explore open campaigns and submit your first video to start earning."}
          </p>
          <Button onClick={() => navigate("/campaigns")}>
            {language === "es" ? "Ver campañas" : "View campaigns"}
          </Button>
        </div>
      )}

      {/* Submissions list */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <SubmissionCardSkeleton key={i} />)
          : filteredSubmissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onSparkCodeClick={setSparkCodeModal}
              />
            ))}
      </div>

      {/* SparkCode Modal */}
      <Dialog open={!!sparkCodeModal} onOpenChange={() => setSparkCodeModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === "es" ? "Enviar SparkCode" : "Submit SparkCode"}
            </DialogTitle>
            <DialogDescription>
              {language === "es"
                ? "Ingresa el SparkCode de tu video de TikTok para completar la venta."
                : "Enter the SparkCode from your TikTok video to complete the sale."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SparkCode</label>
              <Input
                placeholder="Ej: ABC123XYZ..."
                value={sparkCodeValue}
                onChange={(e) => setSparkCodeValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {language === "es"
                  ? "Puedes encontrar el SparkCode en TikTok: Video → Compartir → Spark Ads"
                  : "You can find the SparkCode in TikTok: Video → Share → Spark Ads"}
              </p>
            </div>

            {sparkCodeModal?.approved_price_mxn && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">
                    {language === "es" ? "Recibirás:" : "You'll receive:"}{" "}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      ${sparkCodeModal.approved_price_mxn.toLocaleString()} MXN
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSparkCodeModal(null)}>
              {language === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              onClick={handleSparkCodeSubmit}
              disabled={!sparkCodeValue.trim() || isSubmittingSparkCode}
            >
              {isSubmittingSparkCode
                ? language === "es"
                  ? "Enviando..."
                  : "Submitting..."
                : language === "es"
                ? "Enviar SparkCode"
                : "Submit SparkCode"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
};

export default MySubmissions;
