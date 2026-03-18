import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Users, Phone, Mail, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface CreatorLead {
  id: string;
  name: string;
  age: number;
  whatsapp: string;
  email: string;
  tiktok_username: string | null;
  instagram_username: string | null;
  content_preferences: string[] | null;
  comfortable_on_camera: boolean | null;
  campaign_tag: string;
  user_id: string | null;
  created_at: string;
}

const CreatorLeadsDashboard = () => {
  const [leads, setLeads] = useState<CreatorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [campaigns, setCampaigns] = useState<string[]>([]);

  const fetchLeads = async () => {
    setLoading(true);
    let query = supabase
      .from("creator_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (campaignFilter !== "all") {
      query = query.eq("campaign_tag", campaignFilter);
    }

    const { data, error } = await query;
    if (!error && data) {
      setLeads(data);
      // Extract unique campaign tags
      const tags = [...new Set(data.map((l) => l.campaign_tag))];
      if (campaigns.length === 0) setCampaigns(tags);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, [campaignFilter]);

  // Initial load of all campaign tags
  useEffect(() => {
    const loadTags = async () => {
      const { data } = await supabase
        .from("creator_leads")
        .select("campaign_tag");
      if (data) {
        setCampaigns([...new Set(data.map((d) => d.campaign_tag))]);
      }
    };
    loadTags();
  }, []);

  const totalLeads = leads.length;
  const withAccount = leads.filter((l) => l.user_id).length;
  const comfortableOnCamera = leads.filter((l) => l.comfortable_on_camera).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total leads</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Con cuenta</span>
            </div>
            <p className="text-2xl font-bold mt-1">{withAccount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Cómodos en cámara</span>
            </div>
            <p className="text-2xl font-bold mt-1">{comfortableOnCamera}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Tasa conversión</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totalLeads > 0 ? Math.round((withAccount / totalLeads) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Campaña" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las campañas</SelectItem>
              {campaigns.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Registros ({totalLeads})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay registros aún.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>TikTok</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>Contenido</TableHead>
                    <TableHead>Cámara</TableHead>
                    <TableHead>Campaña</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium whitespace-nowrap">{lead.name}</TableCell>
                      <TableCell>{lead.age}</TableCell>
                      <TableCell>
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {lead.whatsapp}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell className="text-xs">{lead.email}</TableCell>
                      <TableCell>
                        {lead.tiktok_username ? (
                          <a
                            href={`https://tiktok.com/@${lead.tiktok_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{lead.tiktok_username}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.instagram_username ? (
                          <a
                            href={`https://instagram.com/${lead.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            @{lead.instagram_username}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(lead.content_preferences || []).map((pref) => (
                            <Badge key={pref} variant="secondary" className="text-[10px]">
                              {pref}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.comfortable_on_camera ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Sí</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.campaign_tag}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.user_id ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">Registrado</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Solo lead</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(lead.created_at), "d MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorLeadsDashboard;
