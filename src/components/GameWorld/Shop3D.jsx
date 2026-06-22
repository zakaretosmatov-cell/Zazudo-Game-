import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';
import * as THREE from 'three';

export default function Shop3D() {
  const { 
    shop, 
    processCustomerSale, 
    restockItem, 
    quickStockAll,
    setIsVisualSimulationActive, 
    triggerSound, 
    soundEnabled, 
    toggleSound 
  } = useGame();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // React state for HUD
  const [controlMode, setControlMode] = useState('orbit'); // orbit | firstperson
  const [carryingBox, setCarryingBox] = useState(null); // null or { id, productId, name, quantity, totalQuantity }
  const [activeMessage, setActiveMessage] = useState('Welcome to your 3D Supermarket!');
  const [scanningItems, setScanningItems] = useState([]); // items currently on register scanner
  const [isNearRegister, setIsNearRegister] = useState(false);
  const [activeTheme, setActiveTheme] = useState('cyberpunk'); // cyberpunk | classic

  // Refs to share state with Three.js rendering loop
  const stateRef = useRef({
    shopData: null,
    controlMode: 'orbit',
    carryingBox: null,
    scanningItems: [],
    // Camera settings
    yaw: -Math.PI / 2,
    pitch: -Math.PI / 6,
    playerPos: new THREE.Vector3(0, 1.6, 5),
    keys: { w: false, a: false, s: false, d: false, e: false },
    // Entities lists
    customers: [],
    deliveryBoxes: [],
    shelves: [],
    particles: [],
    // Game loop parameters
    spawnTimer: 0,
    prevTime: 0,
    isPointerLocked: false
  });

  // Keep ref data synced with React state
  useEffect(() => {
    stateRef.current.shopData = shop;
  }, [shop]);

  useEffect(() => {
    stateRef.current.controlMode = controlMode;
  }, [controlMode]);

  useEffect(() => {
    stateRef.current.carryingBox = carryingBox;
  }, [carryingBox]);

  // Activate visual simulation
  useEffect(() => {
    setIsVisualSimulationActive(true);
    return () => {
      setIsVisualSimulationActive(false);
    };
  }, [setIsVisualSimulationActive]);

  // Initialize Three.js Game World
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(activeTheme === 'cyberpunk' ? 0x05050d : 0x0a0c10);
    scene.fog = new THREE.FogExp2(activeTheme === 'cyberpunk' ? 0x05050d : 0x0a0c10, 0.03);

    // Camera
    const camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 100);
    scene.add(camera);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Base Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, activeTheme === 'cyberpunk' ? 0.2 : 0.4);
    scene.add(ambientLight);

    // Main Overhead light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    // Neon ceiling lights (glowing Cyberpunk vibe)
    const neonPink = new THREE.PointLight(0xec4899, 1.5, 12);
    neonPink.position.set(-4, 4, -2);
    scene.add(neonPink);

    const neonCyan = new THREE.PointLight(0x06b6d4, 1.5, 12);
    neonCyan.position.set(4, 4, 2);
    scene.add(neonCyan);

    // Grid Floor Helper (Custom Cyberpunk look)
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(35, 25);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: activeTheme === 'cyberpunk' ? 0x0f172a : 0x1f2937, 
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Shop Room Walls
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: activeTheme === 'cyberpunk' ? 0x1e1b4b : 0x374151,
      roughness: 0.9 
    });
    
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 0.5), wallMat);
    backWall.position.set(0, 3, -10);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 20), wallMat);
    leftWall.position.set(-13, 3, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 20), wallMat);
    rightWall.position.set(13, 3, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    scene.add(rightWall);

    // Front Wall with Door opening
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    frontWallLeft.position.set(-8, 3, 10);
    scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.5), wallMat);
    frontWallRight.position.set(8, 3, 10);
    scene.add(frontWallRight);

    // Door glowing frame
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.6), new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true
    }));
    doorFrame.position.set(0, 2.25, 10);
    scene.add(doorFrame);

    // Delivery Zone (Outside the door)
    const deliveryZoneMat = new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true });
    const deliveryZone = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 4), deliveryZoneMat);
    deliveryZone.position.set(0, 0.02, 13);
    scene.add(deliveryZone);

    // --- DECORATIVE hologram (Attraction Upgrade) ---
    let hologramGroup = new THREE.Group();
    hologramGroup.position.set(0, 1.5, 0);
    scene.add(hologramGroup);

    const buildHologram = (level) => {
      // Clear existing
      while(hologramGroup.children.length > 0) {
        hologramGroup.remove(hologramGroup.children[0]);
      }

      if (level >= 3) {
        const shapeGeo = new THREE.IcosahedronGeometry(0.6, 1);
        const shapeMat = new THREE.MeshBasicMaterial({ 
          color: activeTheme === 'cyberpunk' ? 0x06b6d4 : 0x10b981, 
          wireframe: true, 
          transparent: true, 
          opacity: 0.6 
        });
        const holoMesh = new THREE.Mesh(shapeGeo, shapeMat);
        hologramGroup.add(holoMesh);

        // Core light
        const holoLight = new THREE.PointLight(activeTheme === 'cyberpunk' ? 0x06b6d4 : 0x10b981, 1.0, 4);
        holoLight.position.set(0, 0.5, 0);
        hologramGroup.add(holoLight);

        // Decorative floor base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        base.position.y = -1.4;
        hologramGroup.add(base);
      }
    };

    // --- CREATE 3D OBJECT MODELS ---

    // 1. Cashier Checkout Desk
    const registerGroup = new THREE.Group();
    registerGroup.position.set(8, 0, -2);
    scene.add(registerGroup);

    // Counter table
    const counterTable = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 3.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
    counterTable.position.set(0, 0.45, 0);
    counterTable.castShadow = true;
    counterTable.receiveShadow = true;
    registerGroup.add(counterTable);

    // Scanner red laser line
    const scannerLaser = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    scannerLaser.position.set(-0.2, 0.91, 0);
    registerGroup.add(scannerLaser);

    // Computer screen
    const pcBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    pcBase.position.set(0.4, 1.05, -0.4);
    registerGroup.add(pcBase);
    const pcScreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x020617 }));
    pcScreen.position.set(0.4, 1.35, -0.4);
    pcScreen.rotation.y = -Math.PI / 6;
    registerGroup.add(pcScreen);

    // Cashier character (Simple 3D dummy avatar)
    const cashierHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    cashierHead.position.set(0, 1.45, -2);
    registerGroup.add(cashierHead);
    const cashierBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.4), new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }));
    cashierBody.position.set(0, 0.8, -2);
    registerGroup.add(cashierBody);

    // 2. 3D Shelves (8 items slots)
    // Shelf Layout positions
    const SHELF_COORDS = [
      { id: 'cyber_drink', x: -8, z: -6, color: 0xc084fc, emoji: '🥤' },
      { id: 'coffee_beans', x: -4, z: -6, color: 0x60a5fa, emoji: '☕' },
      { id: 'tech_gadget', x: 0, z: -6, color: 0xf43f5e, emoji: '💍' },
      { id: 'retro_console', x: 4, z: -6, color: 0x10b981, emoji: '🎮' },
      { id: 'designer_shoes', x: -8, z: 2, color: 0xfbbf24, emoji: '👟' },
      { id: 'solar_charger', x: -4, z: 2, color: 0x3b82f6, emoji: '🎒' },
      { id: 'ai_chip', x: 0, z: 2, color: 0xec4899, emoji: '🧠' },
      { id: 'luxury_watch', x: 4, z: 2, color: 0x14b8a6, emoji: '⌚' }
    ];

    const shelf3DMeshes = {}; // keep track of shelves to update product items

    const buildShelves = (currentShop) => {
      SHELF_COORDS.forEach((sc) => {
        // Remove existing shelf model if it exists
        if (shelf3DMeshes[sc.id]) {
          scene.remove(shelf3DMeshes[sc.id]);
        }

        const unlocked = PRODUCTS[sc.id].minLevel <= currentShop.level;
        const shelfGroup = new THREE.Group();
        shelfGroup.position.set(sc.x, 0, sc.z);
        scene.add(shelfGroup);
        shelf3DMeshes[sc.id] = shelfGroup;

        // Shelf Frame
        const postLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        postLeft.position.set(-1.25, 1.0, 0);
        postLeft.castShadow = true;
        shelfGroup.add(postLeft);

        const postRight = postLeft.clone();
        postRight.position.x = 1.25;
        shelfGroup.add(postRight);

        // Boards (Bottom, Middle, Top)
        const boardMat = new THREE.MeshStandardMaterial({ color: unlocked ? 0x1e293b : 0x475569, roughness: 0.8 });
        
        const boardBottom = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.05, 0.9), boardMat);
        boardBottom.position.y = 0.3;
        boardBottom.castShadow = true;
        boardBottom.receiveShadow = true;
        shelfGroup.add(boardBottom);

        const boardMiddle = boardBottom.clone();
        boardMiddle.position.y = 1.0;
        shelfGroup.add(boardMiddle);

        const boardTop = boardBottom.clone();
        boardTop.position.y = 1.7;
        shelfGroup.add(boardTop);

        // Visual lock mesh if locked
        if (!unlocked) {
          const lockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
          lockMesh.position.set(0, 1.0, 0.5);
          shelfGroup.add(lockMesh);
        } else {
          // Draw stocked product models
          const stock = currentShop.inventory[sc.id];
          const stockQty = stock ? stock.quantity : 0;

          if (stockQty > 0) {
            // Draw visual boxes on the shelves
            // We draw 3 boxes on bottom shelf, 3 on middle shelf based on quantity
            const totalBoxesToDraw = Math.min(8, Math.ceil(stockQty / 2));
            const itemMat = new THREE.MeshStandardMaterial({ color: sc.color, roughness: 0.5 });
            const itemGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);

            for (let i = 0; i < totalBoxesToDraw; i++) {
              const item = new THREE.Mesh(itemGeo, itemMat);
              item.castShadow = true;

              // Distribute items across bottom (y=0.45) and middle (y=1.15) shelves
              const isBottom = i < 4;
              item.position.y = isBottom ? 0.45 : 1.15;
              
              const xIdx = i % 4;
              item.position.x = -0.8 + xIdx * 0.5;
              item.position.z = -0.1 + (Math.random() * 0.1); // randomize depth slightly

              shelfGroup.add(item);
            }
          }
        }
      });
    };

    // --- DELIVERY BOXES ENGINE ---
    const box3DMeshes = {};

    const syncDeliveryBoxes = (currentShop) => {
      const dbList = currentShop.deliveryBoxes || [];
      
      // Remove boxes that are no longer in the list
      Object.keys(box3DMeshes).forEach(id => {
        if (!dbList.find(b => b.id === id)) {
          scene.remove(box3DMeshes[id]);
          delete box3DMeshes[id];
        }
      });

      // Add or update boxes
      dbList.forEach((box, index) => {
        if (!box3DMeshes[box.id]) {
          const boxGroup = new THREE.Group();
          
          // Position boxes stacked or arranged inside delivery zone outside door
          // Delivery zone: (0, 0.02, 13). Box size: 0.8
          const xOffset = (index % 3) * 1.2 - 1.2;
          const zOffset = Math.floor(index / 3) * 1.2 + 13.0;

          boxGroup.position.set(xOffset, 0.4, zOffset);
          scene.add(boxGroup);
          box3DMeshes[box.id] = boxGroup;

          // Box Mesh
          const boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.9 }) // Cardboard brown
          );
          boxMesh.castShadow = true;
          boxMesh.receiveShadow = true;
          boxGroup.add(boxMesh);

          // Packing tape
          const tape = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.81, 0.81),
            new THREE.MeshBasicMaterial({ color: 0xfef08a }) // yellow tape
          );
          boxGroup.add(tape);

          // Add Box ID label reference to the mesh for clicking
          boxMesh.userData = { boxId: box.id, productId: box.productId, name: PRODUCTS[box.productId].name, quantity: box.quantity };
        }
      });
    };

    // Initial build
    const initialShop = stateRef.current.shopData;
    if (initialShop) {
      buildShelves(initialShop);
      syncDeliveryBoxes(initialShop);
      buildHologram(initialShop.upgrades.attraction);
    }

    // --- CONTROLS SETUP ---

    // 1. Mouse Input for Orbit Cam
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraRadius = 15;
    let cameraTheta = Math.PI / 4; // azimuth
    let cameraPhi = Math.PI / 6; // elevation

    const onMouseDown = (e) => {
      if (stateRef.current.controlMode === 'orbit') {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onMouseMove = (e) => {
      const currentMode = stateRef.current.controlMode;
      
      if (currentMode === 'orbit' && isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        cameraTheta -= deltaX * 0.005;
        cameraPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, cameraPhi + deltaY * 0.005));
      } else if (currentMode === 'firstperson' && stateRef.current.isPointerLocked) {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;

        stateRef.current.yaw += movementX * 0.0025;
        stateRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, stateRef.current.pitch - movementY * 0.0025));
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      if (stateRef.current.controlMode === 'orbit') {
        cameraRadius = Math.max(5, Math.min(25, cameraRadius + e.deltaY * 0.01));
      }
    };

    // 2. Keyboard Input for FP Cam
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e'].includes(key)) {
        stateRef.current.keys[key] = true;
      }
      
      // Stock placement trigger in 3D
      if (key === 'e' && stateRef.current.carryingBox) {
        attemptStockItem();
      }
    };

    const onKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e'].includes(key)) {
        stateRef.current.keys[key] = false;
      }
    };

    // Attach listeners
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Click on canvas (Pointer lock trigger or object clicking)
    const onCanvasClick = (e) => {
      const currentMode = stateRef.current.controlMode;
      const currentShop = stateRef.current.shopData;
      if (!currentShop) return;

      if (currentMode === 'firstperson') {
        if (!stateRef.current.isPointerLocked) {
          canvas.requestPointerLock();
        } else {
          // Perform raycast clicking in First-Person Mode
          raycastInteraction(e);
        }
      } else {
        // Orbit Mode: Click to interact
        raycastInteraction(e);
      }
    };

    canvas.addEventListener('click', onCanvasClick);

    // Pointer Lock events
    const onPointerLockChange = () => {
      stateRef.current.isPointerLocked = (document.pointerLockElement === canvas);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Raycast click collision detector
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const raycastInteraction = (e) => {
      const currentShop = stateRef.current.shopData;
      if (!currentShop) return;

      // Calculate mouse coordinates: in PointerLock, it's always center of screen
      if (stateRef.current.isPointerLocked) {
        mouse.set(0, 0);
      } else {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      raycaster.setFromCamera(mouse, camera);

      // Collect all clickable meshes
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length === 0) return;

      // Find if we clicked a delivery box
      let clickedBox = null;
      let clickedRegister = false;
      let clickedShelf = null;

      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        
        // Check if parent group or user data has boxId
        let curr = obj;
        while (curr) {
          if (curr.userData && curr.userData.boxId) {
            clickedBox = curr.userData;
            break;
          }
          if (curr === registerGroup) {
            clickedRegister = true;
            break;
          }
          // Check if shelf
          const shelfId = Object.keys(shelf3DMeshes).find(id => shelf3DMeshes[id] === curr);
          if (shelfId) {
            clickedShelf = shelfId;
            break;
          }
          curr = curr.parent;
        }
        if (clickedBox || clickedRegister || clickedShelf) break;
      }

      // Proximity check in First Person Mode (must be within 4 units to interact)
      const playerPos = stateRef.current.playerPos;
      if (stateRef.current.controlMode === 'firstperson') {
        const hitPos = intersects[0].point;
        const dist = playerPos.distanceTo(hitPos);
        if (dist > 4.5) {
          setActiveMessage('⚠️ Too far away! Move closer to interact.');
          setTimeout(() => setActiveMessage(''), 2500);
          return;
        }
      }

      // Process interactions
      if (clickedBox) {
        // Pick up box
        if (stateRef.current.carryingBox) {
          setActiveMessage('⚠️ Already carrying a box! Drop or stock it first.');
        } else {
          // Add to carrying
          const box = (currentShop.deliveryBoxes || []).find(b => b.id === clickedBox.boxId);
          if (box) {
            setCarryingBox({ ...box, name: PRODUCTS[box.productId].name });
            setActiveMessage(`📦 Carrying Box: ${PRODUCTS[box.productId].name} (${box.quantity}x)`);
            triggerSound('success');
          }
        }
      } else if (clickedShelf && stateRef.current.carryingBox) {
        // Stock carrying item on shelf
        attemptStockItemOnShelf(clickedShelf);
      } else if (clickedRegister) {
        // Enter Cashier Scan HUD mode
        setIsNearRegister(true);
        if (stateRef.current.controlMode === 'firstperson' && stateRef.current.isPointerLocked) {
          document.exitPointerLock();
        }
      }
    };

    // Attempts to stock item based on carrying box in First-Person (near nearest shelf)
    const attemptStockItem = () => {
      const box = stateRef.current.carryingBox;
      if (!box) return;

      // Find nearest shelf to player
      const playerPos = stateRef.current.playerPos;
      let nearestShelfId = null;
      let minDist = 3.5; // interact radius

      SHELF_COORDS.forEach(sc => {
        const shelfPos = new THREE.Vector3(sc.x, 1, sc.z);
        const dist = playerPos.distanceTo(shelfPos);
        if (dist < minDist) {
          minDist = dist;
          nearestShelfId = sc.id;
        }
      });

      if (nearestShelfId) {
        attemptStockItemOnShelf(nearestShelfId);
      }
    };

    const attemptStockItemOnShelf = (shelfProductId) => {
      const box = stateRef.current.carryingBox;
      const currentShop = stateRef.current.shopData;
      if (!box || !currentShop) return;

      if (box.productId !== shelfProductId) {
        setActiveMessage(`❌ This shelf is for ${PRODUCTS[shelfProductId].name}, not ${box.name}!`);
        triggerSound('error');
        setTimeout(() => setActiveMessage(''), 3000);
        return;
      }

      // Perform restock unit!
      restockItem(box.id, 1);
      triggerSound('success');
      
      // Update local carrying state
      const updatedBox = { ...box, quantity: box.quantity - 1 };
      if (updatedBox.quantity <= 0) {
        setCarryingBox(null);
        setActiveMessage('📦 Box emptied and discarded.');
      } else {
        setCarryingBox(updatedBox);
        setActiveMessage(`📦 Carrying Box: ${box.name} (${updatedBox.quantity}x)`);
      }
    };

    // --- NPC CUSTOMERS ENGINE ---
    // Spawn 3D customers
    const namesList = ['Zara', 'Kael', 'Rin', 'V', 'Dexter', 'Lina', 'Sora', 'Tifa', 'Cloud', 'Ken', 'Yuki'];
    const bodyColors = [0xf472b6, 0x38bdf8, 0x4ade80, 0xfbbf24, 0xa78bfa, 0x2dd4bf, 0xfb7185, 0xa3e635];

    const spawn3DCustomer = () => {
      const currentShop = stateRef.current.shopData;
      if (!currentShop) return;

      // Choose target product
      const inStockProducts = Object.keys(currentShop.inventory).filter(
        id => currentShop.inventory[id].quantity > 0
      );
      
      let targetProduct = 'cyber_drink';
      if (inStockProducts.length > 0 && Math.random() < 0.85) {
        targetProduct = inStockProducts[Math.floor(Math.random() * inStockProducts.length)];
      } else {
        const unlockedProducts = Object.keys(PRODUCTS).filter(
          id => PRODUCTS[id].minLevel <= currentShop.level
        );
        if (unlockedProducts.length > 0) {
          targetProduct = unlockedProducts[Math.floor(Math.random() * unlockedProducts.length)];
        }
      }

      const shelfCoord = SHELF_COORDS.find(sc => sc.id === targetProduct) || SHELF_COORDS[0];

      // Build 3D mesh for customer
      const custGroup = new THREE.Group();
      custGroup.position.set(0, 0.5, 10.5); // Spawn outside door
      scene.add(custGroup);

      const color = bodyColors[Math.floor(Math.random() * bodyColors.length)];
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.4), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      bodyMesh.castShadow = true;
      custGroup.add(bodyMesh);

      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0xffe4e6 }));
      headMesh.position.y = 0.55;
      headMesh.castShadow = true;
      custGroup.add(headMesh);

      const hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.38), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      hairMesh.position.y = 0.72;
      custGroup.add(hairMesh);

      const newCustomer = {
        mesh: custGroup,
        color,
        productId: targetProduct,
        shelfPos: new THREE.Vector3(shelfCoord.x, 0.5, shelfCoord.z + 1.2), // stand in front of shelf
        state: 'entering', // entering | browsing | checkout | leaving
        pauseTimer: 0,
        speed: 1.2 + Math.random() * 0.5,
        bobAngle: Math.random() * 10,
        bobSpeed: 0.15 + Math.random() * 0.05,
        hasItem: false,
        name: namesList[Math.floor(Math.random() * namesList.length)]
      };

      stateRef.current.customers.push(newCustomer);
    };

    // Clean particles list
    const create3DParticle = (pos, text, colorCode) => {
      const canvasText = document.createElement('canvas');
      canvasText.width = 128;
      canvasText.height = 64;
      const tCtx = canvasText.getContext('2d');
      tCtx.fillStyle = colorCode === 0x4ade80 ? '#4ade80' : '#60a5fa';
      tCtx.font = 'bold 20px Arial';
      tCtx.fillText(text, 10, 40);

      const textTex = new THREE.CanvasTexture(canvasText);
      const spriteMat = new THREE.SpriteMaterial({ map: textTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(pos);
      sprite.scale.set(1.5, 0.75, 1);
      scene.add(sprite);

      stateRef.current.particles.push({
        sprite,
        vy: 0.02,
        life: 60
      });
    };

    // Sync cashier register belt state to UI list when customer is checked out
    const cashierCheckOutTrigger = (cust) => {
      const productInfo = PRODUCTS[cust.productId];
      const quantity = Math.floor(Math.random() * 2) + 1; // 1-2 items

      // Create a visual 3D item on conveyor belt
      const itemMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xef4444 })
      );
      itemMesh.position.set(8.0 - 0.2, 0.95, -2.0 + (stateRef.current.scanningItems.length * 0.35));
      scene.add(itemMesh);

      // Add to cashier UI scanning items list
      const updatedScanningList = [...stateRef.current.scanningItems, {
        mesh: itemMesh,
        productId: cust.productId,
        name: productInfo.name,
        quantity,
        emoji: productInfo.emoji
      }];

      stateRef.current.scanningItems = updatedScanningList;
      setScanningItems(updatedScanningList);
    };

    // --- RENDER GAME LOOP ---
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const timestamp = clock.getElapsedTime() * 1000;

      const currentShop = stateRef.current.shopData;
      if (!currentShop) {
        requestAnimationFrame(animate);
        return;
      }

      // 1. Spawning customers
      const marketingLevel = currentShop.upgrades.marketing;
      const spawnInterval = Math.max(3000, 16000 - (marketingLevel - 1) * 2200);
      
      stateRef.current.spawnTimer += delta * 1000;
      if (stateRef.current.spawnTimer >= spawnInterval) {
        stateRef.current.spawnTimer = 0;
        if (stateRef.current.customers.length < 5) {
          spawn3DCustomer();
        }
      }

      // Rebuild shelves and boxes on changes
      buildShelves(currentShop);
      syncDeliveryBoxes(currentShop);
      buildHologram(currentShop.upgrades.attraction);

      // Rotate hologram core
      hologramGroup.rotation.y += 0.015;
      hologramGroup.rotation.z += 0.005;

      // 2. Camera control logic
      const currentMode = stateRef.current.controlMode;
      if (currentMode === 'orbit') {
        const target = new THREE.Vector3(0, 1, 0);
        camera.position.x = target.x + cameraRadius * Math.sin(cameraTheta) * Math.cos(cameraPhi);
        camera.position.y = target.y + cameraRadius * Math.sin(cameraPhi);
        camera.position.z = target.z + cameraRadius * Math.cos(cameraTheta) * Math.cos(cameraPhi);
        camera.lookAt(target);
      } else {
        // First Person movement logic
        const playerPos = stateRef.current.playerPos;
        const keys = stateRef.current.keys;
        const speed = 4.0 * delta;

        // Calculate direction vectors
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);

        // Move
        if (keys.w) playerPos.addScaledVector(forward, speed);
        if (keys.s) playerPos.addScaledVector(forward, -speed);
        if (keys.a) playerPos.addScaledVector(right, -speed);
        if (keys.d) playerPos.addScaledVector(right, speed);

        // Wall Boundaries Collision Detection
        playerPos.x = Math.max(-12, Math.min(12, playerPos.x));
        playerPos.z = Math.max(-9.5, Math.min(12.5, playerPos.z)); // allow stepping out to delivery zone

        // Set camera
        camera.position.copy(playerPos);
        
        const targetLook = new THREE.Vector3(0, 0, -1);
        targetLook.applyAxisAngle(new THREE.Vector3(1, 0, 0), stateRef.current.pitch);
        targetLook.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);
        targetLook.add(playerPos);
        camera.lookAt(targetLook);
      }

      // 3. Customers animation & behavior pathfinding
      stateRef.current.customers.forEach((cust, idx) => {
        cust.bobAngle += cust.bobSpeed;
        cust.mesh.position.y = 0.5 + Math.abs(Math.sin(cust.bobAngle)) * 0.15; // walking bob

        let target = new THREE.Vector3(0, 0.5, 9); // default center path
        if (cust.state === 'entering') {
          target.set(0, 0.5, 5);
          const dist = cust.mesh.position.distanceTo(target);
          if (dist < 0.5) {
            cust.state = 'browsing';
          }
        } else if (cust.state === 'browsing') {
          target.copy(cust.shelfPos);
          const dist = cust.mesh.position.distanceTo(target);
          if (dist < 0.3) {
            if (cust.pauseTimer === 0) {
              cust.pauseTimer = 90; // browse for 1.5s
              
              // Check stock
              const stock = currentShop.inventory[cust.productId];
              cust.hasItem = stock && stock.quantity > 0;
            } else {
              cust.pauseTimer--;
              if (cust.pauseTimer <= 0) {
                if (cust.hasItem) {
                  cust.state = 'checkout';
                } else {
                  cust.state = 'leaving';
                }
              }
            }
          }
        } else if (cust.state === 'checkout') {
          // Walk to checkout register line queue
          target.set(8.0, 0.5, 0); // front of desk
          const dist = cust.mesh.position.distanceTo(target);
          if (dist < 0.5) {
            // Arrived at register! Place items on conveyor belt
            cashierCheckOutTrigger(cust);
            cust.state = 'leaving';
            cust.pauseTimer = 40; // checkout buffer
          }
        } else if (cust.state === 'leaving') {
          target.set(0, 0.5, 11); // Door exit
          const dist = cust.mesh.position.distanceTo(target);
          if (dist < 0.5) {
            scene.remove(cust.mesh);
            stateRef.current.customers.splice(idx, 1);
          }
        }

        // Walk translation
        const dir = new THREE.Vector3().subVectors(target, cust.mesh.position);
        dir.y = 0; // lock height
        const len = dir.length();
        if (len > 0.1) {
          dir.normalize();
          cust.mesh.position.addScaledVector(dir, cust.speed * delta);
          
          // Face walking direction
          const angle = Math.atan2(dir.x, dir.z);
          cust.mesh.rotation.y = angle;
        }
      });

      // 4. Update floating particles
      stateRef.current.particles.forEach((p, idx) => {
        p.sprite.position.y += p.vy;
        p.life--;
        if (p.life <= 0) {
          scene.remove(p.sprite);
          stateRef.current.particles.splice(idx, 1);
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // Clean listeners on cleanup
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onCanvasClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      
      // Clean scene meshes
      scene.clear();
      renderer.dispose();
    };
  }, [activeTheme, activeTheme]);

  // Click on scanning item to manually scan it
  const scanConveyorItem = (index) => {
    const list = [...scanningItems];
    const item = list[index];
    if (!item) return;

    // Scan Beep sound
    triggerSound('sale');

    // Create glowing "+$xx" particle in 3D scene above checkout counter
    const registerWorldPos = new THREE.Vector3(8.0, 1.2, -1.0);
    // Find item cost
    const pInfo = PRODUCTS[item.productId];
    const attractionLevel = shop.upgrades.attraction;
    const maxMarkup = UPGRADES.attraction.getMaxPriceMarkup(attractionLevel);
    const markupBonus = 1 + (Math.random() * (maxMarkup - 1.0));
    const salePrice = Math.round(pInfo.baseSellPrice * markupBonus);

    // Call processCustomerSale backend
    const result = processCustomerSale();

    // Trigger visual particles
    if (result) {
      // Success
      // Remove 3D conveyor item box mesh
      scene.remove(item.mesh);

      // Create floating particles
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 128;
      textCanvas.height = 64;
      const tCtx = textCanvas.getContext('2d');
      tCtx.fillStyle = '#4ade80';
      tCtx.font = 'bold 20px Arial';
      tCtx.fillText(`+$${result.revenue}`, 15, 30);
      tCtx.fillStyle = '#60a5fa';
      tCtx.fillText(`+${result.xpGained} XP`, 15, 55);

      const textTex = new THREE.CanvasTexture(textCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: textTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(registerWorldPos);
      sprite.scale.set(1.5, 0.75, 1);
      // add sprite to parent scene (need to store scene ref or access globally)
      // For simplicity, we can do it directly in canvas effect or by exposing scene. 
      // Instead, we just delete the item from array and trigger UI alert
    }

    list.splice(index, 1);
    setScanningItems(list);
    stateRef.current.scanningItems = list;

    if (list.length === 0) {
      setIsNearRegister(false);
      setActiveMessage('✅ Customer checkout complete!');
      setTimeout(() => setActiveMessage(''), 2000);
    }
  };

  return (
    <div className="card" style={styles.cardContainer}>
      {/* 3D Supermarket HUD Header */}
      <div style={styles.hudHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🛒 3D Supermarket Simulator
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            WASD to Walk, mouse click to interact. Carry boxes and click shelves to stock!
          </span>
        </div>

        <div style={styles.controlsRow}>
          {/* Theme selector */}
          <div style={styles.themeSelector}>
            <button 
              onClick={() => setActiveTheme(activeTheme === 'cyberpunk' ? 'classic' : 'cyberpunk')}
              className="btn btn-secondary" 
              style={styles.hudBtn}
            >
              🎨 Theme: {activeTheme === 'cyberpunk' ? 'Cyberpunk' : 'Classic'}
            </button>
          </div>

          {/* Camera View Mode Toggle */}
          <button 
            onClick={() => {
              const nextMode = controlMode === 'orbit' ? 'firstperson' : 'orbit';
              setControlMode(nextMode);
              setActiveMessage(nextMode === 'firstperson' ? '🚶 First-Person (WASD): Click screen to lock mouse. Press ESC to unlock.' : '🎥 Tycoon View: Drag mouse to rotate, scroll to zoom.');
            }}
            className="btn btn-primary"
            style={styles.hudBtn}
          >
            🎥 Mode: {controlMode === 'orbit' ? 'Tycoon Orbit' : 'First-Person (WASD)'}
          </button>

          {/* Quick Stock button */}
          <button 
            onClick={quickStockAll}
            disabled={!shop.deliveryBoxes || shop.deliveryBoxes.length === 0}
            className="btn btn-success"
            style={{
              ...styles.hudBtn,
              ...((!shop.deliveryBoxes || shop.deliveryBoxes.length === 0) ? styles.hudBtnDisabled : {})
            }}
          >
            📦 Quick Stock All
          </button>

          <button onClick={toggleSound} style={styles.iconBtn}>
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Game World */}
      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas ref={canvasRef} style={styles.canvasElement}></canvas>

        {/* HUD Crosshair for First-Person Pointer lock target */}
        {controlMode === 'firstperson' && stateRef.current.isPointerLocked && (
          <div style={styles.crosshair}></div>
        )}

        {/* Dynamic HUD Alerts */}
        {activeMessage && (
          <div style={styles.hudAlert}>
            {activeMessage}
          </div>
        )}

        {/* Carrying Item HUD Overlay */}
        {carryingBox && (
          <div style={styles.carryingOverlay}>
            <span style={{ fontSize: '0.8rem', color: '#fef08a' }}>HOLDING DELIVERY BOX</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              📦 {carryingBox.name} ({carryingBox.quantity}x)
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Walk to the shelf and press E (or click shelf) to stock items
            </span>
          </div>
        )}

        {/* Cashier Scan Mode Overlay */}
        {isNearRegister && scanningItems.length > 0 && (
          <div style={styles.scannerOverlay} className="animate-fade-in">
            <div style={styles.scannerHeader}>
              <h4 style={{ margin: 0 }}>🛒 Cashier scanning terminal</h4>
              <button 
                onClick={() => setIsNearRegister(false)}
                style={styles.scannerClose}
              >
                ✕ Close
              </button>
            </div>
            
            <div style={styles.scannerItemList}>
              {scanningItems.map((item, idx) => (
                <div key={idx} style={styles.scannerItemRow}>
                  <span>{item.emoji} {item.name} ({item.quantity}x)</span>
                  <button 
                    onClick={() => scanConveyorItem(idx)}
                    className="btn btn-success"
                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Scan & Bag
                  </button>
                </div>
              ))}
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.8rem' }}>
              Click "Scan & Bag" for each item to ring up customer
            </div>
          </div>
        )}
      </div>

      {/* 3D Simulation Stats Panel Footer */}
      <div style={styles.hudFooter}>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Pending Deliveries</span>
          <span style={styles.statValue} className="text-glow-blue">
            {shop.deliveryBoxes ? shop.deliveryBoxes.length : 0} boxes
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Shop Volume multiplier</span>
          <span style={styles.statValue} className="text-glow-purple">
            x{(1.0 + (shop.upgrades.marketing - 1) * 0.15).toFixed(2)}
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Customer tips bonus</span>
          <span style={styles.statValue} className="text-glow-green">
            +{Math.round((UPGRADES.attraction.getMaxPriceMarkup(shop.upgrades.attraction) - 1.0) * 100)}%
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.statLabel}>Warehouse occupancy</span>
          <span style={styles.statValue}>
            {Object.values(shop.inventory).reduce((acc, it) => acc + it.quantity, 0)} / {UPGRADES.storage.getCapacity(shop.upgrades.storage)}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  cardContainer: {
    padding: '1rem',
    background: 'rgba(15, 23, 42, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
    width: '100%',
    overflow: 'hidden'
  },
  hudHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '0.8rem',
    marginBottom: '0.8rem',
    flexWrap: 'wrap',
    gap: '0.8rem'
  },
  controlsRow: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center'
  },
  hudBtn: {
    padding: '0.45rem 1rem',
    fontSize: '0.85rem'
  },
  hudBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    background: 'var(--bg-card)'
  },
  iconBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-sm)',
    width: '34px',
    height: '34px',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  canvasContainer: {
    position: 'relative',
    height: '460px',
    width: '100%',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.06)',
    boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9)'
  },
  canvasElement: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.7)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none'
  },
  hudAlert: {
    position: 'absolute',
    top: '15px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    color: '#fff',
    padding: '0.5rem 1.2rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.85rem',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
  },
  carryingOverlay: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    backgroundColor: 'rgba(9, 13, 22, 0.9)',
    border: '2px solid #eab308',
    padding: '0.8rem 1.2rem',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)'
  },
  scannerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '360px',
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    border: '2px solid var(--accent-blue)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 15px var(--accent-blue-glow)',
    padding: '1.25rem',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem'
  },
  scannerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    paddingBottom: '0.5rem'
  },
  scannerClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '0.85rem'
  },
  scannerItemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '0.2rem'
  },
  scannerItemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.04)'
  },
  hudFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    background: 'rgba(0,0,0,0.25)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.04)',
    marginTop: '0.8rem'
  },
  footerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.15rem'
  },
  statLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statValue: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#fff'
  },
  themeSelector: {
    display: 'flex'
  }
};
