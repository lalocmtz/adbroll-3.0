import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAccountType } from "@/hooks/useAccountType";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useSubmissions, Submission } from "@/hooks/useSubmissions";
import { 
  ArrowLeft, 
  Play,
  Check,
  X,
  MessageSquare,
  DollarSign,
  Clock,
  User,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending_review: { label: "Pendiente", color: "bg-yellow-500" },
  approved: { label: "Aprobado", color: "bg-green-500" },
  rejected: { label: "Rechazado", color: "bg-red-500" },
  changes_requested: { label: "Cambios solicitados", color: "bg-orange-500" },
  pending_sparkcode: { label: "Esperando SparkCode", color: "bg-blue-500" },
  completed: { label: "Completado", color: "bg-emerald-500" },
  cancelled: { label: "Cancelado", color: "bg-gray-500" },
};

const BrandSubmissions = () => {
  const navigate = useNavigate();
  const { id: campaignId } = useParams<{ id: string }>();
  const { isBrand, brandProfile, isLoading: accountLoading } = useAccountType();
  const { getCampaign } = useCampaigns();
  const { 
    submissions, 
    isLoading: submissionsLoading,
    approveSubmission,
    rejectSubmission,
    requestChanges 
  } = useSubmissions({ campaignId });

  const [campaign, setCampaign] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "changes" | null>(null);
  const [approvedPrice, setApprovedPrice] = useState<number>(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!accountLoading && !isBrand) {
      navigate("/app");
    }
  }, [accountLoading, isBrand, navigate]);

  useEffect(() => {
    if (campaignId) {
      getCampaign(campaignId).then(setCampaign);
    }
  }, [campaignId, getCampaign]);

  const handleApprove = async () => {
    if (!selectedSubmission) return;
    const success = await approveSubmission(selectedSubmission.id, approvedPrice);
    if (success) {
      setActionModal(null);
      setSelectedSubmission(null);
      setApprovedPrice(0);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission) return;
    const success = await rejectSubmission(selectedSubmission.id, feedback);
    if (success) {
      setActionModal(null);
      setSelectedSubmission(null);
      setFeedback("");
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedSubmission || !feedback.trim()) {
      toast.error("Escribe el feedback para el creador");
      return;
    }
    const success = await requestChanges(selectedSubmission.id, feedback);
    if (success) {
      setActionModal(null);
      setSelectedSubmission(null);
      setFeedback("");
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (activeTab === "all") return true;
    return s.status === activeTab;
  });

  if (accountLoading || submissionsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!isBrand) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/brand/campaigns")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{campaign?.title || "Campaña"}</h1>
          <p className="text-muted-foreground">
            {submissions.length} envíos recibidos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="pending_review">
            Pendientes ({submissions.filter(s => s.status === "pending_review").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Aprobados ({submissions.filter(s => s.status === "approved").length})
          </TabsTrigger>
          <TabsTrigger value="changes_requested">
            Cambios ({submissions.filter(s => s.status === "changes_requested").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rechazados ({submissions.filter(s => s.status === "rejected").length})
          </TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredSubmissions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-lg font-medium">No hay envíos</p>
                <p className="text-sm text-muted-foreground">
                  Los creadores aún no han enviado videos para esta campaña
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSubmissions.map((submission) => (
                <SubmissionCard 
                  key={submission.id} 
                  submission={submission}
                  onApprove={() => {
                    setSelectedSubmission(submission);
                    setApprovedPrice(submission.proposed_price_mxn);
                    setActionModal("approve");
                  }}
                  onReject={() => {
                    setSelectedSubmission(submission);
                    setActionModal("reject");
                  }}
                  onRequestChanges={() => {
                    setSelectedSubmission(submission);
                    setActionModal("changes");
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Approve Modal */}
      <Dialog open={actionModal === "approve"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              El creador propuso: <strong>${selectedSubmission?.proposed_price_mxn} MXN</strong>
            </p>
            <div className="space-y-2">
              <Label>Precio aprobado (MXN)</Label>
              <Input
                type="number"
                value={approvedPrice}
                onChange={(e) => setApprovedPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={actionModal === "reject"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Video</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo del rechazo (opcional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explica al creador por qué no cumple con los requisitos..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              <X className="h-4 w-4 mr-2" />
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Modal */}
      <Dialog open={actionModal === "changes"} onOpenChange={() => setActionModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Cambios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>¿Qué cambios necesitas?</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe los cambios que el creador debe realizar..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestChanges}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface SubmissionCardProps {
  submission: Submission;
  onApprove: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}

const SubmissionCard = ({ submission, onApprove, onReject, onRequestChanges }: SubmissionCardProps) => {
  const status = statusConfig[submission.status] || statusConfig.pending_review;

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted relative">
        {submission.thumbnail_url ? (
          <img 
            src={submission.thumbnail_url} 
            alt="Thumbnail" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${status.color}`}>
          {status.label}
        </div>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {submission.profiles?.full_name || "Creador"}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {new Date(submission.created_at || "").toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-500" />
            <span>${submission.proposed_price_mxn} MXN</span>
          </div>
          {submission.duration_seconds && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{submission.duration_seconds}s</span>
            </div>
          )}
        </div>

        {submission.creator_note && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            "{submission.creator_note}"
          </p>
        )}

        {submission.video_url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.open(submission.video_url || "", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Video
          </Button>
        )}

        {submission.status === "pending_review" && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onApprove}
            >
              <Check className="h-4 w-4 mr-1" />
              Aprobar
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onRequestChanges}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={onReject}
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )}

        {submission.brand_feedback && (
          <div className="bg-muted p-2 rounded text-sm">
            <strong>Feedback:</strong> {submission.brand_feedback}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandSubmissions;
