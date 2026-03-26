import React, { useState, useEffect, useRef } from "react";
import Lenis from "lenis";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
}


const BASE_RESOLUTION = {
  width: 1920,
  height: 1080
};

const CITY_FEATURES: FeatureItem[] = [
  {
    id: "content",
    name: "Content",
    description:
      "In Content, available map layers are listed, each offering actions such as information, styles, viewpoints, and more",
    icon: "/icon/content.svg",
    position: { x: 25.4, y: -3.2 },
  },
  {
    id: "workspace",
    name: "My Workspace",
    description:
      "In My Workspace, user-created map objects are listed and managed, including drawn geometries such as polygons, lines, points, and text, with more object types added in future updates.",
    icon: "/icon/workspace.svg",
    position: { x:29.5 , y: -3.2 },
  },
  {
    id: "legend",
    name: "Legend",
    description:
      "Provides a legend for a layer of the VC Map, either via style or service. The legend of the corresponding layer will be displayed once the layer is activated in the application",
    icon: "/icon/legend.svg",
    position: { x: 33.8, y: -3.2 },
  },
  {
    id: "toolbox",
    name: "Toolbox",
    description:
      "The toolbox contains standard tools for interacting with VC Map content. When the toolbox is activated, a toolbar opens centrally at the top of the map",
    icon: "/icon/toolbox.svg",
    position: { x: 38.5, y: -3.2 },
  },
  {
    id: "info",
    name: "Info Tool",
    description:
      "The Info Tool allows querying attribute information of vector and raster layers",
    icon: "/icon/info.svg",
    position: { x: 53.6, y: 3.6 },
  },
  {
    id: "drawing",
    name: "Drawing Tool",
    description:
      "The drawing tool allows users to create simple and complex objects in the map or environment model in both 2D and 3D views. Clicking the black arrow opens all available drawing tools, and the active tool is highlighted in green in the top bar.",
    icon: "/icon/drawing.svg",
    position: { x: 56.9, y: 3.6 },
  },
  {
    id: "shadow",
    name: "Shadow Tool",
    description:
      "The Shadow Tool is activated via the toolbar button and displays shadows on the map. Users can adjust the shadows by changing the time of day and the date.",
    icon: "/icon/shadow.svg",
    position: { x: 61.5, y: 3.6 },
  },
  {
    id: "swipe",
    name: "Swipe Tool",
    description:
      "The Swipe Tool of the VC Map allows the direct comparison of two freely selectable layers.",
    icon: "/icon/swipe.svg",
    position: { x: 65.3, y: 3.6 },
  },
  {
    id: "measurement",
    name: "2D Point Measurement",
    description:
      "The point measurement carried out in the 2D map outputs the 2D coordinates of the point to be measured in the tool window.",
    icon: "/icon/measurement.svg",
    position: { x: 72.5, y: 3.6 },
  },
];

const ViewerView: React.FC = () => {
  const cityViewerSrc = "https://tulrgis-itbe-fl.srv.mwn.de/group08/vcmap/";
  const ifcViewerSrc = "https://tulrgis-itbe-fl.srv.mwn.de/group08/ifcviewer/";

  const [hoveredCityFeature, setHoveredCityFeature] = useState<string | null>(
    null
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [viewerDimensions, setViewerDimensions] = useState({ width: 0, height: 0 });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cityViewerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number>(0);
  const pointCloudContainerRef = useRef<HTMLDivElement>(null);

  // Monitor the actual dimensions of the viewer container
  useEffect(() => {
    const updateViewerDimensions = () => {
      if (cityViewerRef.current) {
        const rect = cityViewerRef.current.getBoundingClientRect();
        setViewerDimensions({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateViewerDimensions();
    window.addEventListener("resize", updateViewerDimensions);

    return () => {
      window.removeEventListener("resize", updateViewerDimensions);
    };
  }, [sidebarHeight]);

  useEffect(() => {
    const updateZoomScale = () => {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const browserZoom =
        devicePixelRatio / (window.outerWidth / window.innerWidth || 1);
      const effectiveZoom = Math.max(0.5, Math.min(2, browserZoom));
      setZoomScale(effectiveZoom);
    };

    updateZoomScale();
    window.addEventListener("resize", updateZoomScale);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateZoomScale);
    }

    return () => {
      window.removeEventListener("resize", updateZoomScale);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateZoomScale);
      }
    };
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (!sidebarRef.current) return;

    const el = sidebarRef.current;

    const update = () => {
      const r = el.getBoundingClientRect();
      setSidebarHeight(Math.round(r.height));
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Adjust coordinates according to screen aspect ratio
  const getAdjustedPosition = (position: { x: number; y: number }) => {
  const W = viewerDimensions.width;
  const H = viewerDimensions.height;

  if (!W || !H) return position;

  const baseW = BASE_RESOLUTION.width;
  const baseH = BASE_RESOLUTION.height;

  const baseAR = baseW / baseH;
  const curAR = W / H;

 
  const basePx = (position.x / 100) * baseW;
  const basePy = (position.y / 100) * baseH;

 
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (curAR > baseAR) {

    scale = H / baseH;
    const contentW = baseW * scale;
    offsetX = (W - contentW) / 2;
  } else {
 
    scale = W / baseW;
    const contentH = baseH * scale;
    offsetY = (H - contentH) / 2;
  }


  const curPx = offsetX + basePx * scale;
  const curPy = offsetY + basePy * scale;


  const adjustedX = (curPx / W) * 100;
  const adjustedY = (curPy / H) * 100;

  return {
    x: Math.max(0, Math.min(100, adjustedX)),
    y: Math.max(0, Math.min(100, adjustedY)),
  };
};

  // Point Cloud Viewer Setup
  useEffect(() => {
    if (!pointCloudContainerRef.current) return;

    const container = pointCloudContainerRef.current;
    const PANEL_HEIGHT = 480;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f14);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / PANEL_HEIGHT,
      0.1,
      1000
    );
    camera.position.set(2, 2, 2);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, PANEL_HEIGHT);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3; // Slower auto-rotation
    
    // Restrict rotation to only horizontal (around Y-axis)
    controls.minPolarAngle = Math.PI / 2; // Lock vertical angle at 90 degrees
    controls.maxPolarAngle = Math.PI / 2;
    
    // Disable zoom and pan
    controls.enableZoom = false;
    controls.enablePan = false;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Load PLY point cloud
    const loader = new PLYLoader();
    loader.load(
      '/models/pointcloud.ply',
      (geometry) => {
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.PointsMaterial({
          size: 0.03,
          vertexColors: true,
          sizeAttenuation: true,
        });

        const points = new THREE.Points(geometry, material);
        points.scale.set(0.08, 0.08, 0.08); // Scale down the point cloud
        scene.add(points);
      },
      (progress) => {
        console.log('Point cloud loading:', (progress.loaded / progress.total) * 100 + '%');
      },
      (error) => {
        console.error('Error loading point cloud:', error);
      }
    );

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      camera.aspect = width / PANEL_HEIGHT;
      camera.updateProjectionMatrix();
      renderer.setSize(width, PANEL_HEIGHT);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Points) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(mat => mat.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-white overflow-x-hidden">
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden bg-white pt-24"
      >
        <div className="w-full px-4 md:pl-12 md:pr-10 py-6">

          {/* City Viewer Section */}
          <section className="mb-12 md:mb-20">
            {/* Section Header with Description - Desktop */}
            <div
              className="hidden lg:grid mb-8"
              style={{
                gridTemplateColumns: "300px 1fr",
                alignItems: "start",
                gap: "2rem"
              }}
            >
              {/* Left: Title */}
              <div>
                <div
                  className="uppercase font-semibold tracking-[0.22em]"
                  style={{
                    fontSize: "8px",
                    lineHeight: "1.2",
                    color: "#94a3b8",
                    marginLeft: "4px",
                    marginTop: "8px",
                    marginBottom: "8px",
                  }}
                >
                  CITY-SCALE ANALYSIS VIEWER
                </div>

                <div
                  className="font-bold tracking-tight"
                  style={{
                    fontSize: "36px",
                    lineHeight: "1.15",
                    color: "#0f172a",
                  }}
                >
                  3D City Viewer
                </div>
              </div>

              {/* Right: Description */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#475569" }}
              >
                Before the design phase, a detailed site analysis was conducted to
                better understand the context, including visibility, solar
                exposure, noise impact, shadow simulation, and accessibility. The
                VC Map below presents these results in a clear and interactive way,
                allowing you to explore the data directly and supporting a
                transparent, evidence-based design process.
              </p>
            </div>

            {/* Section Header - Mobile */}
            <div className="lg:hidden mb-6">
              <div
                className="uppercase font-semibold tracking-[0.18em]"
                style={{
                  fontSize: "11px",
                  lineHeight: "1.2",
                  color: "#94a3b8",
                  marginBottom: "8px",
                }}
              >
                CITY-SCALE ANALYSIS VIEWER
              </div>

              <div
                className="font-bold tracking-tight"
                style={{
                  fontSize: "32px",
                  lineHeight: "1.15",
                  color: "#0f172a",
                  marginBottom: "16px",
                }}
              >
                3D City Viewer
              </div>

              <p className="text-sm leading-relaxed" 
                 style={{ color: "#475569" }}>
                Before the design phase, a detailed site analysis was conducted to
                better understand the context, including visibility, solar
                exposure, noise impact, shadow simulation, and accessibility. The VC Map below presents these results in a clear and interactive
                way, allowing you to explore the data directly and supporting a
                transparent, evidence-based design process.
              </p>
            </div>

            {/* Viewer with Sidebar - Desktop */}
            <div className="hidden lg:flex gap-4 px-0 items-start">
              <aside className="w-auto flex-shrink-0">
                <div
                  ref={sidebarRef}
                  className="bg-white/95 border border-slate-200 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                >
                  <div className="py-4 px-2">
                    <ul className="space-y-1">
                      {CITY_FEATURES.map((feature) => (
                        <li
                          key={feature.id}
                          className={`
                            flex flex-col items-center gap-2 px-3 py-3 rounded-lg cursor-pointer
                            transition-all duration-300
                            ${
                              hoveredCityFeature === feature.id
                                ? "bg-blue-50 scale-105"
                                : "hover:bg-slate-50"
                            }
                          `}
                          onMouseEnter={() => setHoveredCityFeature(feature.id)}
                          onMouseLeave={() => setHoveredCityFeature(null)}
                        >
                          <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center">
                            <img
                              src={feature.icon}
                              alt={feature.name}
                              className="w-full h-full object-contain"
                              style={{ 
                                filter: hoveredCityFeature === feature.id 
                                  ? 'brightness(0) saturate(100%) invert(38%) sepia(89%) saturate(2309%) hue-rotate(211deg) brightness(97%) contrast(96%)'
                                  : 'brightness(0) saturate(100%) invert(45%) sepia(8%) saturate(577%) hue-rotate(177deg) brightness(96%) contrast(88%)'
                              }}
                            />
                          </div>
                          <span 
                            className={`
                              text-xs text-center font-medium whitespace-nowrap transition-colors
                              ${hoveredCityFeature === feature.id ? 'text-blue-600' : 'text-slate-600'}
                            `}
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </aside>

              <div ref={cityViewerRef} className="flex-1 min-w-0 relative">
                <div
                  className="w-full h-full relative border border-slate-200 rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                  style={{ height: sidebarHeight ? `${sidebarHeight}px` : "auto" }}
                >
                  <iframe
                    src={cityViewerSrc}
                    title="VC Map"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div
                  className="absolute inset-0 pointer-events-none overflow-visible"
                  style={{
                    transform: `scale(${1 / zoomScale})`,
                    transformOrigin: "top left",
                    width: `${100 * zoomScale}%`,
                    height: `${100 * zoomScale}%`,
                  }}
                >
                  {CITY_FEATURES.map((feature) => {
                    const adjustedPos = getAdjustedPosition(feature.position);
                    return (
                      <div
                        key={feature.id}
                        className={`
                          absolute pointer-events-none
                          transition-all duration-500
                          ${
                            hoveredCityFeature === feature.id
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-50"
                          }
                        `}
                        style={{
                          left: `${adjustedPos.x}%`,
                          top: `${adjustedPos.y}%`,
                        }}
                      >
                        <div
                          className="flex items-center gap-3"
                          style={{
                            transform: `translate(-50%, -50%) scale(${zoomScale})`,
                            position: "relative",
                          }}
                        >
                          <div
                            className="relative flex-shrink-0"
                            style={{
                              width: "3vw",
                              height: "3vw",
                              minWidth: "50px",
                              minHeight: "50px",
                              maxWidth: "70px",
                              maxHeight: "70px",
                            }}
                          >
                            <div
                              className="absolute inset-0 rounded-full animate-ping"
                              style={{
                                border: "3px solid #f97316",
                                animationDuration: "2s",
                              }}
                            />
                            <div
                              className="absolute rounded-full animate-pulse"
                              style={{
                                border: "4px solid #fb923c",
                                animationDuration: "1.5s",
                                inset: "12.5%",
                              }}
                            />
                          </div>

                          <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-xl max-w-xs">
                            <h4 className="text-sm font-bold text-white mb-1">
                              {feature.name}
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-4 relative">
              <div className="bg-white/95 border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.08)] sticky top-40 z-50 rounded-lg overflow-hidden">
                <div className="px-2 py-3">
                  <div className="flex justify-start items-center gap-1 overflow-x-auto pb-2">
                    {CITY_FEATURES.map((feature) => (
                      <div key={feature.id} className="relative flex-shrink-0">
                        <div
                          className={`
                            flex flex-col items-center justify-center px-3 py-2 rounded-lg cursor-pointer
                            transition-all duration-300 min-w-[60px]
                            ${
                              hoveredCityFeature === feature.id
                                ? "bg-blue-50 scale-105"
                                : "active:bg-slate-50"
                            }
                          `}
                          onClick={() =>
                            setHoveredCityFeature(
                              hoveredCityFeature === feature.id
                                ? null
                                : feature.id
                            )
                          }
                        >
                          <div className="w-6 h-6 sm:w-7 sm:h-7 mb-1">
                            <img
                              src={feature.icon}
                              alt={feature.name}
                              className="w-full h-full object-contain"
                              style={{ 
                                filter: hoveredCityFeature === feature.id 
                                  ? 'brightness(0) saturate(100%) invert(38%) sepia(89%) saturate(2309%) hue-rotate(211deg) brightness(97%) contrast(96%)'
                                  : 'brightness(0) saturate(100%) invert(45%) sepia(8%) saturate(577%) hue-rotate(177deg) brightness(96%) contrast(88%)'
                              }}
                            />
                          </div>
                          <span 
                            className={`
                              text-[10px] text-center font-medium transition-colors
                              ${hoveredCityFeature === feature.id ? 'text-blue-600' : 'text-slate-600'}
                            `}
                          >
                            {feature.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Overlay dialog - positioned absolutely over sidebar */}
              {hoveredCityFeature && (
                <div
                  className="fixed left-0 right-0 z-[60] px-4"
                  style={{
                    top: 'calc(10rem + 80px)', // sticky top-40 (10rem) + icon height
                  }}
                  onClick={() => setHoveredCityFeature(null)}
                >
                  <div
                    className="bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl p-4 max-w-md mx-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-bold text-white">
                        {CITY_FEATURES.find(f => f.id === hoveredCityFeature)?.name}
                      </h4>
                      <button 
                        className="text-white/60 hover:text-white transition-colors flex-shrink-0"
                        onClick={() => setHoveredCityFeature(null)}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {CITY_FEATURES.find(f => f.id === hoveredCityFeature)?.description}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative">
                <div
                  className="rounded-lg border border-slate-200 bg-white/95 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]"
                  style={{ height: "60vh", minHeight: "400px" }}
                >
                  <iframe
                    src={cityViewerSrc}
                    title="VC Map"
                    className="w-full h-full"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* IFC Viewer Section */}
          <section className="mb-12">
            {/* Section Header with Description - Desktop */}
            <div
              className="hidden lg:grid mb-8"
              style={{
                gridTemplateColumns: "300px 1fr",
                alignItems: "start",
                gap: "2rem"
              }}
            >
              {/* Left: Title */}
              <div>
                <div
                  className="uppercase font-semibold tracking-[0.22em]"
                  style={{
                    fontSize: "8px",
                    lineHeight: "1.2",
                    color: "#94a3b8",
                    marginLeft: "4px",
                    marginTop: "8px",
                    marginBottom: "8px",
                  }}
                >
                  BUILDING-LEVEL SEMANTIC INSPECTION
                </div>

                <div
                  className="font-bold tracking-tight"
                  style={{
                    fontSize: "36px",
                    lineHeight: "1.15",
                    color: "#0f172a",
                  }}
                >
                  IFC Viewer
                </div>
              </div>

              {/* Right: Description */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#475569" }}
              >
                The City Viewer supports early-stage understanding of the site. The IFC Viewer complements this by shifting to a building-scale
                perspective, enabling a more detailed and semantic reading of the
                design, including interior organization, structural systems, and
                component-level information embedded in the IFC model.
              </p>
            </div>

            {/* Section Header - Mobile */}
            <div className="lg:hidden mb-6">
              <div
                className="uppercase font-semibold tracking-[0.18em]"
                style={{
                  fontSize: "11px",
                  lineHeight: "1.2",
                  color: "#94a3b8",
                  marginBottom: "8px",
                }}
              >
                BUILDING-LEVEL SEMANTIC INSPECTION
              </div>

              <div
                className="font-bold tracking-tight"
                style={{
                  fontSize: "32px",
                  lineHeight: "1.15",
                  color: "#0f172a",
                  marginBottom: "16px",
                }}
              >
                IFC Viewer
              </div>

              <p className="text-sm leading-relaxed" 
                 style={{ color: "#475569" }}>
                The City Viewer supports early-stage understanding of the site. The IFC Viewer complements this by shifting to a building-scale
                perspective, enabling a more detailed and semantic reading of the
                design, including interior organization, structural systems, and
                component-level information embedded in the IFC model.
              </p>
            </div>

            {/* IFC Viewer - Full Width */}
            <div className="w-full relative">
              <div className="w-full h-full relative border border-slate-200 rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)]" 
                   style={{ height: "98vh" }}>
                <iframe
                  src={ifcViewerSrc}
                  title="IFC Viewer"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </section>

          <div className="h-10" />
        </div>

        {/* Point Cloud Viewer Panel */}
        <div className="w-full px-4 md:px-12">
          <div className="mb-6">
            <div
              className="uppercase font-semibold tracking-[0.22em]"
              style={{
                fontSize: "8px",
                lineHeight: "1.2",
                color: "#94a3b8",
                marginLeft: "4px",
                marginBottom: "8px",
              }}
            >
              POINT CLOUD VISUALIZATION
            </div>
            <div
              className="font-bold tracking-tight"
              style={{
                fontSize: "36px",
                lineHeight: "1.15",
                color: "#0f172a",
              }}
            >
              3D Point Cloud
            </div>
          </div>
          <div
            ref={pointCloudContainerRef}
            className="w-full rounded-lg overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200"
            style={{ height: "480px", background: "#0b0f14" }}
          />
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
};

export default ViewerView;
