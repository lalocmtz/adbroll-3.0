import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Heart, ExternalLink, Copy, Check, Loader2, FileText, Brain, Wand2, X, Save, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useBlurGateContext } from '@/contexts/BlurGateContext';
import { CatalogVideoPlayer } from '@/components/CatalogVideoPlayer';
import { ScriptTranslation } from '@/components/ScriptTranslation';
import { ScriptTranscript, VideoInsights, validScriptSegments } from '@/components/VideoInsights';
interface GeneratedVariant {
  hook: string;
  body: string;
  cta: string;
  strategy_note?: string;
}
interface Video {
  id: string;
  video_url: string;
  video_mp4_url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  creator_name?: string | null;
  creator_handle?: string | null;
  product_name?: string | null;
  product_id?: string | null;
  rank?: number | null;
  views?: number | null;
  sales?: number | null;
  revenue_mxn?: number | null;
  // NOTE: premium columns (transcript / analysis_json / variants_json) are NO
  // longer fetched into the video object from the card list — they are revoked
  // at the DB level. The script is loaded on-demand via the get_video_script RPC.
  transcript?: string | null;
  analysis_json?: any;
  variants_json?: any;
  processing_status?: string | null;
  product?: {
    producto_nombre?: string | null;
    commission?: number | null;
    price?: number | null;
    revenue_30d?: number | null;
    producto_url?: string | null;
    imagen_url?: string | null;
  } | null;
}
interface VideoAnalysisModalOriginalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video;
}
const formatNumber = (num: number | null | undefined): string => {
  if (num == null || !Number.isFinite(num)) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString('es-MX');
};
const formatCurrency = (num: number | null | undefined): string => {
  if (num == null || !Number.isFinite(num)) return '—';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};
const VideoAnalysisModalOriginal = ({
  isOpen,
  onClose,
  video
}: VideoAnalysisModalOriginalProps) => {
  const [activeTab, setActiveTab] = useState('script');
  const [measuredMedia, setMeasuredMedia] = useState<{ source: string; seconds?: number } | null>(null);
  const durationSeconds = measuredMedia?.source === video.video_mp4_url ? measuredMedia.seconds : undefined;
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [processingError, setProcessingError] = useState<{ source: 'load'; message: string } | null>(null);
  const requestVersion = useRef(0);
  const scriptRequest = useRef(0);
  const [transcript, setTranscript] = useState(video.transcript || '');
  const [analysis, setAnalysis] = useState<any>(video.analysis_json || null);
  const [variants, setVariants] = useState<any>(video.variants_json || null);
  const [scriptLocked, setScriptLocked] = useState(false);
  const [isLoadingScript, setIsLoadingScript] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    hasPaid,
    openPaywall
  } = useBlurGateContext();

  // Variant generator controls
  const [variantCount, setVariantCount] = useState<number>(2);
  const [changeLevel, setChangeLevel] = useState<'light' | 'medium' | 'aggressive'>('medium');
  const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariant[]>([]);
  const [variantError, setVariantError] = useState<string | null>(null);
  const variantBusy = useRef(false);

  // Calculate earnings - unified formula matching VideoCardOriginal.
  // GLOSARIO: revenue_mxn es GMV ("Ventas reportadas"). La ganancia del creador
  // solo se estima si el producto tiene commission REAL (escala 0-100, igual
  // que process-kalodata-products). Sin commission no se muestra nada.
  const hasCommission = video.product?.commission != null && video.product.commission > 0;
  const commissionRate = video.product?.commission || 0;
  const totalCreatorEarnings = hasCommission ? (video.revenue_mxn || 0) * (commissionRate / 100) : 0;

  // Handle locked tabs for visitors
  const handleTabChange = (value: string) => {
    if (!hasPaid) {
      openPaywall('Guion y análisis del video');
      return;
    }
    setActiveTab(value);
  };
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data
      } = await supabase.from('favorites_videos').select('id').eq('user_id', user.id).eq('video_url', video.video_url).maybeSingle();
      setIsFavorite(!!data);
    };
    checkFavoriteStatus();
  }, [video.video_url]);

  // SECURITY: the script (transcript + variants) is no longer present on the
  // video object — premium columns are revoked at the DB level. We fetch it via
  // the gated `get_video_script` RPC, which enforces access server-side:
  //   - paid user            -> transcript + variants
  //   - free user, rank <= 5 -> transcript only (variants null)
  //   - free user, rank > 5  -> locked = true
  const loadScript = async () => {
    if (!video.id) return;
    const version = requestVersion.current;
    const scriptVersion = ++scriptRequest.current;
    const isCurrent = () => version === requestVersion.current && scriptVersion === scriptRequest.current;
    setIsLoadingScript(true);
    setProcessingError(null);
    try {
      const { data, error } = await supabase.rpc('get_video_script', { _video_id: video.id });
      if (!isCurrent()) return;
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('No se pudo recuperar el guion de este video. Vuelve a intentarlo.');
      if (row.locked) {
        setScriptLocked(true);
        setTranscript('');
        setVariants(null);
        return;
      }
      setScriptLocked(false);
      setTranscript(row.transcript || '');
      setVariants(row.variants_json ?? null);
      if (hasPaid) {
        const saved = await supabase.rpc('get_video_analysis', { _video_id: video.id });
        if (!isCurrent()) return;
        if (saved.error) throw saved.error;
        setAnalysis(saved.data);
      }
    } catch (error: any) {
      if (!isCurrent()) return;
      console.error('Error loading script via RPC:', error);
      setProcessingError({ source: 'load', message: 'No se pudo cargar el guion guardado. Revisa tu conexión y vuelve a intentarlo.' });
    } finally {
      if (isCurrent()) setIsLoadingScript(false);
    }
  };

  // Invalidate pending work when access, video or modal visibility changes.
  useEffect(() => {
    requestVersion.current++;
    variantBusy.current = false;
    setIsGeneratingVariants(false);
    setVariantError(null);
    setActiveTab('script');
    setProcessingError(null);
    setTranscript('');
    setAnalysis(null);
    setVariants(null);
    setGeneratedVariants([]);
    setScriptLocked(false);
    if (isOpen) loadScript();
    return () => {
      requestVersion.current++;

    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, video.id, hasPaid]);

  const handleToggleFavorite = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para guardar favoritos"
      });
      return;
    }
    try {
      if (isFavorite) {
        const {
          error
        } = await supabase.from("favorites_videos").delete().eq("user_id", user.id).eq("video_url", video.video_url);
        if (error) throw error;
        setIsFavorite(false);
        toast({
          title: "✓ Eliminado de favoritos"
        });
      } else {
        const {
          error
        } = await supabase.from("favorites_videos").insert([{
          user_id: user.id,
          video_url: video.video_url,
          video_data: video as any
        }]);
        if (error) throw error;
        setIsFavorite(true);
        toast({
          title: "✓ Guardado en favoritos"
        });
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleCopy = async (text: string, field: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      toast({ title: 'No se pudo copiar', description: 'Selecciona el guion y cópialo manualmente.', variant: 'destructive' });
      return;
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: '✓ Copiado al portapapeles'
    });
  };
  const CopyButton = ({
    text,
    field,
    variant = 'ghost' as 'ghost' | 'outline'
  }: {
    text: string;
    field: string;
    variant?: 'ghost' | 'outline';
  }) => <Button size="sm" variant={variant} aria-label="Copiar guion" className="h-10 gap-1.5 text-xs" onClick={() => handleCopy(text, field)}>
      {copiedField === field ? <>
          <Check className="h-3.5 w-3.5 text-success" />
          <span className="inline">Copiado</span>
        </> : <>
          <Copy className="h-3.5 w-3.5" />
          <span className="inline">Copiar</span>
        </>}
    </Button>;

  // Creating variants is explicit; opening a catalog video only reads saved data.
  const generateVariants = async () => {
    if (!hasPaid) { openPaywall('Variantes de guion'); return; }
    if (!transcript.trim() || variantBusy.current) return;
    const version = requestVersion.current;
    variantBusy.current = true;
    setIsGeneratingVariants(true);
    setVariantError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-script-variants', {
        body: { transcript, analysis, product: video.product, variantCount, changeLevel },
      });
      if (version !== requestVersion.current) return;
      if (error) {
        const detail = await error.context?.json?.().catch(() => null);
        throw new Error(detail?.error || 'No se pudieron generar las variantes. Inténtalo de nuevo.');
      }
      if (!Array.isArray(data?.variants) || !data.variants.length) throw new Error(data?.error || 'No se recibieron variantes. Inténtalo de nuevo.');
      setGeneratedVariants(data.variants);
    } catch (error: any) {
      if (version === requestVersion.current) setVariantError(error.message || 'No se pudieron generar las variantes.');
    } finally {
      if (version === requestVersion.current) { variantBusy.current = false; setIsGeneratingVariants(false); }
    }
  };

  // Copy entire variant to clipboard
  const copyVariant = (variant: GeneratedVariant, index: number) => {
    const fullText = `Primeros segundos:\n${variant.hook}\n\nCuerpo:\n${variant.body}\n\nInvitación a actuar:\n${variant.cta}`;
    handleCopy(fullText, `full-variant-${index}`);
  };

  // Save variant to favorites
  const saveVariantToFavorites = async (variant: GeneratedVariant, index: number) => {
    setIsSavingVariant(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Inicia sesión",
          description: "Debes iniciar sesión para guardar guiones"
        });
        return;
      }

      // Generate a unique script ID and save directly to favorites_scripts
      const scriptId = crypto.randomUUID();
      const fullScript = `Primeros segundos:\n${variant.hook}\n\nCuerpo:\n${variant.body}\n\nInvitación a actuar:\n${variant.cta}`;

      const {
        error: favError
      } = await supabase.from('favorites_scripts').insert({
        user_id: user.id,
        script_id: scriptId,
        script_data: {
          content: fullScript,
          hook: variant.hook,
          body: variant.body,
          cta: variant.cta,
          strategy_note: variant.strategy_note,
          video_title: video.title || 'Video sin título',
          video_id: video.id,
          video_url: video.video_url,
          created_from: 'variant_generator',
          change_level: changeLevel
        }
      });
      if (favError) throw favError;
      toast({
        title: '✅ Guion guardado',
        description: 'Puedes verlo en la sección de Favoritos'
      });
    } catch (error: any) {
      console.error('Error saving variant:', error);
      toast({
        title: 'Error al guardar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSavingVariant(false);
    }
  };
  const timedSegments = durationSeconds && durationSeconds > 0
    ? validScriptSegments(analysis?.segments, durationSeconds)
    : [];
  const cachedVariants: GeneratedVariant[] = Array.isArray(variants?.hooks)
    ? variants.hooks.filter((hook: unknown): hook is string => typeof hook === 'string').map((hook: string) => ({ hook, body: variants.body_variant || analysis?.body || '', cta: analysis?.cta || '' }))
    : [];
  const shownVariants = generatedVariants.length ? generatedVariants : cachedVariants;
  const loadingNotice = <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando guion…</p>;
  const preparedNotice = <div className="rounded-xl bg-muted/40 p-4 text-sm"><h3 className="font-medium">Guion en preparación</h3><p className="mt-1 text-pretty text-muted-foreground">Estamos preparando esta referencia. Mientras tanto, puedes ver el video original o explorar otro guion del catálogo.</p><Button variant="outline" size="sm" className="mt-3" onClick={onClose}>Explorar otros videos</Button></div>;
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-0 overflow-hidden rounded-none p-0 md:h-[90dvh] md:max-w-5xl md:rounded-2xl [&>button]:hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-t-2 border-t-brand-pink px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1"><DialogTitle className="line-clamp-1 text-balance text-sm font-semibold md:text-base">{video.title || 'Guion del video'}</DialogTitle><DialogDescription className="mt-1 truncate text-xs">@{video.creator_handle || video.creator_name || 'creador'} · TikTok Shop México</DialogDescription></div>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label={isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'} onClick={handleToggleFavorite}><Heart className={isFavorite ? 'size-4 fill-current text-primary' : 'size-4'} /></Button>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Cerrar video" onClick={onClose}><X className="size-5" /></Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto md:grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:overflow-hidden">
        <aside className="min-w-0 space-y-3 border-b p-3 md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
          {video.video_mp4_url ? <CatalogVideoPlayer key={video.id} src={video.video_mp4_url} poster={video.thumbnail_url} title={`Reproducir video de ${video.creator_handle || video.creator_name || 'creador'}`} active={isOpen} onDurationChange={seconds => setMeasuredMedia({ source: video.video_mp4_url!, seconds })} /> : <p className="rounded-xl bg-muted p-4 text-sm">Video en preparación.</p>}
          <a className="inline-flex min-h-10 items-center gap-1.5 text-xs text-muted-foreground underline" href={video.video_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" />Abrir original en TikTok</a>
          <dl className="grid grid-cols-3 gap-2 rounded-xl border border-brand-cyan-200 bg-brand-cyan-50 p-3 text-xs text-brand-ink">
            {[["Ventas reportadas", formatCurrency(video.revenue_mxn)], ["Unidades", formatNumber(video.sales)], ["Vistas", formatNumber(video.views)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}
          </dl>
          {hasCommission && video.revenue_mxn != null && <p className="text-xs text-muted-foreground">Comisión estimada: <span className="font-medium tabular-nums">{formatCurrency(totalCreatorEarnings)}</span> · {commissionRate}% del producto</p>}
          {(video.product || video.product_name) && <button className="flex min-h-12 w-full items-center gap-2 rounded-xl border p-2 text-left" onClick={() => video.product_id ? navigate(`/videos/product/${video.product_id}`) : navigate('/products')}>
            {video.product?.imagen_url && <img src={video.product.imagen_url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />}<span className="min-w-0 text-xs"><span className="block text-muted-foreground">Ver producto relacionado</span><span className="line-clamp-2 font-medium">{video.product?.producto_nombre || video.product_name}</span></span><ExternalLink className="ml-auto size-4 shrink-0" />
          </button>}
        </aside>
        <main className="min-w-0 md:flex md:min-h-0 md:flex-col">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
            <div className="sticky top-0 z-10 border-b bg-background px-3 py-2 md:static md:px-4"><TabsList className="grid h-11 w-full grid-cols-3">
              <TabsTrigger value="script" className="gap-1.5"><FileText className="size-4" />Guion</TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1.5">{!hasPaid ? <Lock className="size-3" /> : <Brain className="size-4" />}Análisis</TabsTrigger>
              <TabsTrigger value="variants" className="gap-1.5">{!hasPaid ? <Lock className="size-3" /> : <Wand2 className="size-4" />}Variantes</TabsTrigger>
            </TabsList></div>
            <div className="min-h-0 flex-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:overflow-y-auto md:p-4">
              {processingError && <div role="alert" className="mb-3 rounded-xl border border-destructive/30 p-3 text-sm"><p>{processingError.message}</p><Button variant="outline" size="sm" className="mt-2" disabled={isLoadingScript} onClick={loadScript}>Reintentar carga</Button></div>}
              <TabsContent value="script" className="m-0 space-y-3">
                {isLoadingScript ? loadingNotice : scriptLocked ? <div className="rounded-xl border p-4 text-sm"><h3 className="font-medium">Descubre cómo este video vende</h3><p className="mt-1 text-muted-foreground">Accede al guion completo, estudia su gancho y adapta la estructura a tu producto.</p><Button className="mt-3" onClick={() => openPaywall('Guion del video')}>Desbloquear guion y análisis</Button></div> : transcript ? <>
                  <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{timedSegments.length ? "Guion por segundos" : "Guion original"}</h3><CopyButton text={transcript} field="transcript" variant="outline" /></div>
                  <ScriptTranscript transcript={transcript} segments={timedSegments} durationSeconds={durationSeconds} />
                  {hasPaid && <ScriptTranslation text={transcript} />}
                </> : !processingError && preparedNotice}
              </TabsContent>
              <TabsContent value="analysis" className="m-0 space-y-3">
                {isLoadingScript ? loadingNotice : analysis ? <VideoInsights analysis={analysis} segments={timedSegments} durationSeconds={durationSeconds} onExploreVariants={transcript ? () => handleTabChange('variants') : undefined} /> : <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">El análisis de esta referencia está en preparación. Puedes consultar el guion disponible.</p>}
              </TabsContent>
              <TabsContent value="variants" className="m-0 space-y-4">
                {!hasPaid ? <Button onClick={() => openPaywall('Variantes de guion')}>Ver acceso Pro</Button> : !transcript ? preparedNotice : <>
                  <div className="rounded-2xl border border-brand-pink-200 bg-brand-pink-50 p-4 text-brand-ink space-y-3"><div><h3 className="text-sm font-semibold">Adapta este guion a tu estilo</h3><p className="mt-1 text-xs text-muted-foreground">Prueba otros primeros segundos, otra presentación y un cierre distinto. Tú decides qué grabar.</p></div>
                    <div className="flex flex-wrap items-center gap-3"><Label htmlFor="variant-count">Cantidad</Label><select id="variant-count" value={variantCount} onChange={event => setVariantCount(Number(event.target.value))} className="h-10 rounded-lg border bg-background px-3 text-sm">{[1, 2, 3].map(value => <option key={value} value={value}>{value}</option>)}</select></div>
                    <RadioGroup value={changeLevel} onValueChange={value => setChangeLevel(value as typeof changeLevel)} className="flex flex-wrap gap-3" aria-label="Nivel de cambio">{[['light', 'Suave'], ['medium', 'Medio'], ['aggressive', 'Amplio']].map(([value, label]) => <label key={value} className="flex min-h-10 items-center gap-2 text-sm"><RadioGroupItem value={value} />{label}</label>)}</RadioGroup>
                    <Button className="h-11 w-full bg-brand-pink-600 text-white hover:bg-brand-pink-700" onClick={generateVariants} disabled={isGeneratingVariants}>{isGeneratingVariants ? <><Loader2 className="mr-2 size-4 animate-spin" />Preparando variantes…</> : 'Generar variantes'}</Button>
                    {variantError && <p role="alert" className="text-sm text-destructive">{variantError}</p>}
                  </div>
                  {shownVariants.map((variant, index) => <Card key={index} className="space-y-3 border-t-2 border-t-brand-cyan p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Variante {index + 1}</h4><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => copyVariant(variant, index)}><Copy className="mr-1 size-3.5" />Copiar</Button><Button size="sm" variant="ghost" onClick={() => saveVariantToFavorites(variant, index)} disabled={isSavingVariant}><Save className="mr-1 size-3.5" />Guardar</Button></div></div>{[["Inicio", variant.hook], ["Cuerpo", variant.body], ["Cierre", variant.cta]].map(([label, value]) => <div key={label}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p></div>)}{variant.strategy_note && <p className="border-t pt-2 text-xs text-muted-foreground">{variant.strategy_note}</p>}</Card>)}
                </>}
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </DialogContent>
  </Dialog>;
};
export default VideoAnalysisModalOriginal;
