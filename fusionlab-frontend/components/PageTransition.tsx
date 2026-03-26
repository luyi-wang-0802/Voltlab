import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'entering' | 'covered' | 'leaving';

interface PageTransitionProps {
  isActive: boolean;
  onCovered: () => void;
  targetId?: 'findRoom' | 'buildingTelemetry' | 'back' | null;
}

const PageTransition: React.FC<PageTransitionProps> = ({ isActive, onCovered, targetId }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);  // Blue layer
  const ref2 = useRef<HTMLDivElement>(null); // Orange layer

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isActive && phase === 'idle') {
      setPhase('entering');
    }
  }, [isActive, phase]);

  useEffect(() => {
    if (!ref.current || !ref2.current) return;

    const el1 = ref.current;  // Blue layer
    const el2 = ref2.current; // Orange layer

    if (phase === 'entering') {
      // Determine color order based on targetId
      const isOrangeFirst = targetId === 'findRoom';
      const firstLayer = isOrangeFirst ? el2 : el1;  // Orange or Blue first
      const secondLayer = isOrangeFirst ? el1 : el2; // Blue or Orange second
      
      // First layer starts immediately
      if (isMobile) {
        firstLayer.style.transform = 'translateY(0%)';
      } else {
        firstLayer.style.transform = 'translateX(0%)';
      }

      // Second layer starts with delay
      setTimeout(() => {
        if (isMobile) {
          secondLayer.style.transform = 'translateY(0%)';
        } else {
          secondLayer.style.transform = 'translateX(0%)';
        }
      }, 300); // 300ms delay for layered effect

      const t = setTimeout(() => {
        setPhase('covered');
        onCovered();
      }, 800); // Extended to account for second layer

      return () => clearTimeout(t);
    }

    if (phase === 'covered') {
      const t = setTimeout(() => {
        setPhase('leaving');
        // Both layers exit together
        if (isMobile) {
          el1.style.transform = 'translateY(100%)';
          el2.style.transform = 'translateY(100%)';
        } else {
          el1.style.transform = 'translateX(100%)';
          el2.style.transform = 'translateX(100%)';
        }
      }, 50);

      return () => clearTimeout(t);
    }

    if (phase === 'leaving') {
      const t = setTimeout(() => {
        setPhase('idle');
      }, 600);

      return () => clearTimeout(t);
    }
  }, [phase, onCovered, isMobile, targetId]);

  return (
    <>
      {/* Blue Layer (el1) */}
      <div
        ref={ref}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: targetId === 'findRoom' ? 10001 : 9998, // Higher z-index when blue should be on top
          pointerEvents: phase === 'idle' ? 'none' : 'all',
          backgroundColor: '#3b6feb', // Higher saturation blue (minimal white mixed in)
          transform: isMobile ? 'translateY(-100%)' : 'translateX(-100%)',
          transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
        }}
      />
      
      {/* Orange Layer (el2) */}
      <div
        ref={ref2}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: targetId === 'buildingTelemetry' ? 10001 : 9999, // Higher z-index when orange should be on top
          pointerEvents: phase === 'idle' ? 'none' : 'all',
          backgroundColor: '#f9812c', // Higher saturation orange (minimal white mixed in)
          transform: isMobile ? 'translateY(-100%)' : 'translateX(-100%)',
          transition: 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
        }}
      />
    </>
  );
};

export default PageTransition;