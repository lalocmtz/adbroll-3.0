import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type TargetLanguage = 'es' | 'en';
interface Props { text: string; locale?: 'es' | 'en' }

/** Translation is a separate view: the source transcript and variants remain intact. */
export function ScriptTranslation({ text, locale = 'es' }: Props) {
  const [target, setTarget] = useState<TargetLanguage | null>(null);
  const [translations, setTranslations] = useState<Partial<Record<TargetLanguage, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedTarget, setFailedTarget] = useState<TargetLanguage | null>(null);
  const [copied, setCopied] = useState(false);
  const request = useRef(0);
  const busy = useRef(false);
  const t = (es: string, en: string) => locale === 'es' ? es : en;

  useEffect(() => {
    request.current++;
    busy.current = false;
    setTarget(null);
    setTranslations({});
    setLoading(false);
    setError(null);
    setFailedTarget(null);
    setCopied(false);
    return () => { request.current++; };
  }, [text]);

  const showOriginal = () => {
    request.current++;
    busy.current = false;
    setTarget(null);
    setLoading(false);
    setError(null);
    setFailedTarget(null);
    setCopied(false);
  };

  const translate = async (language: TargetLanguage) => {
    if (busy.current) return;
    setError(null);
    setFailedTarget(null);
    setCopied(false);
    if (!text.trim() || text.length > 30_000) {
      setError(t('El guion debe tener entre 1 y 30,000 caracteres para traducirlo.', 'The script must contain between 1 and 30,000 characters to translate.'));
      return;
    }
    setTarget(language);
    const id = ++request.current;
    if (translations[language]) return;
    busy.current = true;
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('translate-script', { body: { text, targetLanguage: language } });
      if (id !== request.current) return;
      if (invokeError) {
        const detail = await invokeError.context?.json?.().catch(() => null);
        throw new Error(detail?.error || t('No se pudo traducir el guion. Vuelve a intentarlo.', 'Could not translate the script. Try again.'));
      }
      if (typeof data?.translation !== 'string' || !data.translation.trim()) {
        throw new Error(data?.error || t('La traducción llegó vacía. Vuelve a intentarlo.', 'The translation was empty. Try again.'));
      }
      setTranslations(previous => ({ ...previous, [language]: data.translation.trim() }));
    } catch (cause: unknown) {
      if (id !== request.current) return;
      setError(cause instanceof Error ? cause.message : t('No se pudo traducir el guion.', 'Could not translate the script.'));
      setFailedTarget(language);
    } finally {
      if (id === request.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  };

  const translatedText = target ? translations[target] : null;
  const copyTranslation = async () => {
    if (!translatedText) return;
    const id = request.current;
    try {
      await navigator.clipboard.writeText(translatedText);
      if (id === request.current) setCopied(true);
    } catch {
      if (id === request.current) setError(t('No se pudo copiar. Selecciona el texto de la traducción para copiarlo.', 'Could not copy. Select the translated text to copy it.'));
    }
  };

  return <section aria-label={t('Traducir guion', 'Translate script')} className="mt-3 space-y-3 rounded-xl border border-border/60 p-3">
    <div className="flex items-center gap-2 text-sm font-medium"><Languages className="h-4 w-4" />{t('Traduce el guion', 'Translate the script')}</div>
    <p className="text-xs text-muted-foreground">{t('Conserva el sentido del original en otro idioma. Revisa el texto antes de grabar.', 'Keep the meaning of the original in another language. Review the text before recording.')}</p>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={loading} onClick={() => translate('en')}>{t('Traducir al inglés', 'Translate to English')}</Button>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => translate('es')}>{t('Traducir al español', 'Translate to Spanish')}</Button>
      {(target || error) && <Button size="sm" variant="ghost" onClick={showOriginal}>{t('Volver al original', 'Back to original')}</Button>}
    </div>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('Traduciendo el guion…', 'Translating the script…')}</p>}
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <p>{error}</p>
      {failedTarget && <Button className="mt-2" variant="outline" size="sm" onClick={() => translate(failedTarget)}>{t('Reintentar traducción', 'Retry translation')}</Button>}
    </div>}
    {translatedText && !loading && <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-medium">{target === 'en' ? t('Traducción al inglés', 'English translation') : t('Traducción al español', 'Spanish translation')}</h4>
        <Button size="sm" variant="ghost" onClick={copyTranslation}>{copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}{copied ? t('Traducción copiada', 'Translation copied') : t('Copiar traducción', 'Copy translation')}</Button>
      </div>
      <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-3 text-sm leading-relaxed">{translatedText}</p>
    </div>}
  </section>;
}
