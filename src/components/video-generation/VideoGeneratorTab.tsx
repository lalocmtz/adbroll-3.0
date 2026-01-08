import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, 
  Upload, 
  Loader2, 
  Sparkles, 
  Clock, 
  Coins, 
  Download,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { useVideoCredits } from '@/hooks/useVideoCredits';
import { useVideoGeneration } from '@/hooks/useVideoGeneration';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useBlurGateContext } from '@/contexts/BlurGateContext';

interface VideoGeneratorTabProps {
  videoId?: string;
  transcript?: string;
  productName?: string;
}

const DURATION_OPTIONS = [
  { value: '10', label: '10s', credits: 1 },
  { value: '15', label: '15s', credits: 1, recommended: true },
  { value: '25', label: '25s', credits: 2 },
];

export const VideoGeneratorTab = ({ 
  videoId, 
  transcript, 
  productName 
}: VideoGeneratorTabProps) => {
  const [duration, setDuration] = useState('15');
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  const { availableCredits, loading: creditsLoading, getCreditsForDuration, refetch: refetchCredits } = useVideoCredits();
  const { 
    status, 
    generatedVideo, 
    error, 
    generateVideo, 
    reset, 
    isGenerating, 
    isCompleted, 
    isFailed 
  } = useVideoGeneration();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { hasPaid } = useBlurGateContext();

  const creditsRequired = getCreditsForDuration(duration);
  const hasEnoughCredits = availableCredits >= creditsRequired;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast({
        title: 'Formato no válido',
        description: 'Solo se permiten imágenes JPG, PNG o WebP',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El tamaño máximo es 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setProductImageUrl(publicUrl);
      toast({
        title: '✓ Imagen subida',
        description: 'Lista para generar tu video',
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({
        title: 'Error al subir',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!productImageUrl) {
      toast({
        title: 'Sube una imagen',
        description: 'Necesitas subir la imagen de tu producto',
        variant: 'destructive',
      });
      return;
    }

    await generateVideo({
      videoId,
      productImageUrl,
      duration,
      customPrompt: customPrompt || undefined,
    });
  };

  const handleDownload = () => {
    if (generatedVideo?.videoUrl) {
      window.open(generatedVideo.videoUrl, '_blank');
    }
  };

  // Locked state for non-paid users
  if (!hasPaid) {
    return (
      <div className="p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Genera Videos con IA</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          Sube la imagen de tu producto y genera un video estilo TikTok usando Sora 2 Pro.
        </p>
        <Button onClick={() => navigate('/unlock')} className="rounded-xl">
          <Sparkles className="h-4 w-4 mr-2" />
          Desbloquear
        </Button>
      </div>
    );
  }

  // Completed state
  if (isCompleted && generatedVideo?.videoUrl) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 space-y-4"
      >
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-lg">¡Video generado!</h3>
          <p className="text-sm text-muted-foreground">Tu video está listo para descargar</p>
        </div>

        {/* Video Preview */}
        <div className="w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-black aspect-[9/16]">
          <video 
            src={generatedVideo.videoUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl"
            onClick={reset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generar otro
          </Button>
          <Button 
            className="flex-1 rounded-xl"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar MP4
          </Button>
        </div>
      </motion.div>
    );
  }

  // Failed state
  if (isFailed) {
    return (
      <div className="p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <X className="h-6 w-6 text-destructive" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Error en la generación</h3>
        <p className="text-sm text-muted-foreground mb-4">{error || 'Algo salió mal. Tu crédito fue reembolsado.'}</p>
        <Button onClick={reset} className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="p-6 text-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative h-16 w-16 mx-auto mb-4"
        >
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </motion.div>
        <h3 className="font-semibold text-lg mb-1">Generando tu video...</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Sora 2 Pro está creando tu video. Esto puede tomar 1-2 minutos.
        </p>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <p>💡 Tip: No cierres esta ventana</p>
        </div>
      </div>
    );
  }

  // Default: Form state
  return (
    <div className="p-4 space-y-4">
      {/* Credits Display */}
      <Card className="p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Créditos disponibles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">
              {creditsLoading ? '...' : availableCredits}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => navigate('/settings')}
            >
              Ver más
            </Button>
          </div>
        </div>
      </Card>

      {/* Product Image Upload */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
          Imagen de tu producto
        </Label>
        {productImageUrl ? (
          <div className="relative w-full aspect-square max-w-[150px] mx-auto rounded-xl overflow-hidden bg-muted">
            <img src={productImageUrl} alt="Producto" className="w-full h-full object-cover" />
            <button 
              onClick={() => setProductImageUrl(null)}
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <span className="text-sm text-muted-foreground">Click para subir imagen</span>
                <span className="text-xs text-muted-foreground/60">JPG, PNG, WebP (max 10MB)</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp"
              className="hidden" 
              onChange={handleImageUpload}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* Duration Selector */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground mb-2 block uppercase tracking-wider">
          Duración del video
        </Label>
        <RadioGroup 
          value={duration} 
          onValueChange={setDuration}
          className="grid grid-cols-3 gap-2"
        >
          {DURATION_OPTIONS.map(option => (
            <div key={option.value}>
              <RadioGroupItem value={option.value} id={`duration-${option.value}`} className="peer sr-only" />
              <Label 
                htmlFor={`duration-${option.value}`}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${
                  duration === option.value 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                }`}
              >
                <Clock className="h-4 w-4 mb-1" />
                <span className="font-semibold text-sm">{option.label}</span>
                <span className="text-[10px] opacity-80">{option.credits} crédito{option.credits > 1 ? 's' : ''}</span>
                {option.recommended && (
                  <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full bg-white/20">
                    Recomendado
                  </span>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Custom Prompt (optional) */}
      <div>
        <button 
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-xs text-primary hover:underline mb-2"
        >
          {showPrompt ? 'Ocultar prompt personalizado' : '+ Agregar prompt personalizado (opcional)'}
        </button>
        {showPrompt && (
          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe el estilo de video que quieres. Ej: 'Video moderno con movimientos de cámara suaves, iluminación cálida...'"
            className="text-sm"
            rows={3}
          />
        )}
      </div>

      {/* No credits warning */}
      {!hasEnoughCredits && !creditsLoading && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            Necesitas {creditsRequired} crédito{creditsRequired > 1 ? 's' : ''}. 
            <button 
              onClick={() => navigate('/pricing')}
              className="underline ml-1"
            >
              Obtener más
            </button>
          </span>
        </div>
      )}

      {/* Generate Button */}
      <Button 
        className="w-full h-11 rounded-xl gap-2"
        onClick={handleGenerate}
        disabled={!productImageUrl || !hasEnoughCredits || isUploading}
      >
        <Video className="h-4 w-4" />
        Generar Video ({creditsRequired} crédito{creditsRequired > 1 ? 's' : ''})
      </Button>
    </div>
  );
};