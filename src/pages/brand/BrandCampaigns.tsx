import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAccountType } from "@/hooks/useAccountType";
import { useCampaigns, CreateCampaignInput, Campaign } from "@/hooks/useCampaigns";
import { 
  Plus, 
  Megaphone, 
  Eye, 
  Pause, 
  Play,
  Trash2,
  Users,
  DollarSign,
  Calendar
} from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  active: { label: "Activa", variant: "default" },
  paused: { label: "Pausada", variant: "outline" },
  completed: { label: "Completada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const BrandCampaigns = () => {
  const navigate = useNavigate();
  const { isBrand, brandProfile, isLoading: accountLoading } = useAccountType();
  const { 
    campaigns, 
    isLoading, 
    createCampaign, 
    publishCampaign, 
    pauseCampaign,
    deleteCampaign 
  } = useCampaigns({ brandId: brandProfile?.id });
  
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<CreateCampaignInput>({
    title: "",
    product_name: "",
    product_url: "",
    brief: "",
    rules: "",
    objective: "awareness",
    min_payment_mxn: 200,
    max_payment_mxn: 700,
    video_duration_min: 15,
    video_duration_max: 60,
  });

  useEffect(() => {
    if (!accountLoading && !isBrand) {
      navigate("/app");
    }
  }, [accountLoading, isBrand, navigate]);

  const handleCreateCampaign = async () => {
    if (!brandProfile?.id) return;
    
    if (!formData.title || !formData.product_name || !formData.brief) {
      toast.error("Completa los campos requeridos");
      return;
    }

    const campaign = await createCampaign(brandProfile.id, formData);
    if (campaign) {
      setIsCreateOpen(false);
      setFormData({
        title: "",
        product_name: "",
        product_url: "",
        brief: "",
        rules: "",
        objective: "awareness",
        min_payment_mxn: 200,
        max_payment_mxn: 700,
        video_duration_min: 15,
        video_duration_max: 60,
      });
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === "all") return true;
    return c.status === activeTab;
  });

  if (accountLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Campañas</h1>
          <p className="text-muted-foreground">
            Gestiona tus campañas de UGC
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Campaña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título de la campaña *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Lanzamiento Serum Vitamina C"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name">Nombre del producto *</Label>
                  <Input
                    id="product_name"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Ej: Serum Vitamina C 30ml"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product_url">URL del producto (opcional)</Label>
                <Input
                  id="product_url"
                  value={formData.product_url || ""}
                  onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                  placeholder="https://tiktokshop.com/..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brief">Brief creativo *</Label>
                <Textarea
                  id="brief"
                  value={formData.brief}
                  onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
                  placeholder="Describe qué tipo de contenido esperas, tono, mensajes clave..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">Reglas y requisitos (opcional)</Label>
                <Textarea
                  id="rules"
                  value={formData.rules || ""}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  placeholder="Requisitos específicos, restricciones, palabras a evitar..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pago mínimo (MXN)</Label>
                  <Input
                    type="number"
                    value={formData.min_payment_mxn}
                    onChange={(e) => setFormData({ ...formData, min_payment_mxn: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pago máximo (MXN)</Label>
                  <Input
                    type="number"
                    value={formData.max_payment_mxn}
                    onChange={(e) => setFormData({ ...formData, max_payment_mxn: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duración mínima (segundos)</Label>
                  <Input
                    type="number"
                    value={formData.video_duration_min}
                    onChange={(e) => setFormData({ ...formData, video_duration_min: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duración máxima (segundos)</Label>
                  <Input
                    type="number"
                    value={formData.video_duration_max}
                    onChange={(e) => setFormData({ ...formData, video_duration_max: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateCampaign}>
                  Crear Campaña
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Todas ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="active">
            Activas ({campaigns.filter(c => c.status === "active").length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Borradores ({campaigns.filter(c => c.status === "draft").length})
          </TabsTrigger>
          <TabsTrigger value="paused">
            Pausadas ({campaigns.filter(c => c.status === "paused").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay campañas</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Crea tu primera campaña para empezar a recibir videos
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear campaña
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard 
                  key={campaign.id} 
                  campaign={campaign}
                  onViewSubmissions={() => navigate(`/brand/campaigns/${campaign.id}/submissions`)}
                  onPublish={() => publishCampaign(campaign.id)}
                  onPause={() => pauseCampaign(campaign.id)}
                  onDelete={() => deleteCampaign(campaign.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface CampaignCardProps {
  campaign: Campaign;
  onViewSubmissions: () => void;
  onPublish: () => void;
  onPause: () => void;
  onDelete: () => void;
}

const CampaignCard = ({ campaign, onViewSubmissions, onPublish, onPause, onDelete }: CampaignCardProps) => {
  const status = statusConfig[campaign.status] || statusConfig.draft;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate" title={campaign.title}>
              {campaign.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {campaign.product_name}
            </p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{campaign.submissions_count || 0} envíos</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span>${campaign.min_payment_mxn}-{campaign.max_payment_mxn}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {campaign.brief}
        </p>

        <div className="flex items-center gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={onViewSubmissions}
          >
            <Eye className="h-4 w-4 mr-1" />
            Ver envíos
          </Button>
          
          {campaign.status === "draft" && (
            <Button variant="outline" size="sm" onClick={onPublish}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === "active" && (
            <Button variant="outline" size="sm" onClick={onPause}>
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button variant="outline" size="sm" onClick={onPublish}>
              <Play className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BrandCampaigns;
