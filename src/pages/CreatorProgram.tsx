import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useToast } from "@/hooks/use-toast";
import { hasCreatorAccess, validCreatorVideoUrl } from "@/lib/creator-access";
import { CheckCircle, Loader2 } from "lucide-react";
import { useCreatorLifetimeCapacity } from "@/hooks/useCreatorLifetimeCapacity";
import { CreatorLifetimeCapacity } from "@/components/creators/CreatorLifetimeCapacity";

export default function CreatorProgram() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<Tables<'creator_program_applications'> | null>(null);
  const [form, setForm] = useState({ full_name: '', whatsapp: '', tiktok_url: '' });
  const [videos, setVideos] = useState(['', '', '']);
  const [consent, setConsent] = useState(false);
  const { toast } = useToast();
  const capacityState = useCreatorLifetimeCapacity();
  const canSubmit = !capacityState.loading && !capacityState.error && capacityState.capacity?.is_open === true;

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email_confirmed_at && user.email) {
      setEmail(user.email);
      const { data, error } = await supabase.from('creator_program_applications').select('*').eq('email', user.email.toLowerCase()).maybeSingle();
      if (error) toast({ title: 'No pudimos cargar tu solicitud', description: 'Recarga la página o contáctanos.', variant: 'destructive' });
      setApplication(data);
      setForm({ full_name: data?.full_name || user.user_metadata?.full_name || '', whatsapp: data?.whatsapp || '', tiktok_url: data?.tiktok_url || '' });
      if (data?.video_urls?.length === 3) setVideos(data.video_urls);
    }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) {
      toast({ title: capacityState.capacity?.is_open === false ? 'Los accesos vitalicios se agotaron' : 'Verifica la disponibilidad', description: 'Solo podemos recibir nuevas solicitudes cuando hay lugares confirmados. Enviar videos no reserva un lugar.', variant: 'destructive' });
      await capacityState.refresh();
      return;
    }
    const urls = videos.map(v => v.trim());
    if (!consent || !urls.every(validCreatorVideoUrl) || new Set(urls.map(v => v.split(/[?#]/)[0])).size !== 3) {
      toast({ title: 'Revisa los tres videos', description: 'Incluye tres enlaces distintos a videos publicados y acepta el permiso de pauta.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_creator_lifetime_application', {
        p_full_name: form.full_name, p_whatsapp: form.whatsapp, p_tiktok_url: form.tiktok_url,
        p_video_urls: urls, p_ad_permission: consent,
      });
      if (error) throw error;
      await refresh();
      toast({ title: 'Tus tres videos están en revisión', description: 'Consulta aquí el resultado. La solicitud no reserva un lugar ni activa el acceso todavía.' });
    } catch (error) {
      toast({ title: 'No se pudo enviar', description: error instanceof Error ? error.message : (error as { message?: string })?.message || 'Inténtalo de nuevo.', variant: 'destructive' });
    } finally { await capacityState.refresh(); setSubmitting(false); }
  }

  const active = hasCreatorAccess(application);
  const lifetimeActive = active && application?.access_kind === "lifetime";
  return <main className="min-h-[100dvh] bg-background">
    <header className="border-b"><div className="mx-auto max-w-4xl flex items-center justify-between gap-3 px-4 py-4">
      <Link to="/"><BrandLogo tone="dark" size="md" /></Link>
      <Button variant="outline" size="sm" asChild><Link to={email ? '/affiliates' : '/login?redirect=%2Fcolaboraciones'}>{email ? 'Mi código y comisiones' : 'Iniciar sesión'}</Link></Button>
    </div></header>
    <section className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="text-center space-y-3"><p className="text-sm text-primary font-semibold">Programa de creadores</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{capacityState.capacity?.is_open === false ? 'Los primeros 100 lugares están completos.' : 'Muestra cómo decides qué grabar.'}</h1>
        <p className="text-muted-foreground">{capacityState.capacity?.is_open === false ? 'La oferta de acceso vitalicio por contenido está cerrada. Los accesos que ya aprobamos se mantienen mientras opere la plataforma.' : 'Comparte cómo eliges una referencia con ventas reportadas y adaptas el guion a tu producto. Publica tres videos originales sobre TokXray y autoriza su uso en anuncios durante 12 meses. Los primeros 100 creadores con videos y permiso aprobados reciben acceso personal sin cuota mientras opere la plataforma.'}</p>
      </div>
      <CreatorLifetimeCapacity state={capacityState} />
      {capacityState.capacity?.is_open !== false && <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {['1. Crea y verifica tu cuenta. Si fuiste invitado, solicita tu prueba antes de grabar.', '2. Enseña tu proceso en tres videos originales. Publícalos y envía sus enlaces.', '3. Revisamos videos y permiso de pauta. Si se aprueban y hay cupo, activamos tu acceso.'].map(step => <div key={step} className="rounded-xl border p-4">{step}</div>)}
      </div>}
      <p className="text-sm text-muted-foreground text-center">{capacityState.capacity?.is_open !== false && 'No necesitas tarjeta para solicitarlo. El acceso no depende de conseguir referidos ni de entregar videos adicionales. '}<Link className="text-primary underline" to="/programa-creadores">Conoce tus comisiones por recomendar TokXray.</Link></p>
      <Card className="max-w-xl mx-auto"><CardHeader><CardTitle>{lifetimeActive ? 'Tu acceso está activo' : application?.status === 'pending_review' ? 'Estamos revisando tus tres videos' : capacityState.capacity?.is_open === false ? 'Cupo vitalicio agotado' : 'Envía tus tres videos'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {active && !lifetimeActive && <div className="rounded-xl bg-primary/5 p-3 text-sm space-y-2"><p>Tu acceso de prueba está activo hasta {new Date(application!.subscription_ends_at!).toLocaleDateString('es-MX')}. Tu prueba no reserva acceso vitalicio; puedes solicitarlo si todavía hay lugares disponibles.</p><Link to="/app" className="text-primary underline">Elegir una referencia para mis videos</Link></div>}
          {loading ? <Loader2 className="animate-spin mx-auto" /> : !email && capacityState.capacity?.is_open === false ? <>
            <p className="text-sm text-muted-foreground">La oferta de 100 accesos vitalicios está cerrada. No grabes videos para solicitar este beneficio: ya no quedan lugares. Si tu acceso fue aprobado, se mantiene y puedes entrar con tu cuenta.</p>
            <Button className="w-full" asChild><Link to="/login?redirect=%2Fcolaboraciones">Entrar con mi cuenta existente</Link></Button>
            <Button className="w-full" variant="outline" asChild><Link to="/programa-creadores">Conocer el programa de afiliados</Link></Button>
          </> : !email ? <>
            <p className="text-sm text-muted-foreground">Usa el correo de tu cuenta. Primero confirma tu correo o entra con Google. Si fuiste invitado, comparte ese correo con nosotros para activar una prueba sin tarjeta antes de grabar.</p>
            <Button className="w-full" asChild><Link to="/register?redirect=%2Fcolaboraciones">Crear mi cuenta gratis</Link></Button>
            <Button className="w-full" variant="outline" asChild><Link to="/login?redirect=%2Fcolaboraciones">Ya tengo cuenta</Link></Button>
          </> : lifetimeActive ? <>
            <CheckCircle className="text-green-600 h-8 w-8" />
            <p>{application?.access_kind === 'lifetime' ? 'Acceso vitalicio aprobado. No requiere renovación de pago.' : `Tu acceso está activo hasta ${new Date(application!.subscription_ends_at!).toLocaleDateString('es-MX')}.`}</p>
            <p className="text-sm text-muted-foreground">Si ya tenías una suscripción de pago, este acceso no la cancela automáticamente. <Link className="text-primary underline" to="/settings">Cancela la renovación desde Configuración</Link> para evitar cargos futuros; conservarás tu acceso vitalicio.</p>
            <Button asChild className="w-full"><Link to="/app">Usar TokXray</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link to="/affiliates">Ver mi código y comisiones</Link></Button>
          </> : application?.status === 'approved' && !active ? <>
            <p>Tu solicitud fue aprobada. Activa el acceso con tu cuenta.</p>
            <Button asChild><Link to={`/canjear?code=${encodeURIComponent(application.grant_code || '')}`}>Activar acceso aprobado</Link></Button>
          </> : application?.status === 'pending_review' ? <>
            <p className="text-sm text-muted-foreground">La revisión es manual y esta solicitud no reserva lugar. El cupo se asigna al aprobar los tres videos y la autorización de pauta. Vuelve aquí para consultar el resultado o escríbenos si necesitas ayuda.</p>
            <Button variant="outline" onClick={() => { void refresh(); void capacityState.refresh(); }}>Actualizar estado</Button>
            <a className="block text-sm text-primary underline" href="https://wa.me/522213267653" target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>
          </> : capacityState.capacity?.is_open === false ? <>
            <p className="text-sm text-muted-foreground">Ya se otorgaron los 100 accesos vitalicios. No estamos recibiendo nuevas solicitudes para este cupo. Tu cuenta y cualquier acceso de prueba vigente se conservan.</p>
            <Button variant="outline" asChild><Link to="/affiliates">Ver mi código y comisiones</Link></Button>
          </> : <form onSubmit={submit} className="space-y-4">
            {application?.status === 'rejected' && <p className="text-sm text-destructive">Tu entrega necesita ajustes. Contáctanos y vuelve a enviar los tres enlaces.</p>}
            <p className="text-sm break-all">Cuenta: <strong>{email}</strong></p>
            <div className="space-y-1"><Label htmlFor="creator-name">Nombre completo</Label><Input id="creator-name" required minLength={2} maxLength={100} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="creator-whatsapp">WhatsApp</Label><Input id="creator-whatsapp" type="tel" required minLength={10} maxLength={20} value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="creator-profile">Tu perfil de TikTok</Label><Input id="creator-profile" type="url" required placeholder="https://www.tiktok.com/@tuusuario" value={form.tiktok_url} onChange={e => setForm({ ...form, tiktok_url: e.target.value })} /></div>
            {videos.map((video, index) => <div key={index} className="space-y-1"><Label htmlFor={`creator-video-${index}`}>Video publicado {index + 1}</Label><Input id={`creator-video-${index}`} type="url" required placeholder="Enlace de TikTok, Instagram o YouTube Shorts" value={video} onChange={e => setVideos(videos.map((v, i) => i === index ? e.target.value : v))} /></div>)}
            <label className="flex items-start gap-3 text-sm leading-relaxed"><input className="mt-1 h-4 w-4 shrink-0" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required /><span>Confirmo que los tres videos son originales y que tengo los derechos necesarios. Autorizo a TokXray a usarlos en anuncios y publicaciones durante 12 meses desde su aprobación, incluyendo mi imagen y voz. Esta autorización es independiente de mi acceso vitalicio.</span></label>
            <Button type="submit" disabled={submitting || !canSubmit} className="w-full">{submitting ? 'Enviando…' : 'Enviar mis videos a revisión'}</Button>
          </form>}
        </CardContent></Card>
    </section>
  </main>;
}
