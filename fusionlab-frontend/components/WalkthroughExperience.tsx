import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomData } from '../App';

interface WalkthroughExperienceProps {
  onSelectRoom: (room: RoomData) => void;
  onHoverRoom: (room: RoomData | null) => void;
  initialFloor?: number; // Initial floor passed from parent component
  onFloorChange?: (floor: number) => void; // Notify parent component when floor changes
}

const rooms: RoomData[] = [
  { 
    id: 'Raum-200', 
    name: 'Bridge Connection', 
    floor: 1, 
    imageUrl: '/rooms/Raum-200.jpg',
    description: 'A newly constructed bridge structure connecting the northern part of the old building to the southern new extension, maintaining a close but non-touching link between the two.'
  },  
  { 
    id: 'Raum-100', 
    name: 'Main Entrance', 
    floor: 0, 
    imageUrl: '/rooms/Raum-100.jpg',
    description: 'The entrance area of VoltLab, offering a full view of the iconic blue staircase structure and welcoming visitors with open space and clear orientation.'
  },
  { 
    id: 'Raum-103', 
    name: 'Atrium Bridge', 
    floor: 2, 
    imageUrl: '/rooms/Raum-103.jpg',
    description: 'A spacious bridge in the atrium connecting rooms and corridors on both sides, filled with natural light. The bridge features edge tables and chairs for temporary study and work, creating a vibrant communal space.'
  },
  { 
    id: 'Raum-016', 
    name: 'Meeting Room', 
    floor: 4, 
    imageUrl: '/rooms/Raum-016.jpg',
    description: 'A fully enclosed meeting room designed for privacy and confidential discussions, offering a quiet and secure environment.'
  },
  { 
    id: 'Raum-011', 
    name: 'Movement Room', 
    floor: 2, 
    imageUrl: '/rooms/Raum-011.jpg',
    description: 'A semi-open activity space with fully openable glass doors, allowing visibility from outside and enhancing visual interaction and communication.'
  },
  { 
    id: 'Raum-022', 
    name: 'Lounge Space', 
    floor: 3, 
    imageUrl: '/rooms/Raum-022.jpg',
    description: 'A fully open space furnished with sofas and chairs, providing a comfortable area for users to relax and rest.'
  },
  { 
    id: 'Raum-101', 
    name: 'Multifunctional Space', 
    floor: -1, 
    imageUrl: '/rooms/Raum-101.jpg',
    description: 'A versatile basement space suitable for exhibitions, lectures, film screenings, and a variety of events and activities.'
  },
];

const WalkthroughExperience: React.FC<WalkthroughExperienceProps> = ({ onSelectRoom, onHoverRoom, initialFloor = 5, onFloorChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const floorEmptiesRef = useRef<Map<number, THREE.Object3D>>(new Map());
  const siteModelsRef = useRef<THREE.Object3D[]>([]);
  const bridgeRef = useRef<THREE.Object3D | null>(null);
  // All objects with northcar prefix
  const northcarModelsRef = useRef<THREE.Object3D[]>([]);
  // All objects with eastcar prefix
  const eastcarModelsRef = useRef<THREE.Object3D[]>([]);
  const raum011Ref = useRef<THREE.Mesh | null>(null);
  const raum016Ref = useRef<THREE.Mesh | null>(null);
  const raum022Ref = useRef<THREE.Mesh | null>(null);
  const raum103Ref = useRef<THREE.Mesh | null>(null);
  const raum100Ref = useRef<THREE.Mesh | null>(null);
  const raum101Ref = useRef<THREE.Mesh | null>(null);
  const raum200Ref = useRef<THREE.Mesh | null>(null);
  const currentFloorRef = useRef<number>(initialFloor); // Use ref to save current floor
  const selectedRoomIdRef = useRef<string | null>(null); // Use ref to save selected room ID
  const [currentFloor, setCurrentFloor] = useState<number>(initialFloor); // Use initial floor passed from parent
  const [isAnimating, setIsAnimating] = useState(false);
  const [hoveredFloor, setHoveredFloor] = useState<number | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null); // Currently selected room ID
  const [showInstruction, setShowInstruction] = useState(true); // Whether to show usage instructions

  // Convert floor number to text label
  const getFloorLabel = (floor: number): string => {
    switch (floor) {
      case -1: return 'Basement';
      case 0: return 'EG Floor';
      case 1: return '1st Floor';
      case 2: return '2nd Floor';
      case 3: return '3rd Floor';
      case 4: return '4th Floor';
      case 5: return 'Roof';
      default: return `Floor ${floor}`;
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    if (rendererRef.current) return; // Guard against double initialization

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const aspect = window.innerWidth / window.innerHeight;
    // Use orthographic camera for better architectural display
    const camera = new THREE.OrthographicCamera(
      -800 * aspect,
      800 * aspect,
      800,
      -800,
      0.1,
      5000
    );
    camera.position.set(100, 150, 100);
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 150, 100);
    scene.add(directionalLight);

    // Set up OrbitControls for model rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = true;
    controls.autoRotate = false;
    controls.target.set(0, 0, 0);
    // Limit to horizontal rotation only (lock vertical angle)
    controls.minPolarAngle = Math.PI / 3; // 60 degrees
    controls.maxPolarAngle = Math.PI / 3; // 60 degrees
    controlsRef.current = controls;

    // Load 3D model
    const loader = new GLTFLoader();
    loader.load(
      '/models/walkthroughmodel.glb',
      (gltf) => {
        const model = gltf.scene;
        scene.add(model);

        // First find the Empty object named "0" and all floors (before moving the model)
        let targetEmpty: THREE.Object3D | null = null;
        const floorNumbers = [-1, 0, 1, 2, 3, 4, 5];
        
        

        // Collect all objects with northcar and eastcar prefixes
        northcarModelsRef.current = [];
        eastcarModelsRef.current = [];
        let northcarCount = 0;
        let eastcarCount = 0;
        model.traverse((child) => {
          if (child.name === '0') {
            targetEmpty = child;
          }
          // Save all floor empty objects
          const floorNum = parseInt(child.name.trim());
          if (!isNaN(floorNum) && floorNumbers.includes(floorNum)) {
            floorEmptiesRef.current.set(floorNum, child);
          }
          // Find site plan, site model, bridge objects
          const childNameLower = child.name.toLowerCase();

          // Collect all models with "site" prefix
          if (childNameLower.startsWith('site')) {
            siteModelsRef.current.push(child);
          }
          if (childNameLower === 'bridge') {
            bridgeRef.current = child;
          }
          // Collect all objects with northcar prefix
          if (childNameLower.startsWith('northcar')) {
            northcarModelsRef.current.push(child);
            northcarCount++;
          }
          // Collect all objects with eastcar prefix
          if (childNameLower.startsWith('eastcar')) {
            eastcarModelsRef.current.push(child);
            eastcarCount++;
          }
        });
        console.log('Number of northcar objects found:', northcarCount);
        console.log('Number of eastcar objects found:', eastcarCount);
        
        // Initialize visibility of site models and bridge
        // Site models are only shown on roof level (5th floor)
        siteModelsRef.current.forEach((siteModel) => {
          // Save original Y coordinate
          if (siteModel.userData.originalY === undefined) {
            siteModel.userData.originalY = siteModel.position.y;
          }
          if (initialFloor === 5) {
            siteModel.visible = true;
            siteModel.position.y = siteModel.userData.originalY;
          } else {
            siteModel.visible = false;
          }
        });
        if (bridgeRef.current) {
          bridgeRef.current.visible = true; // bridge is always visible
        }
        
        // Initialize visibility and position of all northcar objects
        northcarModelsRef.current.forEach((obj) => {
          if (obj.userData.originalZ === undefined) {
            obj.userData.originalZ = obj.position.z;
          }
          if (initialFloor === 5) {
            obj.visible = true;
            obj.position.z = obj.userData.originalZ;
          } else {
            obj.visible = false;
          }
        });

        // Initialize visibility and position of all eastcar objects
        eastcarModelsRef.current.forEach((obj) => {
          if (obj.userData.originalX === undefined) {
            obj.userData.originalX = obj.position.x;
          }
          if (initialFloor === 5) {
            obj.visible = true;
            obj.position.x = obj.userData.originalX;
          } else {
            obj.visible = false;
          }
        });

        // Set initial floor visibility based on initialFloor
        floorEmptiesRef.current.forEach((empty, floorNum) => {
          // Save original Y coordinate
          if (empty.userData.originalY === undefined) {
            empty.userData.originalY = empty.position.y;
          }
          
          if (initialFloor === 5) {
            // Show all floors, restore to original position
            empty.visible = true;
            empty.position.y = empty.userData.originalY;
          } else {
            // Only show selected floor and below
            if (floorNum <= initialFloor) {
              empty.visible = true;
              empty.position.y = empty.userData.originalY; // Restore to original position
            } else {
              empty.visible = false;
            }
          }
        });

        // Get the original world coordinates of Empty "0"
        let emptyWorldPosition = new THREE.Vector3(0, 0, 0);
        if (targetEmpty) {
          targetEmpty.getWorldPosition(emptyWorldPosition);
        } else {
        }

        // Calculate the model's bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the model to origin
        model.position.sub(center);
        
        // Responsive scaling: 0.5x for mobile, 0.7x for desktop
        const isMobile = window.innerWidth < 768;
        const scale = isMobile ? 0.25 : 0.4;
        model.scale.set(scale, scale, scale);
        
        // Translate model downward
        model.position.y -= size.y * 0.2; // Move down by 15% of model height

        // Calculate Empty's position in new coordinate system (position after moving)
        const rotationCenter = emptyWorldPosition.clone().sub(center);
        rotationCenter.y -= size.y * 0.15; // Synchronously adjust rotation center

        // Apply materials: white faces + black wireframe
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const meshName = mesh.name.toLowerCase();
            
            // Save Raum-011 reference
            if (mesh.name === 'Raum-011') {
              raum011Ref.current = mesh;
            }
             // Save Raum-016 reference
            if (mesh.name === 'Raum-016') {
              raum016Ref.current = mesh;
            }
            // Save Raum-022 reference
            if (mesh.name === 'Raum-022') {
              raum022Ref.current = mesh;
            }                           

            // Save Raum-103 reference
            if (mesh.name === 'Raum-103') {
              raum103Ref.current = mesh;
            }
            
            // Save Raum-100 reference
            if (mesh.name === 'Raum-100') {
              raum100Ref.current = mesh;
            }
            
            // Save Raum-101 reference
            if (mesh.name === 'Raum-101') {
              raum101Ref.current = mesh;
            }
            
            // Save Raum-200 reference
            if (mesh.name === 'Raum-200') {
              raum200Ref.current = mesh;
            }
            
            // Set surface color based on object name
            let faceColor = 0xffffff; // Default white
            if (meshName.includes('ground')) {
              faceColor = 0xfafafa; // Lighter gray
            }
            // Set initial color based on room's floor and initialFloor
            if (mesh.name === 'Raum-011' || mesh.name === 'Raum-103') {
              faceColor = initialFloor === 2 ? 0x2563eb : 0xffffff; // Floor 2
            } else if (mesh.name === 'Raum-022') {
              faceColor = initialFloor === 3 ? 0x2563eb : 0xffffff; // Floor 3
            } else if (mesh.name === 'Raum-016') {
              faceColor = initialFloor === 4 ? 0x2563eb : 0xffffff; // Floor 4
            } else if (mesh.name === 'Raum-100') {
              faceColor = initialFloor === 0 ? 0x2563eb : 0xffffff; // Floor 0
            } else if (mesh.name === 'Raum-101') {
              faceColor = initialFloor === -1 ? 0x2563eb : 0xffffff; // Floor -1
            } else if (mesh.name === 'Raum-200') {
              faceColor = initialFloor === 1 ? 0x2563eb : 0xffffff; // Floor 1
            }
            
            // Set face material
            mesh.material = new THREE.MeshBasicMaterial({
              color: faceColor,
              side: THREE.DoubleSide
            });

            // Set different line transparency based on object name
            let opacity = 1.0; // Default opaque (third lightest)
            
            if (meshName.includes('treppe')) {
              opacity = 0.15;
            } else if (meshName.includes('stütze') || meshName.includes('stutze')) {
              opacity = 0.3;
            } else if (meshName.includes('fenster') || meshName.includes('fenster')) {
              opacity = 0.2;
            } else if (meshName.includes('tür') || meshName.includes('tür')) {
              opacity = 0.2;
            } else if (meshName.includes('absturzsicherung') || meshName.includes('absturzsicherung')) {
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

            // Add black wireframe border
            const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
            const linesMaterial = new THREE.LineBasicMaterial({
              color: 0x000000,
              linewidth: 1,
              transparent: true,
              opacity: opacity
            });
            const wireframe = new THREE.LineSegments(edges, linesMaterial);
            mesh.add(wireframe);
          }
        });

        // Calculate camera range needed to display the entire model
        const maxDim = Math.max(size.x, size.y, size.z);
        const cameraScale = maxDim * 0.7 / 15; // Divide by 15 to achieve 15x zoom effect
        camera.left = -cameraScale * aspect;
        camera.right = cameraScale * aspect;
        camera.top = cameraScale;
        camera.bottom = -cameraScale;
        camera.updateProjectionMatrix();

        // Axonometric view: Place camera around rotation center
        const distance = maxDim;
        const rotationAngle = 80 * Math.PI / 180; // Convert 80 degrees to radians
        
        // Base camera offset
        const baseOffsetX = distance * 0.6;
        const baseOffsetZ = distance * 0.6;
        
        // Apply 80-degree rotation (around Y-axis)
        const rotatedX = baseOffsetX * Math.cos(rotationAngle) - baseOffsetZ * Math.sin(rotationAngle);
        const rotatedZ = baseOffsetX * Math.sin(rotationAngle) + baseOffsetZ * Math.cos(rotationAngle);
        
        camera.position.set(
          rotationCenter.x + rotatedX,
          rotationCenter.y + distance * 8,
          rotationCenter.z + rotatedZ
        );
        camera.lookAt(rotationCenter.x, rotationCenter.y, rotationCenter.z);
        controls.target.copy(rotationCenter);
        controls.update();
      },
      (progress) => {
      },
      (error) => {
      }
    );

    // Render loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // Northcar prefix objects unidirectional loop motion animation (only shown on roof level)
      northcarModelsRef.current.forEach((obj) => {
        if (currentFloorRef.current === 5) {
          obj.visible = true;
          const speed = 0.02; // Control speed (movement per frame)
          const range = 120; // Motion range
          const originalZ = obj.userData.originalZ || 0;
          if (obj.userData.northcarStartTime === undefined) {
            obj.userData.northcarStartTime = Date.now();
          }
          // Calculate elapsed time
          const elapsed = (Date.now() - obj.userData.northcarStartTime) * speed;
          // Calculate current offset (0~range)
          let offset = elapsed % range;
          obj.position.z = originalZ + offset;
        } else {
          obj.visible = false;
          if (obj.userData.originalZ !== undefined) {
            obj.position.z = obj.userData.originalZ;
          }
          // Reset animation start point
          obj.userData.northcarStartTime = undefined;
        }
      });

      // Eastcar prefix objects unidirectional loop motion animation (only shown on roof level, x direction)
      eastcarModelsRef.current.forEach((obj) => {
        if (currentFloorRef.current === 5) {
          obj.visible = true;
          const speed = 0.02; // Control speed (movement per frame)
          const range = 120; // Motion range
          const originalX = obj.userData.originalX || 0;
          if (obj.userData.eastcarStartTime === undefined) {
            obj.userData.eastcarStartTime = Date.now();
          }
          // Calculate elapsed time
          const elapsed = (Date.now() - obj.userData.eastcarStartTime) * speed;
          // Calculate current offset (0~range)
          let offset = elapsed % range;
          obj.position.x = originalX - offset;
        } else {
          obj.visible = false;
          if (obj.userData.originalX !== undefined) {
            obj.position.x = obj.userData.originalX;
          }
          // Reset animation start point
          obj.userData.eastcarStartTime = undefined;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const newAspect = window.innerWidth / window.innerHeight;
      if (camera instanceof THREE.OrthographicCamera) {
        const viewHeight = camera.top;
        camera.left = -viewHeight * newAspect;
        camera.right = viewHeight * newAspect;
        camera.updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Add mouse/touch interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Unified handling of click and touch events
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (!cameraRef.current) return;
      
      event.preventDefault();

      // Get click/touch coordinates
      let clientX = 0;
      let clientY = 0;
      
      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
      } else if (event instanceof TouchEvent) {
        // Use first touch point
        const touch = event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
      }

      // Calculate normalized coordinates using canvas actual position and size
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      raycaster.setFromCamera(mouse, cameraRef.current);

      let clickedRoomId: string | null = null;

      // Detect Raum-011 (Floor 2)
      if (currentFloorRef.current === 2 && raum011Ref.current) {
        const intersects = raycaster.intersectObject(raum011Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-011';
        }
      }

      // Detect Raum-103 (Floor 2)
      if (!clickedRoomId && currentFloorRef.current === 2 && raum103Ref.current) {
        const intersects = raycaster.intersectObject(raum103Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-103';
        }
      }

      // Detect Raum-022 (Floor 3)
      if (!clickedRoomId && currentFloorRef.current === 3 && raum022Ref.current) {
        const intersects = raycaster.intersectObject(raum022Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-022';
        }
      }

      // Detect Raum-016 (Floor 4)
      if (!clickedRoomId && currentFloorRef.current === 4 && raum016Ref.current) {
        const intersects = raycaster.intersectObject(raum016Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-016';
        }
      }

      // Detect Raum-100 (Floor 0)
      if (!clickedRoomId && currentFloorRef.current === 0 && raum100Ref.current) {
        const intersects = raycaster.intersectObject(raum100Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-100';
        }
      }
      
      // Detect Raum-101 (Floor -1)
      if (!clickedRoomId && currentFloorRef.current === -1 && raum101Ref.current) {
        const intersects = raycaster.intersectObject(raum101Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-101';
        }
      }
      
      // Detect Raum-200 (Floor 1)
      if (!clickedRoomId && currentFloorRef.current === 1 && raum200Ref.current) {
        const intersects = raycaster.intersectObject(raum200Ref.current, false);
        if (intersects.length > 0) {
          clickedRoomId = 'Raum-200';
        }
      }

      // Handle click logic
      if (clickedRoomId) {
        setShowInstruction(false); // Hide usage instructions
        
        if (selectedRoomIdRef.current === clickedRoomId) {
          // Second click on same room, enter 360-degree view
          const room = rooms.find(r => r.id === clickedRoomId);
          if (room) {
            onSelectRoom(room);
          }
        } else {
          // First click on room, show room information
          selectedRoomIdRef.current = clickedRoomId;
          setSelectedRoomId(clickedRoomId);
        }
      }
    };

    // Listen to both mouse click and touch events
    canvas.addEventListener('click', handlePointer);
    canvas.addEventListener('touchend', handlePointer, { passive: false });

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('click', handlePointer);
        canvas.removeEventListener('touchend', handlePointer);
      }
      
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry?.dispose();
          if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
          else node.material?.dispose();
        }
      });
      renderer.dispose();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  // Listen for floor changes, clear selected room state
  useEffect(() => {
    currentFloorRef.current = currentFloor; // Synchronously update ref
    selectedRoomIdRef.current = null; // Clear selected state in ref
    setSelectedRoomId(null); // Clear selected state when switching floors
    setShowInstruction(false); // Hide usage instructions
  }, [currentFloor]);

  // Floor switching function
  const handleFloorChange = (targetFloor: number) => {
    if (isAnimating || targetFloor === currentFloor) return;
    
    setIsAnimating(true);
    
    // Immediately update currentFloorRef so animation loop can respond to floor changes instantly
    currentFloorRef.current = targetFloor;
    
    // If switching down (from high to low floor), target floor rooms need animation from white to blue
    if (targetFloor < currentFloor) {
      const animationStartTime = Date.now();
      const colorAnimationDuration = 400; // 400ms color animation
      
      const animateColorDown = () => {
        const elapsed = Date.now() - animationStartTime;
        const progress = Math.min(elapsed / colorAnimationDuration, 1);
        
        const easeProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const startColor = new THREE.Color(0xffffff);
        const endColor = new THREE.Color(0x2563eb);
        
        // Add color transition for target floor rooms
        if (targetFloor === 2) {
          if (raum011Ref.current && raum011Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum011Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
          if (raum103Ref.current && raum103Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum103Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        } else if (targetFloor === 3) {
          if (raum022Ref.current && raum022Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum022Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        } else if (targetFloor === 4) {
          if (raum016Ref.current && raum016Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum016Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        } else if (targetFloor === 0) {
          if (raum100Ref.current && raum100Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum100Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        } else if (targetFloor === -1) {
          if (raum101Ref.current && raum101Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum101Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        } else if (targetFloor === 1) {
          if (raum200Ref.current && raum200Ref.current.material instanceof THREE.MeshBasicMaterial) {
            raum200Ref.current.material.color.lerpColors(startColor, endColor, easeProgress);
          }
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateColorDown);
        }
      };
      
      animateColorDown();
    }
    
    // Calculate zoom factors for current and target floors
    const currentZoomFactor = 0.7 + (currentFloor + 1) * 0.3 / 6;
    const targetZoomFactor = 0.7 + (targetFloor + 1) * 0.3 / 6;
    
    // Mark whether zoom animation has been triggered (ensure it only triggers once)
    let zoomTriggered = false;
    
    // Function to trigger zoom animation
    const triggerZoom = () => {
      if (zoomTriggered) return;
      zoomTriggered = true;
      
      if (cameraRef.current instanceof THREE.OrthographicCamera) {
        const camera = cameraRef.current;
        const aspect = window.innerWidth / window.innerHeight;
        const baseScale = camera.userData.baseScale || camera.top;
        camera.userData.baseScale = baseScale;
        
        const zoomStartTime = Date.now();
        const zoomDuration = 800; // Extended to 600ms: first 300ms complete half (synchronized with descent), next 300ms complete the other half
        
        const animateZoom = () => {
          const elapsed = Date.now() - zoomStartTime;
          const progress = Math.min(elapsed / zoomDuration, 1);
          
          const easeProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
          
          const zoomFactor = currentZoomFactor + (targetZoomFactor - currentZoomFactor) * easeProgress;
          const newScale = baseScale * zoomFactor;
          
          camera.left = -newScale * aspect;
          camera.right = newScale * aspect;
          camera.top = newScale;
          camera.bottom = -newScale;
          camera.updateProjectionMatrix();
          
          if (progress < 1) {
            requestAnimationFrame(animateZoom);
          }
        };
        
        animateZoom();
      }
    };
    
    // All floors that need to disappear and appear execute animation simultaneously
    floorEmptiesRef.current.forEach((empty, floorNum) => {
      const shouldBeVisible = floorNum >= -1 && floorNum <= targetFloor;
      
      if (!shouldBeVisible && empty.visible) {
        // Floor needs to disappear: add up then down animation
        const originalY = empty.userData.originalY !== undefined ? empty.userData.originalY : empty.position.y;
        if (empty.userData.originalY === undefined) {
          empty.userData.originalY = empty.position.y;
        }
        
        // Get target floor Y coordinate (disappear to target floor height position)
        const targetFloorEmpty = floorEmptiesRef.current.get(targetFloor);
        const targetY = targetFloorEmpty ? 
          (targetFloorEmpty.userData.originalY !== undefined ? targetFloorEmpty.userData.originalY : targetFloorEmpty.position.y) 
          : originalY;
        
        // First phase: move upward
        const upDuration = 500;
        const upHeight = 1;
        const startY = empty.position.y;
        const startTime = Date.now();
        
        const animateUp = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / upDuration, 1);
          empty.position.y = startY + upHeight * progress;
          
          // If floor 2 disappears (switching down from floor 2), color transitions from blue to white during upward animation
          // Only execute color transition when current floor is 2
          if (floorNum === 2 && currentFloor === 2 && targetFloor < 2 && raum011Ref.current) {
            const mesh = raum011Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          // If floor 3 disappears (switching down from floor 3), color transitions from blue to white during upward animation
          if (floorNum === 3 && currentFloor === 3 && targetFloor < 3 && raum022Ref.current) {
            const mesh = raum022Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          // If floor 4 disappears (switching down from floor 4), color transitions from blue to white during upward animation
          if (floorNum === 4 && currentFloor === 4 && targetFloor < 4 && raum016Ref.current) {
            const mesh = raum016Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          // If floor 0 disappears (switching down from floor 0), color transitions from blue to white during upward animation
          // Only execute color transition when current floor is 0
          if (floorNum === 0 && currentFloor === 0 && targetFloor < 0 && raum100Ref.current) {
            const mesh = raum100Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          // If floor -1 disappears (switching down from floor -1), color transitions from blue to white during upward animation
          // Only execute color transition when current floor is -1
          if (floorNum === -1 && currentFloor === -1 && targetFloor < -1 && raum101Ref.current) {
            const mesh = raum101Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          // If floor 1 disappears (switching down from floor 1), color transitions from blue to white during upward animation
          // Only execute color transition when current floor is 1
          if (floorNum === 1 && currentFloor === 1 && targetFloor < 1 && raum200Ref.current) {
            const mesh = raum200Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          if (floorNum === 2 && currentFloor === 2 && targetFloor < 2 && raum103Ref.current) {
            const mesh = raum103Ref.current;
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              const startColor = new THREE.Color(0x2563eb); // Blue
              const endColor = new THREE.Color(0xffffff);   // White
              mesh.material.color.lerpColors(startColor, endColor, progress);
            }
          }
          
          if (progress < 1) {
            requestAnimationFrame(animateUp);
          } else {
            // Second phase: move down to target floor height and disappear
            // Trigger zoom when downward animation starts (ensure precise time synchronization)
            triggerZoom();
            
            const downStartTime = Date.now();
            const downDuration = 400;
            const downStartY = empty.position.y;
            const downDistance = downStartY - targetY; // Calculate distance to descend
            
            const animateDown = () => {
              const elapsed = Date.now() - downStartTime;
              const progress = Math.min(elapsed / downDuration, 1);
              
              // Use easing function
              const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              
              empty.position.y = downStartY - downDistance * easeProgress;
              
              if (progress >= 1) {
                empty.visible = false;
                empty.position.y = originalY;
              } else {
                requestAnimationFrame(animateDown);
              }
            };
            animateDown();
          }
        };
        animateUp();
      } else if (shouldBeVisible && !empty.visible) {
        // Floor needs to appear
        const originalY = empty.userData.originalY !== undefined ? empty.userData.originalY : empty.position.y;
        if (empty.userData.originalY === undefined) {
          empty.userData.originalY = empty.position.y;
        }
        
        // If switching up floors (number increases), only the last floor (target floor) needs animation
        if (targetFloor > currentFloor) {
          // Get current topmost floor Y coordinate as starting position
          const currentTopFloorEmpty = floorEmptiesRef.current.get(currentFloor);
          const startY = currentTopFloorEmpty ? 
            (currentTopFloorEmpty.userData.originalY !== undefined ? currentTopFloorEmpty.userData.originalY : currentTopFloorEmpty.position.y) 
            : originalY;
          
          // Check if this is the last floor (target floor)
          if (floorNum === targetFloor) {
            // Last floor: complete animation starting from current topmost floor, first up then down
            empty.visible = true;
            empty.position.y = startY;
            const upHeight = 1;
            
            // First phase: move up to position higher than final position
            const upDuration = 500;
            const startTime = Date.now();
            const totalDistance = originalY - startY + upHeight; // Distance to original position + additional upward height
            
            // If switching from room's floor to higher floor, room turns white immediately when animation starts
            if (floorNum === 2 && currentFloor === 2 && targetFloor > 2) {
              if (raum011Ref.current && raum011Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum011Ref.current.material.color.setHex(0xffffff);
              }
              if (raum103Ref.current && raum103Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum103Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            if (floorNum === 3 && currentFloor === 3 && targetFloor > 3) {
              if (raum022Ref.current && raum022Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum022Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            if (floorNum === 4 && currentFloor === 4 && targetFloor > 4) {
              if (raum016Ref.current && raum016Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum016Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            if (floorNum === 0 && currentFloor === 0 && targetFloor > 0) {
              if (raum100Ref.current && raum100Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum100Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            if (floorNum === -1 && currentFloor === -1 && targetFloor > -1) {
              if (raum101Ref.current && raum101Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum101Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            if (floorNum === 1 && currentFloor === 1 && targetFloor > 1) {
              if (raum200Ref.current && raum200Ref.current.material instanceof THREE.MeshBasicMaterial) {
                raum200Ref.current.material.color.setHex(0xffffff);
              }
            }
            
            const animateUp = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / upDuration, 1);
              empty.position.y = startY + totalDistance * progress;
              
              if (progress < 1) {
                requestAnimationFrame(animateUp);
              } else {
                // Second phase: move down back to original position
                // Trigger zoom when downward animation starts
                triggerZoom();
                
                const downStartTime = Date.now();
                const downDuration = 400;
                const downStartY = empty.position.y;
                
                const animateDown = () => {
                  const elapsed = Date.now() - downStartTime;
                  const progress = Math.min(elapsed / downDuration, 1);
                  
                  // Use easing function
                  const easeProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                  
                  empty.position.y = downStartY - upHeight * easeProgress;
                  
                  // If floor 2 appears (switching from other floors to 2), color transitions from white to blue during downward animation
                  if (floorNum === 2 && currentFloor !== 2 && targetFloor === 2 && raum011Ref.current) {
                    const mesh = raum011Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  // If floor 2 appears (switching from other floors to 2), color transitions from white to blue during downward animation
                  if (floorNum === 2 && currentFloor !== 2 && targetFloor === 2 && raum103Ref.current) {
                    const mesh = raum103Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  // If floor 3 appears (switching from other floors to 3), color transitions from white to blue during downward animation
                  if (floorNum === 3 && currentFloor !== 3 && targetFloor === 3 && raum022Ref.current) {
                    const mesh = raum022Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  // If floor 4 appears (switching from other floors to 4), color transitions from white to blue during downward animation
                  if (floorNum === 4 && currentFloor !== 4 && targetFloor === 4 && raum016Ref.current) {
                    const mesh = raum016Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  // If floor 0 appears (switching from other floors to 0), color transitions from white to blue during downward animation
                  if (floorNum === 0 && currentFloor !== 0 && targetFloor === 0 && raum100Ref.current) {
                    const mesh = raum100Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  // If floor -1 appears (switching from other floors to -1), color transitions from white to blue during downward animation
                  if (floorNum === -1 && currentFloor !== -1 && targetFloor === -1 && raum101Ref.current) {
                    const mesh = raum101Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  // If floor 1 appears (switching from other floors to 1), color transitions from white to blue during downward animation
                  if (floorNum === 1 && currentFloor !== 1 && targetFloor === 1 && raum200Ref.current) {
                    const mesh = raum200Ref.current;
                    if (mesh.material instanceof THREE.MeshBasicMaterial) {
                      const startColor = new THREE.Color(0xffffff);
                      const endColor = new THREE.Color(0x2563eb);
                      mesh.material.color.lerpColors(startColor, endColor, easeProgress);
                    }
                  }
                  
                  if (progress >= 1) {
                    empty.position.y = originalY;
                  } else {
                    requestAnimationFrame(animateDown);
                  }
                };
                animateDown();
              }
            };
            animateUp();
          } else {
            // Middle floors: move up from current topmost floor to original position
            empty.visible = true;
            empty.position.y = startY;
            
            // Move directly up to original position (no bounce animation needed)
            const upDuration = 500;
            const startTime = Date.now();
            const totalDistance = originalY - startY; // Distance to original position
            
            const animateUp = () => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min(elapsed / upDuration, 1);
              empty.position.y = startY + totalDistance * progress;
              
              if (progress < 1) {
                requestAnimationFrame(animateUp);
              } else {
                empty.position.y = originalY;
              }
            };
            animateUp();
          }
        } else {
          // Switch down floors (number decreases), show directly
          empty.position.y = originalY;
          empty.visible = true;
        }
      }
    });
    
    // Handle show/hide animation for site models (only shown on roof level)
    const shouldShowSiteModels = targetFloor === 5;
    const currentlyShowingSiteModels = currentFloor === 5;
    
    if (shouldShowSiteModels && !currentlyShowingSiteModels) {
      // Switch to roof level, site models need to appear
      siteModelsRef.current.forEach((siteModel) => {
        const originalY = siteModel.userData.originalY !== undefined ? siteModel.userData.originalY : siteModel.position.y;
        if (siteModel.userData.originalY === undefined) {
          siteModel.userData.originalY = siteModel.position.y;
        }
        
        // Start from current position, first up then down animation
        siteModel.visible = true;
        const upHeight = 1;
        const startY = originalY;
        
        // First phase: move upward
        const upDuration = 500;
        const startTime = Date.now();
        
        const animateUp = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / upDuration, 1);
          siteModel.position.y = startY + upHeight * progress;
          
          if (progress < 1) {
            requestAnimationFrame(animateUp);
          } else {
            // Second phase: move down back to original position
            const downStartTime = Date.now();
            const downDuration = 400;
            const downStartY = siteModel.position.y;
            
            const animateDown = () => {
              const elapsed = Date.now() - downStartTime;
              const progress = Math.min(elapsed / downDuration, 1);
              
              // Use easing function
              const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              
              siteModel.position.y = downStartY - upHeight * easeProgress;
              
              if (progress >= 1) {
                siteModel.position.y = originalY;
              } else {
                requestAnimationFrame(animateDown);
              }
            };
            animateDown();
          }
        };
        animateUp();
      });
    } else if (!shouldShowSiteModels && currentlyShowingSiteModels) {
      // Leave roof level, site models need to disappear
      siteModelsRef.current.forEach((siteModel) => {
        const originalY = siteModel.userData.originalY !== undefined ? siteModel.userData.originalY : siteModel.position.y;
        if (siteModel.userData.originalY === undefined) {
          siteModel.userData.originalY = siteModel.position.y;
        }
        
        // First phase: move upward
        const upDuration = 500;
        const upHeight = 1;
        const startY = siteModel.position.y;
        const startTime = Date.now();
        
        const animateUp = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / upDuration, 1);
          siteModel.position.y = startY + upHeight * progress;
          
          if (progress < 1) {
            requestAnimationFrame(animateUp);
          } else {
            // Second phase: move down and disappear (move down a fixed distance)
            const downStartTime = Date.now();
            const downDuration = 400;
            const downStartY = siteModel.position.y;
            const downDistance = upHeight + 3; // Total downward distance: back to original position (1) then further down (3)
            
            const animateDown = () => {
              const elapsed = Date.now() - downStartTime;
              const progress = Math.min(elapsed / downDuration, 1);
              
              // Use easing function
              const easeProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              
              siteModel.position.y = downStartY - downDistance * easeProgress;
              
              if (progress >= 1) {
                siteModel.visible = false;
                siteModel.position.y = originalY;
              } else {
                requestAnimationFrame(animateDown);
              }
            };
            animateDown();
          }
        };
        animateUp();
      });
    }
    
    // Update state after animation completes
    setTimeout(() => {
      setCurrentFloor(targetFloor);
      setIsAnimating(false);
      
      // Update target floor room colors
      // Set target floor rooms to blue, other floor rooms to white
      if (raum011Ref.current && raum011Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum011Ref.current.material.color.setHex(targetFloor === 2 ? 0x2563eb : 0xffffff);
      }
      if (raum103Ref.current && raum103Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum103Ref.current.material.color.setHex(targetFloor === 2 ? 0x2563eb : 0xffffff);
      }
      if (raum022Ref.current && raum022Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum022Ref.current.material.color.setHex(targetFloor === 3 ? 0x2563eb : 0xffffff);
      }
      if (raum016Ref.current && raum016Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum016Ref.current.material.color.setHex(targetFloor === 4 ? 0x2563eb : 0xffffff);
      }
      if (raum100Ref.current && raum100Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum100Ref.current.material.color.setHex(targetFloor === 0 ? 0x2563eb : 0xffffff);
      }
      if (raum101Ref.current && raum101Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum101Ref.current.material.color.setHex(targetFloor === -1 ? 0x2563eb : 0xffffff);
      }
      if (raum200Ref.current && raum200Ref.current.material instanceof THREE.MeshBasicMaterial) {
        raum200Ref.current.material.color.setHex(targetFloor === 1 ? 0x2563eb : 0xffffff);
      }
      
      // Notify parent component of floor change
      if (onFloorChange) {
        onFloorChange(targetFloor);
      }
    }, 900); // Total time: 500ms up + 400ms down
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Info box - top for mobile, bottom left for desktop */}
      <div className="absolute top-20 left-4 right-4 md:top-auto md:right-auto md:bottom-10 md:left-10 z-50 animate-in fade-in duration-200 max-w-none md:max-w-[500px]">
        <div
          className="relative bg-white rounded-lg px-4 py-3 md:px-8 md:py-6 w-full md:w-auto md:min-w-[400px]"
          style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.03)' }}
        >
          {/* Show instructions or room info */}
          {showInstruction ? (
            /* Usage instructions */
            <div className="space-y-2 md:space-y-3">
              <div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 block mb-0.5 md:mb-1">
                  INSTRUCTIONS
                </span>
                <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-black">
                  How to Explore
                </h3>
              </div>
              <div className="text-xs md:text-sm leading-relaxed text-slate-700 space-y-1 md:space-y-2">
                <p>
                  → Use the <span className="font-bold text-blue-600">diamond buttons</span>{' '}
                  <span className="md:hidden">below</span>
                  <span className="hidden md:inline">on the right</span>
                  {' '}to switch between floors
                </p>
                <p>→ <span className="font-bold text-blue-600">Click once</span> on a blue room to view details</p>
                <p>→ <span className="font-bold text-blue-600">Click again</span> on the same room to enter 360° view</p>
              </div>
            </div>
          ) : selectedRoomId ? (
            /* Room info */
            (() => {
              const selectedRoom = rooms.find(r => r.id === selectedRoomId);
              if (!selectedRoom) return null;
              
              return (
                <div className="space-y-2 md:space-y-3">
                  <div>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 block mb-0.5 md:mb-1">
                      LEVEL 0{selectedRoom.floor}
                    </span>
                    <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-black">
                      {selectedRoom.name}
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-700">
                    {selectedRoom.description}
                  </p>
                  <p className="text-[10px] md:text-xs text-blue-600 font-bold animate-pulse">
                    → Click again to enter 360° view
                  </p>
                </div>
              );
            })()
          ) : (
            /* Default prompt */
            <div className="space-y-2 md:space-y-3">
              <div>
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.18em] text-blue-600 block mb-0.5 md:mb-1">
                  EXPLORE
                </span>
                <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-black">
                  Select a Room
                </h3>
              </div>
              <p className="text-xs md:text-sm leading-relaxed text-slate-700">
                Click on any blue room to view its details and explore the space in 360°.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Floor buttons - bottom center for mobile, bottom right for desktop */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-10 md:translate-x-0 md:bottom-10 z-50 flex flex-col-reverse items-center md:items-end gap-2 md:gap-3">
        {/* Floor number display box */}
        <div
          className="relative bg-white rounded-lg px-3 py-2 md:px-6 md:py-3 flex items-center justify-between w-[180px] md:w-auto md:min-w-[240px]"
          style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.03)' }}
        >
          <span className="text-sm md:text-lg text-slate-800 ml-2 md:ml-4">
            {getFloorLabel(hoveredFloor !== null ? hoveredFloor : currentFloor)}
          </span>
          <div className="flex flex-col-reverse items-center">
            {[-1, 0, 1, 2, 3, 4, 5].map((floor, index) => (
              <button
                key={floor}
                onClick={() => handleFloorChange(floor)}
                onMouseEnter={() => setHoveredFloor(floor)}
                onMouseLeave={() => setHoveredFloor(null)}
                disabled={isAnimating}
                className={`relative w-10 h-7 md:w-16 md:h-10 transition-all duration-300 ${
                  isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${index < 6 ? '-mt-[10px] md:-mt-[15px]' : ''}`}
              >
                <svg
                  viewBox="0 0 64 40"
                  className="w-full h-full"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Diamond fill */}
                  <polygon
                    points="0,20 32,0 64,20 32,40"
                    fill={currentFloor === floor ? '#2563eb' : 'white'}
                    stroke={
                      currentFloor === floor 
                        ? '#2563eb' 
                        : (hoveredFloor === floor ? '#2563eb' : 'black')
                    }
                    strokeWidth="2"
                    strokeDasharray={
                      currentFloor === floor 
                        ? '0' 
                        : (hoveredFloor === floor ? '0' : '4 4')
                    }
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkthroughExperience;
