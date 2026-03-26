
import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SpaceTourProps {
  onComplete: () => void;
  objectFit?: 'cover' | 'contain';
}

/**
 * SMOOTHING: Controls the "viscosity" of the video scrubbing.
 */
const SMOOTHING = 0.12;

const SpaceTour: React.FC<SpaceTourProps> = ({ onComplete, objectFit = 'cover' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberAreaRef = useRef<HTMLDivElement>(null);
  
  const [progress, setProgress] = useState(0); 
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [duration, setDuration] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const targetProgressRef = useRef(0);
  const currentProgressRef = useRef(0);
  const requestRef = useRef<number>(null);
  const hasFinishedRef = useRef(false);

  // Stable video source for the tour experience.
  const videoUrl = "/videos/welcome.mp4";

  useEffect(() => {
    console.log('SpaceTour: Video URL:', videoUrl);
    if (videoRef.current) {
      console.log('SpaceTour: Video element ready');
      videoRef.current.load();
    }
  }, [videoUrl]);

  const handleMetadata = () => {
    console.log('SpaceTour: Video metadata loaded');
    if (videoRef.current) {
      const d = videoRef.current.duration;
      console.log('SpaceTour: Video duration:', d);
      if (d && d > 0) {
        setDuration(d);
        setIsLoaded(true);
        videoRef.current.currentTime = 0;
      }
    }
  };

  const syncVideo = useCallback(() => {
    const diff = targetProgressRef.current - currentProgressRef.current;
    
    if (Math.abs(diff) > 0.001) {
      currentProgressRef.current += diff * SMOOTHING;
    } else {
      currentProgressRef.current = targetProgressRef.current;
    }

    if (videoRef.current && duration > 0 && videoRef.current.readyState >= 2) {
      const targetTime = (currentProgressRef.current / 100) * duration;
      videoRef.current.currentTime = targetTime;
    }
    
    setProgress(currentProgressRef.current);

    if (currentProgressRef.current >= 99.8 && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      handleExit();
    }
    
    requestRef.current = requestAnimationFrame(syncVideo);
  }, [duration]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(syncVideo);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [syncVideo]);

  const handleExit = () => {
    setIsExiting(true);
    setTimeout(onComplete, 1000);
  };

  const calculateProgressFromPointer = useCallback((clientY: number) => {
    if (!scrubberAreaRef.current) return;
    const rect = scrubberAreaRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const h = rect.height;
    // Bottom (h) is 0%, Top (0) is 100%.
    const val = Math.max(0, Math.min(100, 100 - (relativeY / h) * 100));
    targetProgressRef.current = val;
  }, []);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDragging) {
        calculateProgressFromPointer(e.clientY);
      }
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, calculateProgressFromPointer]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    calculateProgressFromPointer(e.clientY);
  };

  return (
    <div className={`fixed inset-0 z-[60] bg-black flex flex-col transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#161616_0%,_#000_100%)]"></div>
      </div>

      {/* Real Video Content */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={{ objectFit }}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        onLoadStart={() => console.log('SpaceTour: Video load started')}
        onLoadedMetadata={handleMetadata}
        onCanPlay={() => console.log('SpaceTour: Video can play')}
        onError={(e) => {
          console.error('SpaceTour: Video error:', e);
          if (videoRef.current) {
            console.error('SpaceTour: Video error details:', videoRef.current.error);
          }
          setLoadError(true);
          setDuration(10);
          setIsLoaded(true); 
        }}
      />

      {/* Video Loading Indicator */}
      {!isLoaded && !loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-white/60 text-sm font-medium animate-pulse">
            Loading video...
          </div>
        </div>
      )}

      {/* Error Message */}
      {loadError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-red-400/60 text-sm font-medium">
            Video failed to load. Check console for details.
          </div>
        </div>
      )}

      {/* Welcome Message Overlay (Bottom Left) */}
      <div className="absolute bottom-24 left-12 z-40 pointer-events-none select-none flex items-stretch animate-in fade-in slide-in-from-left duration-1000 delay-500 welcome-mobile">
        <div className="welcome-bar w-[1.5px] bg-white mr-6 opacity-80 shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
        <div className="flex flex-col justify-center">
           <h2 className="welcome-title text-white text-3xl font-medium tracking-normal leading-snug antialiased">
             Welcome to the<br/>VoltLab Student Center
           </h2>
        </div>
      </div>

      {/* Vertical Scrubber UI */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
        <div 
          ref={scrubberAreaRef}
          className="relative w-20 h-56 flex flex-col items-center justify-end cursor-pointer touch-none pointer-events-auto group"
          onPointerDown={handlePointerDown}
        >
          {/* Interaction Zone Feedback */}
          <div className="absolute inset-0 bg-white/[0.01] opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>

          {/* Instruction Text */}
          <div className="absolute -bottom-12 w-full text-center select-none pointer-events-none">
             <span className="text-[7px] text-white/40 font-black uppercase tracking-[0.18em] whitespace-nowrap">Drag up to enter</span>
          </div>

          {/* Vertical Track Visual */}
          <div className="absolute inset-y-0 w-[0.5px] bg-white/20 left-1/2 -translate-x-1/2">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border border-white/40 rotate-45 bg-black -translate-y-1/2"></div>
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 border border-white/40 rotate-45 bg-black translate-y-1/2"></div>
          </div>
          
          {/* Draggable Handle Visual */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-30"
            style={{ 
              bottom: `${progress}%`, 
              transform: `translate(-50%, 50%)`,
              transition: isDragging ? 'none' : 'bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <div className="relative w-8 h-8 flex items-center justify-center">
                <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${isDragging ? 'scale-110 shadow-[0_0_20px_rgba(255,255,255,0.9)]' : 'shadow-[0_0_10px_rgba(255,255,255,0.5)] group-hover:shadow-[0_0_15px_rgba(255,255,255,0.7)]'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Hint */}
      {!isLoaded && !loadError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
          <span className="text-[9px] text-white/30 uppercase font-black tracking-[0.18em] animate-pulse">Establishing Node...</span>
        </div>
      )}

      <style>{`
        .touch-none {
          touch-action: none;
          -webkit-user-select: none;
          user-select: none;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-left { from { transform: translateX(-1rem); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-left { animation-name: slide-in-from-left; }

        /* mobile */
        @media (max-width: 600px) {
          .welcome-mobile {
            left: 20px;
            bottom: 12px;
          }
          .welcome-bar {
            width: 1px !important;
            margin-right: 4px !important;
          }
          .welcome-title {
            font-size: 1.1rem !important;
            line-height: 1.3 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SpaceTour;
