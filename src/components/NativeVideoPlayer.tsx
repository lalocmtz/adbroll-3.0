import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

interface NativeVideoPlayerProps {
  videoUrl: string;
  posterUrl?: string;
  className?: string;
  autoPlayOnScroll?: boolean;
}

export const NativeVideoPlayer = ({
  videoUrl,
  posterUrl,
  className,
  autoPlayOnScroll = false,
}: NativeVideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Autoplay on scroll into view (always starts muted for browser compatibility)
  useEffect(() => {
    if (!autoPlayOnScroll || hasAutoPlayed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAutoPlayed && videoRef.current) {
          // Start muted for reliable autoplay
          videoRef.current.muted = true;
          setIsMuted(true);
          
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true);
              setHasStarted(true);
              setHasAutoPlayed(true);
            })
            .catch(console.error);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlayOnScroll, hasAutoPlayed]);

  const handlePlayClick = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setHasStarted(true);
        })
        .catch(console.error);
    }
  };

  const enableAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = false;
    setIsMuted(false);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer group",
        "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)]",
        "transition-all duration-300 hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.2)]",
        className
      )}
      onClick={handlePlayClick}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video Element with loop */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />

      {/* Play Button Overlay (shown when not started) */}
      {!hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300">
          <button
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center",
              "bg-primary text-primary-foreground",
              "shadow-[0_8px_30px_rgba(243,18,96,0.4)]",
              "transform transition-all duration-300",
              "hover:scale-110 hover:shadow-[0_12px_40px_rgba(243,18,96,0.5)]",
              "focus:outline-none focus:ring-4 focus:ring-primary/30"
            )}
          >
            <Play className="h-10 w-10 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Enable Audio Button (shown when playing but muted) */}
      {hasStarted && isPlaying && isMuted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={enableAudio}
            className={cn(
              "pointer-events-auto",
              "flex items-center gap-3 px-8 py-4 rounded-full",
              "bg-white/95 text-foreground",
              "shadow-[0_8px_30px_rgba(0,0,0,0.15)]",
              "transform transition-all duration-300",
              "hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)]",
              "focus:outline-none focus:ring-4 focus:ring-primary/30",
              "animate-pulse"
            )}
          >
            <Volume2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Activar sonido</span>
          </button>
        </div>
      )}

      {/* Controls Bar (shown on hover) */}
      {hasStarted && (
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 p-4",
            "bg-gradient-to-t from-black/60 to-transparent",
            "transition-opacity duration-300",
            showControls || !isPlaying ? "opacity-100" : "opacity-0"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={handlePlayClick}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 text-white" />
                ) : (
                  <Play className="h-5 w-5 text-white ml-0.5" fill="white" />
                )}
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5 text-white" />
                ) : (
                  <Volume2 className="h-5 w-5 text-white" />
                )}
              </button>
            </div>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Maximize className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Premium Border Glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none ring-1 ring-inset ring-white/10" />
    </div>
  );
};
