import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onComplete, 100);
    }, 2000); // Reduce total loading time to 4s

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#0066ff] transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0 scale-110' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center">
        {/* Stair-step Logo Animation */}
        <div className="w-48 h-48 flex items-center justify-center overflow-visible">
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full overflow-visible"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinejoin="round"
          >
            {/* Architectural Stair Path */}
            <path
              d="M 15 85 L 40 85 L 40 60 L 65 60 L 65 35 L 90 35 L 90 10 L 65 10 L 65 35 L 40 35 L 40 60 L 15 60 Z"
              className="logo-outline"
            />
          </svg>
        </div>
      </div>

      <style>{`

        .logo-outline {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: draw-stair-logo 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes draw-stair-logo {
          0% {
            stroke-dashoffset: 400;
            opacity: 0;
          }
          65% {
            opacity: 1;
          }
          70% {
            stroke-dashoffset: 0;
            fill: rgba(255, 255, 255, 0);
          }
          100% {
            stroke-dashoffset: 0;
            fill: rgba(255, 255, 255, 0.6);
          }
        }

        svg {
          filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.3));
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
