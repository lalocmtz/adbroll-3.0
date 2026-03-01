import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Check, Clock, Send, RefreshCw, Users, CreditCard, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RegisteredUser {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

interface ActiveSubscriber {
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: string;
  renew_at: string | null;
  created_at: string | null;
}

interface EmailLead {
  id: string;
  email: string;
  referral_code: string | null;
  source: string | null;
  converted_at: string | null;
  created_at: string;
}

export const EmailLeadsList = () => {
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [subscribers, setSubscribers] = useState<ActiveSubscriber[]>([]);
  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadRegisteredUsers(), loadSubscribers(), loadLeads()]);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisteredUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Deduplicate by email
      const seen = new Set<string>();
      const unique = (data || []).filter((u) => {
        if (!u.email || seen.has(u.email)) return false;
        seen.add(u.email);
        return true;
      });
      setRegisteredUsers(unique);
    } catch (error) {
      console.error("Error loading registered users:", error);
    }
  };

  const loadSubscribers = async () => {
    try {
      const { data: subs, error: subsError } = await supabase
        .from("subscriptions")
        .select("user_id, status, renew_at, created_at")
        .order("created_at", { ascending: false });

      if (subsError) throw subsError;

      if (!subs || subs.length === 0) {
        setSubscribers([]);
        return;
      }

      // Get profile info for each subscriber
      const userIds = [...new Set(subs.map((s) => s.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, { email: p.email, full_name: p.full_name }])
      );

      // Deduplicate by user_id (keep most recent)
      const seenUsers = new Set<string>();
      const merged: ActiveSubscriber[] = [];
      for (const sub of subs) {
        if (seenUsers.has(sub.user_id)) continue;
        seenUsers.add(sub.user_id);
        const profile = profileMap.get(sub.user_id);
        merged.push({
          user_id: sub.user_id,
          email: profile?.email || null,
          full_name: profile?.full_name || null,
          status: sub.status,
          renew_at: sub.renew_at,
          created_at: sub.created_at,
        });
      }

      setSubscribers(merged);
    } catch (error) {
      console.error("Error loading subscribers:", error);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("email_captures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Deduplicate by email, keep most recent
      const seen = new Map<string, EmailLead>();
      for (const lead of data || []) {
        if (!seen.has(lead.email)) {
          seen.set(lead.email, lead);
        }
      }
      setLeads(Array.from(seen.values()));
    } catch (error) {
      console.error("Error loading leads:", error);
    }
  };

  const sendFollowUpEmail = async (lead: EmailLead) => {
    setSendingEmail(lead.id);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: lead.email,
          subject: "¡No te pierdas Adbroll Pro! 🚀",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #F31260;">¡Hola!</h2>
              <p>Notamos que te interesaste en Adbroll pero no completaste tu suscripción.</p>
              <p>Como recordatorio, con Adbroll Pro obtienes:</p>
              <ul>
                <li>✅ Acceso a todos los videos virales de TikTok Shop</li>
                <li>✅ Análisis de scripts con IA</li>
                <li>✅ Generación de variantes de hooks</li>
                <li>✅ Oportunidades de productos con alto margen</li>
              </ul>
              <p><strong>Por solo $25 USD/mes</strong></p>
              <a href="https://adbroll.lovable.app/pricing" style="display: inline-block; background: #F31260; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                Activar Adbroll Pro
              </a>
              <p style="margin-top: 24px; color: #666; font-size: 12px;">
                ¿Preguntas? Responde a este email.
              </p>
            </div>
          `,
        },
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: `Seguimiento enviado a ${lead.email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSendingEmail(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Directorio de Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const activeSubscribers = subscribers.filter((s) => s.status === "active");
  const pendingLeads = leads.filter((l) => !l.converted_at);
  const convertedLeads = leads.filter((l) => l.converted_at);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Directorio de Emails ({registeredUsers.length} registrados)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadAllData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="registered" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-4">
            <TabsTrigger value="registered" className="text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 mr-1" />
              Registrados ({registeredUsers.length})
            </TabsTrigger>
            <TabsTrigger value="subscribers" className="text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              Suscriptores ({activeSubscribers.length})
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-xs sm:text-sm">
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Leads ({leads.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Registered Users */}
          <TabsContent value="registered">
            {registeredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin usuarios registrados aún</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {registeredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.email || "Sin email"}
                      </p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {user.full_name}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {user.created_at
                        ? format(new Date(user.created_at), "dd MMM yyyy", { locale: es })
                        : "--"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Active Subscribers */}
          <TabsContent value="subscribers">
            {subscribers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin suscriptores aún</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {subscribers.map((sub) => (
                  <div
                    key={sub.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      sub.status === "active"
                        ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {sub.email || "Sin email"}
                      </p>
                      {sub.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {sub.full_name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge
                        className={
                          sub.status === "active"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-muted-foreground"
                        }
                      >
                        {sub.status === "active" ? "Activa" : sub.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {sub.renew_at
                          ? `Renueva: ${format(new Date(sub.renew_at), "dd MMM yyyy", { locale: es })}`
                          : "Renueva: --"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Email Leads (deduplicated) */}
          <TabsContent value="leads">
            <div className="flex gap-2 text-xs mb-3">
              <Badge variant="outline" className="bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400">
                <Clock className="h-3 w-3 mr-1" />
                {pendingLeads.length} pendientes
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                {convertedLeads.length} convertidos
              </Badge>
            </div>

            {leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Sin email leads aún</p>
                <p className="text-xs">Los leads aparecerán cuando los usuarios inicien checkout</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      lead.converted_at
                        ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-orange-50/50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{lead.email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(lead.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                        </span>
                        {lead.referral_code && (
                          <Badge variant="secondary" className="text-xs">
                            ref: {lead.referral_code}
                          </Badge>
                        )}
                        {lead.source && (
                          <Badge variant="outline" className="text-xs">
                            {lead.source}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {lead.converted_at ? (
                        <Badge className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Convertido
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => sendFollowUpEmail(lead)}
                          disabled={sendingEmail === lead.id}
                        >
                          {sendingEmail === lead.id ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Seguimiento
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
