import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Megaphone,
  Users,
  Play,
  Pause,
  Trash2,
  Eye,
  ExternalLink,
  CheckCircle,
  Clock,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/hooks/useCampaigns";
import type { CampaignApplication } from "@/hooks/useCampaignApplications";

interface BrandProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  verified: boolean;
}

const CampaignManager = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<CampaignApplication[]>([]);
  const [filterStatus, setFilterStatus] = useState("all");

  // Form state
  const [form, setForm] = useState({
    brand_name: "",
    brand_logo_url: "",
    title: "",
    product_name: "",
    product_url: "",
    product_image_url: "",
    brief: "",
    rules: "",
    objective: "awareness",
    min_payment_mxn: 200,
    max_payment_mxn: 700,
    requires_spark_code: true,
    video_duration_min: 15,
    video_duration_max: 60,
  });

  useEffect(() => {
    fetchCampaigns();
    fetchBrands();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brand_profiles (
            company_name,
            logo_url,
            verified
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as Campaign[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      toast.error("Error al cargar campañas");
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brand_profiles")
        .select("id, company_name, logo_url, verified")
        .order("company_name");

      if (error) throw error;
      setBrands((data || []) as BrandProfile[]);
    } catch (err) {
      console.error("Error fetching brands:", err);
    }
  };

  const fetchApplications = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from("campaign_applications")
        .select(`
          *,
          creator_directory (
            id,
            full_name,
            tiktok_username,
            avatar_url,
            email,
            whatsapp,
            niche,
            content_type,
            tiktok_url
          )
        `)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications((data || []) as CampaignApplication[]);
    } catch (err) {
      console.error("Error fetching applications:", err);
    }
  };

  const createCampaign = async () => {
    if (!form.brand_name || !form.title || !form.product_name || !form.brief) {
      toast.error("Completa los campos requeridos");
      return;
    }

    try {
      const { error } = await supabase.from("campaigns").insert({
        brand_name: form.brand_name,
        brand_logo_url: form.brand_logo_url || null,
        brand_id: null,
        title: form.title,
        product_name: form.product_name,
        product_url: form.product_url || null,
        product_image_url: form.product_image_url || null,
        brief: form.brief,
        rules: form.rules || null,
        objective: form.objective,
        min_payment_mxn: form.min_payment_mxn,
        max_payment_mxn: form.max_payment_mxn,
        requires_spark_code: form.requires_spark_code,
        video_duration_min: form.video_duration_min,
        video_duration_max: form.video_duration_max,
        status: "draft",
      });

      if (error) throw error;

      toast.success("Campaña creada exitosamente");
      setShowCreateModal(false);
      resetForm();
      fetchCampaigns();
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error("Error al crear campaña");
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", campaignId);

      if (error) throw error;

      toast.success(`Campaña ${status === "active" ? "publicada" : status === "paused" ? "pausada" : "actualizada"}`);
      fetchCampaigns();
    } catch (err) {
      console.error("Error updating campaign:", err);
      toast.error("Error al actualizar");
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm("¿Eliminar esta campaña? Esta acción no se puede deshacer.")) return;

    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);

      if (error) throw error;

      toast.success("Campaña eliminada");
      fetchCampaigns();
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Error al eliminar");
    }
  };

  const updateApplicationStatus = async (applicationId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("campaign_applications")
        .update({ status })
        .eq("id", applicationId);

      if (error) throw error;

      toast.success("Estado actualizado");
      if (selectedCampaign) {
        fetchApplications(selectedCampaign.id);
      }
    } catch (err) {
      console.error("Error updating application:", err);
      toast.error("Error al actualizar");
    }
  };

  const resetForm = () => {
    setForm({
      brand_name: "",
      brand_logo_url: "",
      title: "",
      product_name: "",
      product_url: "",
      product_image_url: "",
      brief: "",
      rules: "",
      objective: "awareness",
      min_payment_mxn: 200,
      max_payment_mxn: 700,
      requires_spark_code: true,
      video_duration_min: 15,
      video_duration_max: 60,
    });
  };

  const openApplications = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    fetchApplications(campaign.id);
    setShowApplicationsModal(true);
  };

  const filteredCampaigns = campaigns.filter((c) =>
    filterStatus === "all" ? true : c.status === filterStatus
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-600 border-green-500/20",
      draft: "bg-gray-500/10 text-gray-600 border-gray-500/20",
      paused: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    };
    return <Badge variant="outline" className={styles[status] || ""}>{status}</Badge>;
  };

  const getAppStatusBadge = (status: string) => {
    const config: Record<string, { icon: React.ReactNode; className: string }> = {
      applied: { icon: <Clock className="h-3 w-3" />, className: "bg-blue-500/10 text-blue-600" },
      contacted: { icon: <MessageCircle className="h-3 w-3" />, className: "bg-yellow-500/10 text-yellow-600" },
      accepted: { icon: <CheckCircle className="h-3 w-3" />, className: "bg-green-500/10 text-green-600" },
      rejected: { icon: <XCircle className="h-3 w-3" />, className: "bg-red-500/10 text-red-600" },
    };
    const { icon, className } = config[status] || config.applied;
    return (
      <Badge variant="outline" className={className}>
        {icon}
        <span className="ml-1">{status}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Gestión de Campañas</h2>
            <p className="text-sm text-muted-foreground">
              {campaigns.length} campañas totales
            </p>
          </div>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Campaña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre de la Marca *</Label>
                  <Input
                    value={form.brand_name}
                    onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                    placeholder="Ej: Skinglow, Feelink"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Logo de la Marca (URL)</Label>
                  <Input
                    value={form.brand_logo_url}
                    onChange={(e) => setForm({ ...form, brand_logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <Label>Título de Campaña *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ej: Lanzamiento Serum Vitamina C"
                  />
                </div>

                <div>
                  <Label>Nombre del Producto *</Label>
                  <Input
                    value={form.product_name}
                    onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                    placeholder="Ej: Serum Vitamina C 30ml"
                  />
                </div>

                <div>
                  <Label>URL del Producto</Label>
                  <Input
                    value={form.product_url}
                    onChange={(e) => setForm({ ...form, product_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <Label>URL Imagen del Producto</Label>
                  <Input
                    value={form.product_image_url}
                    onChange={(e) => setForm({ ...form, product_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="col-span-2">
                  <Label>Brief / Descripción *</Label>
                  <Textarea
                    value={form.brief}
                    onChange={(e) => setForm({ ...form, brief: e.target.value })}
                    placeholder="Describe qué tipo de video buscas, tono, estilo..."
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Reglas / Requisitos</Label>
                  <Textarea
                    value={form.rules}
                    onChange={(e) => setForm({ ...form, rules: e.target.value })}
                    placeholder="Requisitos específicos, hashtags, menciones..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Objetivo</Label>
                  <Select value={form.objective} onValueChange={(v) => setForm({ ...form, objective: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="awareness">Awareness</SelectItem>
                      <SelectItem value="sales">Ventas</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.requires_spark_code}
                    onCheckedChange={(v) => setForm({ ...form, requires_spark_code: v })}
                  />
                  <Label>Requiere Spark Code</Label>
                </div>

                <div>
                  <Label>Pago Mínimo (MXN)</Label>
                  <Input
                    type="number"
                    value={form.min_payment_mxn}
                    onChange={(e) => setForm({ ...form, min_payment_mxn: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Pago Máximo (MXN)</Label>
                  <Input
                    type="number"
                    value={form.max_payment_mxn}
                    onChange={(e) => setForm({ ...form, max_payment_mxn: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Duración Mín (seg)</Label>
                  <Input
                    type="number"
                    value={form.video_duration_min}
                    onChange={(e) => setForm({ ...form, video_duration_min: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>Duración Máx (seg)</Label>
                  <Input
                    type="number"
                    value={form.video_duration_max}
                    onChange={(e) => setForm({ ...form, video_duration_max: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={createCampaign}>
                  Crear Campaña
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "active", "draft", "paused"].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(status)}
          >
            {status === "all" ? "Todas" : status}
          </Button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filteredCampaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No hay campañas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {campaign.product_image_url ? (
                      <img
                        src={campaign.product_image_url}
                        alt={campaign.product_name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                        <Megaphone className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{campaign.title}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(campaign as any).brand_name || campaign.brand_profiles?.company_name || "Sin marca"} · {campaign.product_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${campaign.min_payment_mxn} - ${campaign.max_payment_mxn} MXN
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openApplications(campaign)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {campaign.submissions_count || 0}
                    </Button>

                    {campaign.status === "draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, "active")}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Publicar
                      </Button>
                    )}

                    {campaign.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, "paused")}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pausar
                      </Button>
                    )}

                    {campaign.status === "paused" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign.id, "active")}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Reactivar
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCampaign(campaign.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Applications Modal */}
      <Dialog open={showApplicationsModal} onOpenChange={setShowApplicationsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Aplicaciones: {selectedCampaign?.title}
            </DialogTitle>
          </DialogHeader>
          
          {applications.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay aplicaciones aún</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Creador</TableHead>
                  <TableHead>TikTok</TableHead>
                  <TableHead>Nicho</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {app.creator_directory?.avatar_url ? (
                          <img
                            src={app.creator_directory.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted" />
                        )}
                        <div>
                          <p className="font-medium">{app.creator_directory?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{app.creator_directory?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.creator_directory?.tiktok_url ? (
                        <a
                          href={app.creator_directory.tiktok_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          @{app.creator_directory?.tiktok_username}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        `@${app.creator_directory?.tiktok_username}`
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {app.creator_directory?.niche?.slice(0, 2).map((n) => (
                          <Badge key={n} variant="secondary" className="text-xs">
                            {n}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getAppStatusBadge(app.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={app.status}
                          onValueChange={(v) => updateApplicationStatus(app.id, v)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="applied">Aplicado</SelectItem>
                            <SelectItem value="contacted">Contactado</SelectItem>
                            <SelectItem value="accepted">Aceptado</SelectItem>
                            <SelectItem value="rejected">Rechazado</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {app.creator_directory?.whatsapp && (
                          <a
                            href={`https://wa.me/${app.creator_directory.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManager;
