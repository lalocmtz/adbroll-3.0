import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBlurGateContext } from '@/contexts/BlurGateContext';
import { useSubscription } from '@/hooks/useSubscription';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Video, 
  Download, 
  Trash2, 
  Clock, 
  Check, 
  X, 
  Loader2,
  Sparkles,
  Lock,
  ExternalLink,
  RefreshCw,
  Crown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface GeneratedVideo {
  id: string;
  source_video_id: string | null;
  prompt_used: string | null;
  product_image_url: string | null;
  video_url: string | null;
  duration_seconds: number;
  status: string;
  error_message: string | null;
  cost_usd: number;
  created_at: string;
}

const MyGeneratedVideos = () => {
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const { isLoggedIn, hasPaid } = useBlurGateContext();
  const { isPremium, canGenerateVideos, planTier } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('generated_videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'es' ? '¿Eliminar este video?' : 'Delete this video?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('generated_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVideos(prev => prev.filter(v => v.id !== id));
      toast({
        title: language === 'es' ? '✓ Video eliminado' : '✓ Video deleted',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleCheckStatus = async (video: GeneratedVideo) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-video-status', {
        body: { generatedVideoId: video.id },
      });

      if (error) throw error;

      if (data.status !== video.status) {
        await fetchVideos(); // Refresh all videos
        toast({
          title: data.status === 'completed' 
            ? (language === 'es' ? '✅ Video listo' : '✅ Video ready')
            : (language === 'es' ? 'Estado actualizado' : 'Status updated'),
        });
      } else {
        toast({
          title: language === 'es' ? 'Sin cambios' : 'No changes',
          description: language === 'es' ? 'El video aún está procesando' : 'Video is still processing',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'd MMM, HH:mm', {
      locale: language === 'es' ? es : enUS,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
            <Check className="h-3 w-3 mr-1" />
            {language === 'es' ? 'Listo' : 'Ready'}
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {language === 'es' ? 'Procesando' : 'Processing'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
            <X className="h-3 w-3 mr-1" />
            {language === 'es' ? 'Error' : 'Failed'}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Not logged in
  if (!isLoggedIn) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-8 text-center max-w-md">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {language === 'es' ? 'Inicia sesión' : 'Sign in'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === 'es' 
                ? 'Necesitas iniciar sesión para ver tus videos generados'
                : 'You need to sign in to see your generated videos'}
            </p>
            <Button onClick={() => navigate('/login')}>
              {language === 'es' ? 'Iniciar sesión' : 'Sign in'}
            </Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Pro user without Premium - upsell
  if (isLoggedIn && planTier === 'pro' && !canGenerateVideos) {
    return (
      <DashboardLayout>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="p-8 text-center max-w-md bg-gradient-to-br from-violet-500/5 to-purple-500/10 border-violet-200 dark:border-violet-800">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Crown className="h-8 w-8 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {language === 'es' ? 'Genera videos sin grabar' : 'Generate videos without filming'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === 'es' 
                ? 'Con el plan Premium puedes generar videos UGC con lip-sync automático. 5 videos incluidos cada mes.'
                : 'With the Premium plan you can generate UGC videos with automatic lip-sync. 5 videos included each month.'}
            </p>
            <Button 
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Actualizar a Premium' : 'Upgrade to Premium'}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              {language === 'es' ? 'Solo $29.99/mes • 5 videos IA incluidos' : 'Only $29.99/month • 5 AI videos included'}
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">
            {language === 'es' ? 'Mis Videos Generados' : 'My Generated Videos'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'es' 
              ? 'Videos creados con Sora 2 Pro'
              : 'Videos created with Sora 2 Pro'}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-4">
                <Skeleton className="aspect-[9/16] rounded-lg mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <Card className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {language === 'es' ? 'Sin videos todavía' : 'No videos yet'}
            </h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {language === 'es' 
                ? 'Abre un video en el dashboard y usa la pestaña "Generar Video" para crear tu primer video con IA'
                : 'Open a video in the dashboard and use the "Generate Video" tab to create your first AI video'}
            </p>
            <Button onClick={() => navigate('/app')}>
              <Sparkles className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Ir al Dashboard' : 'Go to Dashboard'}
            </Button>
          </Card>
        )}

        {/* Videos Grid */}
        {!loading && videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Video/Image Preview */}
                  <div className="aspect-[9/16] bg-muted relative overflow-hidden">
                    {video.status === 'completed' && video.video_url ? (
                      <video 
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                      />
                    ) : video.product_image_url ? (
                      <img 
                        src={video.product_image_url} 
                        alt="" 
                        className="w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* Status Overlay */}
                    {video.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                          <p className="text-sm">{language === 'es' ? 'Generando...' : 'Generating...'}</p>
                        </div>
                      </div>
                    )}

                    {video.status === 'failed' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white p-4">
                          <X className="h-8 w-8 mx-auto mb-2 text-red-400" />
                          <p className="text-sm">{video.error_message || 'Error'}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      {getStatusBadge(video.status)}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {video.duration_seconds}s
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDate(video.created_at)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {video.status === 'completed' && video.video_url && (
                        <Button 
                          size="sm" 
                          className="flex-1 h-8 text-xs"
                          onClick={() => window.open(video.video_url!, '_blank')}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          {language === 'es' ? 'Descargar' : 'Download'}
                        </Button>
                      )}

                      {video.status === 'processing' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleCheckStatus(video)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          {language === 'es' ? 'Verificar' : 'Check'}
                        </Button>
                      )}

                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyGeneratedVideos;