import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  searchRooms,
  createRoomBooking,
  uploadPoster,
  searchSeats,
  createSeatBooking,
  RoomSearchRequest,
  RoomMatchOut,
  RoomBookingCreate, 
  SeatSearchRequest,
  SeatMatchOut,
  SeatBookingCreate,
} from '../services/api';

type EventType = 
  | 'SCREENING' | 'PARTY' | 'EXHIBITION' | 'PRESENTATION' 
  | 'WORKSHOP' | 'CLUB_EVENT' | 'MEETING';

interface ActivityDetails {
  title: string;
  organizer: string;
  description: string;
  attendance: string;
  type: EventType;
}

interface BookingExperienceProps {
  isLoggedIn: boolean;
  onTriggerLogin: () => void;
  sessionId?: string | null;
}

type BookingMode = 'space' | 'seat';

const ROOM_NAME_REGEX = /^R-\d{2}$/i;

//R-XX -> Room XX
const formatRoomName = (roomName: string): string => {
  if (ROOM_NAME_REGEX.test(roomName)) {
    const roomNumber = roomName.split('-')[1];
    return `Room ${roomNumber}`;
  }
  return roomName;
};

// ID: R-XX_S-XX -> {roomNumber: XX, seatNumber: XX}
const parseSeatId = (seatId: string): {roomNumber: string, seatNumber: string} => {
  if (seatId && seatId.includes('_')) {
    const [roomPart, seatPart] = seatId.split('_');
    const roomNumber = roomPart?.replace('R-', '') || '';
    const seatNumber = seatPart?.replace('S-', '') || '';
    return { roomNumber, seatNumber };
  }
  return { roomNumber: '', seatNumber: seatId || '' };
};

const EVENT_TYPES: EventType[] = [
  'SCREENING', 'PARTY', 'EXHIBITION', 'PRESENTATION', 
  'WORKSHOP', 'CLUB_EVENT', 'MEETING'
];

const PARTICIPANT_OPTIONS = ['<5', '5-10', '10-15', '15-20', '20-25', '25-30', '30-35', '35-40', '40-45', '45-50'];

// UTC+1 timezone helpers
const getUTC1Date = () => {
  const now = new Date();
  const utc1 = new Date(now.getTime() + (1 * 60 * 60 * 1000)); // Add 1 hour for UTC+1
  return utc1;
};

const formatDateDDMMYYYY = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getCurrentDateISO = () => {
  const utc1Date = getUTC1Date();
  return utc1Date.toISOString().split('T')[0];
};
const FLOOR_MAP: Record<string, number> = {
  'UG': -1,
  'EG': 0,
  '1.OG': 1,
  '2.OG': 2,
  '3.OG': 3,
  '4.OG': 4,
};

const BookingExperience: React.FC<BookingExperienceProps> = ({ isLoggedIn, onTriggerLogin, sessionId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const roomMeshesRef = useRef<Record<string, THREE.Object3D>>({});
  const seatMeshesRef = useRef<Record<string, THREE.Mesh>>({});
  const floorsRef = useRef<{ floor: number; object: THREE.Object3D; originalX: number; originalY: number; originalZ: number; originalScale: number }[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const isUserInteractingRef = useRef(false);
  const resumeRotationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const apiRoomDataRef = useRef<RoomMatchOut[]>([]);
  const apiSeatDataRef = useRef<SeatMatchOut[]>([]);
  const previousSelectedIdRef = useRef<string | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingMode>('space');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDossier, setShowDossier] = useState(false);
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [attendees, setAttendees] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<EventType | ''>('');
  const [expandedSection, setExpandedSection] = useState<'time' | 'participant' | 'eventtype' | 'equipment' | 'needs' | 'floor' | null>(null);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  const [roomReqs, setRoomReqs] = useState({ 
    projector: false, 
    power_outlets: false, 
    wifi_router: false,
    whiteboard: false, 
    chairs: false, 
    tables: false,
    piano: false,
    lockers: false,
    sport_mats: false
  });
 
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ActivityDetails>({
    title: '',
    organizer: '',
    description: '',
    attendance: '',
    type: '' as EventType
  });

  // Temporary state for cleaned data architecture
  const [roomRecommendations, setRoomRecommendations] = useState<any[]>([]);
  const [seatRecommendations, setSeatRecommendations] = useState<SeatMatchOut[]>([]);

  // Seat-specific state
  const [needsPowerOutlet, setNeedsPowerOutlet] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<string>('');

  // API related state
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [apiRoomData, setApiRoomData] = useState<RoomMatchOut[]>([]);
  const [apiSeatData, setApiSeatData] = useState<SeatMatchOut[]>([]);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);  // Store uploaded poster URL
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  
  // Form validation
  const isDossierValid = useMemo(() => {
    return dossier.title.trim().length > 0 && 
           dossier.organizer.trim().length > 0 && 
           dossier.description.trim().length > 0;
  }, [dossier]);

  // Clear form data function
  const clearFormData = () => {
    setDossier({
      title: '',
      organizer: '',
      description: '',
      attendance: '',
      type: '' as EventType
    });
    setPosterFile(null);
    setPosterPreview(null);
    setPosterUrl(null);
  };



  // File upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    // Check file type (images only)
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setPosterFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPosterPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    // Upload to server
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (currentSessionId) {
      setIsUploadingPoster(true);
      try {
        const result = await uploadPoster(file);
        setPosterUrl(result.poster_url);
      } catch (error) {
        alert('Poster upload failed, please try again');
      } finally {
        setIsUploadingPoster(false);
      }
    } else {
      alert('Please log in before uploading a poster');
      // Clear the selected file if user is not logged in
      setPosterFile(null);
      setPosterPreview(null);
      event.target.value = '';
    }
  };

  const removePoster = () => {
    setPosterFile(null);
    setPosterPreview(null);
    setPosterUrl(null);
  };

  // API handling functions
  const handleRoomSearch = async () => {
    if (!date || !startTime || !endTime) {
      setSearchError('Please fill in date, start time and end time');
      return;
    }
    if (endTime <= startTime) {
      setSearchError('End time should be after start time');
      return;
    }

    // Get sessionId from props or localStorage
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) {
      setSearchError('Please log in to search for rooms');
      onTriggerLogin();
      return;
    }

    // Parse attendees to get participant count (use default if not specified)
    let participantCount = 1; // Default to 1 person
    if (attendees) {
      if (attendees.includes('<')) {
        participantCount = 4; // <5 means up to 4
      } else {
        const parts = attendees.split('-');
        if (parts.length === 2) {
          participantCount = parseInt(parts[1]); // Take the upper bound
        } else {
          participantCount = parseInt(attendees) || 1;
        }
      }
    }

    // Build required equipment array
    const requiredEquipment: string[] = [];
    if (roomReqs.projector) requiredEquipment.push('PROJECTER');
    if (roomReqs.power_outlets) requiredEquipment.push('POWER_OUTLETS');
    if (roomReqs.wifi_router) requiredEquipment.push('WIFI_ROUTER');
    if (roomReqs.whiteboard) requiredEquipment.push('WHITEBOARD');
    if (roomReqs.chairs) requiredEquipment.push('CHAIRS');
    if (roomReqs.tables) requiredEquipment.push('TABLES');
    if (roomReqs.piano) requiredEquipment.push('PIANO');
    if (roomReqs.lockers) requiredEquipment.push('LOCKERS');
    if (roomReqs.sport_mats) requiredEquipment.push('SPORT_MATS');

    // Create UTC datetime strings
    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    const searchParams: RoomSearchRequest = {
      attendee_count: participantCount,  
      event_type: selectedEventType || undefined,
      start_time_utc: startDateTime,
      end_time_utc: endDateTime,
      required_equipment: requiredEquipment.length > 0 ? requiredEquipment : undefined
    };

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchRooms(searchParams, currentSessionId);
      setApiRoomData(results);
      setRoomRecommendations(results); // Update the display data
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid session') || error.message.includes('Missing X-Session-id')) {
          setSearchError('Session expired, please log in again');
          onTriggerLogin();
        } else {
          setSearchError(error.message);
        }
      } else {
        setSearchError('Unknown error occurred during room search');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Seat search function
  const handleSeatSearch = async () => {
    if (!date || !startTime || !endTime) {
      setSearchError('Please fill in date, start time and end time');
      return;
    }
    if (endTime <= startTime) {
      setSearchError('End time should be after start time');
      return;
    }

    // Get sessionId from props or localStorage
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!currentSessionId) {
      setSearchError('Please log in to search for seats');
      onTriggerLogin();
      return;
    }

    // Create UTC datetime strings
    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    // Convert floor number to backend format (2 -> 2.OG, 3 -> 3.OG, etc.)
    const floorForAPI = selectedFloor ? `${selectedFloor}.OG` : undefined;

    const searchParams: SeatSearchRequest = {
      start_time_utc: startDateTime,
      end_time_utc: endDateTime,
      floor: floorForAPI,
      need_power: needsPowerOutlet || undefined
    };

    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchSeats(searchParams, currentSessionId);
      setApiSeatData(results);
      setSeatRecommendations(results);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid session') || error.message.includes('Missing X-Session-id')) {
          setSearchError('Session expired, please log in again');
          onTriggerLogin();
        } else {
          setSearchError(error.message);
        }
      } else {
        setSearchError('Unknown error occurred during seat search');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookingConfirm = async () => {
    // Get sessionId from props or localStorage
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!selectedId || !currentSessionId) {
      setBookingError('Missing required booking information');
      if (!currentSessionId) {
        onTriggerLogin();
      }
      return;
    }

    if (!isDossierValid) {
      setBookingError('Please complete all activity information');
      return;
    }

    // Parse attendees for attendee count
    let attendeeCount = 0;
    if (attendees.includes('<')) {
      attendeeCount = 4;
    } else {
      const parts = attendees.split('-');
      if (parts.length === 2) {
        attendeeCount = parseInt(parts[1]);
      } else {
        attendeeCount = parseInt(attendees) || 0;
      }
    }

    // Create UTC datetime strings
    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    const bookingData: RoomBookingCreate = {
      ifcroom_id: selectedId,
      type: selectedEventType || undefined,
      activity_title: dossier.title,
      lead_organizer: dossier.organizer,
      attendee_count: attendeeCount,
      slogan: dossier.description,
      start_time_utc: startDateTime,
      end_time_utc: endDateTime,
      poster_url: posterUrl 
    };

    setIsBooking(true);
    setBookingError(null);

    try {
      const result = await createRoomBooking(bookingData, currentSessionId);
      // Success
      alert(`CONGRATULATIONS: ${formatRoomName(selectedId)} successfully booked!`);
      setSelectedId(null);
      setShowDossier(false);
      setShowConfirmButton(false);
      // Clear all form data
      clearFormData();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unknown error occurred during room booking');
    } finally {
      setIsBooking(false);
    }
  };

  // Auto search when search criteria change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (date && startTime && endTime) {
        if (bookingMode === 'space') {
          handleRoomSearch();
        } else if (bookingMode === 'seat') {
          handleSeatSearch();
        }
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [attendees, date, startTime, endTime, selectedEventType, roomReqs, bookingMode, selectedFloor, needsPowerOutlet]);

  // Sync state to ref for animation loop
  useEffect(() => {
    selectedIdRef.current = selectedId;
    hoveredIdRef.current = hoveredId;
  }, [selectedId, hoveredId]);

  useEffect(() => {
    apiRoomDataRef.current = apiRoomData;
  }, [apiRoomData]);

  useEffect(() => {
    apiSeatDataRef.current = apiSeatData;
  }, [apiSeatData]);

  // Clear form when selectedId changes (but not on initial mount)
  useEffect(() => {
    if (previousSelectedIdRef.current !== null && previousSelectedIdRef.current !== selectedId) {
      clearFormData();
    }
    previousSelectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (rendererRef.current) return; // Guard against double initialization
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const aspect = window.innerWidth / window.innerHeight;
    const d = 40;
    const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 2000);
    camera.position.set(50, 40, 50);
    camera.lookAt(0, 0, 0);
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
    controlsRef.current = controls;
    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;

      if (resumeRotationTimeoutRef.current) {
        clearTimeout(resumeRotationTimeoutRef.current);
        resumeRotationTimeoutRef.current = null;
      }
    });

    controls.addEventListener('end', () => {
      resumeRotationTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 1500); 
    });


    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 60, 40);
    scene.add(directionalLight);

    const buildingGroup = new THREE.Group();
    buildingGroup.rotation.y = (80 * Math.PI) / 180; // 80 degrees
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    const roomMeshes: Record<string, THREE.Object3D> = {};

    // Load the 3D model only once
    const loader = new GLTFLoader();
    loader.load(
      '/models/bookingmodel.glb',
      (gltf) => {
        // Clear previous floor references
        floorsRef.current = [];
        
        const model = gltf.scene;
        
        // Find all floor empties (-1, 0, 1, 2, 3, 4, 5)
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
        
        // Sort floors by floor number
        floors.sort((a, b) => a.floor - b.floor);
        
        // Calculate overall bounding box for scaling
        const overallBox = new THREE.Box3();
        floors.forEach(({ empty }) => {
          const box = new THREE.Box3().setFromObject(empty);
          overallBox.union(box);
        });
        
        const overallCenter = overallBox.getCenter(new THREE.Vector3());
        const overallSize = overallBox.getSize(new THREE.Vector3());
        
        // Explosion spacing
        const explosionSpacing = 15;
        const totalHeight = (floors.length - 1) * explosionSpacing + overallSize.y;
        
        // Calculate scale to fit viewport
        const isMobileLayout = window.innerWidth < 768;
        const targetHeight = isMobileLayout ? 85 : 100;
        const scale = targetHeight / totalHeight;
        
        // Update camera frustum to fit exactly
        const aspect = window.innerWidth / window.innerHeight;
        const viewHeight = totalHeight * 0.58;
        camera.top = viewHeight;
        camera.bottom = -viewHeight;
        camera.left = -viewHeight * aspect;
        camera.right = viewHeight * aspect;
        camera.updateProjectionMatrix();
        
        const startY = -((floors.length - 1) * explosionSpacing) / 2;
        
        // Shift the group to better fit mobile layout
        buildingGroup.position.set(isMobileLayout ? -5 : 0, 5, 0);
        
        // Collect all Room objects
        const roomObjects: { name: string; object: THREE.Object3D; floor: number; mesh: THREE.Mesh | null }[] = [];
        
        // Process each floor
        floors.forEach(({ floor, empty }, index) => {
          // Calculate explosion offset
          const yOffset = startY + index * explosionSpacing;
          
          // Position and scale the floor
          empty.position.set(
            -overallCenter.x,
            -overallCenter.y + yOffset,
            -overallCenter.z
          );
          empty.scale.setScalar(scale);
          
          // Store floor reference with original position and scale for animation
          floorsRef.current.push({
            floor: floor,
            object: empty,
            originalX: empty.position.x,
            originalY: empty.position.y,
            originalZ: empty.position.z,
            originalScale: scale
          });
          
          // Find R-XX objects within this floor
          empty.traverse((child) => {
            if (ROOM_NAME_REGEX.test(child.name)) {
              let roomMesh: THREE.Mesh | null = null;
              child.traverse((subChild) => {
                if ((subChild as THREE.Mesh).isMesh && !roomMesh) {
                  roomMesh = subChild as THREE.Mesh;
                }
              });
              
              roomMeshes[child.name] = child;

              roomObjects.push({
                name: child.name,
                object: child,
                floor: index + 1, // Map to 1-based floor numbers
                mesh: roomMesh
              });
            }
          });
          
          // Convert to white surfaces with black edges
          empty.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              // Check if this is a Room object or its parent
              const isRoomObject = ROOM_NAME_REGEX.test(child.name);
              const parentIsRoom = child.parent && ROOM_NAME_REGEX.test(child.parent.name);
              if (isRoomObject || parentIsRoom) {
                mesh.material = new THREE.MeshBasicMaterial({ 
                  color: 0xffffff, // default white, not blue
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
              } else if (/^R-\d{2}_S-\d{2}$/i.test(mesh.name)) {
                const seatId = mesh.name; 

                mesh.material = new THREE.MeshBasicMaterial({
                  color: 0xffffff, 
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 1.0 
                });

                mesh.visible = true; 
                mesh.renderOrder = 9;

                const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
                mesh.add(new THREE.LineSegments(edges, lineMaterial));

                // register seat mesh for interaction
                seatMeshesRef.current[seatId] = mesh;
              } else {
                mesh.material = new THREE.MeshBasicMaterial({ 
                  color: 0xffffff,
                  side: THREE.DoubleSide
                });
                // set opacity based on name keywords
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
          
          // Add floor to group
          buildingGroup.add(empty);
        });
        
        // Store in ref for animation loop
        roomMeshesRef.current = roomMeshes;
      },
      (progress) => {
        // Loading progress
      },
      (error) => {
      }
    );

    const clock = new THREE.Clock();
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const t = clock.getElapsedTime();
      
      // Use ref instead of local variable to avoid stale closure
      const currentRoomMeshes = roomMeshesRef.current;
      const currentSelectedId = selectedIdRef.current;
      const currentHoveredId = hoveredIdRef.current;
      const currentFloors = floorsRef.current;
      
      const activeId = currentHoveredId || currentSelectedId;
      let targetFloorNum: number | undefined;

      if (activeId) {
        // Check if it's a room first
        const room = apiRoomDataRef.current.find(
          r => r.room?.ifcroom_id === activeId
        );

        if (room?.room?.floor) {
          targetFloorNum = FLOOR_MAP[room.room.floor];
        } else {
          // Check if it's a seat
          const currentApiSeatData = apiSeatDataRef.current;
          const seat = currentApiSeatData.find(
            s => s.seat?.seat_id === activeId
          );
          
          if (seat?.seat?.floor) {
            // Convert seat floor string to number for FLOOR_MAP
            const floorStr = seat.seat.floor;
            
            if (floorStr === 'EG') {
              targetFloorNum = FLOOR_MAP['EG'];
            } else if (floorStr === '1.OG') {
              targetFloorNum = FLOOR_MAP['1.OG'];
            } else if (floorStr === '2.OG') {
              targetFloorNum = FLOOR_MAP['2.OG'];
            } else if (floorStr === '3.OG') {
              targetFloorNum = FLOOR_MAP['3.OG'];
            } else if (floorStr === '4.OG') {
              targetFloorNum = FLOOR_MAP['4.OG'];
            } else {
              // Handle direct floor numbers like "2", "3", "4"
              const floorNum = parseInt(floorStr);
              if (!isNaN(floorNum)) {
                // Map direct numbers to proper floor indices
                if (floorNum === 0) {
                  targetFloorNum = FLOOR_MAP['EG']; // 0 -> EG (ground floor)
                } else if (floorNum >= 1 && floorNum <= 4) {
                  targetFloorNum = FLOOR_MAP[`${floorNum}.OG`]; // 2 -> 2.OG, 3 -> 3.OG, 4 -> 4.OG
                }
              }
            }
          }
        }
      }

      // Auto-rotate the building group when not interacting
      const currentBuildingGroup = buildingGroupRef.current;
      if (
        currentBuildingGroup &&
        !activeId &&
        !isUserInteractingRef.current
      ) {
        currentBuildingGroup.rotation.y += 0.003;
      }

      // Handle Floor Isolation and Magnification
      currentFloors.forEach((f) => {
        const isTargetFloor = f.floor === targetFloorNum;
        
        if (activeId) {
          // If a room is hovered or selected, only show the target floor
          f.object.visible = isTargetFloor;
          if (isTargetFloor) {
            // Magnify and position the isolated floor (slightly right and down)
            f.object.position.x = THREE.MathUtils.lerp(f.object.position.x, 8, 0.1);
            f.object.position.y = THREE.MathUtils.lerp(f.object.position.y, -5, 0.1);
            f.object.position.z = THREE.MathUtils.lerp(f.object.position.z, 0, 0.1);
            f.object.scale.setScalar(THREE.MathUtils.lerp(f.object.scale.x, f.originalScale * 2.5, 0.1));
          } else {
            f.object.position.x = THREE.MathUtils.lerp(f.object.position.x, f.originalX, 0.1);
            f.object.position.y = THREE.MathUtils.lerp(f.object.position.y, f.originalY, 0.1);
            f.object.position.z = THREE.MathUtils.lerp(f.object.position.z, f.originalZ, 0.1);
            f.object.scale.setScalar(THREE.MathUtils.lerp(f.object.scale.x, f.originalScale, 0.1));
          }
        } else {
          // Reset to exploded view when no room is focused
          f.object.visible = true;
          f.object.position.x = THREE.MathUtils.lerp(f.object.position.x, f.originalX, 0.1);
          f.object.position.y = THREE.MathUtils.lerp(f.object.position.y, f.originalY, 0.1);
          f.object.position.z = THREE.MathUtils.lerp(f.object.position.z, f.originalZ, 0.1);
          f.object.scale.setScalar(THREE.MathUtils.lerp(f.object.scale.x, f.originalScale, 0.1));
        }
      });

      // Update previousSelectedId for debugging
      if (previousSelectedIdRef.current !== activeId) {
        previousSelectedIdRef.current = activeId;
      }

      // Handle Camera Position for Different View Types (only when user is not interacting)
      const currentCamera = cameraRef.current;
      // In seat booking mode, don't auto-correct camera after user interaction to allow manual navigation
      if (currentCamera && activeId && !isUserInteractingRef.current && bookingMode === 'space') {
        // Both seats and rooms use top-down (bird's eye) view
        currentCamera.position.x = THREE.MathUtils.lerp(currentCamera.position.x, 8, 0.1);
        currentCamera.position.y = THREE.MathUtils.lerp(currentCamera.position.y, 80, 0.1);
        currentCamera.position.z = THREE.MathUtils.lerp(currentCamera.position.z, 0, 0.1);
        // Look down at the magnified floor center
        currentCamera.lookAt(8, -5, 0);
      }
      // No automatic reset when nothing is selected - preserve user's camera position

      Object.entries(currentRoomMeshes).forEach(([id, roomObject]) => {
        const isHovered = currentHoveredId === id;
        const isSelected = currentSelectedId === id;

        roomObject.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;

          const mesh = child as THREE.Mesh;
          const isRoomMesh =
            ROOM_NAME_REGEX.test(child.name) ||
            (child.parent && ROOM_NAME_REGEX.test(child.parent.name));

          if (!isRoomMesh) return;

          const mat = mesh.material as THREE.MeshBasicMaterial;

          if (!isHovered && !isSelected) {
            mesh.visible = false;
            mat.opacity = 0;
            return;
          }

          mesh.visible = true;

          if (isSelected) {
            mat.color.setHex(0x0066ff);
            mat.opacity = 1.0;
            return;
          }

          if (isHovered) {
            const pulse = 0.5 + 0.5 * Math.sin(t * 6);
            mat.color.setHex(0x66b3ff);
            mat.opacity = 0.4 + 0.6 * pulse;
          }
        });
      });

      Object.entries(seatMeshesRef.current).forEach(([id, mesh]) => {
        const isHovered = currentHoveredId === id;
        const isSelected = currentSelectedId === id;

        const mat = mesh.material as THREE.MeshBasicMaterial;

        mesh.visible = true;

        if (isSelected) {
          mat.color.setHex(0x0066ff);
          mat.opacity = 1.0;
          return;
        }

        if (isHovered) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 6);
          mat.color.setHex(0x66b3ff);
          mat.opacity = 0.4 + 0.6 * pulse;
          return;
        }

        mat.color.setHex(0xffffff); 
        mat.opacity = 1.0;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const asp = window.innerWidth / window.innerHeight;
      const viewHeight = camera.top; // Use existing viewHeight
      camera.left = -viewHeight * asp;
      camera.right = viewHeight * asp;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry?.dispose();
          if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
          else node.material?.dispose();
        }
      });
      
      if (resumeRotationTimeoutRef.current) {
        clearTimeout(resumeRotationTimeoutRef.current);
      }
      if (controls) {
        controls.dispose();
      }
      if (renderer) {
        renderer.dispose();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []); // Only run once on mount

  const handleBookClick = () => {
    if (!selectedId) return;
    if (!isLoggedIn) onTriggerLogin();
    else if (bookingMode === 'space') setShowDossier(true);
    else setShowConfirmButton(true); // For seats, show confirm button directly
  };

  const confirmBooking = () => {
    if (!selectedId) return;
    
    if (bookingMode === 'space') {
      // For room booking, use API
      handleBookingConfirm();
    } else {
      // For seat booking, use seat API
      handleSeatBookingConfirm();
    }
  };

  // Seat booking function
  const handleSeatBookingConfirm = async () => {
    const currentSessionId = sessionId || localStorage.getItem('sessionId');
    if (!selectedId || !currentSessionId) {
      setBookingError('lack of booking information');
      if (!currentSessionId) {
        onTriggerLogin();
      }
      return;
    }

    // Find the selected seat to get its database ID
    const selectedSeat = apiSeatData.find(item => item.seat.seat_id === selectedId);
    if (!selectedSeat) {
      setBookingError('Selected seat information not found');
      return;
    }

    // Create UTC datetime strings
    const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

    const bookingData: SeatBookingCreate = {
      seat_id: selectedSeat.seat.id, // Use database ID
      start_time_utc: startDateTime,
      end_time_utc: endDateTime
    };

    setIsBooking(true);
    setBookingError(null);

    try {
      const result = await createSeatBooking(bookingData, currentSessionId);
      // Success
      alert(`CONGRATULATIONS: Seat ${selectedSeat.seat.seat_id} successfully booked!`);
      setSelectedId(null);
      setShowConfirmButton(false);
      // Clear all form data
      clearFormData();
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Unknown error occurred during seat booking');
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <div ref={containerRef} className={`relative w-full h-full transition-all duration-500 ease-out ${
        showDossier ? 'transform -translate-x-32' : 'transform translate-x-0'
      }`} />

      {/* LEFT SIDEBAR: NAVIGATION BAR */}
      {isLeftSidebarCollapsed ? (
        // Collapsed state - independent blue dot positioned at bottom left
        <div 
          onClick={() => setIsLeftSidebarCollapsed(false)}
          className="absolute left-5 md:left-12 bottom-[30px] w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg cursor-pointer pointer-events-auto flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
        >
          {/* Three horizontal lines icon */}
          <div className="flex flex-col gap-1">
            <div className="w-4 h-0.5 bg-white rounded"></div>
            <div className="w-4 h-0.5 bg-white rounded"></div>
            <div className="w-4 h-0.5 bg-white rounded"></div>
          </div>
        </div>
      ) : (
        <div className={`absolute left-5 md:left-12 top-[110px] bottom-[30px] w-[270px] md:w-[280px] pointer-events-none flex flex-col z-50 transition-all duration-500 ease-out ${
          showDossier ? 'transform -translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'
        }`}>
          {/* Expanded state - full sidebar */}
          <div className="bg-white/95 backdrop-blur-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.08)] pointer-events-auto h-full flex flex-col overflow-hidden rounded-lg relative">
          
          {/* Options area */}
          <div className="flex flex-col flex-1 overflow-hidden">
              {/* MODE SWITCHER */}
              <div className="p-4 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setBookingMode('space');
                      setSelectedId(null);
                      setShowConfirmButton(false);
                    }}
                    className={`w-full py-4 text-[12px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out hover:scale-105 flex items-center justify-center ${
                      bookingMode === 'space' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-50 text-slate-500 hover:bg-blue-50'
                    }`}
                    style={{ borderRadius: 4 }}
                  >
                    SPACE
                  </button>
                  <button
                    onClick={() => {
                      setBookingMode('seat');
                      setSelectedId(null);
                      setShowConfirmButton(false);
                    }}
                    className={`w-full py-4 text-[12px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out hover:scale-105 flex items-center justify-center ${
                      bookingMode === 'seat' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'bg-slate-50 text-slate-500 hover:bg-blue-50'
                    }`}
                    style={{ borderRadius: 4 }}
                  >
                    SEAT
                  </button>
                </div>
              </div>

              {/* TIME SELECTOR */}
              <div className="border-b border-slate-100 overflow-hidden">
                <button 
                  onClick={() => setExpandedSection(expandedSection === 'time' ? null : 'time')}
                  className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                    expandedSection === 'time' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>TIME</span>
                    {(date && startTime && endTime && expandedSection !== 'time') && (
                      <span className="text-[9px] mt-1 opacity-70">
                        {formatDateDDMMYYYY(date)} • {startTime}-{endTime}
                      </span>
                    )}
                  </div>
                  <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'time' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div 
                  className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                    expandedSection === 'time' ? 'max-h-48 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                  }`}
                >
                  <div className="p-4 bg-slate-50 space-y-3 will-change-transform">
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 mb-2">DATE</div>
                      <input 
                        type="date" 
                        value={date} 
                        min={getCurrentDateISO()}
                        onChange={e => setDate(e.target.value)} 
                        className="w-full py-1 px-2 text-[12px] font-bold text-slate-900 border border-slate-200 bg-white will-change-auto" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 mb-1">FROM</div>
                        <input 
                          type="time" 
                          value={startTime} 
                          onChange={e => setStartTime(e.target.value)} 
                          className="w-full py-1 px-2 text-[12px] font-bold text-slate-900 border border-slate-200 bg-white will-change-auto" 
                        />
                      </div>
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 mb-1">TO</div>
                        <input 
                          type="time" 
                          value={endTime} 
                          min={startTime || undefined}
                          onChange={e => setEndTime(e.target.value)} 
                          className="w-full py-1 px-2 text-[12px] font-bold text-slate-900 border border-slate-200 bg-white will-change-auto" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PARTICIPANT SELECTOR */}
              {bookingMode === 'space' && (
                <div className="border-b border-slate-100 overflow-hidden">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'participant' ? null : 'participant')}
                    className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                      expandedSection === 'participant' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span>PARTICIPANT</span>
                      {(attendees && expandedSection !== 'participant') && (
                        <span className="text-[7px] md:text-[9px] mt-1 opacity-70">{attendees} people</span>
                      )}
                    </div>
                    <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'participant' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div 
                    className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                      expandedSection === 'participant' ? 'max-h-32 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                    }`}
                  >
                    <div className="p-4 bg-slate-50 max-h-32 overflow-y-auto will-change-transform">
                      <div className="grid grid-cols-3 gap-1">
                        {PARTICIPANT_OPTIONS.map(option => (
                          <button
                            key={option}
                            onClick={() => {
                              setAttendees(option);
                              setExpandedSection(null);
                            }}
                            className={`py-2 text-[11px] font-black uppercase will-change-transform transition-all duration-150 ease-out hover:scale-105 ${
                              attendees === option ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EVENT TYPE SELECTOR */}
              {bookingMode === 'space' && (
                <div className="border-b border-slate-100 overflow-hidden">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'eventtype' ? null : 'eventtype')}
                    className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                      expandedSection === 'eventtype' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span>EVENT TYPE</span>
                      {(selectedEventType && expandedSection !== 'eventtype') && (
                        <span className="text-[7px] md:text-[9px] font-bold mt-1 opacity-70">{selectedEventType}</span>
                      )}
                    </div>
                    <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'eventtype' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div 
                    className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                      expandedSection === 'eventtype' ? 'max-h-32 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                    }`}
                  >
                    <div className="p-4 bg-slate-50 max-h-32 overflow-y-auto will-change-transform">
                      <div className="flex flex-wrap gap-1">
                        {EVENT_TYPES.map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              setSelectedEventType(type);
                              setExpandedSection(null);
                            }}
                            className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wide will-change-transform transition-all duration-150 ease-out hover:scale-105 ${
                              selectedEventType === type ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* EQUIPMENT FILTERS */}
              {bookingMode === 'space' ? (
                <div className="border-b border-slate-100 overflow-hidden">
                  <button 
                    onClick={() => setExpandedSection(expandedSection === 'equipment' ? null : 'equipment')}
                    className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                      expandedSection === 'equipment' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span>EQUIPMENT</span>
                      {(() => {
                        const selectedCount = Object.values(roomReqs).filter(req => req).length;
                        return selectedCount > 0 && expandedSection !== 'equipment' && (
                          <span className="text-[7px] md:text-[9px] mt-1 opacity-70">{selectedCount} selected</span>
                        );
                      })()}
                    </div>
                    <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'equipment' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div 
                    className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${expandedSection === 'equipment' ? 'max-h-72 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'}
                    }`}
                  >
                    <div className="p-4 bg-slate-50 will-change-transform max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'projector', icon: '📽️', label: 'PRJ' }, 
                          { id: 'power_outlets', icon: '🔌', label: 'PWR' },
                          { id: 'wifi_router', icon: '📶', label: 'WIFI' },
                          { id: 'whiteboard', icon: '📝', label: 'WBD' }, 
                          { id: 'chairs', icon: '💺', label: 'CHR' },
                          { id: 'tables', icon: '🪑', label: 'TBL' },
                          { id: 'piano', icon: '🎹', label: 'PIANO' },
                          { id: 'lockers', icon: '🗄️', label: 'LOCK' },
                          { id: 'sport_mats', icon: '🤸', label: 'MATS' }
                        ].map(f => (
                          <button 
                            key={f.id}
                            onClick={() => setRoomReqs({...roomReqs, [f.id]: !roomReqs[f.id as keyof typeof roomReqs]})}
                            className={`w-full py-3 text-[8px] font-black uppercase tracking-[0.1em] will-change-transform transition-all duration-150 ease-out hover:scale-105 hover:shadow-sm flex flex-col items-center justify-center gap-1 ${
                              roomReqs[f.id as keyof typeof roomReqs] ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-blue-50'
                            }`}
                            style={{ borderRadius: 4 }}
                          >
                            <span className="text-[12px]">{f.icon}</span>
                            <span>{f.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Seat requirements UI
                <div className="space-y-0">
                  <div className="border-b border-slate-100 overflow-hidden">
                    <button 
                      onClick={() => setExpandedSection(expandedSection === 'needs' ? null : 'needs')}
                      className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                        expandedSection === 'needs' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span>NEEDS</span>
                        {needsPowerOutlet && expandedSection !== 'needs' && (
                          <span className="text-[9px] mt-1 opacity-70">Power outlet</span>
                        )}
                      </div>
                      <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'needs' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div 
                      className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                        expandedSection === 'needs' ? 'max-h-24 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                      }`}
                    >
                      <div className="p-4 bg-slate-50 will-change-transform">
                        <button 
                          onClick={() => setNeedsPowerOutlet(!needsPowerOutlet)}
                          className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-150 ease-out hover:scale-105 hover:shadow-sm flex flex-col items-center gap-2 ${
                            needsPowerOutlet ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-blue-50'
                          }`}
                          style={{ borderRadius: 4 }}
                        >
                          <span className="text-[16px]">🔌</span>
                          <span>POWER</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-b border-slate-100 overflow-hidden">
                    <button 
                      onClick={() => setExpandedSection(expandedSection === 'floor' ? null : 'floor')}
                      className={`w-full p-4 text-[10px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                        expandedSection === 'floor' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col items-start">
                        <span>FLOOR</span>
                        {selectedFloor && expandedSection !== 'floor' && (
                          <span className="text-[9px] mt-1 opacity-70">Floor {selectedFloor}.OG</span>
                        )}
                      </div>
                      <svg className={`w-3 h-3 will-change-transform transition-transform duration-200 ease-out ${expandedSection === 'floor' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div 
                      className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                        expandedSection === 'floor' ? 'max-h-32 opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                      }`}
                    >
                      <div className="p-4 bg-slate-50 will-change-transform">
                        <div className="grid grid-cols-3 gap-2">
                          {['2', '3', '4'].map(floor => (
                            <button 
                              key={floor}
                              onClick={() => setSelectedFloor(selectedFloor === floor ? '' : floor)}
                              className={`py-3 text-[10px] font-black uppercase tracking-[0.1em] will-change-transform transition-all duration-150 ease-out hover:scale-105 hover:shadow-sm ${
                                selectedFloor === floor ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-blue-50'
                              }`}
                              style={{ borderRadius: 4 }}
                            >
                              {floor}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
          
          {/* STATUS INDICATOR - fixed at the bottom */}
          <div className="p-4 border-t border-slate-100 mt-auto relative">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                selectedId ? 'bg-green-400 animate-pulse' : 
                (attendees && date && startTime && endTime) ? 'bg-yellow-400' : 'bg-slate-300'
              } transition-all`}></div>
              <span className="text-[6px] font-black uppercase tracking-[0.15em] text-slate-400 text-center">
                {selectedId ? 'SELECTED' : (attendees && date && startTime && endTime) ? 'READY' : 'SETUP'}
              </span>
            </div>
            
            {/* Collapse Button */}
            <button
              onClick={() => setIsLeftSidebarCollapsed(true)}
              className="absolute bottom-2 right-2 w-6 h-6 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 group"
              title="Collapse sidebar"
            >
              <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        </div>
      )}

      {/* RIGHT SIDEBAR: RECOMMENDATIONS / DOSSIER */}
      <div className={`absolute top-[110px] bottom-[30px] pointer-events-none flex flex-col z-40 transition-all duration-300 ease-in-out ${
        showDossier 
          ? 'right-2 left-2 md:right-12 md:left-auto md:w-[280px]'  // Full width on mobile, original width on desktop
          : 'right-2 md:right-12 w-[100px] md:w-[280px]'  // Narrower on mobile for recommendations
      }`}>
         <div className={`bg-white/90 backdrop-blur-3xl border border-slate-100 p-3 md:p-4 shadow-[0_40px_100px_rgba(0,0,0,0.08)] pointer-events-auto h-full flex flex-col overflow-hidden rounded-lg`}>
            {/* Recommendations list */}
            <div className={`absolute inset-0 p-3 md:p-4 flex flex-col transition-all duration-300 ease-in-out ${
              !showDossier 
                ? 'opacity-100 transform translate-x-0 scale-100 delay-50' 
                : 'opacity-0 transform translate-x-8 scale-95 pointer-events-none'
            }`}>
              <>
                <header className="mb-4 md:mb-8">
                  <h1 className="text-xs md:text-xl font-black uppercase tracking-normal text-slate-900 leading-tight text-center">
                    Available Choice
                  </h1>
                </header>

              <div className="flex-1 overflow-y-auto space-y-3 md:space-y-5 pr-1 md:pr-2 scrollbar-hide">
                {/* Loading and Error States */}
                {isSearching && (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600">searching for rooms...</span>
                  </div>
                )}
                
                {searchError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{searchError}</p>
                    <button 
                      onClick={() => setSearchError(null)}
                      className="text-red-500 text-xs mt-2 underline"
                    >
                      Close
                    </button>
                  </div>
                )}

                {bookingMode === 'space' ? (
                  // Display room search results
                  roomRecommendations.length > 0 && !isSearching ? roomRecommendations
                    .sort((a, b) => {
                      // percentage from high to low
                      if (b.match_score !== a.match_score) {
                        return b.match_score - a.match_score;
                      }
                      // when percentage is the same, sort by capacity from low to high
                      const aCapacity = a.room?.spacebooking_max_occupancy || 0;
                      const bCapacity = b.room?.spacebooking_max_occupancy || 0;
                      return aCapacity - bCapacity;
                    })
                    .map(room => (
                    <div 
                      key={room.room?.id || room.id}
                      onMouseEnter={() => setHoveredId(room.room?.ifcroom_id || room.id)}
                      onMouseLeave={() => {
                        // Only clear hover state if not selected, allowing model to scale back
                        if (selectedId !== (room.room?.ifcroom_id || room.id)) {
                          setHoveredId(null);
                        }
                      }}
                      onClick={() => {
                        const roomId = room.room?.ifcroom_id || room.id;
                        // Click to select
                        if (selectedId === roomId) {
                          setSelectedId(null); // Deselect
                          setHoveredId(null); // Also clear hover state, allowing model to scale back
                          setShowConfirmButton(false); // Hide confirm button
                        } else {
                          setSelectedId(roomId); // Select
                          setShowConfirmButton(true); // Show confirm button
                        }
                      }}
                      className={`relative p-1.5 md:p-6 pl-1 md:pl-3 pr-1 md:pr-3 border-2 transition-all duration-500 cursor-pointer ${
                        selectedId === (room.room?.ifcroom_id || room.id) ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white border-slate-200 hover:border-blue-100'
                      }`}
                      style={{ borderRadius: 8 }}
                    >
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-1 md:mb-4">
                        <span className={`text-[9px] md:text-[13px] font-black tracking-[0.18em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'text-blue-400' : 'text-blue-600'}`}>
                          {formatRoomName(room.room?.ifcroom_id || room.id)}
                        </span>
                        <div className="text-left md:text-right mt-0.5 md:mt-0">
                          <span className={`block text-[7px] md:text-[10px] font-bold uppercase tracking-[0.18em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'text-slate-400' : 'text-slate-400'}`}>
                            {Math.round((room.match_score || 0) * 100)}% Match
                          </span>
                        </div>
                      </div>
                      
                      <h3 className="text-base md:text-4xl font-black uppercase tracking-tight mb-1 md:mb-4 leading-tight">
                        {formatRoomName(room.room?.room_name || room.name)}
                      </h3>
                      
                      <div className="flex flex-col gap-2 mb-3 md:mb-4">
                        <div className={`text-[7px] md:text-[11px] font-black uppercase tracking-[0.18em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'text-slate-400' : 'text-slate-500'}`}>
                          Capacity: {room.room?.spacebooking_max_occupancy || 'N/A'}
                        </div>
                        <div className={`flex flex-wrap gap-1`}>
                          {room.room?.spacebooking_existing_equipment ? (
                            room.room.spacebooking_existing_equipment.split(';').filter((e: string) => e.trim()).map((equipment: string, idx: number) => {
                              const equipmentAbbr: { [key: string]: string } = {
                                'PROJECTER': 'PRJ',
                                'POWER_OUTLETS': 'POWER',
                                'WIFI_ROUTER': 'WIFI',
                                'WHITEBOARD': 'WBD',
                                'CHAIRS': 'CHR',
                                'TABLES': 'TBL',
                                'PIANO': 'PIANO',
                                'LOCKERS': 'LOCK',
                                'SPORT_MATS': 'MATS'
                              };
                              const abbr = equipmentAbbr[equipment.trim()] || equipment.trim().substring(0, 3);
                              return (
                                <span 
                                  key={idx}
                                  className={`text-[6px] md:text-[7px] font-black px-1 md:px-1.5 py-0.5 tracking-[0.1em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'bg-white/10 text-white/50' : 'bg-blue-50 text-blue-600'}`}
                                  style={{ borderRadius: 2 }}
                                >
                                  {abbr}
                                </span>
                              );
                            })
                          ) : (
                            <span className={`text-[6px] md:text-[7px] font-black px-1 md:px-1.5 py-0.5 tracking-[0.1em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'bg-white/10 text-white/50' : 'bg-slate-50 text-slate-400'}`} 
                                  style={{ borderRadius: 2 }}>
                              None
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.18em] ${selectedId === (room.room?.ifcroom_id || room.id) ? 'text-blue-300' : 'text-slate-400'}`}>
                        Floor {room.room?.floor || room.floor}
                      </div>
                      
                      {/* Confirm Button */}
                      {selectedId === (room.room?.ifcroom_id || room.id) && (
                        <div 
                          className={`absolute bottom-2 md:bottom-4 right-1 md:right-2 transition-all duration-300 ease-in-out ${
                            showConfirmButton 
                              ? 'opacity-100 transform translate-x-0 scale-100' 
                              : 'opacity-0 transform translate-x-4 scale-75'
                          }`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!showConfirmButton) {
                                setShowConfirmButton(true);
                              } else {
                                if (!isLoggedIn) {
                                  onTriggerLogin();
                                } else {
                                  setTimeout(() => {
                                    setShowDossier(true);
                                  }, 50);
                                }
                              }
                            }}
                            className="h-18 w-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all duration-200 ease-out transform hover:scale-105 shadow-lg"
                            style={{ borderRadius: 6 }}
                            title="Book this room"
                          >
                            ✓
                          </button>
                        </div>
                      )}
                    </div>
                  )) : (
                    !isSearching && (
                      <div className="text-center px-3 py-8 md:px-8 text-slate-500">
                        <p className="text-xs md:text-base">Please add search criteria to see available rooms.</p>
                      </div>
                    )
                  )
                ) : (
                  // Seat recommendations
                  seatRecommendations.length > 0 ? seatRecommendations.map(seatMatch => (
                    <div 
                      key={seatMatch.seat.id}
                      onMouseEnter={() => setHoveredId(seatMatch.seat.seat_id || '')}
                      onMouseLeave={() => {
                        // Only clear hover state if not selected
                        if (selectedId !== seatMatch.seat.seat_id) {
                          setHoveredId(null);
                        }
                      }}
                      onClick={() => {
                        // Click to select
                        if (selectedId === seatMatch.seat.seat_id) {
                          setSelectedId(null); // Deselect
                          setHoveredId(null); 
                          setShowConfirmButton(false); // Hide confirm button
                        } else {
                          setSelectedId(seatMatch.seat.seat_id || ''); // Select
                          setShowConfirmButton(true); // Show confirm button
                        }
                      }}
                      className={`relative p-1.5 md:p-6 border-2 transition-all duration-500 cursor-pointer ${
                        selectedId === seatMatch.seat.seat_id ? 'bg-slate-900 border-slate-900 text-white shadow-2xl' : 'bg-white border-slate-200 hover:border-blue-100'
                      }`}
                      style={{ borderRadius: 8 }}
                    >
                      <div className="flex justify-between items-start mb-1 md:mb-4">
                        <span className={`text-[9px] md:text-[11px] font-black tracking-[0.18em] ${selectedId === seatMatch.seat.seat_id ? 'text-blue-400' : 'text-blue-600'}`}>
                          {(() => {
                            const { roomNumber } = parseSeatId(seatMatch.seat.seat_id || '');
                            return roomNumber ? `Room ${roomNumber}` : seatMatch.seat.seat_id;
                          })()}
                        </span>
                      </div>
                      <h3 className="text-base md:text-xl font-black uppercase tracking-tight mb-1 md:mb-4 leading-tight">
                        {(() => {
                          const { seatNumber } = parseSeatId(seatMatch.seat.seat_id || '');
                          return seatNumber ? `Seat ${seatNumber}` : 'Workspace';
                        })()}
                      </h3>
                      
                      <div className="flex flex-col gap-2 mb-3 md:mb-4">
                        <div className="flex flex-wrap gap-1">
                          {seatMatch.seat.power_outlet_available && (
                            <span className={`text-[6px] md:text-[7px] font-black px-1 md:px-1.5 py-0.5 tracking-[0.1em] ${selectedId === seatMatch.seat.seat_id ? 'bg-white/10 text-white/50' : 'bg-blue-50 text-blue-600'}`} style={{ borderRadius: 2 }}>
                              POWER
                            </span>
                          )}
                        </div>
                      </div>

                      {seatMatch.seat.floor && (
                        <div className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.18em] ${selectedId === seatMatch.seat.seat_id ? 'text-blue-300' : 'text-slate-400'}`}>
                          Floor {seatMatch.seat.floor}
                        </div>
                      )}
                      
                      {/* Confirm Button */}
                      {selectedId === seatMatch.seat.seat_id && showConfirmButton && (
                        <div className="absolute top-0 -right-1 h-full transition-all duration-300 ease-out animate-in slide-in-from-right-2 scale-in-75">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isLoggedIn) {
                                onTriggerLogin();
                              } else {
                                confirmBooking();
                              }
                            }}
                            disabled={isBooking}
                            className="w-6 h-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-r-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group hover:w-8"
                          >
                            {isBooking ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-3 h-3 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )) : (
                    !isSearching && (
                      <div className="text-center px-3 py-8 md:px-8 text-slate-400">
                        <p className="text-xs md:text-sm">No seats available</p>
                        <p className="text-[10px] md:text-xs mt-2">Please adjust your search criteria</p>
                      </div>
                    )
                  )
                )}
              </div>
              </>
            </div>

            {/* Dossier form */}
            <div className={`absolute inset-0 p-4 flex flex-col transition-all duration-300 ease-in-out ${
              showDossier 
                ? 'opacity-100 transform translate-x-0 scale-100 delay-100' 
                : 'opacity-0 transform -translate-x-8 scale-95 pointer-events-none'
            }`}>
              <>
                {/* DOSSIER HEADER WITH BACK BUTTON */}
                <header className="mb-6">
                  <div className="flex items-start mb-4">
                    <button 
                      onClick={() => {
                        // First close the dossier, then show the confirm button after the animation completes
                        setShowDossier(false);
                        setTimeout(() => {
                          setShowConfirmButton(true);
                        }, 100);
                      }}
                      className="mr-3 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex-1">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 mb-2">Selected Room</h2>
                      <h1 className="text-xl font-black uppercase tracking-normal text-slate-900 leading-tight">
                        {/* Room name will be provided by backend API */}
                        {selectedId ? formatRoomName(selectedId) : 'SELECT ROOM'}
                      </h1>
                    </div>
                  </div>
                </header>

                {/* DOSSIER FORM */}
                <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-lg">
                    {selectedEventType && (
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.18em] mb-2">{selectedEventType}</p>
                    )}
                    {(date || startTime || endTime) && (
                      <div className="mb-2">
                        {date && <p className={`text-[9px] uppercase tracking-[0.18em] ${selectedId ? 'text-slate-600' : 'text-slate-400'}`}>{formatDateDDMMYYYY(date)}</p>}
                        {(startTime && endTime) && <p className={`text-[9px] uppercase tracking-[0.18em] ${selectedId ? 'text-slate-600' : 'text-slate-400'}`}>{startTime} — {endTime}</p>}
                      </div>
                    )}
                    {attendees && (
                      <div>
                        <p className={`text-[9px] uppercase tracking-[0.18em] ${selectedId ? 'text-slate-600' : 'text-slate-400'}`}>Num of participants: {attendees}</p>
                      </div>
                    )}
                    {(!selectedEventType && !date && !startTime && !endTime && !attendees) && (
                      <div className="text-center px-3 py-4 md:px-4 text-slate-400">
                        <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.18em]">Please set your requirements first</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: 'Activity Title', key: 'title', placeholder: 'PROJECT NAME' },
                      { label: 'Lead Organizer', key: 'organizer', placeholder: 'FULL IDENTITY' }
                    ].map(field => (
                      <div key={field.key} className="flex flex-col border-b border-slate-100 pb-3">
                        <label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.18em] mb-2">{field.label} *</label>
                        <input 
                          type="text"
                          value={(dossier as any)[field.key]}
                          onChange={e => setDossier({...dossier, [field.key]: e.target.value})}
                          placeholder={field.placeholder}
                          className="w-full bg-transparent border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-900 focus:text-blue-600 focus:border-blue-300 outline-none transition-all placeholder:text-slate-300 rounded"
                        />
                      </div>
                    ))}
                    <div className="flex flex-col">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.18em] mb-2">Slogan *</label>
                      <textarea 
                        rows={3} 
                        value={dossier.description} 
                        onChange={e => setDossier({...dossier, description: e.target.value})} 
                        placeholder="SPATIAL USAGE GOALS" 
                        className="w-full bg-transparent border border-slate-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900 focus:text-blue-600 focus:border-blue-300 outline-none transition-all resize-none placeholder:text-slate-300 rounded" 
                      />
                    </div>

                    {/* POSTER UPLOAD SECTION */}
                    <div className="flex flex-col">
                      <label className="text-[8px] font-black uppercase text-slate-400 tracking-[0.18em] mb-2">
                        Poster *
                        {isUploadingPoster && (
                          <span className="text-blue-500 ml-2">
                            (Uploading...)
                          </span>
                        )}
                        {posterUrl && (
                          <span className="text-green-500 ml-2">
                            ✓ Uploaded
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden" 
                          id="poster-upload"
                          disabled={isUploadingPoster}
                        />
                        <label htmlFor="poster-upload" className={`cursor-pointer block ${isUploadingPoster ? 'pointer-events-none' : ''}`}>
                          <div className="w-full aspect-square border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors rounded-lg flex items-center justify-center relative overflow-hidden">
                            {posterPreview ? (
                              <div className="w-full h-full relative group">
                                <img 
                                  src={posterPreview} 
                                  alt="Poster preview" 
                                  className={`w-full h-full object-cover ${isUploadingPoster ? 'opacity-50' : ''}`}
                                />
                                {isUploadingPoster && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                  </div>
                                )}
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removePoster();
                                  }}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-red-600"
                                  disabled={isUploadingPoster}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 p-4">
                                {isUploadingPoster ? (
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                ) : (
                                  <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-center">
                                  {isUploadingPoster ? 'UPLOADING...' : 'CLICK TO UPLOAD'}
                                </span>
                                <span className="text-[8px] text-slate-400 tracking-[0.1em] text-center">MAX 10MB</span>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CONFIRM BUTTON */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  {/* Booking Error Display */}
                  {bookingError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm">{bookingError}</p>
                      <button 
                        onClick={() => setBookingError(null)}
                        className="text-red-500 text-xs mt-1 underline"
                      >
                        CLOSE
                      </button>
                    </div>
                  )}
                  
                  <button 
                    disabled={!isDossierValid || isBooking}
                    onClick={confirmBooking}
                    className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 rounded-lg ${
                      isDossierValid && !isBooking ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isBooking ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        BOOKING...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        CONFIRM BOOKING
                      </>
                    )}
                  </button>
                </div>
              </>
            </div>
         </div>
      </div>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Custom animation keyframes */
        @keyframes slide-in-from-right-2 {
          from { transform: translateX(8px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slide-out-to-right-2 {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(8px); opacity: 0; }
        }
        @keyframes scale-in-95 {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scale-out-95 {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        @keyframes scale-in-75 {
          from { transform: scale(0.75); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in-50 {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-out-50 {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInRight {
          from { 
            opacity: 0; 
            transform: translateX(100%);
          }
          to { 
            opacity: 1; 
            transform: translateX(0);
          }
        }
        
        .animate-in { animation-duration: 0.5s; animation-fill-mode: both; }
        .animate-out { animation-duration: 0.3s; animation-fill-mode: forward; }
        .slide-in-from-right-2 { animation-name: slide-in-from-right-2; }
        .slide-out-to-right-2 { animation-name: slide-out-to-right-2; }
        .scale-in-95 { animation-name: scale-in-95; }
        .scale-out-95 { animation-name: scale-out-95; }
        .scale-in-75 { animation-name: scale-in-75; }
        .fade-in-50 { animation-name: fade-in-50; }
        .fade-out-50 { animation-name: fade-out-50; }
      `}</style>
    </div>
  );
}

export default BookingExperience;
