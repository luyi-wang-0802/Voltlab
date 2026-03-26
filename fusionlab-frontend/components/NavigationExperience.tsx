
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface NavigationExperienceProps {
  targetRoom: string | null;
  onSearch: (id: string) => void;
}

const ROOM_DATABASE = [
  { id: 'R-03', floor: 1, wing: 'L', name: 'Workshop Room 1' },
  { id: 'R-06', floor: 1, wing: 'L', name: 'Workshop Room 2' },
  { id: 'R-11', floor: 2, wing: 'R', name: 'Workshop Room 3' },
  { id: 'R-12', floor: 3, wing: 'L', name: 'Workshop Room 4' },
  { id: 'R-08', floor: 2, wing: 'L', name: 'Movement Room 1' },
  { id: 'R-09', floor: 2, wing: 'L', name: 'Movement Room 2' },
  { id: 'R-19', floor: 2, wing: 'R', name: 'Lounge space 2' },
  { id: 'R-20', floor: 3, wing: 'L', name: 'Lounge space 3' },
  { id: 'R-21', floor: 3, wing: 'R', name: 'Lounge space 4' },
  { id: 'R-10', floor: 2, wing: 'R', name: 'Game room' },
  { id: 'R-13', floor: 3, wing: 'R', name: 'Self Study Room 1' },
  { id: 'R-07', floor: 1, wing: 'R', name: 'Event Room 1' },
  { id: 'R-17', floor: 4, wing: 'L', name: 'Event Room 2' },
  { id: 'R-04', floor: 1, wing: 'R', name: 'Meeting Room 1' },
  { id: 'R-14', floor: 4, wing: 'R', name: 'Meeting Room 2' },
  { id: 'R-15', floor: 4, wing: 'R', name: 'Meeting Room 3' },
  { id: 'R-16', floor: 4, wing: 'L', name: 'Meeting Room 4' },
  { id: 'R-02', floor: 0, wing: 'L', name: 'Presentation Room' },
  { id: 'R-01', floor: 0, wing: 'R', name: 'Exhibition Room 1' },
  { id: 'R-37', floor: -1, wing: 'R', name: 'Exhibition Room 2' },
  { id: 'R-38', floor: -1, wing: 'L', name: 'Exhibition Room 3' },

  

];


// Define navigation paths - element names to highlight for each room
const ROOM_PATHS: Record<string, string[]> = {
  'R-03': [
    'R-03',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'Tür-025004',
    'Tür-025003',
    'Tür-026001',
    'Fenster-025045',
    'Fenster-025046',
    'Fenster-025047',
    'newslab021',
    'Boden-001014',
  ],
  'R-04': [
    'R-04',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'newslab023',
    'newslab024',
    'Tür-027002',
    'Tür-028001',
    'Tür-029',
    'Fenster-024020',
    'Fenster-024019',
    'Fenster-024012',
    'Boden-001014',

    ],

  'R-07': [
    'R-07',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'newslab023',
    'Tür-027018',
    'Tür-012035',
    'Tür-026002',
    'Wand-012.034',
    'Wand-012.035',
    'Fenster-025001',
    'Fenster-025',
    'Fenster-025003',
    'Fenster-025002',
    'newslab023',
    'Boden-001014',

    ],

  'R-06': [
    'R-06',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'newslab021',
    'newslab022',
    'Fenster-025008',
    'Fenster-024018',
    'Fenster-024017',
    'Fenster-024011',
    'Tür-028002',
    'Tür-025002',
    'Tür-025006',
    'Wand-012028',
    'Wand-012027',
    'Wand-012087',
    'Boden-001014',
    ],
    'R-08': [
    'R-08',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'newslab003',
    'newslab002',
    'Tür-027007',
    'Tür-027006',
    'Tür-027005',
    'Tür-027004',
    'Fenster-025014',
    'Fenster-025013',
    'Fenster-025012',
    'Fenster-025011',
    'Boden-001014',
    'Boden-001015',
    ],
    'R-09': [
    'R-09',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'newslab003',
    'Tür-025011',
    'Tür-027015',
    'Tür-027009',
    'Tür-027008',
    'Fenster-025005',
    'Fenster-025016',
    'Fenster-025015',
    'Boden-001014',
    'Boden-001015',
    ],
    'R-19': [
    'R-19',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'newslab006',
    'Tür-027021',
    'Tür-027022',
    'Tür-027001',
    'Fenster-025026',
    'Fenster-025027',
    'Fenster-025006',
    'Boden-001014',
    'Boden-001015',
    ],
    'R-11': [
    'R-11',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'newslab006',
    'newslab005',
    'Wand-012069',
    'Wand-013011',
    'Fenster-024032',
    'Fenster-025025',
    'Tür-025010',
    'Boden-001014',
    'Boden-001015',
    ],
    'R-10': [
    'R-10',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'newslab006',
    'newslab005',
    'newslab004',
    'Wand-013010',
    'Wand-012068',
    'Fenster-025024',
    'Fenster-024033',
    'Tür-025009',
    'Boden-001014',
    'Boden-001015',
    ],
    //floor 3 rooms
    'R-13': [
    'R-13',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'newslab011',
    'Tür-027027',
    'Tür-027023',
    'Tür-027024',
    'Tür-027025',
    'Fenster-025042',
    'Fenster-025029',
    'Fenster-025030',
    'Fenster-025031',
    'Fenster-025043',
    'Tür-028003',
    'Tür-027026',
    'Wand-012064',
    'newslab026',
    'newslab027',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    ],
    'R-21': [
    'R-21',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'newslab011',
    'newslab012',
    'Tür-028003',
    'Tür-027026',
    'newslab026',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    ],
    'R-20': [
    'R-20',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'newslab009',
    'newslab025',
    'Fenster-025022',
    'Wand-012012',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    ],
    'R-12': [
    'R-12',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'newslab009',
    'newslab010',
    'Fenster-025022',
    'Wand-012012',
    'Tür-027010',
    'Tür-027011',
    'Tür-027012',
    'Tür-027013',
    'Fenster-025018',
    'Fenster-025019',
    'Fenster-025020',
    'Fenster-025021',
    'Tür-028',
    'Tür-027003',
    'Wand-012041',
    'Fenster-025023',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    ],
    ///end of Floor 3
    //Floor 4
    'R-17': [
    'R-17',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'stair3',
    'Absturzsicherung-010001',
    'Absturzsicherung-010',
    'newslab015',
    'Tür-027',
    'Tür-027017',
    'Tür-027016',
    'Tür-027031',
    'Fenster-025007',
    'Fenster-025040',
    'Fenster-025039',
    'Fenster-025038',
    'newslab028',
    'newslab029',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    'Boden-001017',
    ],
    'R-16': [
    'R-16',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'stair3',
    'Absturzsicherung-010001',
    'Absturzsicherung-010',
    'newslab015',
    'newslab014',
    'Tür-027030',
    'Tür-027029',
    'Tür-027028',
    'Fenster-025037',
    'Fenster-025036',
    'Fenster-025035',
    'newslab028',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    'Boden-001017',
    ],
    'R-15': [
    'R-15',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'stair3',
    'Absturzsicherung-010001',
    'Absturzsicherung-010',
    'Boden-001012',
    'Absturzsicherung-010003',
    'Absturzsicherung-008',
    'newslab018',
    'Wand-013017',
    'Wand-012057',
    'Fenster-025044',
    'Fenster-024014',
    'Tür-025',
    'newslab030',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    'Boden-001017',

    ],
    'R-14': [
    'R-14',  
    'stair0', 
    'Absturzsicherung-005002', 
    'Absturzsicherung-005001', 
    'Boden-001010', 
    'Absturzsicherung-007004',
    'Absturzsicherung-005004',
    'stair1',
    'Absturzsicherung-007002',
    'Absturzsicherung-007003',
    'Boden-001013',
    'Absturzsicherung-009',
    'stair2',
    'Absturzsicherung-009004',
    'Absturzsicherung-009005',
    'Boden-001011',
    'Absturzsicherung-007',
    'Absturzsicherung-005',
    'stair3',
    'Absturzsicherung-010001',
    'Absturzsicherung-010',
    'Boden-001012',
    'Absturzsicherung-010003',
    'Absturzsicherung-008',
    'newslab018',
    'newslab017',
    'newslab016',
    'Wand-012063',
    'Wand-013022',
    'Fenster-024034',
    'Fenster-025032',
    'Tür-025008',
    'Wand-012072',
    'Fenster-025034',
    'Boden-001014',
    'Boden-001015',
    'Boden-001016',
    'Boden-001017',
    ],
    //end of floor 4
    //start of EG
    'R-02': [
    'R-02',  
    'Tür-024001',
    'Tür-023003',
    'Tür-022044',
    'Tür-022043',
    'Fenster-024021',
    'Fenster-024022',
    'Fenster-024023',
    'Fenster-024024',
    'Fenster-024025',
    'Tür-025005',
    ],
    'R-01': [
    'R-01', 
    'Tür-022045',
    'Tür-022046',
    'Tür-023004',
    'Tür-024002',
    'Tür-022021',
    'Tür-022022',
    'Tür-023',
    "Fenster-024029",
    'Fenster-024028',
    'Fenster-024027',
    'Fenster-024026',
    'Fenster-024031',
    'Fenster-024030',
    'Fenster-024013',
    ],
    'R-37': [
    'R-37',
    'stair-1',
    'Tür-023010',
    'Tür-024006',
    'Tür-024005',
    'Tür-024004',
    'Tür-024003',
    'Tür-023009',
    'Tür-023002',
    'Tür-024015',
    'Fenster-024006',
    'Fenster-024005',
    'Fenster-024004',
    'Fenster-024003',
    'Fenster-024015',
    ],
    'R-38': [
    'R-38',
    'stair-1',
    'Tür-023005',
    'Tür-023007',
    'Tür-023006',
    'Tür-023008',
    'Fenster-024016',
    'Fenster-024007',
    'Fenster-024008',
    'Fenster-024009',
    'Fenster-024010',




    //other path objects (mash names)
  ],
};

const NavigationExperience: React.FC<NavigationExperienceProps> = ({ targetRoom, onSearch }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const meshFloorMapRef = useRef<Map<THREE.Mesh, number>>(new Map());
  const [searchValue, setSearchValue] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const [foundViaIdInput, setFoundViaIdInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<typeof ROOM_DATABASE[0] | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isMobilePanelCollapsed, setIsMobilePanelCollapsed] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const previousRoomRef = useRef<string | null>(null);

  // Function to reset opacity for all meshes
  const resetMeshOpacity = () => {
    if (!buildingGroupRef.current) return;
    
    buildingGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as THREE.MeshBasicMaterial;
        
        // Explicitly ensure Wand-001005 is always 70% transparent
        if (mesh.name === 'Wand-001005') {
          console.log('🔧 resetMeshOpacity: Setting Wand-001005 to 70% transparent');
          material.opacity = 0.3;
          material.transparent = true;
        } else {
          // Reset to original opacity based on type
          const isFacadeWall = mesh.name.startsWith('Wand');
          const isRoom = mesh.name.startsWith('Raum');
          material.opacity = (isFacadeWall || isRoom) ? 0.3 : 1.0;
          material.transparent = isFacadeWall || isRoom;
        }
        
        // Reset edge opacity
        mesh.children.forEach(c => {
          if (c instanceof THREE.LineSegments) {
            const edgeMaterial = c.material as THREE.LineBasicMaterial;
            let edgeOpacity = 0.5;
            if (mesh.name.startsWith('Stütze')) edgeOpacity = 0.3;
            else if (mesh.name.startsWith('Treppe')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Tür')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Fenster')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Absturzsicherung')) edgeOpacity = 0.1;
            edgeMaterial.opacity = edgeOpacity;
          }
        });
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setIsMobilePanelCollapsed(false);
      return;
    }

    if (activeRoom) {
      setIsMobilePanelCollapsed(true);
    }
  }, [activeRoom, isMobileLayout]);

  useEffect(() => {
    // Reset opacity every time a room is searched (even if same room) or when clearing search
    const isNewSearch = !!targetRoom;
    const isClearingSearch = !targetRoom && previousRoomRef.current;
    
    if (isNewSearch || isClearingSearch) {
      resetMeshOpacity();
    }
    
    if (targetRoom) {
      const room = ROOM_DATABASE.find(r => r.id.toUpperCase() === targetRoom.toUpperCase());
      if (room) {
        setActiveRoom({ ...room }); // Create new object reference to trigger animation
        setError(null);
        // Set the path elements to highlight
        const newPath = ROOM_PATHS[room.id] || [];
        setHighlightedPath(newPath);
        // Update search input to show the room ID
        setSearchValue(room.id);
        setSelectedRoomName(''); // Clear dropdown selection
        setFoundViaIdInput(true); // Mark as found via ID input
        previousRoomRef.current = targetRoom;
        
        // If model is already loaded, apply highlighting immediately
        if (isModelLoaded && newPath.length > 0) {
          console.log('🎯 Applying highlighting immediately for:', room.id);
          applyHighlighting(newPath);
        }
      } else {
        setError('ROOM NOT FOUND');
        setActiveRoom(null);
        setHighlightedPath([]);
        // Clear search input when room not found
        setSearchValue('');
        setSelectedRoomName('');
        previousRoomRef.current = null;
      }
    } else {
      setActiveRoom(null);
      setHighlightedPath([]);
      // Clear search input when clearing search
      setSearchValue('');
      setSelectedRoomName('');
      previousRoomRef.current = null;
    }
  }, [targetRoom, isModelLoaded]);

  // Function to apply highlighting to meshes
  const applyHighlighting = (pathToHighlight: string[]) => {
    if (!buildingGroupRef.current) return;
    
    buildingGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const shouldHighlight = pathToHighlight.includes(mesh.name);
        
        // Check if this is a facade wall (starts with "Wand") or room (starts with "Raum")
        const isFacadeWall = mesh.name.startsWith('Wand');
        const isRoom = mesh.name.startsWith('Raum');
        
        // Explicitly ensure Wand-001005 is always 70% transparent
        if (mesh.name === 'Wand-001005') {
          console.log('🎨 applyHighlighting: Setting Wand-001005 to 70% transparent');
          mesh.material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3
          });
        }
        else if (shouldHighlight) {
          // Highlight in blue - walls stay transparent, but highlighted rooms become solid
          const shouldBeTransparent = isFacadeWall;
          mesh.material = new THREE.MeshBasicMaterial({ 
            color: 0x3b82f6, // blue-600
            side: THREE.DoubleSide,
            transparent: shouldBeTransparent,
            opacity: shouldBeTransparent ? 0.3 : 1.0
          });
        } else {
          // Reset to white - walls and non-highlighted rooms are transparent
          const shouldBeTransparent = isFacadeWall || isRoom;
          mesh.material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            transparent: shouldBeTransparent,
            opacity: shouldBeTransparent ? 0.3 : 1.0
          });
        }
        
        // Remove old edges and add new ones with appropriate opacity
        mesh.children = mesh.children?.filter(c => !(c instanceof THREE.LineSegments)) || [];
        
        let edgeOpacity = 0.5;
        if (mesh.name.startsWith('Stütze')) edgeOpacity = 0.3;
        else if (mesh.name.startsWith('Treppe')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Tür')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Fenster')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Absturzsicherung')) edgeOpacity = 0.1;
        
        const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: shouldHighlight ? 0x1e40af : 0x000000, // darker blue for highlighted edges
          linewidth: 1, 
          transparent: edgeOpacity < 1, 
          opacity: edgeOpacity 
        });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(lineSegments);
      }
    });
  };

  // Effect to update materials when highlighted path changes
  useEffect(() => {
    // Only apply highlighting if model is loaded
    if (isModelLoaded) {
      applyHighlighting(highlightedPath);
    }
  }, [highlightedPath, isModelLoaded]);

  // Effect to re-apply highlighting when model loads and we already have a target room
  useEffect(() => {
    if (isModelLoaded && highlightedPath.length > 0) {
      console.log('🎯 Model loaded, re-applying highlighting for path:', highlightedPath);
      applyHighlighting(highlightedPath);
    }
  }, [isModelLoaded]);

  // Effect to animate fading out floors above the target room
  useEffect(() => {
    if (!activeRoom || !buildingGroupRef.current || meshFloorMapRef.current.size === 0) {
      console.log('Animation skipped:', { 
        hasActiveRoom: !!activeRoom, 
        hasBuildingGroup: !!buildingGroupRef.current, 
        floorMapSize: meshFloorMapRef.current.size 
      });
      return;
    }
    
    const targetFloor = activeRoom.floor;
    const meshFloorMap = meshFloorMapRef.current;
    console.log(`Starting floor fade animation for ${activeRoom.id} on floor ${targetFloor}`);
    
    // Specific objects to hide for Raum-004
    const objectsToHideForRaum004 = [
      'Boden-001013',
      'Absturzsicherung-009',
      'stair1',
      'Absturzsicherung-007002',
      'Absturzsicherung-007003'
    ];
    
    // Collect all meshes on floors above the target OR specific objects for Raum-004
    const meshesToFade: Array<{ mesh: THREE.Mesh, edges: THREE.LineSegments[] }> = [];
    
    buildingGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const meshFloor = meshFloorMap.get(mesh);
        
        // Check if this is a roof element
        const isRoofElement = mesh.name.startsWith('newroof') || mesh.name.startsWith('Dach');
        
        // Check if should be hidden: 
        // - Meshes on floors above the target floor
        // - Specific objects for Raum-004
        // - Roof elements when target floor is 4
        const shouldHide = 
          (meshFloor !== undefined && meshFloor > targetFloor) ||
          (activeRoom.id === 'Raum-004' && objectsToHideForRaum004.includes(mesh.name)) ||
          (targetFloor === 4 && isRoofElement);
        
        if (shouldHide) {
          // Find edge line segments
          const edges = mesh.children.filter(c => c instanceof THREE.LineSegments) as THREE.LineSegments[];
          meshesToFade.push({ mesh, edges });
        }
      }
    });
    
    console.log(`Found ${meshesToFade.length} meshes to fade above floor ${targetFloor}${targetFloor === 4 ? ' (including roof elements)' : ''}`);
    
    // Store initial opacity values for each mesh BEFORE animation starts
    const meshInitialStates = meshesToFade.map(({ mesh, edges }) => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      
      // Explicitly ensure Wand-001005 always uses 0.3 opacity
      let baseOpacity: number;
      if (mesh.name === 'Wand-001005') {
        baseOpacity = 0.3;
      } else {
        const isFacadeWall = mesh.name.startsWith('Wand');
        const isRoom = mesh.name.startsWith('Raum');
        baseOpacity = (isFacadeWall || isRoom) ? 0.3 : 1.0;
      }
      
      const edgeOpacities = edges.map(edge => {
        const edgeMaterial = edge.material as THREE.LineBasicMaterial;
        let edgeOpacity = 0.5;
        if (mesh.name.startsWith('Stütze')) edgeOpacity = 0.3;
        else if (mesh.name.startsWith('Treppe')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Tür')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Fenster')) edgeOpacity = 0.2;
        else if (mesh.name.startsWith('Absturzsicherung')) edgeOpacity = 0.1;
        else if (mesh.name.startsWith('newroof') || mesh.name.startsWith('Dach')) edgeOpacity = 0.5;
        return edgeOpacity;
      });
      
      return { mesh, edges, baseOpacity, edgeOpacities };
    });
    
    // Animate opacity from base to 0 over 1.5 seconds
    const duration = 1500; // milliseconds
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      
      meshInitialStates.forEach(({ mesh, edges, baseOpacity, edgeOpacities }) => {
        const material = mesh.material as THREE.MeshBasicMaterial;
        
        // Set material to transparent and fade from base opacity to 0
        material.transparent = true;
        material.opacity = baseOpacity * (1 - easedProgress);
        
        // Also fade edges from their base opacity to 0
        edges.forEach((edge, idx) => {
          const edgeMaterial = edge.material as THREE.LineBasicMaterial;
          edgeMaterial.transparent = true;
          edgeMaterial.opacity = edgeOpacities[idx] * (1 - easedProgress);
        });
      });
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    // Start animation after a short delay (wait for highlighting to finish)
    const timeoutId = setTimeout(() => {
      animate();
    }, 300);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [activeRoom]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (rendererRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const aspect = window.innerWidth / window.innerHeight;
    const d = 40;
    
    const getModelOffset = () => {
      const isMobile = window.innerWidth < 768;
      return {
        x: isMobile ? 0 : 12,
        y: -7
      };
    };

    //MODEL POSITION - Change modelX to move right/left on screen
    let { x: modelX, y: modelY } = getModelOffset();
    
    console.log('🔧 MODEL OFFSET:', { modelX, modelY });
    
    // Create orthographic camera with offset frustum to shift view
    const camera = new THREE.OrthographicCamera(
      -d * aspect - modelX,  // left - offset moves view right
      d * aspect - modelX,   // right - offset moves view right
      d - modelY,            // top - offset moves view down
      -d - modelY,           // bottom - offset moves view down
      1, 
      2000
    );
    
    // Position camera at standard location
    camera.position.set(50, 40, 50);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const canvas = renderer.domElement;
    canvas.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 1 !important; pointer-events: auto !important; display: block !important;';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('data-interactive', 'true');

    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const buildingGroup = new THREE.Group();
    buildingGroup.rotation.y = (80 * Math.PI) / 180;
    buildingGroup.position.y = -8;  // Standard vertical centering
    buildingGroup.position.x = 0;   // Standard horizontal centering
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 3;
    controls.maxPolarAngle = Math.PI / 3;
    controls.target.set(0, -8, 0);  // Standard orbit center
    controls.update();
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(30, 60, 40);
    scene.add(directionalLight);

    // Load the 3D model only once
    const loader = new GLTFLoader();
    loader.load(
      '/models/navigation.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Map to store which floor each mesh belongs to
        const meshFloorMap = new Map<THREE.Mesh, number>();
        
        // Detect floor structure (model may have floor containers numbered -1, 0, 1, 2, 3, 4, 5)
        const floorNumbers = [-1, 0, 1, 2, 3, 4, 5];
        model.children.forEach((child) => {
          const floorNum = parseInt(child.name.trim());
          if (!isNaN(floorNum) && floorNumbers.includes(floorNum)) {
            // This is a floor container, traverse its children and map them
            console.log(`Found floor container: ${child.name} (floor ${floorNum})`);
            child.traverse((meshChild) => {
              if ((meshChild as THREE.Mesh).isMesh) {
                meshFloorMap.set(meshChild as THREE.Mesh, floorNum);
              }
            });
          }
        });
        
        // Store the mapping in ref
        meshFloorMapRef.current = meshFloorMap;
        console.log(`Floor map populated with ${meshFloorMap.size} meshes`);
        
        // Traverse all meshes and apply materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            
            // Check if this is an outer wall (starts with "Wand") or room (starts with "Raum")
            const isFacadeWall = mesh.name.startsWith('Wand');
            const isRoom = mesh.name.startsWith('Raum');
            const isTransparent = isFacadeWall || isRoom;
            
            // Debug logging for Wand-001005
            if (mesh.name === 'Wand-001005') {
              console.log('🔍 Found Wand-001005 during model load, setting transparent to:', isTransparent);
            }
            
            // Apply material with transparency for walls and rooms
            mesh.material = new THREE.MeshBasicMaterial({ 
              color: 0xffffff, 
              side: THREE.DoubleSide,
              transparent: isTransparent,
              opacity: isTransparent ? 0.3 : 1.0  // 70% transparent = 30% opacity
            });
            mesh.children = mesh.children?.filter(c => !(c instanceof THREE.LineSegments)) || [];
            
            // Determine edge opacity by name
            let edgeOpacity = 0.5;
            if (mesh.name.startsWith('Stütze')) edgeOpacity = 0.3;
            else if (mesh.name.startsWith('Treppe')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Tür')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Fenster')) edgeOpacity = 0.2;
            else if (mesh.name.startsWith('Absturzsicherung')) edgeOpacity = 0.1;
            
            const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
            const lineMaterial = new THREE.LineBasicMaterial({ 
              color: 0x000000, 
              linewidth: 1, 
              transparent: edgeOpacity < 1, 
              opacity: edgeOpacity 
            });
            const lineSegments = new THREE.LineSegments(edges, lineMaterial);
            mesh.add(lineSegments);
          }
        });
        
        // Add model to building group
        buildingGroup.add(model);
        
        // Mark model as loaded
        setIsModelLoaded(true);
        
        // Apply highlighting after model is loaded
        applyHighlighting(highlightedPath);
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
      }
    );

    const clock = new THREE.Clock();
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      ({ x: modelX, y: modelY } = getModelOffset());
      const asp = window.innerWidth / window.innerHeight;
      const viewHeight = d;
      camera.left = -viewHeight * asp - modelX;
      camera.right = viewHeight * asp - modelX;
      camera.top = viewHeight - modelY;
      camera.bottom = -viewHeight - modelY;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (controls) controls.dispose();
      if (renderer) renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      setSelectedRoomName('');  // Clear dropdown when using ID input
      setFoundViaIdInput(true);
      onSearch(searchValue.trim().toUpperCase());
    }
  };

  const handleRoomSelect = (roomName: string) => {
    setSelectedRoomName(roomName);
    if (roomName) {
      setSearchValue('');  // Clear ID input when using dropdown
      const room = ROOM_DATABASE.find(r => r.name === roomName);
      if (room) {
        setFoundViaIdInput(false);
        onSearch(room.id.toUpperCase());
      }
    }
    setIsDropdownExpanded(false);  // Close dropdown after selection
  };

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="relative w-full h-full" />
      <div className={`absolute inset-0 z-20 transition-all duration-300 ease-out pointer-events-none ${
        isMobileLayout && isMobilePanelCollapsed ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}>
        <div className="absolute left-12 top-32 w-80 pointer-events-none">
          <div className="bg-white p-10 border border-slate-50 shadow-[0_40px_100px_rgba(0,0,0,0.06)] pointer-events-auto transition-all duration-700">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 mb-4">Find by Room ID</h2>
            <form onSubmit={handleSubmit} className="mb-3">
              <div className="relative">
                <input 
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="ROOM ID"
                  className="w-full bg-transparent border-b-2 border-slate-100 py-4 text-[12px] font-black uppercase tracking-[0.15em] text-slate-400 focus:border-blue-600 outline-none transition-all placeholder:text-slate-100"
                />
                <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-200 hover:text-blue-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </form>
            {error && <p className="text-[9px] text-red-500 font-black uppercase tracking-[0.18em] mt-6">{error}</p>}
          </div>
        </div>
        
        {/* Second panel with dropdown */}
        <div className="absolute left-12 top-80 w-80 pointer-events-none">
          <div className="bg-white p-10 border border-slate-50 shadow-[0_40px_100px_rgba(0,0,0,0.06)] pointer-events-auto transition-all duration-700 overflow-hidden">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 mb-6">Find by Room Name</h2>
            
            {/* Expandable dropdown button */}
            <div className="border-b border-slate-100 overflow-hidden -mx-10">
              <button 
                onClick={() => setIsDropdownExpanded(!isDropdownExpanded)}
                className={`w-full pl-10 pr-4 py-4 text-[12px] font-black uppercase tracking-[0.15em] will-change-transform transition-all duration-200 ease-out flex items-center justify-between ${
                  isDropdownExpanded ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span className={isDropdownExpanded ? 'text-white' : 'text-slate-400'}>
                    {selectedRoomName && !isDropdownExpanded ? selectedRoomName : 'SELECT THE ROOM'}
                  </span>
                </div>
                <svg className={`w-5 h-5 mr-4 opacity-20 will-change-transform transition-transform duration-200 ease-out ${
                  isDropdownExpanded ? 'rotate-180' : ''
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Expandable room options */}
              <div 
                className={`will-change-transform transition-all duration-200 ease-out overflow-hidden ${
                  isDropdownExpanded ? 'max-h-[400px] opacity-100 transform translate-y-0' : 'max-h-0 opacity-0 transform -translate-y-2'
                }`}
              >
                <div className="p-4 bg-slate-50 max-h-[400px] overflow-y-auto will-change-transform">
                  <div className="space-y-1">
                    {ROOM_DATABASE.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleRoomSelect(room.name)}
                        className={`w-full py-3 px-4 text-[10px] font-black uppercase tracking-[0.15em] text-left will-change-transform transition-all duration-150 ease-out hover:scale-[1.02] ${
                          selectedRoomName === room.name 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-blue-50'
                        }`}
                        style={{ borderRadius: 4 }}
                      >
                        {room.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Third panel - Route found display - dynamically positioned */}
        {activeRoom && (
          <div className={`absolute left-12 w-80 pointer-events-none transition-all duration-200 ease-out ${
            isDropdownExpanded ? 'top-[52rem]' : 'top-[32rem]'
          }`}>
            <div className="bg-white p-10 border border-slate-50 shadow-[0_40px_100px_rgba(0,0,0,0.06)] pointer-events-auto transition-all duration-700 animate-in fade-in slide-in-from-bottom-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Route found!</span>
              {foundViaIdInput && (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mt-4">The room you are looking for is:</p>
                  <h3 className="text-xl font-black uppercase tracking-normal text-slate-900 mt-2 leading-none">{activeRoom.name}</h3>
                </>
              )}
              <p className="text-[12px] font-black uppercase tracking-[0.15em] text-slate-400 mt-4">Level {activeRoom.floor === -1 ? '-01' : `0${activeRoom.floor}`} • Wing {activeRoom.wing}</p>
            </div>
          </div>
        )}

        {isMobileLayout && !isMobilePanelCollapsed && (
          <div className="absolute left-1/2 top-[46rem] -translate-x-1/2 w-80 pointer-events-none">
            <div className="pointer-events-auto transition-all duration-300 flex items-center justify-center">
              <button
                onClick={() => setIsMobilePanelCollapsed(true)}
                className="w-8 h-8 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                title="Collapse"
              >
                <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {isMobileLayout && isMobilePanelCollapsed && (
        <div 
          onClick={() => setIsMobilePanelCollapsed(false)}
          className="absolute left-5 bottom-[30px] w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg cursor-pointer pointer-events-auto flex items-center justify-center transition-all duration-200 hover:scale-110 z-30"
        >
          <div className="flex flex-col gap-1">
            <div className="w-4 h-0.5 bg-white rounded"></div>
            <div className="w-4 h-0.5 bg-white rounded"></div>
            <div className="w-4 h-0.5 bg-white rounded"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigationExperience;
