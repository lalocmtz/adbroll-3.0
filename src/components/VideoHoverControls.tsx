import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface VideoHoverControlsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isVisible: boolean;
  onPlayPause: () => void;
  isPlaying: boolean;
}

export function VideoHoverControls({ 
  videoRef, 
  isVisible, 
  onPlayPause, 
  isPlaying 
}: VideoHoverControlsProps) {
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, videoRef]);

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      videoRef.current.muted = newVolume === 0;
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlayPause();
  };

  const handleVolumeMouseEnter = () => {
    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }
    setShowVolumeSlider(true);
  };

  const handleVolumeMouseLeave = () => {
    volumeTimeoutRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div 
      className="absolute bottom-14 left-0 right-0 px-3 z-30 transition-all duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-2 bg-black/60 backdrop-blur-md rounded-xl px-3 py-2">
        {/* Rewind Button */}
        <button
          onClick={handleRewind}
          className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          title="Retroceder 5s"
        >
          <RotateCcw className="w-4 h-4 text-white" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* Volume Control */}
        <div 
          className="relative flex items-center"
          onMouseEnter={handleVolumeMouseEnter}
          onMouseLeave={handleVolumeMouseLeave}
        >
          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
            title={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Volume Slider - Horizontal */}
          <div 
            className={`overflow-hidden transition-all duration-200 ${
              showVolumeSlider ? 'w-16 ml-2 opacity-100' : 'w-0 ml-0 opacity-0'
            }`}
          >
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-white [&_.bg-primary]:bg-white/80"
            />
          </div>
        </div>
      </div>
    </div>
  );
}