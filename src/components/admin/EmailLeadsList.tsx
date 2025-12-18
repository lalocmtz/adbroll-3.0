import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, Clock, Send, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EmailLead {
  id: string;
  email: string;
  referral_code: string | null;
  source: string | null;
  converted_at: string | null;
  created_at: string;
}

export const EmailLeadsList = () => {
  const [leads, setLeads] = useState<EmailLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("email_captures")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
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
              <p><strong>Por solo $14.99 USD/mes</strong></p>
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
          <CardTitle className="text-lg">Emails Capturados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const pendingLeads = leads.filter(l => !l.converted_at);
  const convertedLeads = leads.filter(l => l.converted_at);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Emails Capturados ({leads.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadLeads}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
        <div className="flex gap-2 text-xs">
          <Badge variant="outline" className="bg-orange-50 text-orange-600">
            <Clock className="h-3 w-3 mr-1" />
            {pendingLeads.length} pendientes
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-600">
            <Check className="h-3 w-3 mr-1" />
            {convertedLeads.length} convertidos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Sin emails capturados aún</p>
            <p className="text-xs">Los leads aparecerán cuando los usuarios inicien checkout</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  lead.converted_at
                    ? "bg-green-50/50 border-green-200"
                    : "bg-orange-50/50 border-orange-200"
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
      </CardContent>
    </Card>
  );
};
