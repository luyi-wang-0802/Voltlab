import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import PageTransition from './PageTransition';

interface WhereToGoExperienceProps {
  onNavigate: (roomId: string) => void;
}

// Entry Hub State Machine
type PageState = 'idle' | 'hover' | 'focused';
type EntryOptionId = 'findRoom' | 'buildingTelemetry';

interface EntryOption {
  id: EntryOptionId;
  label: string;
  description: string;
  experienceRoute: string;
}

// Original types for Find a Room experience
type ActivityType = 'Study' | 'Rest' | 'Social' | 'Exercise';
type DataLayer = 'CO2' | 'Noise' | 'Brightness' | null;

interface EntryHubState {
  pageState: PageState;
  previewId: EntryOptionId | null;
  selectedId: EntryOptionId | null;
  mobilePreSelectedId: EntryOptionId | null; // For mobile two-tap interaction
}

interface TransitionState {
  isActive: boolean;
  targetId: EntryOptionId | 'back' | null;
}

// Entry options configuration
const ENTRY_OPTIONS: EntryOption[] = [
  {
    id: 'findRoom',
    label: 'Find a Room',
    description: 'Discover the perfect space for your needs',
    experienceRoute: '/rooms'
  },
  {
    id: 'buildingTelemetry',
    label: 'Building Telemetry',
    description: 'Monitor real-time building data',
    experienceRoute: '/telemetry'
  }
];

interface RoomMeta {
  id: string;
  name: string;
  floor: number;
  tags: string[];
  type: ActivityType;
  co2: number;
  noise: number;
  brightness: number;
  hasPower: boolean;
}

const ROOM_DATABASE: RoomMeta[] = [
  // Basement (UG)
  { id: 'R-37', name: 'Exhibition Room 2', floor: -1, tags: ['Presentation', 'Active', 'Open'], type: 'Social', co2: 45, noise: 70, brightness: 85, hasPower: true },
  { id: 'R-38', name: 'Exhibition Room 3', floor: -1, tags: ['Presentation', 'Active', 'Open'], type: 'Social', co2: 45, noise: 70, brightness: 85, hasPower: true },

  // Ground Floor (EG)
  { id: 'R-01', name: 'Exhibition Room 1', floor: 0, tags: ['Active', 'Open', 'Flexible'], type: 'Social', co2: 45, noise: 70, brightness: 70, hasPower: true },
  { id: 'R-02', name: 'Presentation Room', floor: 0, tags: ['Presentation', 'Interactive', 'Formal'], type: 'Study', co2: 40, noise: 70, brightness: 80, hasPower: true },
  { id: 'R-05', name: 'Meeting Room', floor: 0, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 25, noise: 30, brightness: 60, hasPower: false },
  { id: 'R-18', name: 'Lounge', floor: 0, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 35, noise: 70, brightness: 65, hasPower: false },
  { id: 'R-31', name: 'Study Zone', floor: 0, tags: ['Quiet', 'Open', 'Tables'], type: 'Study', co2: 22, noise: 20, brightness: 75, hasPower: false },
  { id: 'R-32', name: 'Study Zone', floor: 0, tags: ['Quiet', 'Open', 'Tables'], type: 'Study', co2: 22, noise: 20, brightness: 75, hasPower: false },
  { id: 'R-33', name: 'Music Room', floor: 0, tags: ['Open', 'Piano', 'Creative'], type: 'Rest', co2: 30, noise: 70, brightness: 60, hasPower: false },
  { id: 'R-47', name: 'Meeting Space', floor: 0, tags: ['Open', 'Interactive'], type: 'Rest', co2: 35, noise: 70, brightness: 70, hasPower: true },

  // First Floor (1.OG)
  { id: 'R-03', name: 'Workshop Room 1', floor: 1, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 30, noise: 70, brightness: 75, hasPower: true },
  { id: 'R-04', name: 'Meeting Room 1', floor: 1, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 25, noise: 20, brightness: 70, hasPower: true },
  { id: 'R-06', name: 'Meeting Room 2', floor: 1, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 30, noise: 70, brightness: 75, hasPower: true },
  { id: 'R-07', name: 'Event Room 1', floor: 1, tags: ['Presentation', 'Active', 'Audience'], type: 'Study', co2: 35, noise: 70, brightness: 85, hasPower: true },
  { id: 'R-23', name: 'Pod', floor: 1, tags: ['Quiet', 'Solo', 'Enclosed'], type: 'Rest', co2: 18, noise: 20, brightness: 45, hasPower: false },
  { id: 'R-24', name: 'Pod', floor: 1, tags: ['Quiet', 'Solo', 'Enclosed'], type: 'Rest', co2: 18, noise: 20, brightness: 45, hasPower: false },
  { id: 'R-25', name: 'Pod', floor: 1, tags: ['Quiet', 'Solo', 'Enclosed'], type: 'Rest', co2: 18, noise: 20, brightness: 45, hasPower: false },
  { id: 'R-26', name: 'Pod', floor: 1, tags: ['Quiet', 'Solo', 'Enclosed'], type: 'Rest', co2: 18, noise: 20, brightness: 45, hasPower: false },
  { id: 'R-27', name: 'Pod', floor: 1, tags: ['Quiet', 'Solo', 'Enclosed'], type: 'Rest', co2: 18, noise: 20, brightness: 45, hasPower: false },
  { id: 'R-28', name: 'Lounge', floor: 1, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 30, noise: 70, brightness: 55, hasPower: false },
  { id: 'R-29', name: 'Recreation Area', floor: 1, tags: ['Open', 'Active'], type: 'Rest', co2: 30, noise: 70, brightness: 65, hasPower: false },
  { id: 'R-30', name: 'Game Room', floor: 1, tags: ['Open', 'Active', 'Play'], type: 'Exercise', co2: 35, noise: 70, brightness: 70, hasPower: false },

  // Second Floor (2.OG)
  { id: 'R-08', name: 'Movement Room 1', floor: 2, tags: ['Active', 'Mats', 'Physical'], type: 'Exercise', co2: 40, noise: 70, brightness: 75, hasPower: false },
  { id: 'R-09', name: 'Movement Room 2', floor: 2, tags: ['Active', 'Mats', 'Physical'], type: 'Exercise', co2: 35, noise: 70, brightness: 75, hasPower: false },
  { id: 'R-10', name: 'Game room', floor: 2, tags: ['Open', 'Active', 'Play'], type: 'Exercise', co2: 30, noise: 70, brightness: 65, hasPower: false },
  { id: 'R-11', name: 'Workshop Room 3', floor: 2, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 25, noise: 70, brightness: 75, hasPower: true },
  { id: 'R-19', name: 'Lounge space 2', floor: 2, tags: ['Open', 'Lockers', 'Support'], type: 'Rest', co2: 25, noise: 70, brightness: 60, hasPower: true },
  { id: 'R-34', name: 'Storage', floor: 2, tags: ['Support', 'Restricted'], type: 'Rest', co2: 25, noise: 70, brightness: 50, hasPower: false },
  { id: 'R-35', name: 'Quiet Zone', floor: 2, tags: ['Ultra Quiet', 'Solo'], type: 'Rest', co2: 20, noise: 20, brightness: 50, hasPower: false },
  { id: 'R-36', name: 'Study Room', floor: 2, tags: ['Quiet', 'Focused'], type: 'Study', co2: 24, noise: 15, brightness: 65, hasPower: true },

  // Third Floor (3.OG)
  { id: 'R-12', name: 'Workshop Room 4', floor: 3, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 32, noise: 70, brightness: 85, hasPower: true },
  { id: 'R-13', name: 'Self Study Room 1', floor: 3, tags: ['Quiet', 'Focused'], type: 'Study', co2: 22, noise: 15, brightness: 70, hasPower: true },
  { id: 'R-20', name: 'Lounge space 3', floor: 3, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 24, noise: 70, brightness: 65, hasPower: true },
  { id: 'R-21', name: 'Lounge space 4', floor: 3, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 30, noise: 70, brightness: 60, hasPower: false },
  { id: 'R-39', name: 'Meeting Room', floor: 3, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 26, noise: 70, brightness: 75, hasPower: true },
  { id: 'R-40', name: 'Conference Room', floor: 3, tags: ['Presentation', 'Interactive', 'Formal'], type: 'Study', co2: 30, noise: 70, brightness: 85, hasPower: true },
  { id: 'R-41', name: 'Meeting Room', floor: 3, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 26, noise: 20, brightness: 70, hasPower: true },
  { id: 'R-42', name: 'Lounge', floor: 3, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 30, noise: 70, brightness: 55, hasPower: false },

  // Fourth Floor (4.OG)
  { id: 'R-14', name: 'Meeting Room 2', floor: 4, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 20, noise: 20, brightness: 70, hasPower: true },
  { id: 'R-15', name: 'Meeting Room 3', floor: 4, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 20, noise: 20, brightness: 70, hasPower: true },
  { id: 'R-16', name: 'Meeting Room 4', floor: 4, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 26, noise: 20, brightness: 75, hasPower: true },
  { id: 'R-17', name: 'Event Room 2', floor: 4, tags: ['Presentation', 'Active', 'Audience'], type: 'Study', co2: 30, noise: 70, brightness: 85, hasPower: true },
  { id: 'R-22', name: 'Terrace Lounge', floor: 4, tags: ['Open', 'Active', 'Outdoor'], type: 'Rest', co2: 25, noise: 70, brightness: 90, hasPower: false },
  { id: 'R-43', name: 'Lounge', floor: 4, tags: ['Open', 'Relaxed'], type: 'Rest', co2: 30, noise: 70, brightness: 60, hasPower: false },
  { id: 'R-44', name: 'Study Hall', floor: 4, tags: ['Quiet', 'Open', 'Tables'], type: 'Study', co2: 22, noise: 15, brightness: 70, hasPower: true },
  { id: 'R-45', name: 'Meeting Room', floor: 4, tags: ['Quiet', 'Interactive', 'Formal'], type: 'Study', co2: 24, noise: 20, brightness: 70, hasPower: true },
  { id: 'R-46', name: 'Workshop Room', floor: 4, tags: ['Interactive', 'Active', 'Hands-on'], type: 'Study', co2: 30, noise: 70, brightness: 75, hasPower: true }
];

const WhereToGoExperience: React.FC<WhereToGoExperienceProps> = ({ onNavigate }) => {
  // Entry Hub State Machine
  const [entryState, setEntryState] = useState<EntryHubState>({
    pageState: 'idle',
    previewId: null,
    selectedId: null,
    mobilePreSelectedId: null
  });

  // Page Transition State
  const [transition, setTransition] = useState<TransitionState>({
    isActive: false,
    targetId: null
  });

  // Find a Room experience states (only active when selectedId is 'findRoom')
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityType | null>(null);
  const [prefs, setPrefs] = useState({ bright: false, power: false, quiet: false, air: false });
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  
  // Building Telemetry states (only active when selectedId is 'buildingTelemetry')
  const [activeLayer, setActiveLayer] = useState<DataLayer>(null);

  // controls for mobile interaction model
  const [showModel, setShowModel] = useState(false);

  // Detect if we're on a mobile device for interaction model
  const [isMobile, setIsMobile] = useState(false);

  // detect mobile viewport on mount and on resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3D scene refs
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const autoRotateRef = useRef(true);
  const resumeTimeoutRef = useRef<number | null>(null);

  // Entry Hub State Machine Handlers
  const handleOptionHover = (optionId: EntryOptionId) => {
    if (entryState.pageState === 'focused') return; // No hover if already focused
    
    setEntryState(prev => ({
      ...prev,
      pageState: 'hover',
      previewId: optionId
    }));
  };

  const handleOptionLeave = () => {
    if (entryState.pageState === 'focused') return; // No leave if already focused
    
    setEntryState(prev => ({
      ...prev,
      pageState: 'idle',
      previewId: null
    }));
  };

  const handleOptionClick = (optionId: EntryOptionId) => {
    if (isMobile) {
      // Mobile two-tap interaction
      if (entryState.mobilePreSelectedId === optionId) {
        // Second tap - trigger transition
        setTransition({
          isActive: true,
          targetId: optionId
        });
      } else {
        // First tap - pre-select
        setEntryState(prev => ({
          ...prev,
          mobilePreSelectedId: optionId
        }));
      }
    } else {
      // Desktop - trigger transition
      setTransition({
        isActive: true,
        targetId: optionId
      });
    }
  };

  const handleTransitionCovered = () => {
    if (transition.targetId === 'back') {
      // Handle back navigation
      setEntryState({
        pageState: 'idle',
        previewId: null,
        selectedId: null,
        mobilePreSelectedId: null
      });
      
      // Reset any sub-experience states
      setSelectedRoomId(null);
      setSelectedActivity(null);
      setHoveredRoomId(null);
    } else if (transition.targetId) {
      // Handle forward navigation
      setEntryState({
        pageState: 'focused',
        previewId: null,
        selectedId: transition.targetId,
        mobilePreSelectedId: null
      });
    }

    setTransition({
      isActive: false,
      targetId: null
    });
  };

  const handleBackToSelection = () => {
    // Trigger transition for back navigation
    setTransition({
      isActive: true,
      targetId: 'back'
    });
  };

  // Create a mapping from room ID to room data for quick lookup in animation loop
  const roomDataMap = useMemo(() => {
    const map: Record<string, RoomMeta> = {};
    ROOM_DATABASE.forEach(room => {
      map[room.id] = room;
    });
    return map;
  }, []);

  // 3D model refs
  const roomMeshesRef = useRef<Record<string, THREE.Object3D>>({});
  const floorsRef = useRef<{ floor: number; object: THREE.Object3D; originalX: number; originalY: number; originalZ: number; originalScale: number }[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const isUserInteractingRef = useRef(false);
  const hoveredRoomIdRef = useRef<string | null>(null);
  const selectedRoomIdRef = useRef<string | null>(null);
  const entryStateRef = useRef(entryState);
  const activeLayerRef = useRef<DataLayer>(activeLayer);
  const telemetryTargetsRef = useRef<Record<string, THREE.Color>>({});
  const telemetryStartRef = useRef<Record<string, THREE.Color>>({});
  const telemetryTransitionRef = useRef({ start: 0, duration: 700, active: false });

  // Sync state to ref for animation loop
  useEffect(() => {
    hoveredRoomIdRef.current = hoveredRoomId;
    selectedRoomIdRef.current = selectedRoomId;
    entryStateRef.current = entryState;
    activeLayerRef.current = activeLayer;
  }, [hoveredRoomId, selectedRoomId, entryState, activeLayer]);

  // Clear hover state when leaving Find Room mode
  useEffect(() => {
    if (entryState.selectedId !== 'findRoom') {
      setHoveredRoomId(null);
    }
  }, [entryState.selectedId]);

  // Reset telemetry selection when entering Building Telemetry
  useEffect(() => {
    if (entryState.selectedId === 'buildingTelemetry') {
      setActiveLayer(null);
    }
  }, [entryState.selectedId]);

  const recommendations = useMemo(() => {
    let filteredRooms = ROOM_DATABASE;

    // Apply preference filters with specific thresholds
    if (prefs.air) {
      filteredRooms = filteredRooms.filter(room => room.co2 <= 25); // CO2 Low threshold
    }
    if (prefs.quiet) {
      filteredRooms = filteredRooms.filter(room => room.noise <= 20); // Acoustic Calm threshold
    }
    if (prefs.bright) {
      filteredRooms = filteredRooms.filter(room => room.brightness >= 75); // Sunlight threshold
    }
    if (prefs.power) {
      filteredRooms = filteredRooms.filter(room => room.hasPower); // Power Port requirement
    }

    // Apply activity type filter - only show rooms matching selected activity
    if (selectedActivity) {
      filteredRooms = filteredRooms.filter(room => room.type === selectedActivity);
    }

    if (!selectedActivity) {
      return filteredRooms.map(room => ({ ...room, score: 0 })).sort((a, b) => a.id.localeCompare(b.id));
    }

    return filteredRooms.map(room => {
      let score = 0;
      if (room.type === selectedActivity) score += 50;
      if (prefs.bright && room.brightness >= 75) score += 15;
      if (prefs.power && room.hasPower) score += 15;
      if (prefs.quiet && room.noise <= 20) score += 15;
      if (prefs.air && room.co2 <= 25) score += 15;
      return { ...room, score: Math.min(100, score) };
    }).sort((a, b) => b.score - a.score);
  }, [selectedActivity, prefs]);

  const getLayerColors = (dataType: Exclude<DataLayer, null>) => {
    switch (dataType) {
      case 'Noise':
        return {
          light: { r: 0.86, g: 0.92, b: 1.0 },  // #DBEAFE
          mid: { r: 0.145, g: 0.388, b: 0.922 }, // #2563eb
          dark: { r: 0.118, g: 0.227, b: 0.541 } // #1E3A8A
        };
      case 'CO2':
        return {
          light: { r: 1.0, g: 0.93, b: 0.84 },  // #FFEDD5
          dark: { r: 0.976, g: 0.451, b: 0.086 } // #f97316
        };
      case 'Brightness':
        return {
          light: { r: 1.0, g: 0.98, b: 0.85 },  // #FFF9C4
          dark: { r: 0.98, g: 0.76, b: 0.18 }   // #F9C233
        };
      default:
        return {
          light: { r: 0.89, g: 0.95, b: 0.99 }, // #E3F2FD
          dark: { r: 0.05, g: 0.28, b: 0.63 }   // #0D47A1
        };
    }
  };

  // Building Telemetry room coloring function
  const calculateDataColor = (value: number, dataType: Exclude<DataLayer, null>): number => {
    let normalizedValue: number;
    let maxValue: number;
    
    // Determine max value and normalization based on data type
    switch (dataType) {
      case 'CO2':
        maxValue = 50; // CO2 maximum value (from ROOM_DATABASE, the approximate range is 18-45)
        break;
      case 'Noise':
        maxValue = 70; // Noise maximum value
        break;
      case 'Brightness':
        maxValue = 90; // Brightness maximum value
        break;
      default:
        maxValue = 100;
    }
    
    // Normalize to 0-1 range
    normalizedValue = Math.min(value / maxValue, 1);
    
    // For CO2 and Noise, higher values result in darker colors (more severe issues)
    // For Brightness, lower values result in darker colors (insufficient light)
    let intensity: number;
    if (dataType === 'Brightness') {
      intensity = 1 - normalizedValue; // Lower brightness results in darker color
    } else {
      intensity = normalizedValue; // Higher CO2 and Noise result in darker color
    }
    
    const { light, mid, dark } = getLayerColors(dataType) as {
      light: { r: number; g: number; b: number };
      mid?: { r: number; g: number; b: number };
      dark: { r: number; g: number; b: number };
    };

    let r: number;
    let g: number;
    let b: number;

    if (mid) {
      if (intensity <= 0.5) {
        const t = intensity / 0.5;
        r = light.r + (mid.r - light.r) * t;
        g = light.g + (mid.g - light.g) * t;
        b = light.b + (mid.b - light.b) * t;
      } else {
        const t = (intensity - 0.5) / 0.5;
        r = mid.r + (dark.r - mid.r) * t;
        g = mid.g + (dark.g - mid.g) * t;
        b = mid.b + (dark.b - mid.b) * t;
      }
    } else {
      // Linear interpolation
      r = light.r + (dark.r - light.r) * intensity;
      g = light.g + (dark.g - light.g) * intensity;
      b = light.b + (dark.b - light.b) * intensity;
    }
    
    // Convert to hexadecimal color
    const hexR = Math.floor(r * 255);
    const hexG = Math.floor(g * 255);
    const hexB = Math.floor(b * 255);
    
    return (hexR << 16) + (hexG << 8) + hexB;
  };

  const getLayerGradient = (dataType: Exclude<DataLayer, null>) => {
    switch (dataType) {
      case 'Noise':
        return 'linear-gradient(to bottom, #1E3A8A 0%, #2563eb 50%, #DBEAFE 100%)';
      case 'CO2':
        return 'linear-gradient(to bottom, #f97316 0%, #FDBA74 50%, #FFEDD5 100%)';
      case 'Brightness':
        return 'linear-gradient(to bottom, #F9C233 0%, #FFD54F 25%, #FFE082 50%, #FFF2B2 75%, #FFF9C4 100%)';
      default:
        return 'linear-gradient(to bottom, #0D47A1 0%, #1976D2 25%, #42A5F5 50%, #90CAF9 75%, #F5FAFF 100%)';
    }
  };

  // Get the value range and unit for a data layer
  const getDataLayerInfo = (dataType: Exclude<DataLayer, null>) => {
    switch (dataType) {
      case 'CO2':
        return { min: 15, max: 50, unit: 'ppm', label: 'CO₂ Level' };
      case 'Noise':
        return { min: 15, max: 70, unit: 'dB', label: 'Noise Level' };
      case 'Brightness':
        return { min: 40, max: 90, unit: 'lx', label: 'Brightness' };
    }
  };

  // Render color legend
  const renderColorLegend = () => {
    if (!activeLayer) return null;
    
    const dataInfo = getDataLayerInfo(activeLayer);
    
    return (
      <div className={`absolute z-20 ${isMobile ? 'right-4 bottom-80' : 'left-10 bottom-10'}`}>
        <div className={`bg-white/95 backdrop-blur-md ${isMobile ? 'border-2 border-slate-200 rounded-2xl' : 'rounded-lg'} ${isMobile ? 'p-2' : 'p-4'} ${isMobile ? 'w-16' : 'w-40'}`}>
          <div className={`text-center flex justify-center ${isMobile ? 'mb-1' : 'mb-3'}`}>
            <div className={`${isMobile ? 'text-[6px]' : 'text-[10px]'} font-black uppercase tracking-[0.1em] text-slate-700`}>
              {dataInfo.label}
            </div>
          </div>
          
          {/* Color bar area */}
          <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'} items-center ${isMobile ? 'mb-1' : 'mb-3'}`}>
            {/* Color bar */}
            <div 
              className={`${isMobile ? 'w-3 h-16 ml-0.5' : 'w-4 h-24 ml-1'} rounded flex-shrink-0`}
              style={{
                background: getLayerGradient(activeLayer)
              }}
            ></div>
            
            {/* Value labels */}
            <div className="flex flex-col justify-between h-full flex-1">
              <div className={`${isMobile ? 'text-[8px]' : 'text-[7px]'} font-bold text-slate-700 ${isMobile ? 'h-16' : 'h-24'} flex flex-col justify-between`}>
                <div>{dataInfo.max}{dataInfo.unit}</div>
                <div className="font-medium text-slate-500">
                  {Math.round((dataInfo.max + dataInfo.min) / 2)}{dataInfo.unit}
                </div>
                <div>{dataInfo.min}{dataInfo.unit}</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  };

  const updateRoomColors = () => {
    if (entryState.selectedId !== 'buildingTelemetry' || !activeLayer) {
      // If not in Building Telemetry mode or no data layer is selected, reset all rooms to default color
      telemetryTransitionRef.current.active = false;
      telemetryTargetsRef.current = {};
      telemetryStartRef.current = {};
      Object.values(roomMeshesRef.current).forEach(roomObject => {
        roomObject.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            if (mat && mat.color) {
              mat.color.setHex(0xffffff); // Reset to white
              // Ensure rooms are visible outside of Find Room mode
              if (entryState.selectedId !== 'findRoom') {
                mat.opacity = 1.0;
                mesh.visible = true;
              }
            }
          }
        });
      });
      return;
    }

    // In Building Telemetry mode, color rooms based on the activeLayer
    telemetryTargetsRef.current = {};
    telemetryStartRef.current = {};
    telemetryTransitionRef.current = {
      start: performance.now(),
      duration: 700,
      active: true
    };
    Object.entries(roomMeshesRef.current).forEach(([roomId, roomObject]) => {
      const roomData = roomDataMap[roomId];
      if (!roomData) return;

      let dataValue = 0;
      switch (activeLayer) {
        case 'CO2':
          dataValue = roomData.co2;
          break;
        case 'Noise':
          dataValue = roomData.noise;
          break;
        case 'Brightness':
          dataValue = roomData.brightness;
          break;
        default:
          return; // If activeLayer is null or unknown, skip this room
      }

      const color = calculateDataColor(dataValue, activeLayer as Exclude<DataLayer, null>);
      telemetryTargetsRef.current[roomId] = new THREE.Color(color);

      let captured = false;
      roomObject.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          if (mat && mat.color) {
            if (!captured) {
              telemetryStartRef.current[roomId] = mat.color.clone();
              captured = true;
            }
            mat.opacity = 1.0; // Ensure fully opaque
            mesh.visible = true; // Ensure visible
          }
        }
      });
    });
  };

  // Listen for changes in Building Telemetry mode and data layers, update room colors
  useEffect(() => {
    if (Object.keys(roomMeshesRef.current).length > 0) {
      updateRoomColors();
    }
  }, [entryState.selectedId, activeLayer, roomDataMap]);

  const ROOM_NAME_REGEX = /^R-\d{2}$/i;
  
  // Delay showing the model to ensure the interface loads first
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowModel(true);
    }, 800); // Delay 800ms to show the model

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (rendererRef.current) return;
    if (!showModel) return; // Only initialize the 3D scene when showModel is true

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const aspect = window.innerWidth / window.innerHeight;
    const d = 40;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 2000);
    camera.position.set(50, 40, 50);
    camera.lookAt(40, 25, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const canvas = renderer.domElement;
    canvas.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; pointer-events: auto !important; display: block !important;';
    canvas.setAttribute('data-interactive', 'true');

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 3;
    controls.target.set(40, 25, 0);
    controls.update();
    controlsRef.current = controls;

    // Track user interaction
    const handleInteractionStart = () => {
      isUserInteractingRef.current = true;
      autoRotateRef.current = false;

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };

    const handleInteractionEnd = () => {
      isUserInteractingRef.current = false;

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }

      resumeTimeoutRef.current = window.setTimeout(() => {
        autoRotateRef.current = true;
      }, 1500);
    };

    controls.addEventListener('start', handleInteractionStart);
    controls.addEventListener('end', handleInteractionEnd);

    // Add raycaster for mouse interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event: MouseEvent) => {
      // Only allow mouse interaction in Find Room mode
      if (entryState.selectedId !== 'findRoom') {
        return;
      }

      // Calculate mouse position in normalized device coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Find intersections
      const roomMeshes = roomMeshesRef.current;
      const allRoomObjects = Object.values(roomMeshes);
      const intersects = raycaster.intersectObjects(allRoomObjects, true);

      let hoveredRoomId: string | null = null;
      
      for (const intersect of intersects) {
        // Find the room ID from the intersected object
        let obj = intersect.object;
        while (obj && obj.parent) {
          const roomId = Object.entries(roomMeshes).find(([id, roomObj]) => 
            roomObj === obj || roomObj === obj.parent
          )?.[0];
          
          if (roomId) {
            hoveredRoomId = roomId;
            break;
          }
          obj = obj.parent;
        }
        
        if (hoveredRoomId) break;
      }

      setHoveredRoomId(hoveredRoomId);
    };

    const handleMouseClick = (event: MouseEvent) => {
      // Remove click functionality - users can only select through the bar
      return;
    };

    // Add event listeners
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('click', handleMouseClick);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 60, 40);
    scene.add(directionalLight);

    const buildingGroup = new THREE.Group();
    buildingGroup.rotation.y = (80 * Math.PI) / 180;
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    const roomMeshes: Record<string, THREE.Object3D> = {};

    // Load the 3D model
    const loader = new GLTFLoader();
    loader.load(
      '/models/wheretogomodel.glb',
      (gltf) => {
        floorsRef.current = [];
        
        const model = gltf.scene;
        
        const floorNumbers = [-1, 0, 1, 2, 3, 4, 5];
        const floors: { floor: number; empty: THREE.Object3D }[] = [];
        
        model.children.forEach((child) => {
          const floorNum = parseInt(child.name.trim());
          if (!isNaN(floorNum) && floorNumbers.includes(floorNum)) {
            floors.push({ floor: floorNum, empty: child });
          }
        });
        
        if (floors.length === 0) {
          return;
        }
        
        floors.sort((a, b) => a.floor - b.floor);
        
        const overallBox = new THREE.Box3();
        floors.forEach(({ empty }) => {
          const box = new THREE.Box3().setFromObject(empty);
          overallBox.union(box);
        });
        
        const overallCenter = overallBox.getCenter(new THREE.Vector3());
        const overallSize = overallBox.getSize(new THREE.Vector3());
        
        const explosionSpacing = 15;
        const totalHeight = (floors.length - 1) * explosionSpacing + overallSize.y;
        
        const targetHeight = 100;
        const scale = targetHeight / totalHeight;
        
        const aspect = window.innerWidth / window.innerHeight;
        const viewHeight = totalHeight * 0.58;
        camera.top = viewHeight;
        camera.bottom = -viewHeight;
        camera.left = -viewHeight * aspect;
        camera.right = viewHeight * aspect;
        camera.updateProjectionMatrix();
        
        const startY = -((floors.length - 1) * explosionSpacing) / 2;
        
        buildingGroup.position.y = 30;
        buildingGroup.position.x = 40;
        
        floors.forEach(({ floor, empty }, index) => {
          const yOffset = startY + index * explosionSpacing;
          
          empty.position.set(
            -overallCenter.x,
            -overallCenter.y + yOffset,
            -overallCenter.z
          );
          empty.scale.setScalar(scale);
          
          floorsRef.current.push({
            floor: floor,
            object: empty,
            originalX: empty.position.x,
            originalY: empty.position.y,
            originalZ: empty.position.z,
            originalScale: scale
          });
          
          // Find and process Room objects
          empty.traverse((child) => {
            if (ROOM_NAME_REGEX.test(child.name)) {
              roomMeshes[child.name] = child;
            }
          });
          
          // Setup materials and edges
          empty.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              const isRoomObject = ROOM_NAME_REGEX.test(child.name);
              const parentIsRoom = child.parent && ROOM_NAME_REGEX.test(child.parent.name);
              
              if (isRoomObject || parentIsRoom) {
                mesh.material = new THREE.MeshBasicMaterial({ 
                  color: 0xffffff,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0
                });
                mesh.renderOrder = 10;
                
                const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                  color: 0x000000,
                  linewidth: 1
                });
                const lineSegments = new THREE.LineSegments(edges, lineMaterial);
                mesh.add(lineSegments);
                mesh.visible = false; // Start invisible, will show on hover/selection
              } else {
                mesh.material = new THREE.MeshBasicMaterial({ 
                  color: 0xffffff,
                  side: THREE.DoubleSide
                });
                
                let meshName = mesh.name.toLowerCase();
                let opacity = 1.0;
                if (meshName.includes('treppe')) {
                  opacity = 0.15;
                } else if (meshName.includes('stütze')) {
                  opacity = 0.3;
                } else if (meshName.includes('fenster')) {
                  opacity = 0.2;
                } else if (meshName.includes('tür')) {
                  opacity = 0.2;
                } else if (meshName.includes('absturzsicherung')) {
                  opacity = 0.2;
                } else if (meshName.includes('rd')) {
                  opacity = 0.8;
                } else if (meshName.includes('wand')) {
                  opacity = 0.5;
                } else if (meshName.includes('boden')) {
                  opacity = 0.5;
                } else if (meshName.includes('stuhl')) {
                  opacity = 0.5;
                } else {
                  opacity = 0.5;
                }
                
                const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
                const lineMaterial = new THREE.LineBasicMaterial({ 
                  color: 0x000000,
                  linewidth: 2,
                  transparent: opacity < 1,
                  opacity: opacity
                });
                const lineSegments = new THREE.LineSegments(edges, lineMaterial);
                mesh.add(lineSegments);
              }
            }
          });
          
          buildingGroup.add(empty);
        });
        
        roomMeshesRef.current = roomMeshes;
        
        // After the model is loaded, if in Building Telemetry mode, immediately update room colors
        updateRoomColors();
      },
      undefined,
      (error) => {
      }
    );

    const clock = new THREE.Clock();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();

      if (buildingGroupRef.current && autoRotateRef.current) {
        buildingGroupRef.current.rotation.y += 0.002;
      }

      // Handle room highlighting - only in Find Room mode  
      if (entryStateRef.current.selectedId === 'findRoom') {
        const currentRoomMeshes = roomMeshesRef.current;
        const currentHoveredId = hoveredRoomIdRef.current;
        const currentSelectedId = selectedRoomIdRef.current;

        Object.entries(currentRoomMeshes).forEach(([id, roomObject]) => {
          const isHovered = currentHoveredId === id;
          const isSelected = currentSelectedId === id;
          
          // Get room data to determine color based on type
          const roomData = roomDataMap[id];
          const isOrangeRoom = roomData && (roomData.type === 'Social' || roomData.type === 'Exercise');
          const highlightColor = isOrangeRoom ? 0xf97316 : 0x0066ff; // Orange for Social/Exercise, Blue for others

          roomObject.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;

            const mesh = child as THREE.Mesh;
            const isRoomMesh = ROOM_NAME_REGEX.test(child.name) ||
              (child.parent && ROOM_NAME_REGEX.test(child.parent.name));

            if (!isRoomMesh) return;

            const mat = mesh.material as THREE.MeshBasicMaterial;

            // Default state: not visible
            if (!isHovered && !isSelected) {
              mesh.visible = false;
              mat.opacity = 0;
              return;
            }

            mesh.visible = true;

            // Selected state: stable color (orange for Social/Exercise, blue for others)
            if (isSelected) {
              mat.color.setHex(highlightColor);
              mat.opacity = 0.8;
              return;
            }

            // Hovered state: flashing color (orange for Social/Exercise, blue for others)
            if (isHovered) {
              const flashIntensity = 0.5 + 0.5 * Math.sin(t * 8); // Fast flash
              mat.color.setHex(highlightColor);
              mat.opacity = 0.3 + 0.4 * flashIntensity;
            }
          });
        });
      } else {
        // In non-Find Room modes, ensure all room meshes are visible
        const currentRoomMeshes = roomMeshesRef.current;
        Object.values(currentRoomMeshes).forEach(roomObject => {
          roomObject.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;

            const mesh = child as THREE.Mesh;
            const isRoomMesh = ROOM_NAME_REGEX.test(child.name) ||
              (child.parent && ROOM_NAME_REGEX.test(child.parent.name));

            if (isRoomMesh) {
              mesh.visible = true;
              const mat = mesh.material as THREE.MeshBasicMaterial;
              if (mat) {
                mat.opacity = 1.0; // Ensure fully opaque in non-Find Room modes
              }
            }
          });
        });

        // Smooth transition for Building Telemetry colors
        if (entryStateRef.current.selectedId === 'buildingTelemetry' && activeLayerRef.current) {
          const transition = telemetryTransitionRef.current;
          if (transition.active) {
            const elapsed = performance.now() - transition.start;
            const t = Math.min(elapsed / transition.duration, 1);
            const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            Object.entries(currentRoomMeshes).forEach(([roomId, roomObject]) => {
              const start = telemetryStartRef.current[roomId];
              const target = telemetryTargetsRef.current[roomId];
              if (!start || !target) return;

              const blended = new THREE.Color().lerpColors(start, target, eased);
              roomObject.traverse((child) => {
                if (!(child as THREE.Mesh).isMesh) return;
                const mesh = child as THREE.Mesh;
                const isRoomMesh = ROOM_NAME_REGEX.test(child.name) ||
                  (child.parent && ROOM_NAME_REGEX.test(child.parent.name));

                if (!isRoomMesh) return;
                const mat = mesh.material as THREE.MeshBasicMaterial;
                if (mat && mat.color) {
                  mat.color.copy(blended);
                }
              });
            });

            if (t >= 1) {
              transition.active = false;
            }
          }
        }
      }

      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      const asp = window.innerWidth / window.innerHeight;
      const viewHeight = camera.top;
      camera.left = -viewHeight * asp;
      camera.right = viewHeight * asp;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      // Remove mouse event listeners
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', handleMouseMove);
        renderer.domElement.removeEventListener('click', handleMouseClick);
      }
      if (controls) {
        controls.removeEventListener('start', handleInteractionStart);
        controls.removeEventListener('change', handleInteractionStart);
        controls.removeEventListener('end', handleInteractionEnd);
        controls.dispose();
      }
      if (renderer) renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
      rendererRef.current = null;
      controlsRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
      buildingGroupRef.current = null;
    };
  }, [showModel]); // Depend on showModel state

  // Clean up resources when the component unmounts
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, []);

  // Render different experiences based on state
  const renderIdleOrHoverState = () => {
    const getMobileLayout = (option: EntryOption, index: number) => {
      const isPreSelected = entryState.mobilePreSelectedId === option.id;
      const hasPreSelected = entryState.mobilePreSelectedId !== null;
      
      if (hasPreSelected) {
        return isPreSelected ? 'h-2/3' : 'h-1/3'; // 67% vs 33%
      }
      return 'h-1/2'; // 50% each initially - fixed height for mobile
    };
    
    const getDesktopLayout = (option: EntryOption) => {
      const isPreview = entryState.previewId === option.id;
      if (entryState.previewId) {
        return isPreview ? 'flex-[2]' : 'flex-[1]'; // 67% vs 33%
      }
      return 'flex-1'; // 50% each initially
    };
    
    return (
      <div className={`absolute ${isMobile ? 'top-20' : 'inset-0'} ${isMobile ? 'left-0 right-0 bottom-0' : ''} z-20 flex ${isMobile ? 'flex-col' : 'flex-row'}`}>
        {ENTRY_OPTIONS.map((option, index) => {
          const isPreview = entryState.previewId === option.id;
          const isOtherPreview = entryState.previewId && entryState.previewId !== option.id;
          const isPreSelected = entryState.mobilePreSelectedId === option.id;
          const isOtherPreSelected = entryState.mobilePreSelectedId && entryState.mobilePreSelectedId !== option.id;
          
          return (
            <div
              key={option.id}
              onMouseEnter={() => !isMobile && handleOptionHover(option.id)}
              onMouseLeave={() => !isMobile && handleOptionLeave()}
              onClick={(e) => {
                if (isMobile) {
                  // Check if the "tap again" button was clicked
                  const target = e.target as HTMLElement;
                  const isTapAgainButton = target.closest('.tap-again-button');
                  
                  if (isTapAgainButton && entryState.mobilePreSelectedId === option.id) {
                    // "Tap again" button clicked, enter the experience
                    handleOptionClick(option.id);
                  } else if (!entryState.mobilePreSelectedId || entryState.mobilePreSelectedId !== option.id) {
                    // Clicked elsewhere and the current option is not pre-selected, pre-select it
                    setEntryState(prev => ({
                      ...prev,
                      mobilePreSelectedId: option.id
                    }));
                  } else {
                    // Clicked elsewhere and the current option is already pre-selected, reset to initial state
                    setEntryState(prev => ({
                      ...prev,
                      mobilePreSelectedId: null
                    }));
                  }
                } else {
                  handleOptionClick(option.id);
                }
              }}
              className={`
                relative cursor-pointer flex-shrink-0
                transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-[flex-basis]
                ${isMobile ? `w-full ${getMobileLayout(option, index)}` : `h-full ${getDesktopLayout(option)}`}
              `}
            >
            {/* Solid background */}
            <div 
              className={`
                absolute inset-0 transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-[filter,brightness,saturate]
                ${(isPreview || isPreSelected) ? 'brightness-110 saturate-110' : ''}
                ${(isOtherPreview || isOtherPreSelected) ? 'brightness-90 saturate-75' : ''}
                ${
                  index === 0 ? 'bg-blue-100' :
                  index === 1 ? 'bg-yellow-100' : ''
                }
              `}
            />
            
            {/* Gradient overlay from top to bottom */}
            <div 
              className={`
                absolute inset-0 bg-gradient-to-b from-gray-50 to-gray-50/50 transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)
              `}
            />
            
            {/* Content container */}
            <div className={`relative h-full flex flex-col justify-center items-center text-center ${isMobile ? 'px-4 py-4' : 'px-8 py-12'}`}>
              {/* Icon area */}
              <div className={`
                ${isMobile ? 'mb-2' : 'mb-8'} transition-all duration-250 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-transform
                ${(isPreview || isPreSelected) ? (isMobile ? 'scale-110' : 'scale-125') : 'scale-100'}
              `}>
                {index === 0 && (
                  <svg className={`${isMobile ? 'w-8 h-8' : 'w-16 h-16'} transition-colors duration-250 cubic-bezier(0.23, 1, 0.32, 1) ${(isPreview || isPreSelected) ? 'text-blue-600' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                )}
                {index === 1 && (
                  <svg className={`${isMobile ? 'w-8 h-8' : 'w-16 h-16'} transition-colors duration-250 cubic-bezier(0.23, 1, 0.32, 1) ${(isPreview || isPreSelected) ? 'text-orange-600' : 'text-orange-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                )}
              </div>
              
              {/* Title */}
              <h2 className={`
                font-black uppercase tracking-wide leading-none ${isMobile ? 'mb-2' : 'mb-6'}
                transition-all duration-250 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-[font-size,color]
                ${(isPreview || isPreSelected) ? (isMobile ? 'text-lg' : 'text-4xl') : (isMobile ? 'text-sm' : 'text-2xl')}
                ${index === 0 ? ((isPreview || isPreSelected) ? 'text-blue-900' : 'text-blue-800') : ''}
                ${index === 1 ? ((isPreview || isPreSelected) ? 'text-orange-900' : 'text-orange-800') : ''}
              `}>
                {option.label}
              </h2>
              
              {/* Description */}
              <p className={`
                text-slate-600 transition-all duration-250 cubic-bezier(0.23, 1, 0.32, 1) ${isMobile ? 'max-w-xs' : 'max-w-sm'}
                will-change-[font-size,opacity]
                ${(isPreview || isPreSelected) ? (isMobile ? 'text-xs opacity-100' : 'text-lg opacity-100') : (isMobile ? 'text-xs opacity-80' : 'text-base opacity-80')}
                ${(isOtherPreview || isOtherPreSelected) ? 'opacity-40' : ''}
              `}>
                {option.description}
              </p>
              
              {/* Enter prompt */}
              <div className={`
                ${isMobile ? 'mt-2' : 'mt-8'} transition-all duration-200 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-[opacity,transform]
                ${(isPreview || isPreSelected) ? 'opacity-100 transform translate-y-0' : 'opacity-60 transform translate-y-2'}
              `}>
                <div className={`
                  tap-again-button ${isMobile ? 'px-3 py-1' : 'px-6 py-2'} rounded-full border-2 transition-all duration-250 cubic-bezier(0.23, 1, 0.32, 1)
                  will-change-[background-color,border-color,color]
                  ${index === 0 ? `${(isPreview || isPreSelected) ? 'border-blue-600 bg-blue-600 text-white' : 'border-blue-300 text-blue-600'}` : ''}
                  ${index === 1 ? `${(isPreview || isPreSelected) ? 'border-orange-600 bg-orange-600 text-white' : 'border-orange-300 text-orange-600'}` : ''}
                `}>
                  <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold`}>
                    {isMobile ? 'Tap to Enter' : 'Click to Enter'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Hover effect */}
            {(isPreview || isPreSelected) && (
              <div className={`
                absolute inset-0 pointer-events-none
                bg-gradient-to-t from-white/20 to-transparent
                transition-opacity duration-150 cubic-bezier(0.23, 1, 0.32, 1)
                animate-pulse
              `} />
            )}
            
            {/* Divider */}
            {index < ENTRY_OPTIONS.length - 1 && (
              <div className={`
                absolute transition-all duration-250 cubic-bezier(0.23, 1, 0.32, 1)
                will-change-[background-color]
                ${isPreview || isOtherPreview || isPreSelected || isOtherPreSelected ? 'bg-white/60' : 'bg-slate-200/60'}
                ${isMobile ? 'bottom-0 left-1/4 right-1/4 h-px' : 'right-0 top-1/4 bottom-1/4 w-px'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
  };

  const renderFindRoomExperience = () => (
    <>
      <div className={`absolute ${isMobile ? 'left-4 top-24 bottom-10 w-[120px]' : 'left-10 top-24 bottom-10 w-[380px]'} z-20 flex flex-col pointer-events-none`}>
        <div className={`bg-white/95 backdrop-blur-2xl ${isMobile ? 'p-4' : 'p-8'} border border-slate-100 shadow-[0_25px_60px_rgba(0,102,255,0.06)] pointer-events-auto flex flex-col h-full overflow-hidden relative`}>
          {/* Back Button - positioned in top-left corner with some padding */}
          <button
            onClick={handleBackToSelection}
            className="absolute top-2 left-2 z-30 bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm hover:shadow-md w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:border-blue-300 pointer-events-auto group"
          >
            <svg 
              className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <header className={`${isMobile ? 'flex items-center mb-3 mt-0' : 'mb-8 mt-4 ml-2'}`}>
            {isMobile && <div className="w-12 h-10" />} {/* return button placeholder */}
            <h1 className={`${isMobile ? 'text-sm ml-6' : 'text-2xl'} font-black uppercase tracking-normal text-slate-900 leading-none`}>You want to...</h1>
          </header>

          <div className={`${isMobile ? 'grid grid-cols-1 gap-1' : 'grid grid-cols-2 gap-2'} ${isMobile ? 'mb-3' : 'mb-8'}`}>
            {(['Study', 'Rest', 'Social', 'Exercise'] as ActivityType[]).map(act => (
              <button
                key={act}
                onClick={() => setSelectedActivity(act)}
                className={`activity-btn relative ${isMobile ? 'py-0.5 px-2 text-[7px]' : 'py-2 px-4 text-xs'} font-bold uppercase tracking-[0.12em] transition-all duration-300 border border-slate-200 overflow-hidden ${
                  selectedActivity === act 
                  ? 'active bg-slate-900 text-white border-slate-900' 
                  : 'bg-white text-slate-900 hover:text-white'
                }`}
              >
                <span className="relative z-10">{act}</span>
              </button>
            ))}
          </div>

          <div className={isMobile ? 'mb-3' : 'mb-8'}>
             <h3 className={`${isMobile ? 'text-[8px]' : 'text-[11px]'} font-black uppercase tracking-[0.18em] text-slate-900 ${isMobile ? 'mb-1' : 'mb-4'}`}>You prefer...</h3>
             <div className="flex flex-wrap gap-1">
                {[
                  { id: 'bright', label: 'Sunlight' },
                  { id: 'power', label: 'Power Port' },
                  { id: 'quiet', label: 'Acoustic Calm' },
                  { id: 'air', label: 'CO2 Low' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPrefs(prev => ({ ...prev, [p.id as any]: !(prev as any)[p.id] }))}
                    className={`pref-btn relative ${isMobile ? 'px-1.5 py-0.5 text-[6px]' : 'px-3 py-1.5 text-[8px]'} font-bold uppercase tracking-[0.15em] border border-slate-200 transition-all duration-300 overflow-hidden ${
                      (prefs as any)[p.id]
                      ? 'active bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-900 hover:text-white'
                    }`}
                  >
                    <span className="relative z-10">{p.label}</span>
                  </button>
                ))}
             </div>
          </div>

          <div className={`flex-1 overflow-y-auto space-y-3 ${isMobile ? 'pr-1' : 'pr-2'} scrollbar-thin`}>
             {recommendations.map((room, i) => (
               <div
                 key={room.id}
                 onMouseEnter={() => setHoveredRoomId(room.id)}
                 onMouseLeave={() => setHoveredRoomId(null)}
                 onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
                 className={
                   `group ${isMobile ? 'p-2' : 'p-5'} border transition-all duration-500 cursor-pointer ` +
                   (selectedRoomId === room.id
                     ? 'bg-blue-200/80 border-blue-400 text-blue-900'
                     : hoveredRoomId === room.id
                       ? 'bg-blue-50/40 border-blue-100 ring-2 ring-blue-200'
                       : 'bg-white border-slate-50 hover:border-blue-200 shadow-sm')
                 }
               >
                  <div className={`flex justify-between items-start ${isMobile ? 'mb-1' : 'mb-3'}`}>
                    <span className={`${isMobile ? 'text-[7px]' : 'text-[10px]'} font-black tracking-[0.18em]`}>{room.id}</span>
                  </div>
                 <h4 className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-black uppercase tracking-normal ${isMobile ? 'mb-1' : 'mb-4'}`}>{room.name}</h4>
                 <div className={`flex flex-wrap gap-1 ${isMobile ? 'mb-2' : 'mb-6'}`}>
                    {room.tags.map(tag => (
                      <span key={tag} className={`${isMobile ? 'text-[6px]' : 'text-[8px]'} uppercase tracking-[0.18em] font-bold text-slate-400 bg-slate-100/60 ${isMobile ? 'px-1 py-0.5' : 'px-2 py-0.5'}`}>{tag}</span>
                    ))}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderBuildingTelemetryExperience = () => (
    <>
      {renderColorLegend()}
      
      {/* Mobile return button placed below VoltLab in the top left corner */}
      {isMobile && (
        <div className="absolute top-20 left-4 z-30">
          <button
            onClick={handleBackToSelection}
            className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm hover:shadow-md w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:border-blue-300 pointer-events-auto group"
          >
            <svg 
              className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}
      
      <div className={`absolute z-20 ${isMobile ? 'right-4 bottom-10' : 'right-10 top-1/2 -translate-y-1/2'}`}>
        <div className={`bg-white/95 backdrop-blur-md border-2 border-slate-200 ${isMobile ? 'w-16 h-[250px]' : 'w-44 h-[450px]'} rounded-2xl flex flex-col ${isMobile ? 'p-2' : 'p-5'} relative`}>
          
          <div className={`text-center flex flex-col items-center justify-center ${isMobile ? 'mb-2' : 'mb-6'}`}>
           <div className={`${isMobile ? 'text-[7px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-slate-900 text-center`}>Building</div>
           <div className={`${isMobile ? 'text-[7px]' : 'text-[10px]'} font-black uppercase tracking-[0.2em] text-slate-900 text-center`}>Telemetry</div>
         </div>
         <div className={`flex flex-col ${isMobile ? 'space-y-1' : 'space-y-4'} items-center ${isMobile ? 'mb-2' : 'mb-6'}`}>
            {(['CO2', 'Noise', 'Brightness'] as const).map(layer => (
              <button
                key={layer}
                onClick={() => setActiveLayer(layer)}
                className={`${isMobile ? 'w-12 h-12' : 'w-20 h-20'} rounded-xl ${isMobile ? 'text-[8px]' : 'text-[8px]'} font-black uppercase tracking-[0.1em] border transition-all duration-300 flex items-center justify-center ${
                  activeLayer === layer 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                  : 'border-slate-200 text-slate-400 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                <span className="whitespace-nowrap text-center">
                  {layer === 'Brightness' && isMobile ? (
                    <div className="flex flex-col items-center">
                      <div>Bright</div>
                      <div>-ness</div>
                    </div>
                  ) : layer}
                </span>
              </button>
            ))}
         </div>
         <div className={`${isMobile ? 'flex flex-col items-center space-y-1 mb-0' : 'flex items-center justify-center space-x-2 mb-6'}`}>
            <svg className={`${isMobile ? 'w-2 h-2' : 'w-4 h-4'} text-blue-600 animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <div className={`${isMobile ? 'w-10 h-0.5' : 'w-16 h-1'} bg-slate-50 rounded-full relative overflow-hidden`}>
               <div className="absolute left-0 top-0 w-1/2 h-full bg-blue-600 rounded-full animate-pulse" />
            </div>
            <span className={`${isMobile ? 'text-[5px]' : 'text-[7px]'} font-bold uppercase tracking-[0.2em] text-blue-600 whitespace-nowrap`}>Syncing</span>
         </div>

          {/* Desktop return button stays inside the bar */}
          {!isMobile && (
            <div className="absolute top-2 left-2">
              <button
                onClick={handleBackToSelection}
                className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm hover:shadow-md w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:border-blue-300 pointer-events-auto group"
              >
                <svg 
                  className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
      </div>
    </div>
    </>
  );

  return (
    <div className="relative w-full h-full overflow-hidden bg-white selection:bg-blue-100">
      {/* Background before model loads */}
      {!showModel && (
        <div className="absolute inset-0 bg-white" />
      )}
      
      {/* 3D model container - delayed display */}
      {showModel && (
        <div 
          ref={containerRef} 
          className="relative w-full h-full" 
        />
      )}

      {/* Render different UI based on state machine state */}
      {entryState.pageState === 'idle' || entryState.pageState === 'hover' ? (
        <div className="animate-fadeIn">
          {renderIdleOrHoverState()}
        </div>
      ) : entryState.selectedId === 'findRoom' ? (
        <div className="animate-fadeIn">
          {renderFindRoomExperience()}
        </div>
      ) : entryState.selectedId === 'buildingTelemetry' ? (
        <div className="animate-fadeIn">
          {renderBuildingTelemetryExperience()}
        </div>
      ) : null}

      {/* Page Transition Overlay */}
      <PageTransition 
          isActive={transition.isActive}
          targetId={transition.targetId}
          onCovered={handleTransitionCovered}
      />

      <style>{`
        .scrollbar-thin::-webkit-scrollbar { width: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        /* Activity Button Styles */
        .activity-btn {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
        }
        
        .activity-btn::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0%;
          background: #1e293b;
          transition: height 0.3s ease;
          z-index: 1;
        }
        
        .activity-btn:not(.active):hover::before {
          height: 100%;
        }
        
        .activity-btn.active::before {
          height: 100%;
          background: #1e293b;
        }
        
        /* Preference Button Styles */
        .pref-btn {
          position: relative;
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
        }
        
        .pref-btn::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 0%;
          background: #1e293b;
          transition: height 0.3s ease;
          z-index: 1;
        }
        
        .pref-btn:not(.active):hover::before {
          height: 100%;
        }
        
        .pref-btn.active::before {
          height: 100%;
          background: #1e293b;
        }
        
        /* Animation effects */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default WhereToGoExperience;