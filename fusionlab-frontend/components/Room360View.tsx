
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomData } from '../App';

interface Room360ViewProps {
  room: RoomData;
  onClose: () => void;
}


const Room360View: React.FC<Room360ViewProps> = ({ room, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    if (!containerRef.current) return;
    if (rendererRef.current) return; // Guard against double initialization

    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; pointer-events: auto !important; display: block !important;';
    canvas.setAttribute('data-interactive', 'true');
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.rotateSpeed = -0.5; // Reverse for inward feeling
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Inverted sphere for 360 degree projection
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Flip geometry to show inside

    const loader = new THREE.TextureLoader();
    const texture = loader.load(room.imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setIsLoaded(true); 
    });
    
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (controls) {
        controls.dispose();
      }
      if (renderer) {
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, [room]);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        opacity: isLoaded ? 1 : 0,
        transition: 'opacity 0.45s cubic-bezier(0,0,0.2,1)'
      }}
    >
      <div ref={containerRef} className="relative w-full h-full cursor-move" />

      {/* Immersive UI Overlays */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-full px-4 pointer-events-none">
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-500 mb-2 block text-center">
          LEVEL 0{room.floor}
        </span>
          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-normal text-white drop-shadow-lg text-center">
            {room.name}
          </h1>
        <button 
          onClick={onClose}
          className="mt-6 bg-white/90 backdrop-blur-md px-8 py-3 border border-slate-100 text-[10px] font-black uppercase tracking-[0.18em] text-slate-900 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 shadow-xl pointer-events-auto"
        >
          Back to Floor
        </button>
      </div>
      {/* no x button */}
    </div>
  );
};

export default Room360View;
