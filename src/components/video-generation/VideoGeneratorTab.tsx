import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Video, 
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
  FileText,
  Wand2,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Mic,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  variantScript?: string; // AI-improved variant from analysis
}

const DURATION_OPTIONS = [
  { value: '10', label: '10s', credits: 1 },
  { value: '15', label: '15s', credits: 1, recommended: true },
  { value: '25', label: '25s', credits: 2 },
];

const VOICE_OPTIONS = [
  { value: 'matilda', label: 'Matilda', desc: 'Femenina cálida' },
  { value: 'jessica', label: 'Jessica', desc: 'Femenina energética' },
  { value: 'sarah', label: 'Sarah', desc: 'Femenina profesional' },
  { value: 'charlie', label: 'Charlie', desc: 'Masculina casual' },
  { value: 'george', label: 'George', desc: 'Masculina confiada' },
  { value: 'brian', label: 'Brian', desc: 'Masculina profunda' },
];

export const VideoGeneratorTab = ({ 
  videoId, 
  transcript, 
  productName,
  variantScript,
}: VideoGeneratorTabProps) => {
  const [duration, setDuration] = useState('15');
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  
  // Script selection state
  const [scriptType, setScriptType] = useState<'original' | 'variant'>('variant');
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  
  // UGC Image generation state
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [ugcImageUrl, setUgcImageUrl] = useState<string | null>(null);
  
  // Audio generation state
  const [generateAudio, setGenerateAudio] = useState(true);
  const [voiceType, setVoiceType] = useState('matilda');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const { availableCredits, loading: creditsLoading, getCreditsForDuration } = useVideoCredits();
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

  const creditsRequired = getCreditsForDuration(duration);
  const hasEnoughCredits = availableCredits >= creditsRequired;
  
  // Get the selected script content
  const selectedScript = scriptType === 'original' ? transcript : (variantScript || transcript);
  const hasVariant = !!variantScript && variantScript !== transcript;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      // Reset UGC image when product image changes
      setUgcImageUrl(null);
      
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

  const handleGenerateUGCImage = async () => {
    if (!productName && !productImageUrl) {
      toast({
        title: 'Falta información',
        description: 'Sube una imagen de producto primero',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-ugc-image', {
        body: {
          productName: productName || 'producto',
          productImageUrl: productImageUrl,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setUgcImageUrl(data.imageUrl);
      toast({
        title: '✓ Imagen generada',
        description: 'Imagen de creador lista para animar',
      });
    } catch (err: any) {
      console.error('UGC image generation error:', err);
      toast({
        title: 'Error generando imagen',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!selectedScript) {
      toast({
        title: 'Sin guion',
        description: 'Necesitas un guion para generar audio',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            text: selectedScript,
            voiceType,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error generando audio');
      }

      const data = await response.json();
      const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      setAudioUrl(audioDataUrl);
      
      toast({
        title: '✓ Audio generado',
        description: 'Voz en español lista para tu video',
      });
    } catch (err: any) {
      console.error('Audio generation error:', err);
      toast({
        title: 'Error generando audio',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerate = async () => {
    // We can use either the UGC image or the product image
    const imageToUse = ugcImageUrl || productImageUrl;
    
    if (!imageToUse) {
      toast({
        title: 'Sube una imagen',
        description: 'Necesitas subir la imagen de tu producto',
        variant: 'destructive',
      });
      return;
    }

    // Generate audio first if enabled and not already generated
    if (generateAudio && selectedScript && !audioUrl) {
      await handleGenerateAudio();
    }

    await generateVideo({
      videoId,
      productImageUrl: imageToUse,
      duration,
      customPrompt: customPrompt || undefined,
      scriptType,
      scriptContent: selectedScript,
      ugcImageUrl: ugcImageUrl || undefined,
    });
  };

  const handleDownload = () => {
    if (generatedVideo?.videoUrl) {
      window.open(generatedVideo.videoUrl, '_blank');
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'audio-ugc.mp3';
      link.click();
    }
  };

  const handleReset = () => {
    reset();
    setUgcImageUrl(null);
    setAudioUrl(null);
  };

  const { hasPaid, openPaywall } = useBlurGateContext();

  // Locked state for non-paid users
  if (!hasPaid) {
    return (
      <div className="p-6 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Genera Videos con IA</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
          Clona guiones virales y genera videos UGC orgánicos con Sora 2.
        </p>
        <Button onClick={() => openPaywall('Generador de Videos IA')} className="rounded-xl">
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
          <h3 className="font-semibold text-lg">¡Video UGC generado!</h3>
          <p className="text-sm text-muted-foreground">Tu video orgánico está listo</p>
        </div>

        <div className="w-full max-w-[200px] mx-auto rounded-xl overflow-hidden bg-black aspect-[9/16]">
          <video 
            src={generatedVideo.videoUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
        </div>

        {/* Audio download if generated */}
        {audioUrl && (
          <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Audio generado</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-green-700 hover:bg-green-100 dark:text-green-400"
                onClick={handleDownloadAudio}
              >
                <Download className="h-3 w-3 mr-1" />
                MP3
              </Button>
            </div>
            <audio src={audioUrl} controls className="w-full h-8 mt-2" />
            <p className="text-[10px] text-green-600 dark:text-green-500 mt-1">
              💡 Combina el audio con tu video en CapCut o tu editor favorito
            </p>
          </Card>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl"
            onClick={handleReset}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generar otro
          </Button>
          <Button 
            className="flex-1 rounded-xl"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
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
        <Button onClick={handleReset} className="rounded-xl">
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
        <h3 className="font-semibold text-lg mb-1">Generando video UGC...</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Creando tu video orgánico estilo TikTok. ~1-2 minutos.
        </p>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
          <p>💡 Tu video se verá como un creador real</p>
          <p>📱 Formato vertical 9:16 para TikTok</p>
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
            <span className="text-sm font-medium">Créditos</span>
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
              +
            </Button>
          </div>
        </div>
      </Card>

      {/* Script Type Selector (only show if we have a transcript) */}
      {transcript && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Guion para el video
          </Label>
          <RadioGroup 
            value={scriptType} 
            onValueChange={(v) => setScriptType(v as 'original' | 'variant')}
            className="grid grid-cols-2 gap-2"
          >
            <div>
              <RadioGroupItem value="original" id="script-original" className="peer sr-only" />
              <Label 
                htmlFor="script-original"
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  scriptType === 'original' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                }`}
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Original</div>
                  <div className="text-[10px] opacity-80">Guion exacto</div>
                </div>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="variant" id="script-variant" className="peer sr-only" />
              <Label 
                htmlFor="script-variant"
                className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  scriptType === 'variant' 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                } ${!hasVariant ? 'opacity-50' : ''}`}
              >
                <Wand2 className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium text-sm">Mejorado</div>
                  <div className="text-[10px] opacity-80">Variante IA</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
          
          {/* Script Preview Toggle */}
          <button 
            onClick={() => setShowScriptPreview(!showScriptPreview)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {showScriptPreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showScriptPreview ? 'Ocultar guion' : 'Ver guion seleccionado'}
          </button>
          
          <AnimatePresence>
            {showScriptPreview && selectedScript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <ScrollArea className="h-24 rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {selectedScript}
                  </p>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Product Image Upload */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Imagen de tu producto
        </Label>
        {productImageUrl ? (
          <div className="flex gap-3">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
              <img src={productImageUrl} alt="Producto" className="w-full h-full object-cover" />
              <button 
                onClick={() => {
                  setProductImageUrl(null);
                  setUgcImageUrl(null);
                }}
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            
            {/* UGC Image Generation */}
            <div className="flex-1 space-y-2">
              {ugcImageUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted">
                  <img src={ugcImageUrl} alt="Creador UGC" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded-full">
                    ✓ UGC
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-20 rounded-xl flex flex-col gap-1"
                  onClick={handleGenerateUGCImage}
                  disabled={isGeneratingImage}
                >
                  {isGeneratingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 text-primary" />
                      <span className="text-[10px]">Generar creador</span>
                    </>
                  )}
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                {ugcImageUrl ? 'Imagen de creador lista' : 'Opcional: crear imagen de creador'}
              </p>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-all">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <span className="text-sm text-muted-foreground">Subir imagen de producto</span>
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

      {/* Audio Generation Section */}
      {selectedScript && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Mic className="h-3 w-3" />
              Voz con IA (ElevenLabs)
            </Label>
            <Switch
              checked={generateAudio}
              onCheckedChange={setGenerateAudio}
            />
          </div>
          
          <AnimatePresence>
            {generateAudio && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3"
              >
                {/* Voice Selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Voz:</Label>
                  <Select value={voiceType} onValueChange={setVoiceType}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map(voice => (
                        <SelectItem key={voice.value} value={voice.value}>
                          <span className="font-medium">{voice.label}</span>
                          <span className="text-muted-foreground ml-1">- {voice.desc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Audio Preview/Generate */}
                {audioUrl ? (
                  <Card className="p-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">Audio listo</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs ml-auto"
                        onClick={() => setAudioUrl(null)}
                      >
                        Regenerar
                      </Button>
                    </div>
                    <audio src={audioUrl} controls className="w-full h-8" />
                  </Card>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio || !selectedScript}
                  >
                    {isGeneratingAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando voz...
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        Pre-generar audio (opcional)
                      </>
                    )}
                  </Button>
                )}
                
                <p className="text-[10px] text-muted-foreground">
                  {audioUrl 
                    ? '✓ Audio en español listo. Se generará junto con el video.' 
                    : 'El audio se genera automáticamente al crear el video.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Custom Prompt (optional) */}
      <div>
        <button 
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-xs text-primary hover:underline mb-2"
        >
          {showPrompt ? 'Ocultar prompt personalizado' : '+ Prompt personalizado (opcional)'}
        </button>
        <AnimatePresence>
          {showPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe el estilo de video que quieres. Ej: 'Creador entusiasta hablando del producto, gestos naturales...'"
                className="text-sm"
                rows={3}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
        className="w-full h-12 rounded-xl gap-2 text-base"
        onClick={handleGenerate}
        disabled={!productImageUrl || !hasEnoughCredits || isUploading}
      >
        <Video className="h-5 w-5" />
        Generar Video UGC ({creditsRequired} crédito{creditsRequired > 1 ? 's' : ''})
      </Button>
      
      <p className="text-[10px] text-center text-muted-foreground">
        Video vertical 9:16 • Estilo TikTok orgánico • ~1-2 min
      </p>
    </div>
  );
};
