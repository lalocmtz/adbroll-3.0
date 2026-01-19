import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UGCAssets {
  id: string;
  script: string;
  image_1_url: string | null;
  image_2_url: string | null;
  video_1_url: string | null;
  video_2_url: string | null;
  audio_url: string | null;
  status: string;
  error_message: string | null;
}

export type UGCStep = 
  | 'idle'
  | 'uploading'
  | 'generating_script'
  | 'generating_images'
  | 'generating_videos'
  | 'generating_audio'
  | 'completed'
  | 'error';

const STEP_LABELS: Record<UGCStep, { es: string; en: string }> = {
  idle: { es: 'Listo para generar', en: 'Ready to generate' },
  uploading: { es: 'Subiendo imagen...', en: 'Uploading image...' },
  generating_script: { es: 'Escribiendo guión de venta...', en: 'Writing sales script...' },
  generating_images: { es: 'Creando tu modelo virtual...', en: 'Creating your virtual model...' },
  generating_videos: { es: 'Animando videos...', en: 'Animating videos...' },
  generating_audio: { es: 'Generando voz...', en: 'Generating voice...' },
  completed: { es: '¡Listo!', en: 'Done!' },
  error: { es: 'Error', en: 'Error' }
};

export function useUGCGeneration() {
  const { toast } = useToast();
  const [step, setStep] = useState<UGCStep>('idle');
  const [progress, setProgress] = useState(0);
  const [assets, setAssets] = useState<UGCAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const getStepLabel = (currentStep: UGCStep, language: 'es' | 'en' = 'es') => {
    return STEP_LABELS[currentStep]?.[language] || '';
  };

  const getProgressPercent = (currentStep: UGCStep): number => {
    switch (currentStep) {
      case 'idle': return 0;
      case 'uploading': return 10;
      case 'generating_script': return 20;
      case 'generating_images': return 40;
      case 'generating_videos': return 60;
      case 'generating_audio': return 80;
      case 'completed': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  const reset = useCallback(() => {
    setStep('idle');
    setProgress(0);
    setAssets(null);
    setError(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollForCompletion = useCallback(async (generationId: string) => {
    const poll = async () => {
      try {
        // Use raw SQL query since types aren't updated yet
        const { data, error: fetchError } = await supabase
          .from('ugc_generations' as any)
          .select('*')
          .eq('id', generationId)
          .single();

        if (fetchError) {
          console.error('Polling error:', fetchError);
          return;
        }

        if (data) {
          const gen = data as unknown as UGCAssets;
          setAssets(gen);

          if (gen.status === 'completed') {
            setStep('completed');
            setProgress(100);
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            toast({ title: '✓ ¡Tu video UGC está listo!' });
          } else if (gen.status === 'failed') {
            setStep('error');
            setError(gen.error_message || 'Generation failed');
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    };

    // Poll every 5 seconds
    pollingRef.current = setInterval(poll, 5000);
    // Also poll immediately
    await poll();
  }, [toast]);

  const generate = useCallback(async (
    productImage: File,
    productDescription: string,
    avatarType: string
  ) => {
    try {
      reset();
      setStep('uploading');
      setProgress(10);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Debes iniciar sesión para generar videos UGC');
      }

      // 1. Upload product image
      const timestamp = Date.now();
      const fileName = `ugc/products/${user.id}_${timestamp}_${productImage.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(fileName, productImage, {
          contentType: productImage.type,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('generated-content')
        .getPublicUrl(fileName);

      const productImageUrl = urlData.publicUrl;
      console.log('Product image uploaded:', productImageUrl);

      // 2. Create generation record
      const { data: generation, error: insertError } = await supabase
        .from('ugc_generations' as any)
        .insert({
          user_id: user.id,
          product_image_url: productImageUrl,
          product_description: productDescription,
          avatar_type: avatarType,
          status: 'processing',
          current_step: 1
        })
        .select()
        .single();

      if (insertError || !generation) {
        throw new Error(`Error al crear generación: ${insertError?.message}`);
      }

      const generationId = (generation as any).id;
      console.log('Generation created:', generationId);

      // 3. Generate script and prompts
      setStep('generating_script');
      setProgress(20);

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-ugc-assets', {
        body: {
          productDescription,
          avatarType,
          productImageUrl
        }
      });

      if (scriptError || !scriptData) {
        throw new Error(`Error al generar guión: ${scriptError?.message || 'Unknown error'}`);
      }

      console.log('Script generated:', scriptData);

      // Update generation with script
      await supabase
        .from('ugc_generations' as any)
        .update({
          script: scriptData.script,
          prompt_scene_1: scriptData.prompt_scene_1,
          prompt_scene_2: scriptData.prompt_scene_2,
          current_step: 2
        })
        .eq('id', generationId);

      // 4. Generate images
      setStep('generating_images');
      setProgress(40);

      const { data: imagesData, error: imagesError } = await supabase.functions.invoke('generate-ugc-images', {
        body: {
          prompt_scene_1: scriptData.prompt_scene_1,
          prompt_scene_2: scriptData.prompt_scene_2,
          generationId
        }
      });

      if (imagesError || !imagesData) {
        throw new Error(`Error al generar imágenes: ${imagesError?.message || 'Unknown error'}`);
      }

      console.log('Images generated:', imagesData);

      // Update generation with images
      await supabase
        .from('ugc_generations' as any)
        .update({
          image_1_url: imagesData.image_1_url,
          image_2_url: imagesData.image_2_url,
          current_step: 3
        })
        .eq('id', generationId);

      // 5. Start video generation (async with callbacks)
      setStep('generating_videos');
      setProgress(60);

      const { data: videosData, error: videosError } = await supabase.functions.invoke('generate-ugc-videos', {
        body: {
          image_1_url: imagesData.image_1_url,
          image_2_url: imagesData.image_2_url,
          generationId
        }
      });

      if (videosError) {
        console.error('Video generation error:', videosError);
        // Don't fail completely - videos are async
      }

      console.log('Videos queued:', videosData);

      // 6. Generate audio (can run in parallel)
      setStep('generating_audio');
      setProgress(80);

      const { data: audioData, error: audioError } = await supabase.functions.invoke('generate-ugc-audio', {
        body: {
          script: scriptData.script,
          generationId
        }
      });

      if (audioError) {
        console.error('Audio generation error:', audioError);
      } else {
        console.log('Audio generated:', audioData);
      }

      // Start polling for video completion
      setStep('generating_videos');
      await pollForCompletion(generationId);

      // Set initial assets with what we have so far
      setAssets({
        id: generationId,
        script: scriptData.script,
        image_1_url: imagesData.image_1_url,
        image_2_url: imagesData.image_2_url,
        video_1_url: null,
        video_2_url: null,
        audio_url: audioData?.audio_url || null,
        status: 'processing_videos',
        error_message: null
      });

    } catch (err: any) {
      console.error('UGC generation error:', err);
      setStep('error');
      setError(err.message || 'Error desconocido');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo generar el video UGC',
        variant: 'destructive'
      });
    }
  }, [reset, pollForCompletion, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  return {
    step,
    progress,
    assets,
    error,
    isGenerating: step !== 'idle' && step !== 'completed' && step !== 'error',
    generate,
    reset,
    getStepLabel,
    getProgressPercent
  };
}
