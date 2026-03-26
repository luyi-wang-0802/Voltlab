import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// Helper functions
function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

interface StorytellingViewProps {
  onScroll?: (scrolled: boolean) => void;
}

// Helper function for text slicing
function sliceByChars(s: string, n: number) {
  return s.slice(0, Math.max(0, Math.min(s.length, n)));
}

// Helper function for hover word rendering
function renderHoverWord(
  word: string,
  keyPrefix: string,
  hoveredLetter: string | null,
  setHoveredLetter: (v: string | null) => void,
) {
  return (
    <span>
      {word.split('').map((ch, i) => {
        const id = `${keyPrefix}-${i}`;
        const isHovered = hoveredLetter === id;
        return (
          <span
            key={id}
            onMouseEnter={() => setHoveredLetter(id)}
            onMouseLeave={() => setHoveredLetter(null)}
            style={{
              display: 'inline-block',
              filter: isHovered ? 'blur(3px)' : 'none',
              transition: 'filter 120ms ease-out',
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

// ImageCompare component
type CompareProps = {
  beforeSrc: string;
  afterSrc: string;
  labelBefore?: string;
  labelAfter?: string;

  height?: string;              // e.g. '700px' | 'min(48vh, 480px)' | 'auto'
  width?: string;               // e.g. '700px' | 'min(92vw, 720px)'
  aspectRatio?: string;         // e.g. '1 / 1' | '16 / 9' | '3 / 2'
  maxWidth?: string;            // e.g. '100%'
};

const ImageCompare: React.FC<CompareProps> = ({
  beforeSrc,
  afterSrc,
  labelBefore = 'BEFORE',
  labelAfter = 'AFTER',
  height = 'min(48vh, 480px)',
  width,
  aspectRatio,
  maxWidth,
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0.5);

  const setFromClientX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = (clientX - r.left) / Math.max(1, r.width);
    setX(clamp01(p));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    // Pointer capture 
    if ((e.buttons ?? 0) === 0 && (e.pointerType === 'mouse')) return;
    setFromClientX(e.clientX);
  };

  const isAutoHeight = height === 'auto';

  return (
    <div
      ref={wrapRef}
      className="image-compare"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      style={{
        position: 'relative',

        // width
        width: width || '50%',
        maxWidth: maxWidth || undefined,

        // height
        height: isAutoHeight ? 'auto' : height,
        aspectRatio: isAutoHeight ? (aspectRatio || '1 / 1') : undefined,

        overflow: 'hidden',
        borderRadius: 0,
        background: '#fff',
        boxShadow: '0 18px 50px rgba(0,0,0,0.10)',
        userSelect: 'none',

        touchAction: 'none',
      }}
    >
      {/* After image always full size */}
      <img
        src={afterSrc}
        alt="after"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
      />

      {/* Before image, clipped from right */}
      <img
        src={beforeSrc}
        alt="before"
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          pointerEvents: 'none',
          clipPath: `inset(0 ${100 - x * 100}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - x * 100}% 0 0)`,
          transition: 'clip-path 0.2s',
        }}
      />

      {/* Divider line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${x * 100}%`,
          width: 2,
          background: 'rgba(17,24,39,0.70)',
          transform: 'translateX(-1px)',
          pointerEvents: 'none',
        }}
      />

      {/* Drag handle */}
      <div
        style={{
          position: 'absolute',
          left: `${x * 100}%`,
          top: '50%',
          width: 44,
          height: 44,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(0,0,0,0.10)',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 10px 20px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', gap: 6, opacity: 0.65 }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#111' }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#111' }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: '#111' }} />
        </div>
      </div>

      {/* Labels */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 14,
          fontFamily: 'Poppins, Arial, sans-serif',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(17,24,39,0.72)',
          background: 'rgba(255,255,255,0.65)',
          padding: '8px 10px',
          pointerEvents: 'none',
        }}
      >
        {labelBefore}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 18,
          top: 14,
          fontFamily: 'Poppins, Arial, sans-serif',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(17,24,39,0.72)',
          background: 'rgba(255,255,255,0.65)',
          padding: '8px 10px',
          pointerEvents: 'none',
        }}
      >
        {labelAfter}
      </div>
    </div>
  );
};


// Declarative animation configuration - data-driven
const animationSteps = [
  { text: 'Historical Value', 
    description: 'The concept begins with minimal, carefully placed changes to the façade. New window openings bring daylight into key spaces, while a new main entrance clarifies arrival and improves accessibility. From the left street side, an added access route also leads down to the garden, connecting the building more directly to its outdoor ground level.',
    duration: 5, globalX: -20, rotY: -Math.PI / 6,      
    newwallY: 100, newwindowY: 100, newdoorY:100, newstructureY: 100, blueY: 100, newslabY: 100,      
    bridgeY: 100, connectfacadeY: 100, cityY: -200,
    camX: 0, camY: 0, camZ: 0,
    // Component opacity settings
      connectfacadeOpacity: 1,
      newslabOpacity: 1, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
      eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
      blueOpacity: 1, bridgeOpacity: 1, cityOpacity: 1,
    // Component color settings (hex color codes)
      connectfacadeColor: 0xffffff,
      newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0x2563eb, southoldColor: 0xe2efff,
      eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
      blueColor: 0xffffff, bridgeColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings (hex color codes)
      connectfacadeEdgeColor: 0x000000,
      newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x16375e, southoldEdgeColor: 0x003c83,
      eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
      blueEdgeColor: 0x000000, bridgeEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    southnewX: 0, southnewY: 0, southoldX: 100,
    oldroofY: 0, newroofY: 100,      
    eastfacadeX:0, eastfacadeZ: 0, westfacadeX:0, westfacadeZ: 0 },
    
{  text: '',
    description: '',
    duration: 5, globalX: -20, rotY: -Math.PI / 4, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 100, blueY: 100, newslabY: 100,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 1, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity:1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity: 1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x000000, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x16375e, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x000000, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 100, connectfacadeY: 100, cityY: -200,
    southnewX: 0, southnewZ:30, southoldX: 200, 
    oldroofY: 100, newroofY: 100,    
    eastfacadeX: 100, eastfacadeZ: 0, westfacadeX: -100, westfacadeZ: 0 },

{ text: 'Inserted frame', 
    description: 'A freestanding steel structure is placed inside the existing building, creating a new internal framework without touching the historic walls. It adds four new levels (+4 floors) and organizes circulation clearly through the space. An external walkway runs along the edge, providing an additional route and connecting the new floors while keeping the old fabric intact.',
    duration: 5, globalX: -20, rotY: -Math.PI / 3, 
    newwallY: 100, newwindowY: 100, newdoorY: 100,  newstructureY: 0, blueY: 100, newslabY: 100,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 1, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity: 1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x000000, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x2563eb, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x000000, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 100, connectfacadeY: 100,  cityY: -200,
    southnewX: 0, southnewZ:300, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 },

{ text: '', 
    description: 'Timber slabs are inserted into the steel frame to bring warmth and a more welcoming atmosphere to the interior.',
    duration: 5, globalX: -20, rotY: -Math.PI / 4, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 100, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.6, newstructureOpacity: 0.3, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity: 1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0x2563eb, newstructureColor: 0x2563eb, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x000000, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x000000, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 100, connectfacadeY: 100,  cityY: -200,
    southnewX: 0, southnewZ:300, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 },

{ text: 'New and Old', 
    description: 'Now we move to the central stair system, which sits at the heart of the building. It connects the inserted structure across all levels and links the north and south parts into one continuous circulation loop. We use blue-painted steel for the stairs, referencing the same material language already present in the existing building.',
    duration: 5, globalX: -20, rotY: -Math.PI / 6, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.2, newstructureOpacity: 0.2, southnewOpacity: 0.1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity: 1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x000000, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x2563eb, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 100, connectfacadeY: 100, cityY: -200,
    southnewX: 40, southnewZ:300, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 }, 

{ text: '', 
    description: '',
    duration: 5, globalX: -20, rotY: Math.PI / -4, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.2, newstructureOpacity: 0.2, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor:  0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0x2563eb, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x2563eb, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x2563eb, bridgeEdgeColor: 0x2563eb, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 100, cityY: -200,
    southnewX: 30, southnewZ:200, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 },

{ text: 'New Reads as New', 

    description: 'Next, small inserted bridges link the north and south parts on each level, strengthening the overall circulation loop. Made from the same blue steel as the central stairs, they continue the material language and create clear, direct connections across the building',
    duration: 5, globalX: -20, rotY: Math.PI / -2, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.2, newstructureOpacity: 0.2, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor:  0x2563eb, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0x2563eb, bridgeColor: 0x2563eb, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x2563eb, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x2563eb, bridgeEdgeColor: 0x2563eb, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 0, cityY: -200,
    southnewX: 30, southnewZ:200, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 },

{ text: '', 
    description: '',
    duration: 5, globalX: -20, rotY:-Math.PI / 3, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.6, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x2563eb, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x2563eb, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 0, cityY: -200,
    southnewX: 0, southnewZ:200, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 }, 

{ text: 'Keep the Identity', 
description: 'Here we keep the existing openings exactly as they are, so the historic façade remains readable and views into the south part stay intact. The openings are highlighted with blue steel frames, turning them into clear “view windows” between old and new. Together with the inserted connections, they strengthen the link across the building while preserving its original character.',
    duration: 5, rotY: -Math.PI / 8, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 0.4, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor: 0x2563eb, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0x2563eb, bridgeColor: 0x2563eb, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x00244f, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x16375e, newstructureEdgeColor: 0x16375e, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor:0x16375e, bridgeEdgeColor: 0xffffff, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 0, cityY: -200,
    southnewX: 40, southnewZ:200, southoldX: 200,
    oldroofY: 100, newroofY: 100,     
    eastfacadeX: 200, eastfacadeZ: 0, westfacadeX: -200, westfacadeZ: 0 },

{ text: '', 
    description: 'Finally, we introduce a roof opening above the stair core to bring natural light down through the building. This skylight brightens the central circulation space and improves orientation across all levels.',
    duration: 5, globalX: -20, rotY: -Math.PI / 10, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 1, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 0.6, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor: 0x2563eb, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0x2563eb, oldroofColor: 0xffffff,
    blueColor: 0x2563eb, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x00244f, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x2563eb, newstructureEdgeColor: 0x2563eb, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0xffffff, bridgeEdgeColor:0xffffff, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 0, cityY: -200,
    southnewX: 0, southnewZ:0, southoldX: 200,
    oldroofY: 100, newroofY: 0,     
    eastfacadeX: 0, eastfacadeZ: 0, westfacadeX: 0, westfacadeZ: 0 }, 

{ text: '', 
    description: '',
    duration: 5, globalX: -20, rotY: 0, 
    newwallY: 100, newwindowY: 100, newdoorY:100,  newstructureY: 0, blueY: 0, newslabY: 0,
    camX: 0, camY: 0, camZ: 0, 
    // Component opacity settings
    connectfacadeOpacity: 1, newwallOpacity: 1, newwindowOpacity: 1, newdoorOpacity: 1,
    newslabOpacity: 1, newstructureOpacity: 1, southnewOpacity: 1, southoldOpacity: 1,
    eastfacadeOpacity: 1, westfacadeOpacity: 1, newroofOpacity: 1, oldroofOpacity: 1,
    blueOpacity: 1, bridgeOpacity: 1, otherOpacity: 1, cityOpacity:1,
    // Component color settings
    connectfacadeColor: 0xffffff, newwallColor: 0xffffff, newwindowColor: 0xffffff, newdoorColor: 0xffffff,
    newslabColor: 0xffffff, newstructureColor: 0xffffff, southnewColor: 0xffffff, southoldColor: 0xffffff,
    eastfacadeColor: 0xffffff, westfacadeColor: 0xffffff, newroofColor: 0xffffff, oldroofColor: 0xffffff,
    blueColor: 0xffffff, bridgeColor: 0xffffff, otherColor: 0xffffff, cityColor: 0xffffff,
    // Component edge color settings
    connectfacadeEdgeColor: 0x000000, newwallEdgeColor: 0x000000, newwindowEdgeColor: 0x000000, newdoorEdgeColor: 0x000000,
    newslabEdgeColor: 0x000000, newstructureEdgeColor: 0x000000, southnewEdgeColor: 0x000000, southoldEdgeColor: 0x000000,
    eastfacadeEdgeColor: 0x000000, westfacadeEdgeColor: 0x000000, newroofEdgeColor: 0x000000, oldroofEdgeColor: 0x000000,
    blueEdgeColor: 0x2563eb, bridgeEdgeColor: 0x000000, otherEdgeColor: 0x000000, cityEdgeColor: 0x000000,
    bridgeY: 0, connectfacadeY: 0, cityY: 0,
    southnewX: 0, southnewZ:0, southoldX: 200,
    oldroofY: 100, newroofY: 0,     
    eastfacadeX: 0, eastfacadeZ: 0, westfacadeX: 0, westfacadeZ: 0 },                                   
];

const StorytellingView: React.FC<StorytellingViewProps> = ({ onScroll }) => {
  // Mobile detection state - initialize with current window width
  const [isMobile, setIsMobile] = useState(() => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false; // Default to false for SSR
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const viewHeightRef = useRef<number>(800);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const descriptionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- ROOMS (NEW SECTION) refs ---
const roomsContainerRef = useRef<HTMLDivElement>(null);          // outer scroll container (like containerRef)
const roomsCanvasContainerRef = useRef<HTMLDivElement>(null);     // canvas mount
const roomsSceneRef = useRef<THREE.Scene | null>(null);
const roomsCameraRef = useRef<THREE.OrthographicCamera | null>(null);
const roomsRendererRef = useRef<THREE.WebGLRenderer | null>(null);
const roomsRootRef = useRef<THREE.Group | null>(null);            // group we move for looping
const roomsModelRef = useRef<THREE.Group | null>(null);
const roomsAnimRef = useRef<number | null>(null);
const roomsViewHeightRef = useRef<number>(800);

const roomsScrollPRef = useRef<number>(0);                        // 0..1 from ScrollTrigger
const roomsSpacingRef = useRef<number>(800);                      // increased spacing for 3 rooms
const roomsTotalLenRef = useRef<number>(0); 
const roomsXRef = useRef<number>(0);
const roomsPartsRef = useRef({
  furniture: [] as THREE.Mesh[],
  walls: [] as THREE.Mesh[],
  floor: [] as THREE.Mesh[],
  glass: [] as THREE.Mesh[],
});

                      // computed after load

  // Frame animation states
  const totalFrames = 85;
  const frameFolder = '/storyframes';
  const [currentFrame, setCurrentFrame] = useState(1);
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);
  const [introEndP, setIntroEndP] = useState(0);
  
  // Headline states
  const headlineRef = useRef<HTMLDivElement>(null);
  const [headlinePanelP, setHeadlinePanelP] = useState(0);
  const [headlineTextP, setHeadlineTextP] = useState(0);
  
  // History states
  const historyAnchorRef = useRef<HTMLDivElement>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);
  const [historyP, setHistoryP] = useState(0);
  const [historyScroll, setHistoryScroll] = useState(0);
  
  // Design states
  const designAnchorRef = useRef<HTMLDivElement>(null);
  const designSectionRef = useRef<HTMLDivElement>(null);
  const [designP, setDesignP] = useState(0);
  const [designScroll, setDesignScroll] = useState(0);
  
  // Concept states
  const conceptAnchorRef = useRef<HTMLDivElement>(null);
  const [conceptP, setConceptP] = useState(0);

  // Preserve/Insert/Live states
  const preserveInsertRef = useRef<HTMLDivElement>(null);
  const [preserveInsertProgress, setPreserveInsertProgress] = useState(0);
  const [hoveredLetter, setHoveredLetter] = useState<string | null>(null);
  
  // Architecture states
  const architectureAnchorRef = useRef<HTMLDivElement>(null);
  const [architectureP, setArchitectureP] = useState(0);
  
  // Renderings states
  const renderingsRef = useRef<HTMLDivElement>(null);
  const [renderingsP, setRenderingsP] = useState(0);
  
  // Pre-stored component references
  const partsRef = useRef<{
    connectfacade: THREE.Object3D[];
    newslab: THREE.Object3D[];
    newstructure: THREE.Object3D[];
    southnew: THREE.Object3D[];
    southold: THREE.Object3D[];
    eastfacade: THREE.Object3D[];
    westfacade: THREE.Object3D[];
    newroof: THREE.Object3D[];
    oldroof: THREE.Object3D[];
    blue: THREE.Object3D[];
    bridge: THREE.Object3D[];
    city: THREE.Object3D[];
  }>({
    connectfacade: [],
    newslab: [],
    newstructure: [],
    southnew: [],
    southold: [],
    eastfacade: [],
    westfacade: [], 
    oldroof: [],
    newroof: [],
    blue: [],
    bridge: [],
    city: []
  });

  // History data
  const storytellingImages = useMemo(
    () => [
      '/storytelling/insidehochvolt.jpg',
      '/storytelling/1200134.jpg',
      '/storytelling/1200138.jpg',
      '/storytelling/1200132.jpg',
    ],
    []
  );

  const step1End = 0.25;
  const step2End = 0.5;
  const step3End = 0.75;

  const historyImageIndex = useMemo(() => {
    if (historyScroll < step1End) return 0;
    if (historyScroll < step2End) return 1;
    if (historyScroll < step3End) return 2;
    return 3;
  }, [historyScroll]);

  const historyTextSegments = useMemo(
    () => [
      `BUILT BETWEEN 1957–1963 FOR HIGH-VOLTAGE ENGINEERING RESEARCH, THE HOCHVOLTHAUS ON TUM’S MAIN CAMPUS WAS DESIGNED BY WERNER EICHBERG AND FRANZ HART.\n\n`,
      `ITS ARCHITECTURE IS DEFINED BY FUNCTION AND SAFETY: MASSIVE BRICK FAÇADES, NARROW VERTICAL WINDOW SLITS, AND FREESTANDING STAIR TOWERS CLEARLY SEPARATE LAB AND EXPERIMENT ZONES FROM THE STREET.\n\n`,
      `OVER TIME, THE BUILDING WAS ADAPTED FOR NEW USES WHILE ITS ORIGINAL STRUCTURE REMAINED LEGIBLE.\n\n`,
      `TODAY: WE PRESERVE WHAT MATTERS, INSERT WHAT IS NEEDED, AND LET THE BUILDING LIVE AGAIN WITHOUT ERASING ITS PAST.`,
    ],
    []
  );

  const typedHistoryText = useMemo(() => {
    const [s1, s2, s3, s4] = historyTextSegments;
    // Split scroll progress into 4 equal parts for 4 segments
    const seg1End = 0.35;
    const seg2End = 0.6;
    const seg3End = 0.85;
    const seg4End = 1.0;

    const p1 = clamp01(historyScroll / seg1End);
    const p2 = clamp01((historyScroll - seg1End) / (seg2End - seg1End));
    const p3 = clamp01((historyScroll - seg2End) / (seg3End - seg2End));
    const p4 = clamp01((historyScroll - seg3End) / (seg4End - seg3End));
    const c1 = Math.round(s1.length * p1);
    const c2 = Math.round(s2.length * p2);
    const c3 = Math.round(s3.length * p3);
    const c4 = Math.round(s4.length * p4);
    return (
      sliceByChars(s1, c1) +
      sliceByChars(s2, c2) +
      sliceByChars(s3, c3) +
      sliceByChars(s4, c4)
    );
  }, [historyScroll, historyTextSegments]);

  // Headline text rendering logic
  const headlineNodes = useMemo(() => {
    const wordsOnBlue = headlinePanelP > 0.85;
    const futureColor = wordsOnBlue ? '#111' : '#2563eb';
    const pastColor = wordsOnBlue ? '#111' : '#2563eb';
    
    const line1 = [
      { text: 'EMBRACE ', color: '#111' },
      { text: 'THE ', color: '#111' },
      { text: 'FUTURE', color: '#2563eb' },
      { text: ' WITHOUT', color: '#111' },
    ];
    const line2 = [
      { text: 'FORGETTING ', color: '#111' },
      { text: 'THE ', color: '#111' },
      { text: 'PAST', color: '#2563eb' },
    ];
    

    let charIndex = 0;
    const totalChars =
      line1.reduce((a, w) => a + w.text.length, 0) +
      line2.reduce((a, w) => a + w.text.length, 0);

    const renderWord = (word: { text: string; color: string }) =>
      word.text.split('').map((char) => {
        const i = charIndex++;
        const done = headlineTextP > 0.98;
        const charP = done ? 1 : Math.max(0, Math.min(1, (headlineTextP * totalChars - i) / 10 + 0.12));
        return (
          <span
            key={i}
            style={{
              color: word.color,
               opacity: 0.08 + charP * 0.92,
               transition: 'opacity 90ms ease-out',
              display: 'inline',
            }}
          >
            {char}
          </span>
        );
      });

    return (
      <>
        {line1.map((w, idx) => (
          <span key={idx}>{renderWord(w)}</span>
        ))}
        <br />
        {line2.map((w, idx) => (
          <span key={idx + 10}>{renderWord(w)}</span>
        ))}
      </>
    );
  }, [headlineTextP, headlinePanelP]);

  // Mobile detection useEffect
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  
  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Integrate Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    const tickerCallback = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(tickerCallback);
    };
  }, []);

  // Preload frame images
  useEffect(() => {
    let loaded = 0;
    let cancelled = false;

    for (let i = 1; i <= totalFrames; i++) {
      const img = new window.Image();
      img.src = `${frameFolder}/story${i.toString().padStart(2, "0")}.jpg`;
      img.onload = img.onerror = () => {
        loaded++;
        if (!cancelled) {
          setImagesLoaded((v) => v + 1);
          if (loaded === totalFrames) setAllLoaded(true);
        }
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Scene initialization
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Pure white background
    sceneRef.current = scene;

    // Orthographic camera (axonometric view)
    const aspect = containerWidth / containerHeight;
    const camera = new THREE.OrthographicCamera(
      -800 * aspect,
      800 * aspect,
      800,
      -800,
      0.1,
      5000
    );
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    const canvas = renderer.domElement;

// Wichtig: Container muss "position: relative" haben, damit absolute Canvas sauber sitzt
canvas.style.cssText =
  'position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;' +
  'width: 100% !important; height: 100% !important; z-index: 1 !important; pointer-events: auto !important;' +
  'display: block !important;';

canvas.setAttribute('data-interactive', 'true');


    // Load GLB model
    const loader = new GLTFLoader();
    loader.load(

'/models/storymodel.glb',
      (gltf) => {
        const model = gltf.scene;
        modelRef.current = model;
        scene.add(model);

        // Calculate model's bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        // Get empty node named '0' as center point
        let center = new THREE.Vector3();
        const emptyNode = model.getObjectByName('0');
        if (emptyNode) {
          emptyNode.getWorldPosition(center);
        } else {
          console.warn("Empty node '0' not found in the model.");
          center = box.getCenter(new THREE.Vector3());
        }
        model.position.sub(center);
        model.position.y -= size.y * 0.3; // Translate model down by 40% of its height
        
        // Check current device type for initial positioning
        const isCurrentlyMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        model.position.x = isCurrentlyMobile ? 0 : -20; // Mobile: 0 (center), Desktop: -20
        model.rotation.y = 0; // Set initial rotation angle to 0
        model.scale.set(
          isCurrentlyMobile ? 0.5 : 1,
          isCurrentlyMobile ? 0.5 : 1,
          isCurrentlyMobile ? 0.5 : 1
        ); // Mobile: 0.5x, Desktop: 1x
        
        console.log(`Model loaded for ${isCurrentlyMobile ? 'mobile' : 'desktop'}: scale=${isCurrentlyMobile ? 0.5 : 1}, x=${isCurrentlyMobile ? 0 : -20}`);

        // Preserve Blender original materials, convert to MeshBasicMaterial (illustration style)
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            // console.log('meshName:', mesh.name); // Print all mesh names
            const meshName = mesh.name.toLowerCase();

            // Pre-store components in categorized arrays
            if (meshName.startsWith('city')) {
              partsRef.current.city.push(mesh);                                                                                      
            }                                       
            if (meshName.startsWith('oldroof')) {
              partsRef.current.oldroof.push(mesh);                                                                                      
            }
            if (meshName.startsWith('newroof')) {
              partsRef.current.newroof.push(mesh);
            }
            if (meshName.startsWith('newstructure')) {
              partsRef.current.newstructure.push(mesh);                 
            }
            if (meshName.startsWith('newslab')) {
              partsRef.current.newslab.push(mesh);
            }
            if (meshName.startsWith('southnew')) {
              partsRef.current.southnew.push(mesh);
            }
            if (meshName.startsWith('southold')) {
              partsRef.current.southold.push(mesh);
            }
            if (meshName.startsWith('eastfacade')) {
              partsRef.current.eastfacade.push(mesh);
            }
            if (meshName.startsWith('westfacade')) {
              partsRef.current.westfacade.push(mesh);
            }
            if (meshName.startsWith('blue')) {
              partsRef.current.blue.push(mesh);
            }
            if (meshName.startsWith('connectfacade')) {
              partsRef.current.connectfacade.push(mesh);
            }
            if (meshName.startsWith('bridge')) {
              partsRef.current.bridge.push(mesh);
            }

            // Set all materials to white with transparency support
            mesh.material = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 1
            });

            // Black edges, opacity set according to object name
            let edgeOpacity = 1.0;
            if (meshName.includes('connectfacade')) {edgeOpacity = 0.5;
            } else if (meshName.includes('newslab')) {edgeOpacity = 0.3;
            } else if (meshName.includes('newstructure')) {edgeOpacity = 0.2;
            } else if (meshName.includes('oldroof')) {edgeOpacity = 0.5;
            } else if (meshName.includes('newroof')) {edgeOpacity = 0.5;
            } else if (meshName.includes('blue')) {edgeOpacity = 0.2;
            } else if (meshName.includes('bridge')) {edgeOpacity = 0.4;
            } else if (meshName.includes('southnew')) {edgeOpacity = 0.5;
            } else if (meshName.includes('southold')) {edgeOpacity = 0.7;
            } else if (meshName.includes('eastfacade')) {edgeOpacity = 0.7;
            } else if (meshName.includes('westfacade')) {edgeOpacity = 0.7;
            } else {
              edgeOpacity = 0.3;
            }
            const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 0x000000,
              linewidth: 1,
              transparent: edgeOpacity < 1,
              opacity: edgeOpacity
            });
            const wireframe = new THREE.LineSegments(edges, lineMaterial);
            mesh.add(wireframe);
          }
        });

        // Set camera view range
        const viewHeight = size.y * 1.1;
        viewHeightRef.current = viewHeight; // Save view height for resize use
        camera.top = viewHeight;
        camera.bottom = -viewHeight;
        camera.left = -viewHeight * aspect;
        camera.right = viewHeight * aspect;
        camera.updateProjectionMatrix();

        // Set axonometric angle
        const angle = 119.5 * Math.PI / 180;
        const radius = Math.max(size.x, size.y, size.z) * 1.2;
        camera.position.set(
          center.x + radius * Math.cos(angle),
          center.y + radius * 0.4,
          center.z + radius * Math.sin(angle)
        );
        camera.lookAt(center.x, center.y, center.z);

        // Set initial positions for all components (before Step 1)
        partsRef.current.southnew.forEach(mesh => { mesh.position.x = -100; });
        partsRef.current.city.forEach(mesh => { mesh.position.y = -200; });
        partsRef.current.bridge.forEach(mesh => { mesh.position.y = 100; });
        partsRef.current.southold.forEach(mesh => { mesh.position.x = 0; });
        partsRef.current.newstructure.forEach(mesh => { mesh.position.y = 100; });
        partsRef.current.newslab.forEach(mesh => { mesh.position.y = 100; });
        partsRef.current.eastfacade.forEach(mesh => { mesh.position.x = 0; });
        partsRef.current.westfacade.forEach(mesh => { mesh.position.x = 0; });
        partsRef.current.oldroof.forEach(mesh => { mesh.position.y = 0; });
        partsRef.current.newroof.forEach(mesh => { mesh.position.y = 100; });
        partsRef.current.blue.forEach(mesh => { mesh.position.y = 100; });
        partsRef.current.connectfacade.forEach(mesh => { mesh.position.y = 100; });
        

        // Create GSAP scroll animation timeline - Sticky mode
        if (containerRef.current) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1,
              pin: false,
              onUpdate: (self) => {
                renderer.render(scene, camera);
                if (onScroll) {
                  onScroll(self.progress > 0.01);
                }
              }
            }
          });

          let currentTime = 0;

          // Declarative direction logic - data directly drives animation
          animationSteps.forEach((step, index) => {
            const stepDuration = step.duration;
            const fadeDuration = 0.3;

            // Helper function to animate component opacity
            const animateOpacity = (parts: THREE.Object3D[], opacity: number) => {
              parts.forEach(obj => {
                const mesh = obj as THREE.Mesh;
                tl.to(mesh.material, {
                  opacity,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            };

            // Helper function to animate component color
            const animateColor = (parts: THREE.Object3D[], color: number) => {
              parts.forEach(obj => {
                const mesh = obj as THREE.Mesh;
                const mat = mesh.material as THREE.MeshBasicMaterial;
                tl.to(mat.color, {
                  r: ((color >> 16) & 255) / 255,
                  g: ((color >> 8) & 255) / 255,
                  b: (color & 255) / 255,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            };

            // Helper function to animate edge color
            const animateEdgeColor = (parts: THREE.Object3D[], color: number) => {
              parts.forEach(obj => {
                const mesh = obj as THREE.Mesh;
                // Find the LineSegments child (wireframe/edges)
                mesh.children.forEach(child => {
                  if (child instanceof THREE.LineSegments) {
                    const lineMat = child.material as THREE.LineBasicMaterial;
                    tl.to(lineMat.color, {
                      r: ((color >> 16) & 255) / 255,
                      g: ((color >> 8) & 255) / 255,
                      b: (color & 255) / 255,
                      duration: stepDuration,
                      ease: 'power2.inOut'
                    }, currentTime + fadeDuration);
                  }
                });
              });
            };

            // Animate opacity for each component type
            if (typeof step.connectfacadeOpacity === 'number') animateOpacity(partsRef.current.connectfacade, step.connectfacadeOpacity);
            if (typeof step.newslabOpacity === 'number') animateOpacity(partsRef.current.newslab, step.newslabOpacity);
            if (typeof step.newstructureOpacity === 'number') animateOpacity(partsRef.current.newstructure, step.newstructureOpacity);
            if (typeof step.southnewOpacity === 'number') animateOpacity(partsRef.current.southnew, step.southnewOpacity);
            if (typeof step.southoldOpacity === 'number') animateOpacity(partsRef.current.southold, step.southoldOpacity);
            if (typeof step.eastfacadeOpacity === 'number') animateOpacity(partsRef.current.eastfacade, step.eastfacadeOpacity);
            if (typeof step.westfacadeOpacity === 'number') animateOpacity(partsRef.current.westfacade, step.westfacadeOpacity);
            if (typeof step.newroofOpacity === 'number') animateOpacity(partsRef.current.newroof, step.newroofOpacity);
            if (typeof step.oldroofOpacity === 'number') animateOpacity(partsRef.current.oldroof, step.oldroofOpacity);
            if (typeof step.blueOpacity === 'number') animateOpacity(partsRef.current.blue, step.blueOpacity);
            if (typeof step.bridgeOpacity === 'number') animateOpacity(partsRef.current.bridge, step.bridgeOpacity);
            if (typeof step.cityOpacity === 'number') animateOpacity(partsRef.current.city, step.cityOpacity);

            // Animate color for each component type
            if (typeof step.connectfacadeColor === 'number') animateColor(partsRef.current.connectfacade, step.connectfacadeColor);
            if (typeof step.newslabColor === 'number') animateColor(partsRef.current.newslab, step.newslabColor);
            if (typeof step.newstructureColor === 'number') animateColor(partsRef.current.newstructure, step.newstructureColor);
            if (typeof step.southnewColor === 'number') animateColor(partsRef.current.southnew, step.southnewColor);
            if (typeof step.southoldColor === 'number') animateColor(partsRef.current.southold, step.southoldColor);
            if (typeof step.eastfacadeColor === 'number') animateColor(partsRef.current.eastfacade, step.eastfacadeColor);
            if (typeof step.westfacadeColor === 'number') animateColor(partsRef.current.westfacade, step.westfacadeColor);
            if (typeof step.newroofColor === 'number') animateColor(partsRef.current.newroof, step.newroofColor);
            if (typeof step.oldroofColor === 'number') animateColor(partsRef.current.oldroof, step.oldroofColor);
            if (typeof step.blueColor === 'number') animateColor(partsRef.current.blue, step.blueColor);
            if (typeof step.bridgeColor === 'number') animateColor(partsRef.current.bridge, step.bridgeColor);
            if (typeof step.cityColor === 'number') animateColor(partsRef.current.city, step.cityColor);

            // Animate edge color for each component type
            if (typeof step.connectfacadeEdgeColor === 'number') animateEdgeColor(partsRef.current.connectfacade, step.connectfacadeEdgeColor);
            if (typeof step.newslabEdgeColor === 'number') animateEdgeColor(partsRef.current.newslab, step.newslabEdgeColor);
            if (typeof step.newstructureEdgeColor === 'number') animateEdgeColor(partsRef.current.newstructure, step.newstructureEdgeColor);
            if (typeof step.southnewEdgeColor === 'number') animateEdgeColor(partsRef.current.southnew, step.southnewEdgeColor);
            if (typeof step.southoldEdgeColor === 'number') animateEdgeColor(partsRef.current.southold, step.southoldEdgeColor);
            if (typeof step.eastfacadeEdgeColor === 'number') animateEdgeColor(partsRef.current.eastfacade, step.eastfacadeEdgeColor);
            if (typeof step.westfacadeEdgeColor === 'number') animateEdgeColor(partsRef.current.westfacade, step.westfacadeEdgeColor);
            if (typeof step.newroofEdgeColor === 'number') animateEdgeColor(partsRef.current.newroof, step.newroofEdgeColor);
            if (typeof step.oldroofEdgeColor === 'number') animateEdgeColor(partsRef.current.oldroof, step.oldroofEdgeColor);
            if (typeof step.blueEdgeColor === 'number') animateEdgeColor(partsRef.current.blue, step.blueEdgeColor);
            if (typeof step.bridgeEdgeColor === 'number') animateEdgeColor(partsRef.current.bridge, step.bridgeEdgeColor);
            if (typeof step.cityEdgeColor === 'number') animateEdgeColor(partsRef.current.city, step.cityEdgeColor);

            // Text animation: different behavior for mobile vs desktop
            if (textRefs.current[index]) {
              // Mobile: start from bottom of screen, Desktop: start from center
              const initialY = isMobile ? 200 : 0;
              const finalY = isMobile ? -500 : -700;
              const holdDuration = 1.5; // Duration to hold at fixed position
              
              // Set initial state immediately (no animation to avoid unwanted movement)
              tl.set(textRefs.current[index], {
                opacity: 0,
                y: initialY
              }, currentTime);
              
              // Fade in at fixed position
              tl.to(textRefs.current[index], {
                opacity: 0.5,
                duration: fadeDuration,
                ease: 'power2.out'
              }, currentTime);
              
              // Becomes fully opaque quickly
              tl.to(textRefs.current[index], {
                opacity: 1,
                duration: 2,
                ease: 'power2.out'
              }, currentTime + fadeDuration);
              
              // Moves up continuously after holding at fixed position
              tl.to(textRefs.current[index], {
                y: finalY,
                duration: stepDuration - fadeDuration * 2 - holdDuration,
                ease: 'none'
              }, currentTime + fadeDuration + holdDuration);
            }
            
            // Description animation: same pattern as text
            if (descriptionRefs.current[index]) {
              // Mobile: start from bottom of screen, Desktop: start from center
              const initialY = isMobile ? 200 : 0;
              const finalY = isMobile ? -500 : -700;
              const holdDuration = 1.5; // Duration to hold at fixed position
              
              // Set initial state immediately (no animation to avoid unwanted movement)
              tl.set(descriptionRefs.current[index], {
                opacity: 0,
                y: initialY
              }, currentTime);
              
              // Fade in at fixed position
              tl.to(descriptionRefs.current[index], {
                opacity: 0.5,
                duration: fadeDuration,
                ease: 'power2.out'
              }, currentTime);
              
              // Becomes fully opaque quickly
              tl.to(descriptionRefs.current[index], {
                opacity: 1,
                duration: 0.6,
                ease: 'power2.out'
              }, currentTime + fadeDuration);
              
              // Moves up continuously after holding at fixed position
              tl.to(descriptionRefs.current[index], {
                y: finalY,
                duration: stepDuration - fadeDuration * 2 - holdDuration,
                ease: 'none'
              }, currentTime + fadeDuration + holdDuration);
            }
            
            // bridge Y-axis displacement
            if (partsRef.current.bridge.length > 0 && typeof step.bridgeY === 'number') {
              partsRef.current.bridge.forEach(bridgeMesh => {
                tl.to(bridgeMesh.position, {
                  y: step.bridgeY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }  
            // connectfacade Y-axis displacement
            if (partsRef.current.connectfacade.length > 0 && typeof step.connectfacadeY === 'number') {
              partsRef.current.connectfacade.forEach(connectfacadeMesh => {
                tl.to(connectfacadeMesh.position, {
                  y: step.connectfacadeY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }             

            // newslab Y-axis displacement
            if (partsRef.current.newslab.length > 0 && typeof step.newslabY === 'number') {
              partsRef.current.newslab.forEach(newslabMesh => {
                tl.to(newslabMesh.position, {
                  y: step.newslabY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            } 

            // blue Y-axis displacement
            if (partsRef.current.blue.length > 0 && typeof step.blueY === 'number') {
              partsRef.current.blue.forEach(blueMesh => {
                tl.to(blueMesh.position, {
                  y: step.blueY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }      

            // oldroof Y-axis displacement
            if (partsRef.current.oldroof.length > 0 && typeof step.oldroofY === 'number') {
              partsRef.current.oldroof.forEach(oldroofMesh => {
                tl.to(oldroofMesh.position, {
                  y: step.oldroofY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }

            // newroof Y-axis displacement
            if (partsRef.current.newroof.length > 0 && typeof step.newroofY === 'number') {
              partsRef.current.newroof.forEach(newroofMesh => {
                tl.to(newroofMesh.position, {
                  y: step.newroofY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }

            // southnew X/Z-axis displacement
            if (partsRef.current.southnew.length > 0 && (typeof step.southnewX === 'number' || typeof step.southnewZ === 'number')) {
              partsRef.current.southnew.forEach(southnewMesh => {
                tl.to(southnewMesh.position, {
                  x: typeof step.southnewX === 'number' ? step.southnewX : southnewMesh.position.x,
                  z: typeof step.southnewZ === 'number' ? step.southnewZ : southnewMesh.position.z,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }

            // southold X-axis displacement
            if (partsRef.current.southold.length > 0 && typeof step.southoldX === 'number') {
              partsRef.current.southold.forEach(southoldMesh => {
                tl.to(southoldMesh.position, {
                  x: step.southoldX,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }

            // city Y-axis displacement
            if (partsRef.current.city.length > 0 && typeof step.cityY === 'number') {
              partsRef.current.city.forEach(cityMesh => {
                tl.to(cityMesh.position, {
                  y: step.cityY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }            

            // eastfacade X/Z-axis displacement
            if (partsRef.current.eastfacade.length > 0 && (typeof step.eastfacadeX === 'number' || typeof step.eastfacadeZ === 'number')) {
              partsRef.current.eastfacade.forEach(eastfacadeMesh => {
                tl.to(eastfacadeMesh.position, {
                  x: typeof step.eastfacadeX === 'number' ? step.eastfacadeX : eastfacadeMesh.position.x,
                  z: typeof step.eastfacadeZ === 'number' ? step.eastfacadeZ : eastfacadeMesh.position.z,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }            

            // westfacade X/Z-axis displacement
            if (partsRef.current.westfacade.length > 0 && (typeof step.westfacadeX === 'number' || typeof step.westfacadeZ === 'number')) {
              partsRef.current.westfacade.forEach(westfacadeMesh => {
                tl.to(westfacadeMesh.position, {
                  x: typeof step.westfacadeX === 'number' ? step.westfacadeX : westfacadeMesh.position.x,
                  z: typeof step.westfacadeZ === 'number' ? step.westfacadeZ : westfacadeMesh.position.z,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }  

            // structure Y-axis displacement
            if (partsRef.current.newstructure.length > 0 && typeof step.newstructureY === 'number') {
              partsRef.current.newstructure.forEach(newstructureMesh => {
                tl.to(newstructureMesh.position, {
                  y: step.newstructureY,
                  duration: stepDuration,
                  ease: 'power2.inOut'
                }, currentTime + fadeDuration);
              });
            }  
            
            // Model rotation - data-driven
            if (model) {
              tl.to(model.rotation, {
                y: step.rotY,
                duration: stepDuration,
                ease: 'power2.inOut'
              }, currentTime + fadeDuration);
            }

            // Model global X position - data-driven
            if (model && typeof step.globalX === 'number') {
              tl.to(model.position, {
                x: isMobile ? 0 : step.globalX, // Mobile: always 0, Desktop: use step value
                duration: stepDuration,
                ease: 'power2.inOut'
              }, currentTime + fadeDuration);
            }

            // Camera displacement - data-driven（全部相对变化）
            if (camera) {
              tl.to(camera.position, {
                x: typeof step.camX === 'number' ? camera.position.x + step.camX : camera.position.x,
                y: typeof step.camY === 'number' ? camera.position.y + step.camY : camera.position.y,
                z: typeof step.camZ === 'number' ? camera.position.z + step.camZ : camera.position.z,
                duration: stepDuration,
                ease: 'power2.inOut'
              }, currentTime + fadeDuration);
            }

            // Step ends: text continues moving up and fades out
            if (textRefs.current[index]) {
              tl.to(textRefs.current[index], {
                opacity: 0,
                y: -800,
                duration: fadeDuration,
                ease: 'power2.in'
              }, currentTime + stepDuration - fadeDuration);
            }
            
            // Step ends: description continues moving up and fades out
            if (descriptionRefs.current[index]) {
              tl.to(descriptionRefs.current[index], {
                opacity: 0,
                y: -800,
                duration: fadeDuration,
                ease: 'power2.in'
              }, currentTime + stepDuration - fadeDuration);
            }

            currentTime += stepDuration;
          });
        }
      },
      (progress) => {
        console.log('Loading story model...', ((progress.loaded / progress.total) * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('Error loading story model:', error);
      }
    );
   
    // Render loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Window resize handling
    const handleResize = () => {
      if (!canvasContainerRef.current || !cameraRef.current || !rendererRef.current) return;

      const width = canvasContainerRef.current.clientWidth;
      const height = canvasContainerRef.current.clientHeight;
      const newAspect = width / height;
      const viewHeight = viewHeightRef.current;

      // Update orthographic camera parameters to maintain aspect ratio
      cameraRef.current.left = -viewHeight * newAspect;
      cameraRef.current.right = viewHeight * newAspect;
      cameraRef.current.top = viewHeight;
      cameraRef.current.bottom = -viewHeight;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && canvasContainerRef.current) {
        canvasContainerRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Adjust model scale and position when isMobile changes (without reloading)
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    
    const targetScale = isMobile ? 0.5 : 1;
    const targetX = isMobile ? 0 : -20;
    
    // Smoothly animate the changes instead of instant update
    gsap.to(model.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.5, ease: 'power2.inOut' });
    gsap.to(model.position, { x: targetX, duration: 0.5, ease: 'power2.inOut' });
  }, [isMobile]);



// ROOMS: Three.js + ScrollTrigger (NEW SECTION)
//
// IMPORTANT (place this ONE LINE up with your other refs, OUTSIDE the useEffect):
// const roomsXRef = useRef<number>(0);

useEffect(() => {
  if (!roomsCanvasContainerRef.current) return;

  const container = roomsCanvasContainerRef.current;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  roomsSceneRef.current = scene;

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  // Directional light removed for flat white appearance


  // Orthographic camera (match storymodel style)
  const aspect = containerWidth / containerHeight;
  const camera = new THREE.OrthographicCamera(
    -800 * aspect,
    800 * aspect,
    800,
    -800,
    0.1,
    5000
  );
  roomsCameraRef.current = camera;

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(containerWidth, containerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  roomsRendererRef.current = renderer;

  // Color management (prevents “too dark / black” look)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  // Root group we move (for loop)
  const root = new THREE.Group();
  roomsRootRef.current = root;
  scene.add(root);

  // Raycaster for mouse interaction
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredRoom: THREE.Object3D | null = null;
  const roomsArray: THREE.Object3D[] = [];

  let currentRoomIndex = 0; 
  let targetX = 0; 
  let currentX = 0; 
  let isTouch = false; 
  let startX = 0;
  let isDragging = false; 

  // Mouse move handler
  const onMouseMove = (event: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  const onTouchStart = (event: TouchEvent) => {
    if (!isMobile) return;
    isTouch = true;
    startX = event.touches[0].clientX;
    isDragging = false;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (!isMobile || !isTouch) return;
    const currentTouchX = event.touches[0].clientX;
    const deltaX = startX - currentTouchX;
    
    if (Math.abs(deltaX) > 10) {
      isDragging = true;
      const sensitivity = 0.003; 
      const spacing = roomsSpacingRef.current;
      const initialPos = -(spacing * 1.0) + spacing * 0.8; 
      const leftBoundary = initialPos - roomsTotalLenRef.current * 0.2; 
      const rightBoundary = initialPos + roomsTotalLenRef.current * 0.2; 
      targetX = Math.max(leftBoundary, Math.min(rightBoundary, currentX - deltaX * sensitivity));
    }
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!isMobile || !isTouch) return;
    isTouch = false;
    
    if (isDragging) {
      const touchEndX = event.changedTouches[0].clientX;
      const deltaX = startX - touchEndX;
      const threshold = 50; 
      
      if (deltaX > threshold && currentRoomIndex < 2) {
        currentRoomIndex++;
      } else if (deltaX < -threshold && currentRoomIndex > 0) {
        currentRoomIndex--;
      }

      const spacing = roomsSpacingRef.current;
      targetX = -(currentRoomIndex * spacing - spacing * 0.8);
    }
    
    isDragging = false;
  };

  if (isMobile) {
    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });
  } else {
    container.addEventListener('mousemove', onMouseMove);
  }

  // Load GLB
  const loader = new GLTFLoader();
  loader.load(
    '/models/rooms.glb',
    (gltf) => {
      const model = gltf.scene as THREE.Group;
      roomsModelRef.current = model;

      // Scale model
      model.scale.set(1.6, 1.6, 1.6); // 增大模型尺寸
      model.rotation.set(0, 0, 0);

      root.add(model);

      // 1) Room parents
      const room1 = model.getObjectByName('room1');
      const room2 = model.getObjectByName('room2');
      const room5 = model.getObjectByName('room5');

      const rooms: THREE.Object3D[] = [room1, room2, room5].filter(
        Boolean
      ) as THREE.Object3D[];

      if (!room1) console.warn('[rooms] Missing object: room1');
      if (!room2) console.warn('[rooms] Missing object: room2');
      if (!room5) console.warn('[rooms] Missing object: room5');

      // 2) Optional: recolor furniture by prefix "furniture"
      roomsPartsRef.current.furniture = [];
      roomsPartsRef.current.walls = [];
      roomsPartsRef.current.floor = [];
      roomsPartsRef.current.glass = [];

        model.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;

          const mesh = child as THREE.Mesh;
          const n = (mesh.name || "").toLowerCase();
          const mn = ((mesh.material as any)?.name || "").toLowerCase();

          // --- flags ---
          const isWindow =
            n.includes("window") || n.includes("glass") || n.includes("fenster") || n.includes("glazing") ||
            mn.includes("glass") || mn.includes("window") || mn.includes("glazing");

          const isSupport = n.includes("stütze") || n.includes("stuetze");
          const isFurniture = n.startsWith("furniture");
          const isWall = n.startsWith("wand");
          const isFloor = n.startsWith("plane");
          const isDoor = n.includes("tür");
          const isSafety = n.includes("absturzsicherung");

          // --- palette (edit freely) ---
          const WALL_BRICK = 0xffffff;
          const FLOOR_GREY = 0xffffff
          const FURN_LIGHT = 0xffffff
          const SUPPORT_DARK = 0xffffff
          const DEFAULT = 0xffffff;

          // --- per-category SURFACE settings ---
          let surfaceColor = DEFAULT;
          let surfaceOpacity = 1.0;
          let surfaceRoughness = 0.9;
          

          // --- per-category EDGE settings ---
          let edgeColor = 0x000000;  // default: black
          let edgeOpacity = 0.35;   // default: light lines
          let edgeThreshold = 15;   // your previous value

          if (isWindow) {
            surfaceColor = 0xffffff;
            surfaceOpacity = 0.35;     // transparent glass
            surfaceRoughness = 0.05;
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.3;         // 50% opacity
            edgeThreshold = 5;
          } else if (isSupport) {
            surfaceColor = SUPPORT_DARK;
            surfaceOpacity = 0.6;
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.4;         // 50% opacity
          } else if (isFurniture) {
            surfaceColor = FURN_LIGHT;
            surfaceOpacity = 1.0;
            edgeColor = 0x2563EB;      // blue for furniture
            edgeOpacity = 0.6;
          } else if (isWall) {
            surfaceColor = WALL_BRICK;
            surfaceOpacity = 1;   
            surfaceRoughness = 0.2;  // slight transparency (optional)
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.5;
          } else if (isFloor) {
            surfaceColor = FLOOR_GREY;
            surfaceOpacity = 0.8;
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.20;
          }
           else if (isDoor) {
            surfaceColor = FLOOR_GREY;
            surfaceOpacity = 0.8;
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.3;         // 50% opacity
          } else if (isSafety) {
            surfaceColor = 0xffffff;
            surfaceOpacity = 0.4;
            edgeColor = 0x000000;      // black
            edgeOpacity = 0.5;
          }


          // --- apply SURFACE material ---
          const mat = new THREE.MeshBasicMaterial({
            color: surfaceColor,
            side: THREE.DoubleSide,
            transparent: surfaceOpacity < 1,
            opacity: surfaceOpacity,
          });

          mesh.material = mat;
          (mesh.material as THREE.Material).needsUpdate = true;

          // --- remove old edges if any (avoid duplicates) ---
          mesh.children
            .filter((c) => (c as any).userData?.isEdgeHelper)
            .forEach((c) => mesh.remove(c));

          // --- add EDGES overlay ---
          const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, edgeThreshold);
          const lineMat = new THREE.LineBasicMaterial({
            color: edgeColor,
            transparent: edgeOpacity < 1,
            opacity: edgeOpacity,
          });
          const edgeLines = new THREE.LineSegments(edgesGeo, lineMat);
          edgeLines.userData.isEdgeHelper = true;
          mesh.add(edgeLines);
        });


      // 3) Auto spacing (based on room width) + layout
      const roomWidths = rooms.map((r) => {
        const b = new THREE.Box3().setFromObject(r);
        const s = b.getSize(new THREE.Vector3());
        return s.x;
      });

      const maxWidth = Math.max(...roomWidths, 1);
      const gap = isMobile ? maxWidth * 0.6 : maxWidth * 0.7; 
      const spacing = maxWidth + gap;
      roomsSpacingRef.current = spacing;

      const axoAngleY = Math.PI / 4; // 45°
      const axoAngleX = Math.PI / 6; // 30°

      rooms.forEach((r, i) => {
  r.position.x = i * spacing;

  const flipY = Math.PI /2 ; // 180° -> Zickzack-Wand nach vorne
  r.rotation.set(axoAngleX, axoAngleY + flipY, 0);
  
  // Store original scale and add to array for raycasting
  r.userData.originalScale = { x: r.scale.x, y: r.scale.y, z: r.scale.z };
  r.userData.targetScale = 1.0;
  roomsArray.push(r);
});


      // Start offset 
      if (isMobile) {
        root.position.x = -spacing * 1.0 + spacing * 0.5; 
      } else {
        root.position.x = -(spacing * 1.0) + spacing * 0.8;
      }
      roomsXRef.current = root.position.x; // IMPORTANT: init smoothing state
      
      if (isMobile) {
        targetX = root.position.x;
        currentX = root.position.x;
      }

      // Loop length (one sequence only)
      roomsTotalLenRef.current = rooms.length * spacing;

      // Camera framing
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const viewHeight = isMobile ? size.y * 1.0 : size.y * 0.5;
      roomsViewHeightRef.current = viewHeight;

      camera.top = viewHeight;
      camera.bottom = -viewHeight;
      camera.left = -viewHeight * aspect;
      camera.right = viewHeight * aspect;
      camera.updateProjectionMatrix();

      const center = box.getCenter(new THREE.Vector3());
      const camDistance = Math.max(size.x, size.y, size.z) * 2.2;
      camera.position.set(center.x, center.y + size.y * 0.2, center.z + camDistance);
      camera.lookAt(center);
    },
    undefined,
    (error) => {
      console.error('Error loading rooms model:', error);
    }
  );

  // Render loop (static, no movement)
  const animate = () => {
    roomsAnimRef.current = requestAnimationFrame(animate);

    const cam = roomsCameraRef.current;
    const ren = roomsRendererRef.current;
    const scn = roomsSceneRef.current;
    const root = roomsRootRef.current;

    if (cam && ren && scn && root) {
      if (isMobile) {
        currentX += (targetX - currentX) * 0.1;
        root.position.x = currentX;
      }

      // Raycasting for hover detection 
      if (!isMobile) {
        raycaster.setFromCamera(mouse, cam);
        const intersects = raycaster.intersectObjects(roomsArray, true);

        // Find which room is being hovered
        let newHoveredRoom: THREE.Object3D | null = null;
        if (intersects.length > 0) {
          let obj = intersects[0].object;
          // Traverse up to find the room parent
          while (obj.parent && !roomsArray.includes(obj)) {
            obj = obj.parent;
          }
          if (roomsArray.includes(obj)) {
            newHoveredRoom = obj;
          }
        }

        // Update hover state
        if (hoveredRoom !== newHoveredRoom) {
          if (hoveredRoom) {
            hoveredRoom.userData.targetScale = 1.0;
          }
          if (newHoveredRoom) {
            newHoveredRoom.userData.targetScale = 1.3; 
          }
          hoveredRoom = newHoveredRoom;
        }

        // Smooth scale animation for all rooms
        roomsArray.forEach((room) => {
          const targetScale = room.userData.targetScale || 1.0;
          const originalScale = room.userData.originalScale;
          if (originalScale) {
            room.scale.x += (originalScale.x * targetScale - room.scale.x) * 0.1;
            room.scale.y += (originalScale.y * targetScale - room.scale.y) * 0.1;
            room.scale.z += (originalScale.z * targetScale - room.scale.z) * 0.1;
          }
        });
      }

      ren.render(scn, cam);
    }
  };
  animate();

  // Resize handling
  const handleResize = () => {
    if (!roomsCanvasContainerRef.current || !roomsCameraRef.current || !roomsRendererRef.current)
      return;

    const w = roomsCanvasContainerRef.current.clientWidth;
    const h = roomsCanvasContainerRef.current.clientHeight;
    const newAspect = w / h;
    const viewHeight = roomsViewHeightRef.current;

    roomsCameraRef.current.left = -viewHeight * newAspect;
    roomsCameraRef.current.right = viewHeight * newAspect;
    roomsCameraRef.current.top = viewHeight;
    roomsCameraRef.current.bottom = -viewHeight;
    roomsCameraRef.current.updateProjectionMatrix();

    roomsRendererRef.current.setSize(w, h);
  };

  window.addEventListener('resize', handleResize);

  // Cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
    
    if (isMobile) {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    } else {
      container.removeEventListener('mousemove', onMouseMove);
    }
    
    if (roomsAnimRef.current) cancelAnimationFrame(roomsAnimRef.current);
    if (roomsRendererRef.current && roomsCanvasContainerRef.current) {
      roomsCanvasContainerRef.current.removeChild(roomsRendererRef.current.domElement);
    }
    roomsRendererRef.current?.dispose();
  };
}, []);


  // ScrollTrigger for frame animation and headline
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Frame animation ScrollTrigger
    const frameSection = document.querySelector('.intro-frame-section');
    if (frameSection) {
      ScrollTrigger.create({
        trigger: frameSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const frameIdx = Math.round(progress * (totalFrames - 1)) + 1;
          setCurrentFrame(Math.min(totalFrames, Math.max(1, frameIdx)));
          
          // Intro end progress (last 12%)
          const introEndStart = 0.88;
          const endP = clamp01((progress - introEndStart) / (1 - introEndStart));
          setIntroEndP(endP);
        }
      });
    }
    
    // Headline ScrollTrigger - trigger on the section itself
    const headlineSection = document.querySelector('.intro-section');
    if (headlineSection) {
      ScrollTrigger.create({
        trigger: headlineSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const base = self.progress;
          // Phase split: first 18% -> panel (faster), ab 18% -> text
          const panel = Math.max(0, Math.min(1, base / 0.18));
          const text = Math.max(0, Math.min(1, (base - 0.18) / 0.82));
          setHeadlinePanelP(panel);
          setHeadlineTextP(text);
        }
      });
    }
    
    // History ScrollTrigger
    const historySection = document.querySelector('.history-section');
    if (historySection && historyAnchorRef.current) {
      // History title progress
      ScrollTrigger.create({
        trigger: historyAnchorRef.current,
        start: 'top 95%',
        end: 'bottom 65%',
        scrub: true,
        onUpdate: (self) => {
          setHistoryP(self.progress);
        }
      });
      
      // History scroll progress (for image swap and typed text)
      ScrollTrigger.create({
        trigger: historySection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          setHistoryScroll(self.progress);
        }
      });
    }
    
    // Design ScrollTrigger
    const designSection = document.querySelector('.design-section');
    if (designSection && designAnchorRef.current) {
      // Design title progress
      ScrollTrigger.create({
        trigger: designAnchorRef.current,
        start: 'top 95%',
        end: 'bottom 65%',
        scrub: true,
        onUpdate: (self) => {
          setDesignP(self.progress);
        }
      });
      
      // Design scroll progress (for map scaling and text reveals)
      ScrollTrigger.create({
        trigger: designSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          setDesignScroll(self.progress);
        }
      });
    }
     // Concept ScrollTrigger
        if (conceptAnchorRef.current) {
      ScrollTrigger.create({
        trigger: conceptAnchorRef.current,
        start: 'top 95%',
        end: 'bottom 65%',
        scrub: true,
        onUpdate: (self) => {
          setConceptP(self.progress);
        }
      });
    }
    
    // Preserve/Insert/Live ScrollTrigger
    const preserveInsertSection = document.querySelector('.preserve-insert-section');
    if (preserveInsertSection) {
      ScrollTrigger.create({
        trigger: preserveInsertSection,
        start: 'top 85%',
        end: 'top 25%',
        scrub: true,
        onUpdate: (self) => {
          setPreserveInsertProgress(self.progress);
        }
      });
    }
    
    // Architecture ScrollTrigger
    if (architectureAnchorRef.current) {
      ScrollTrigger.create({
        trigger: architectureAnchorRef.current,
        start: 'top 95%',
        end: 'bottom 65%',
        scrub: true,
        onUpdate: (self) => {
          setArchitectureP(self.progress);
        }
      });
    }
    
    // Renderings ScrollTrigger
    const renderingsSection = document.querySelector('.renderings-section');
    if (renderingsSection) {
      ScrollTrigger.create({
        trigger: renderingsSection,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          setRenderingsP(self.progress);
        }
      });
    }
    
    return () => {
      ScrollTrigger.getAll().forEach(t => {
        if (t.trigger === frameSection || t.trigger === headlineSection || t.trigger === historySection || t.trigger === designSection || t.trigger === preserveInsertSection || t.trigger === architectureAnchorRef.current || t.trigger === renderingsSection) {
          t.kill();
        }
      });
    };
  }, [totalFrames]);


  // Global scroll progress state (entire page)
  const [scrollProgress, setScrollProgress] = useState(0);
  const headlineSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const totalScrollable = docHeight - winHeight;
      let progress = 0;
      if (totalScrollable > 0) {
        progress = scrollTop / totalScrollable;
        progress = Math.max(0, Math.min(1, progress));
      }
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* GLOBAL Sidebar vertical line with scroll progress (fixed, for entire page) */}
      <div
        style={{
          position: 'fixed',
          left: isMobile ? 0 : 20,
          top: 0,
          height: '100vh',
          width: '60px',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          transform: isMobile ? 'translateX(-15px)' : 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '90%',
            margin: '5% 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Static vertical line */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: '2px',
              height: '100%',
              background: '#d1d5db', // light grey
              transform: 'translateX(-50%)',
              zIndex: 1,
            }}
            aria-label="Static sidebar line"
            title="Static sidebar line"
          />
          {/* Scroll progress line */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              width: '2px',
              height: `${scrollProgress * 100}%`,
              background: '#111',
              transform: 'translateX(-50%)',
              zIndex: 2,
              transition: 'height 0.2s cubic-bezier(.4,0,.2,1)',
            }}
            aria-label="Scroll progress line"
            title="Scroll progress line"
          />
        </div>
      </div>

      {/* ...existing code... */}
      {/* NEW: Frame animation section */}
      <section
        className="intro-frame-section relative"
        style={{ height: '150vh', marginBottom: '0' }}
      >
        <div className="w-full h-full bg-white" style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', overflow: 'hidden', left: 0 }}>
          <img
            src={`/storyframes/story${currentFrame.toString().padStart(2, "0")}.jpg`}
            alt={`frame ${currentFrame}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              display: 'block',
            }}
            draggable={false}
          />

          {!allLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.55)',
              }}
            >
              <div style={{ fontFamily: 'Poppins, Arial, sans-serif', color: '#334155', fontSize: 16 }}>
                Loading… {imagesLoaded}/{totalFrames}
              </div>
            </div>
          )}
        </div>
      </section>
      <div className="w-full px-4 md:px-12">
        {/* CSS animations for Design section */}
        <style>{`
@keyframes rosePulseRing {
  0%   { transform: translate3d(-50%,-50%,0) scale(0.35); opacity: 0.55; }
  70%  { opacity: 0; }
  100% { transform: translate3d(-50%,-50%,0) scale(4.2); opacity: 0; }
}
      `}</style>
      
      

      {/* NEW: Headline section */}
      <section
        className="intro-section"
        ref={headlineSectionRef}
        style={{
          height: '200vh',
          position: 'relative',
          background: '#fff',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            background: '#fff',
          }}
        >
  

          {/* Content */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              width: '100%',
            }}
          >
            <div
              ref={headlineRef}
              style={{
                position: 'relative',
                zIndex: 1,
                padding: '7vh 6vw',
                textAlign: 'center',
                maxWidth: 1800,
              }}
            >
              <div
                style={{
                  fontFamily: 'Poppins, Arial, sans-serif',
                  fontWeight: 300,
                  lineHeight: 0.92,
                  letterSpacing: '-0.02em',
                  fontSize: 'clamp(54px, 8vw, 140px)',
                  color: headlinePanelP > 0.85 ? '#fff' : '#111',
                  margin: 0,
                }}
              >
                {headlineNodes}
                <div
                  style={{
                    marginTop: '18px',
                    fontSize: '2.5rem',
                    lineHeight: 1.3,
                    opacity: 0.9,
                    color: '#2563eb',
                    textAlign: 'center',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    maxWidth: 720,
                  }}
                >
                  A story told through time, structure, and material.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    

      {/* NEW: History section */}
      <section
        ref={historySectionRef}
        className="history-section"
        style={{
          background: '#fff',
          position: 'relative',
          height: '220vh',
          paddingTop: '0px',
          paddingBottom: 0,
          marginLeft: '3vw',
          
        }}
      >
        <div style={{ position: 'relative', height: '220vh' }}>
          <div style={{ position: 'sticky', top: '32px', height: '100vh' }}>
            {/* Title */}
            <div style={{ paddingTop: '20px' }}>
              <div ref={historyAnchorRef} />
              {(() => {
                const t = smoothstep(historyP);
                const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
                const r = mix(0x25, 0x11);
                const g = mix(0x63, 0x11);
                const b = mix(0xeb, 0x11);
                const historyTitleColor = `rgb(${r}, ${g}, ${b})`;
                return (
                  <div style={{
                display: 'flex',
                alignItems: 'center',
                fontFamily: 'Poppins, Arial, sans-serif',
                 fontWeight: 700,
                fontSize: isMobile ? '1.8rem' : '2.6rem',
                color: historyTitleColor,
                letterSpacing: '0.04em',
                marginBottom: 8,
                }}>
            <span style={{ color: '#888', fontSize: isMobile ? '1.5rem' : '2rem', marginRight: 14 }}>01</span>
            HISTORY
          </div>
                );
              })()}
            </div>
            {/* Content grid */}
            <div
              className="w-full px-4 md:px-12" // Mobil: 16px, Desktop: 48px
              style={{
                marginTop: isMobile ? '10px' : '70px',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1.2fr',
                gridTemplateRows: isMobile ? 'auto auto' : 'auto',
                gap: isMobile ? '30px' : '60px',
                alignItems: 'start',
              }}
            >
              {/* Image section - shows first on mobile, second on desktop */}
              <div
                style={{
                  position: 'relative',
                  width: isMobile ? '80%' : 'min(890px, 60vw)',
                  height: isMobile ? 'auto' : 'min(620px, 50vw)',
                  aspectRatio: isMobile ? '4/3' : undefined,
                  marginTop: '0',
                  justifySelf: isMobile ? 'center' : 'start',
                  transform: isMobile ? 'none' : 'translateX(-40px)',
                  order: isMobile ? 1 : 2,
                  maxWidth: isMobile ? '85vw' : undefined,
                }}>
                <img
                  src={storytellingImages[historyImageIndex]}
                  alt={`History image ${historyImageIndex + 1}`}
                    style={{
                      position: isMobile ? 'static' : 'absolute',
                      inset: isMobile ? 'auto' : 0,
                      width: '100%',
                      height: isMobile ? 'auto' : '100%',
                      objectFit: isMobile ? 'cover' : 'cover',
                      borderRadius: 0,
                      boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
                      willChange: 'transform, opacity',
                      transformOrigin: 'center center',
                      opacity: 1,
                      transition: 'opacity 0.3s',
                    }}
                />
              </div>
              
              {/* Text section - shows second on mobile, first on desktop */}
              <div
                style={{
                  fontFamily: 'Poppins, Arial, sans-serif',
                  color: '#111',
                  maxWidth: isMobile ? '100%' : 620,
                  textAlign: 'start',
                  alignSelf: 'start',
                  order: isMobile ? 2 : 1,
                  padding: isMobile ? '0 10px' : '0',
                }}
              >
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    lineHeight: isMobile ? 1.4 : 1.25,
                  }}
                >
                  {typedHistoryText}
                  <span style={{ opacity: 0.35 }}>▍</span>
                </div>

                <div style={{ height: isMobile ? 20 : 28 }} />

                <div style={{ 
                  fontSize: isMobile ? 11 : 13, 
                  opacity: 0.9, 
                  letterSpacing: '0.06em', 
                  color: '#2563eb',
                  lineHeight: isMobile ? 1.3 : 1.2,
                }}>
                  LISTED CULTURAL HERITAGE — BAVARIAN MONUMENT LIST: D-1-62-000-7881.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
<style>{`
  @media (max-width: 768px) {
    .history-section,
    .preserve-insert-section,
    .design-section,
    .architecture-section,
    .renderings-section {
      padding: 12px 4px !important;
      margin: 0 !important;
      height: auto !important;
      min-height: 60vh !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .history-section > div,
    .preserve-insert-section > div,
    .design-section > div,
    .architecture-section > div,
    .renderings-section > div {
      max-width: 100% !important;
      overflow-x: visible !important;
    }
    /* 通用图片：正常流 */
    .history-section img,
    .preserve-insert-section img,
    .design-section img,
    .renderings-section img {
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      object-fit: cover !important;
      position: static !important;
      left: 0 !important;
      transform: none !important;
    }

    /* ❗Architecture 里的 ImageCompare：强制保持叠加模型 */
    .architecture-section .image-compare img {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      transform: none !important;
    }
  }
  @media (max-width: 480px) {
    .history-section,
    .preserve-insert-section,
    .design-section,
    .architecture-section,
    .renderings-section {
      padding: 6px 0 !important;
      min-height: 40vh !important;
    }
  }
`}</style>
      {/* NEW: Design section */}
      <section
        ref={designSectionRef}
        className="design-section"
        style={{
          background: '#fff',
          position: 'relative',
          height: '250vh',
          paddingTop: '40px',
          paddingBottom: '40px',
          marginLeft: '3vw',
        }}
      >
        <div style={{ position: 'relative', height: '250vh' }}>
          <div style={{ position: 'sticky', top: '32px', height: '100vh' }}>
            {/* Title */}
            <div style={{ paddingTop: '20px' }}>
              <div ref={designAnchorRef} />
              {(() => {
                const t = smoothstep(designP);
                const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
                const r = mix(0x25, 0x11);
                const g = mix(0x63, 0x11);
                const b = mix(0xeb, 0x11);
                const designTitleColor = `rgb(${r}, ${g}, ${b})`;
                return (
                  <div style={{
                  display: 'flex',
                alignItems: 'center',
                fontFamily: 'Poppins, Arial, sans-serif',
                 fontWeight: 700,
                fontSize: isMobile ? '1.8rem' : '2.6rem',
                color: designTitleColor,
                letterSpacing: '0.04em',
                marginBottom: 8,
              }}>
                <span style={{ color: '#888', fontSize: isMobile ? '1.5rem' : '2rem', marginRight: 14 }}>02</span>
                DESIGN
              </div>
                );
              })()}
            </div>
            
            {/* Content */}
            <div
              className="w-full px-4 md:px-12" // Mobil: 16px, Desktop: 48px
              style={{
                marginTop: isMobile ? '15px' : '54px',
                maxWidth: 1400,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {(() => {
                const p = smoothstep(clamp01(designScroll));
                const raw = clamp01(designScroll);
                const mapRange = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
                const quant = (pp: number, steps = 120) => Math.round(pp * steps) / steps;
                
                const textDx = p * 28;
                const textDy = (1 - p) * 10;
                
                return (
                    <div
                      style={{
                        position: 'relative',
                        fontFamily: 'Poppins, Arial, sans-serif',
                        color: '#111',
                        opacity: 1,
                        minHeight: 120,
                        overflow: 'visible',
                    }}
                  >
                    {/* Orange headline text (3 lines) */}
                    {(() => {
                      const p = smoothstep(mapRange(raw, 0.20, 0.35));
                      const p1 = clamp01(p / 0.45);
                      const p2 = clamp01((p - 0.45) / 0.35);
                      const p3 = clamp01((p - 0.80) / 0.20);
                      
                      const lineStyle = (pp: number): React.CSSProperties => {
                        const q = quant(pp);
                        return {
                          display: 'block',
                          whiteSpace: isMobile ? 'normal' : 'nowrap',
                          fontWeight: 500,
                          color: '#343434',
                          lineHeight: isMobile ? 1.2 : 1.28,
                          letterSpacing: '-0.01em',
                          fontSize: isMobile ? '20px' : '35px',
                          maxWidth: 1400,
                          marginBottom: isMobile ? 8 : 0,
                          clipPath: `inset(0 ${100 - q * 100}% 0 0)`,
                          WebkitClipPath: `inset(0 ${100 - q * 100}% 0 0)`,
                          transition: 'clip-path 0.18s cubic-bezier(.4,0,.2,1)',
                        };
                      };
                      
                      return (
                        <div>
                          <span style={lineStyle(p1)}>The Hochvolthaus is located on TUM`s main campus, a key connection</span>
                          <span style={lineStyle(p2)}>between campus life and the city streets. This location opens the building</span>
                        <span style={lineStyle(p3)}>to the public while keeping a strong campus identity.</span>
                        </div>
                      );
                    })()}
                    
                    {/* Blue site plan image */}
                    <div
                      style={{
                        float: isMobile ? 'none' : 'left',
                        width: isMobile ? '100%' : 'clamp(700px, 70vw, 1000px)',
                        aspectRatio: '1.5 / 1',
                        marginRight: isMobile ? 'auto' : 36,
                        marginLeft: isMobile ? 'auto' : 120,
                        marginBottom: isMobile ? 30 : 10,
                        marginTop: isMobile ? 10 : 0,
                        overflow: 'hidden',
                        borderRadius: 0,
                        position: 'relative',
                        left: isMobile ? '0' : '2.5cm',
                        maxWidth: isMobile ? '600px' : 800,
                        // Zoom effect: scale from 0.6 to 1.0, synchronized with text reveal (p2)
                        transform: (() => {
                          // Use the same progress as the second headline line (p2)
                          const p = smoothstep(clamp01(designScroll));
                          const mapRange = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
                          const headlineP = smoothstep(mapRange(p, 0.20, 0.35));
                          const p2 = clamp01((headlineP - 0.45) / 0.35);
                          return `translate3d(0,0,0) scale(${0.6 + 0.4 * p2})`;
                        })(),
                        transition: 'transform 0.4s cubic-bezier(.4,0,.2,1)',
                        willChange: 'transform',
                      }}
                    >
                      <img
                        src="/storytelling/bluesiteplan18.02e.png"
                        alt="Blue site plan"
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          display: 'block',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                      />
                      
                      {/* Location marker with pulse rings, erst sichtbar nach Bild-Erscheinen */}
                      {(() => {
                        // Nutze denselben Progress wie für das Bild-Scaling (p2)
                        const p = smoothstep(clamp01(designScroll));
                        const mapRange = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
                        const headlineP = smoothstep(mapRange(p, 0.20, 0.35));
                        const p2 = clamp01((headlineP - 0.45) / 0.35);
                        // Marker erst ab p2 > 0.1 sichtbar, dann weich einblenden
                        const markerOpacity = Math.max(0, Math.min(1, (p2 - 0.1) / 0.2));
                        return (
                          <div
                            style={{
                              position: 'absolute',
                             left: isMobile ? '16.9%' : '16.7%',
                             top:  isMobile ? '36.6%' : '42.5%',
                             width: 14,
                              height: 14,
                              transform: 'translate3d(-50%, -50%, 0)',
                              zIndex: 5,
                              pointerEvents: 'none',
                              opacity: markerOpacity,
                              transition: 'opacity 0.4s cubic-bezier(.4,0,.2,1)',
                            }}
                          >
                            {/* Ring 1 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                border: '3px solid rgb(235, 103, 9)',
                                animation: 'rosePulseRing 1.8s ease-out infinite',
                              }}
                            />
                            {/* Ring 2 */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                border: '3px solid rgba(249, 116, 22, 0.9)',
                                animation: 'rosePulseRing 1.8s ease-out infinite',
                                animationDelay: '0.6s',
                              }}
                            />
                            {/* Center dot */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                background: '#f97316',
                                boxShadow: '0 8px 18px rgba(249,115,22,0.30)',
                                transform: 'translate3d(-50%, -50%, 0)',
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Text wrapping around image */}
                    <div
                      style={{
                        fontFamily: 'Poppins, Arial, sans-serif',
                        fontSize: isMobile ? 18 : 28,
                        letterSpacing: '-0.02em',
                        lineHeight: isMobile ? 1.3 : 1.08,
                        color: '#111',
                        maxWidth: 1400,
                        left: isMobile ? '0' : '3cm',
                        position: 'relative',
                        marginBottom: isMobile ? 15 : 32,
                        marginTop: isMobile ? 10 : 300,
                        textAlign: isMobile ? 'center' : 'left',
                        padding: isMobile ? '0 20px' : '0',
                      }}
                    >
                      <div style={{ height: isMobile ? 8 : 14 }} />
                      {(() => {
                        // Use the same progress as the second headline line (p2)
                        const p = smoothstep(clamp01(designScroll));
                        const mapRange = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));
                        const quant = (pp: number, steps = 120) => Math.round(pp * steps) / steps;
                        // Headline p2 logic:
                        const headlineP = smoothstep(mapRange(p, 0.20, 0.35));
                        const p2 = clamp01((headlineP - 0.45) / 0.35);
                        const lineStyle = (pp: number): React.CSSProperties => {
                          const q = quant(pp);
                          return {
                            display: 'block',
                            whiteSpace: 'normal',
                            textAlign: 'center',
                            fontWeight: 500,
                            color: '#545656',
                            lineHeight: isMobile ? 1.4 : 1.08,
                            letterSpacing: '-0.03em',
                            fontSize: isMobile ? '16px' : '24px',
                            maxWidth: isMobile ? '100%' : 1000,
                            marginBottom: isMobile ? 2 : 6,
                            clipPath: `inset(0 ${100 - q * 100}% 0 0)`,
                            WebkitClipPath: `inset(0 ${100 - q * 100}% 0 0)`,
                            transition: 'clip-path 0.18s cubic-bezier(.4,0,.2,1)',
                          };
                        };
                        return (
                          <span style={lineStyle(p2)}>
                            Brick architecture is common in the immediate context around the site.
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* Model scrolling section */}
      <div ref={containerRef} className="relative w-full bg-white" style={{ height: '800vh' }}>
        {/* Concept Title */}
        <div
        ref={conceptAnchorRef}
        style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            width: '100%',
            paddingTop: '60px',
            paddingBottom: 0,
            fontFamily: 'Poppins, Arial, sans-serif',
            fontWeight: 700,
            fontSize: isMobile ? '1.8rem' : '2.6rem',
            color: (() => {
            const t = smoothstep(conceptP);
            const mix = (a, b) => Math.round(a + (b - a) * t);
            const r = mix(0x25, 0x11);
            const g = mix(0x63, 0x11);
            const b = mix(0xeb, 0x11);
            return `rgb(${r}, ${g}, ${b})`;
            })(),
            letterSpacing: '0.04em',
            marginBottom: 0,
            marginTop: '10px',
            maxWidth: 1400,
            marginLeft: isMobile ? '0vw' : '3vw',
            marginRight: '3vw',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#888', fontSize: isMobile ? '1.5rem' : '2rem', marginRight: 14 }}>03</span>
          CONCEPT
        </div>
        <div
          ref={canvasContainerRef}
          className="bg-white"
          style={{ position: 'sticky', top: 0, width: '100%', height: '100vh', zIndex: 5, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="absolute inset-0 pointer-events-none z-10 flex items-end justify-start p-8">
          {animationSteps.map((step, index) => (
            <div key={index} className="absolute" style={{
              right: isMobile ? '50%' : '20px',
              bottom: isMobile ? 'auto' : '32px',
              top: isMobile ? '50%' : 'auto',
              transform: isMobile ? 'translate(50%, -50%)' : 'none',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              <div
                ref={el => { textRefs.current[index] = el; }}
                className="text-5xl text-blue-600 mb-4"
                style={{ fontSize: "24px", opacity: 0 }}
              >
                {step.text}
              </div>
              <div
                ref={el => { descriptionRefs.current[index] = el; }}
                className="text-lg text-slate-500"
                style={{   maxWidth: isMobile ? "90vw" : "300px",
                textAlign: isMobile ? "center" : "justify",
                marginLeft: "0",
                fontSize: "14px",
                opacity: 0 }}
              >
                {step.description}
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>


{/* ROOMS scrolling section (NEW) */}
<section
  ref={roomsContainerRef}
  className="rooms-scroll-section"
  style={{
    height: '45vh',
    background: '#fff',
    width: '100%',
    margin: 0,
    padding: 0,
    position: 'relative',
    overflow: 'hidden',
  }}
>
  <div
    ref={roomsCanvasContainerRef}
    style={{
      position: 'sticky',
      top: 0,
      left: 0,
      width: '100vw',
      height: '33vh',
      background: '#fff',
      zIndex: 5,
      pointerEvents: 'auto',
      cursor: 'pointer',
    }}
  />
</section>

      {/* Renderings section  */}
      <section
        className="renderings-section"
        style={{
          background: '#f3f4f6',
          height: isMobile ? 'auto' : '220vh',
          marginLeft: '3vw',
          marginRight: '3vw',
          position: 'relative',
        }}
      >
        <div
          style={
            isMobile
              ? { position: 'relative' }
              : { position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }
          }
        >
          {isMobile ? (
            // ===== 移动端：静态纵向排列 =====
            <div>
              {[
                '/storytelling/newbuilding_inside_3.jpeg',
                '/storytelling/newbuilding_inside_1.jpeg',
                '/storytelling/newbuilding_inside_2.jpeg',
              ].map((src, i) => (
                <div key={i} style={{ marginBottom: '16px' }}>
                  <img
                    src={src}
                    alt={`Rendering ${i + 1}`}
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (

            (() => {
              const p = smoothstep(renderingsP);
              const gutter = 3;
              const x = -(p * 180) + (p * gutter);

              return (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      width: '263vw',
                      transform: `translate3d(${x}vw, 0, 0)`,
                      willChange: 'transform',
                    }}
                  >
                    {[
                      '/storytelling/newbuilding_inside_3.jpeg',
                      '/storytelling/newbuilding_inside_1.jpeg',
                      '/storytelling/newbuilding_inside_2.jpeg',
                    ].map((src, i) => (
                      <div key={i} style={{ width: '100vw', padding: '0 3vw' }}>
                        <img
                          src={src}
                          alt={`Rendering ${i + 1}`}
                          style={{
                            width: '100%',
                            height: '76vh',
                            objectFit: 'cover',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>


      

      {/* NEW: Architecture section */}
      <section
        className="architecture-section"
        style={{
          background: '#f3f4f6',
          marginLeft: '3vw',
          marginRight: '3vw',
          position: 'relative',
          paddingTop: '0px',
          paddingBottom: 0,
        }}
      >
        {/* Sticky Title */}
        <div style={{ position: 'sticky', top: '32px', zIndex: 20}}>
          <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
            <div ref={architectureAnchorRef} />
            {(() => {
              const t = smoothstep(architectureP);
              const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
              const r = mix(0x25, 0x11);
              const g = mix(0x63, 0x11);
              const b = mix(0xeb, 0x11);
              const architectureTitleColor = `rgb(${r}, ${g}, ${b})`;
              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'Poppins, Arial, sans-serif',
                  fontWeight: 700,
                  fontSize: isMobile ? '1.8rem' : '2.6rem',
                  color: architectureTitleColor,
                  letterSpacing: '0.04em',
                  marginBottom: 0,
                }}>
                  <span style={{ color: '#888', fontSize: isMobile ? '1.5rem' : '2rem', marginRight: 14 }}>04</span>
                  ARCHITECTURE
                </div>
              );
            })()}
          </div>
        </div>
        
        {/* Content */}
        <div style={{ maxWidth: 2000, margin: '0 auto', paddingTop: '40px' }}>
          {/* Grid: Ground Floor und Section untereinander */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 100, marginTop: 30, alignItems: 'center' }}>
            {/* Ground floor */}
            <div>
              <div style={{ fontFamily: 'Poppins, Arial, sans-serif', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65, marginBottom: 12 }}>
                Ground Floor — Drag the divider
              </div>
              <ImageCompare
                beforeSrc="/storytelling/oldbuilding_groundfloorplan1.png"
                afterSrc="/storytelling/newbuilding_groundfloorplan_1.png"
                labelBefore="OLD"
                labelAfter="NEW"
                width={isMobile ? 'min(92vw, 520px)' : '700px'}
                height={isMobile ? 'auto' : '700px'}
                aspectRatio="1 / 1"       
                maxWidth="100%"
              />
            </div>

            {/* Section */}
            <div>
              <div style={{ fontFamily: 'Poppins, Arial, sans-serif', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.65, marginBottom: 12 }}>
                Section — Drag the divider
              </div>
              <ImageCompare
                beforeSrc="/storytelling/oldbuilding_longitude_section1.png"
                afterSrc="/storytelling/newbuilding_longitude_section1.png"
                labelBefore="BEFORE"
                labelAfter="AFTER"
                width={isMobile ? 'min(92vw, 900px)' : '1200px'}
                height={isMobile ? 'auto' : '700px'}
                aspectRatio="16 / 9"        
                maxWidth="100%"
              />
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Preserve/Insert/Live section - */}
      <section
        ref={preserveInsertRef}
        className="preserve-insert-section"
        style={{
          background: '#f3f4f6',
          marginLeft: '3vw',
          marginRight: '3vw',
          height: '80vh',
          position: 'relative',
          
          
        }}
      >
        <div style={{ position: 'sticky', top: 0, height: '40vh' }}>
          {(() => {
            const p = smoothstep(clamp01(preserveInsertProgress));
            
            // Different animation logic for mobile vs desktop
            let preserveLeft, insertLeft, liveLeft;
            let preserveTop, insertTop, liveTop;
            let preserveTransform, insertTransform, liveTransform;
            
            if (isMobile) {
              // Mobile: vertical stack layout
              preserveLeft = '50%';
              insertLeft = '50%'; 
              liveLeft = '50%';
              
              // Vertical positions for mobile - start from center, then spread vertically with more space
              preserveTop = `${ -70 * p}%`; 
              liveTop = '0%';                    // stays center
              insertTop = `${70 * p}%`;  
              
              preserveTransform = 'translate3d(-50%, -50%, 0)';
              insertTransform = 'translate3d(-50%, -50%, 0)';
            } else {
              // Desktop: keep original pixel-based animation
              const spread = 420;
              const leftX = -spread * p;
              const rightX = spread * p;
              
              preserveLeft = '55%';
              insertLeft = '65%';
              liveLeft = '70%';
              
              preserveTop = '50%';
              insertTop = '50%';
              liveTop = '50%';
              
              preserveTransform = `translate3d(-50%, -50%, 0) translate3d(${leftX}px, 0, 0)`;
              insertTransform = `translate3d(-50%, -50%, 0) translate3d(${rightX}px, 0, 0)`;
            }
            
            const liveOpacity = clamp01((p - 0.15) / 0.35);
            const liveScale = 0.85 + liveOpacity * 0.15;
            liveTransform = `translate3d(-50%, -50%, 0) scale(${liveScale})`;
            
            return (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 18,
                  padding: '0 6vw',
        
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    height: 220,
                    marginTop: '200px',
                  }}
                >
                  {/* PRESERVE - moves left on desktop, top on mobile */}
                  <div
                    style={{
                      position: 'absolute',
                      left: preserveLeft,
                      top: preserveTop,
                      transform: preserveTransform,
                      willChange: 'transform',
                      fontFamily: 'Poppins, Arial, sans-serif',
                      fontWeight: 300,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontSize: isMobile ? 'clamp(3.6rem, 9vw, 8.5rem)' : 'clamp(3.4rem, 8vw, 8.8rem)',
                      color: '#2563eb',
                      whiteSpace: 'nowrap',
                      
                    }}
                  >
                    {renderHoverWord('PRESERVE', 'preserve', hoveredLetter, setHoveredLetter)}
                  </div>
                  {/* INSERT - moves right on desktop, bottom on mobile */}
                  <div
                    style={{
                      position: 'absolute',
                      left: insertLeft,
                      top: insertTop,
                      transform: insertTransform,
                      willChange: 'transform',
                      fontFamily: 'Poppins, Arial, sans-serif',
                      fontWeight: 300,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontSize: isMobile ? 'clamp(3.6rem, 9vw, 8.5rem)' : 'clamp(3.4rem, 8vw, 8.8rem)',
                      color: '#2563eb',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {renderHoverWord('INSERT', 'insert', hoveredLetter, setHoveredLetter)}
                  </div>
                  {/* LIVE - fades in center */}
                  <div
                    style={{
                      position: 'absolute',
                      left: liveLeft,
                      top: liveTop,
                      transform: liveTransform,
                      opacity: liveOpacity,
                      willChange: 'transform, opacity',
                      fontFamily: 'Poppins, Arial, sans-serif',
                      fontWeight: 300,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontSize: isMobile ? 'clamp(3.6rem, 9vw, 8.5rem)' : 'clamp(3.4rem, 8vw, 8.8rem)',
                      color: '#f97316',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {renderHoverWord('LIVE', 'live', hoveredLetter, setHoveredLetter)}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    fontFamily: 'Poppins, Arial, sans-serif',
                    fontSize: 12,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'rgba(17,24,39,0.65)',
                    opacity: 1,
                  }}
                >
                  A PLATFORM FOR STUDENT LIFE, HERITAGE, AND NEW USE.
                </div>
              </div>
            );
          })()}
        </div>
      </section>
      <style>{`
  @media (max-width: 768px) {
    .preserve-insert-section {
      font-size: 1.1rem !important;
      line-height: 1.4 !important;
      padding: 16px 8px !important;
      text-align: center !important;
      word-break: break-word !important;
    }
    
    /* Mobile styles for About Us section */
    .about-us-section {
      margin-left: 0 !important;
      margin-right: 0 !important;
      width: 100% !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
    }
    
    .about-us-text {
      margin-left: 20px !important;
      font-size: 16px !important;
    }
    
    .meet-team-text {
      margin-left: 20px !important;
      font-size: 32px !important;
    }
  }
  @media (max-width: 480px) {
    .preserve-insert-section {
      font-size: 0.98rem !important;
      padding: 10px 2px !important;
    }
    
    /* Smaller mobile styles */
    .about-us-text {
      margin-left: 0px !important;
      font-size: 24px !important;
    }
    
    .meet-team-text {
      margin-left: 0px !important;
      font-size: 32px !important;
    }
  }
`}</style>
      {/* ABOUT US section */}
      <section
        className="about-us-section"
        style={{
          background: '#1c4bb1',
          padding: '80px 0 0 0',
          minHeight: '80vh',
          marginLeft: 'calc(-3rem)',
          marginRight: 'calc(-3rem)',
          width: 'calc(100% + 6rem)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div className="about-us-text" style={{ color: '#6b775e', fontWeight: 700, fontSize: 18, letterSpacing: '0.04em', marginBottom: 8 }}>
            ABOUT US
          </div>
          <div className="meet-team-text" style={{ fontWeight: 700, fontSize: 48, color: '#ffffff' , marginBottom: 48, letterSpacing: '-0.01em' }}>
            MEET THE TEAM
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60, marginBottom: 64, flexWrap: 'wrap' }}>
            {[
              { name: 'Olena Dubrovska', img: '/storytelling/alyonaspeaker.png' },
              { name: 'Fangyuan Han', img: '/storytelling/fangyuancool.png' },
              { name: 'Luyi Wang', img: '/storytelling/luyisweet.png' },
              { name: 'Melisa Cilingiroglu', img: '/storytelling/melisa11.png' },
              { name: 'Xinjie Jiang', img: 'storytelling/xinjiecrazylikeafool.png' },
            ].map((person, idx) => (
              <div key={person.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div
                  style={{
                    width: 170,
                    height: 170,
                    borderRadius: '50%',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: 18,
                  }}
                >
                  <img
                    src={person.img}
                    alt={person.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}}
                    draggable={false}
                  />
                </div>
                <div style={{ fontWeight: 600, fontSize: 18, color: '#ffffff', letterSpacing: '0.01em', textAlign: 'center' }}>{person.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>
    </>
  );
};

export default StorytellingView;