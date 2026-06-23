import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';
import * as THREE from 'three';

// Constant coordinates for shelves
const SHELF_COORDS = [
  { id: 'cyber_drink', x: -8.0, z: -4.0, color: 0xef4444, emoji: '🥤', name: 'Cyber Cola' },
  { id: 'coffee_beans', x: -4.0, z: -4.0, color: 0x78350f, emoji: '☕', name: 'Organic Beans' },
  { id: 'tech_gadget', x: 0.0, z: -4.0, color: 0x3b82f6, emoji: '💍', name: 'Smart Ring' },
  { id: 'retro_console', x: 4.0, z: -4.0, color: 0x8b5cf6, emoji: '🎮', name: 'Retro Boy' },
  { id: 'designer_shoes', x: 8.0, z: -4.0, color: 0xec4899, emoji: '👟', name: 'Aero Sneakers' },
  { id: 'solar_charger', x: -6.0, z: 2.0, color: 0x10b981, emoji: '🎒', name: 'Solar Backpack' },
  { id: 'ai_chip', x: -1.0, z: 2.0, color: 0x06b6d4, emoji: '🧠', name: 'Quantum Core' },
  { id: 'luxury_watch', x: 4.0, z: 2.0, color: 0xf59e0b, emoji: '⌚', name: 'Chrono Gold' }
];

export default function Shop3D() {
  const { 
    shop, 
    processCustomerSale, 
    restockItem, 
    quickStockAll,
    isStoreOpen,
    toggleStoreOpen,
    currentDay,
    currentTime,
    energy,
    useEnergy,
    recoverEnergy,
    setIsVisualSimulationActive, 
    triggerSound, 
    soundEnabled, 
    toggleSound 
  } = useGame();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);

  // States
  const [hasStarted, setHasStarted] = useState(false);
  const [controlMode, setControlMode] = useState('firstperson'); // orbit | firstperson
  const [carryingBox, setCarryingBox] = useState(null); // null or { id, productId, name, quantity }
  const [activeMessage, setActiveMessage] = useState('Welcome to Zazudo Supermarket 3D!');
  const [scanningItems, setScanningItems] = useState([]); // conveyor belt items
  const [isNearRegister, setIsNearRegister] = useState(false);
  const [isSprinting, setIsSprinting] = useState(false);

  // Refs for loop interaction
  const stateRef = useRef({
    shopData: null,
    controlMode: 'firstperson',
    carryingBox: null,
    scanningItems: [],
    isStoreOpen: true,
    isSprinting: false,
    yaw: -Math.PI / 2,
    pitch: -Math.PI / 6,
    playerPos: new THREE.Vector3(0, 1.6, 5),
    keys: { w: false, a: false, s: false, d: false, e: false },
    customers: [],
    deliveryBoxes: [],
    shelves: [],
    particles: [],
    spawnTimer: 0,
    isPointerLocked: false,
    updateNeon: null
  });

  // Sync data to refs
  useEffect(() => {
    stateRef.current.shopData = shop;
  }, [shop]);

  useEffect(() => {
    stateRef.current.controlMode = controlMode;
  }, [controlMode]);

  useEffect(() => {
    stateRef.current.carryingBox = carryingBox;
  }, [carryingBox]);

  useEffect(() => {
    stateRef.current.isStoreOpen = isStoreOpen;
    if (stateRef.current.updateNeon) {
      stateRef.current.updateNeon(isStoreOpen);
    }
  }, [isStoreOpen]);

  useEffect(() => {
    stateRef.current.isSprinting = isSprinting;
  }, [isSprinting]);

  useEffect(() => {
    setIsVisualSimulationActive(true);
    return () => {
      setIsVisualSimulationActive(false);
    };
  }, [setIsVisualSimulationActive]);

  // Main Three.js loader
  useEffect(() => {
    if (!hasStarted) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // SCENE & RENDERER
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbae6fd); // Bright sky blue
    scene.fog = new THREE.FogExp2(0xbae6fd, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // LIGHTS
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
    sunLight.position.set(12, 18, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 45;
    sunLight.shadow.camera.left = -15;
    sunLight.shadow.camera.right = 15;
    sunLight.shadow.camera.top = 15;
    sunLight.shadow.camera.bottom = -15;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ceiling fluorescent lights
    const createCeilingLight = (x, z) => {
      const group = new THREE.Group();
      group.position.set(x, 4.8, z);
      const bulbGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
      bulbGeo.rotateZ(Math.PI / 2);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      group.add(bulb);

      const fix = new THREE.Mesh(
        new THREE.BoxGeometry(2.7, 0.06, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 })
      );
      fix.position.y = 0.08;
      group.add(fix);

      const light = new THREE.PointLight(0xffffff, 0.6, 12);
      light.position.set(0, -0.2, 0);
      group.add(light);
      scene.add(group);
    };

    createCeilingLight(-5, -5);
    createCeilingLight(5, -5);
    createCeilingLight(-5, 3);
    createCeilingLight(5, 3);

    // PROCEDURAL WOODEN FLOOR TEXTURE (golden orange)
    const createWoodFloorTexture = () => {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = 256;
      tileCanvas.height = 256;
      const ctx = tileCanvas.getContext('2d');
      ctx.fillStyle = '#f59e0b'; // Amber base
      ctx.fillRect(0, 0, 256, 256);
      
      ctx.strokeStyle = '#78350f'; // Dark line
      ctx.lineWidth = 4;
      
      const plankHeight = 32;
      for (let y = 0; y < 256; y += plankHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
        
        const offset = (y / plankHeight) % 2 === 0 ? 64 : 0;
        for (let x = offset; x < 256 + 64; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x % 256, y);
          ctx.lineTo(x % 256, y + plankHeight);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#d97706'; // Wood grains
      for (let i = 0; i < 30; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const w = 40 + Math.random() * 60;
        const h = 2;
        ctx.fillRect(x, y, w, h);
      }

      const texture = new THREE.CanvasTexture(tileCanvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 8);
      return texture;
    };

    // PROCEDURAL BRICK EXTERIOR TEXTURE
    const createBrickTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#b91c1c'; // Brick red
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#e2e8f0'; // cement grout
      ctx.lineWidth = 2;

      const rowHeight = 16;
      for (let y = 0; y < 128; y += rowHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(128, y);
        ctx.stroke();
        const offset = (y / rowHeight) % 2 === 0 ? 32 : 0;
        for (let x = offset; x < 128 + 32; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x % 128, y);
          ctx.lineTo(x % 128, y + rowHeight);
          ctx.stroke();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 4);
      return texture;
    };

    // PROCEDURAL STRIPE TEXTURE
    const createStripeTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#dc2626'; // Red stripe
      ctx.fillRect(0, 0, 32, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(16, 1);
      return texture;
    };

    // PROCEDURAL BANNER TEXTURE
    const createBannerTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#16a34a'; // Green
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, 492, 108);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px "Impact", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ZAZUDO', 256, 45);

      ctx.font = 'bold 24px "Arial", sans-serif';
      ctx.fillStyle = '#fef08a'; // Yellow
      ctx.fillText('SUPERSTORE', 256, 92);

      return new THREE.CanvasTexture(canvas);
    };

    // PROCEDURAL NEON TEXTURE
    const createNeonTexture = (isOpen) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 128, 64);
      ctx.strokeStyle = isOpen ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 116, 52);

      ctx.fillStyle = isOpen ? '#4ade80' : '#fca5a5';
      ctx.font = 'bold 20px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isOpen ? 'OPEN' : 'CLOSED', 64, 32);
      return new THREE.CanvasTexture(canvas);
    };

    // BUILD WORLD COMPONENTS
    // 1. Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 20),
      new THREE.MeshStandardMaterial({ map: createWoodFloorTexture(), roughness: 0.4 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Sidewalk & Street Outside
    const sidewalk = new THREE.Mesh(
      new THREE.PlaneGeometry(35, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
    );
    sidewalk.rotation.x = -Math.PI / 2;
    sidewalk.position.set(0, 0.01, 14);
    scene.add(sidewalk);

    const street = new THREE.Mesh(
      new THREE.PlaneGeometry(35, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    );
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0, 24);
    scene.add(street);

    // 3. Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
    const brickMat = new THREE.MeshStandardMaterial({ map: createBrickTexture(), roughness: 0.8 });

    // Back & Side walls
    const buildWall = (w, h, d, x, y, z, rotY = 0) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };
    buildWall(24, 5, 0.3, 0, 2.5, -10); // Back
    buildWall(20, 5, 0.3, -12, 2.5, 0, Math.PI / 2); // Left
    buildWall(20, 5, 0.3, 12, 2.5, 0, -Math.PI / 2); // Right

    // Front Brick Pillars
    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5, 0.4), brickMat);
    pillarLeft.position.set(-11, 2.5, 10);
    scene.add(pillarLeft);

    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5, 0.4), brickMat);
    pillarRight.position.set(11, 2.5, 10);
    scene.add(pillarRight);

    // Glass Windows
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.2, roughness: 0.01 });

    const buildWindow = (x) => {
      const gp = new THREE.Group();
      gp.position.set(x, 2.5, 10);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 4.0), glassMat);
      gp.add(glass);
      const frameH = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.1), windowFrameMat);
      frameH.position.y = 2.0; gp.add(frameH);
      const frameB = frameH.clone(); frameB.position.y = -2.0; gp.add(frameB);
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.0, 0.1), windowFrameMat);
      frameL.position.x = -1.8; gp.add(frameL);
      const frameR = frameL.clone(); frameR.position.x = 1.8; gp.add(frameR);
      scene.add(gp);
    };
    buildWindow(-6.5);
    buildWindow(6.5);

    // Front Slanted Awning (Striped Tent)
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.08, 2.8),
      new THREE.MeshStandardMaterial({ map: createStripeTexture(), roughness: 0.8 })
    );
    awning.position.set(0, 4.1, 11.2);
    awning.rotation.x = Math.PI / 10;
    scene.add(awning);

    // Giant "ZAZUDO" Welcome Banner above awning
    const welcomeBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 2.6),
      new THREE.MeshStandardMaterial({ map: createBannerTexture(), roughness: 0.4 })
    );
    welcomeBanner.position.set(0, 5.1, 10.1);
    scene.add(welcomeBanner);

    // Neon Open/Closed sign
    const neonMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.6),
      new THREE.MeshBasicMaterial({ map: createNeonTexture(stateRef.current.isStoreOpen) })
    );
    neonMesh.position.set(2.4, 2.2, 10.05);
    scene.add(neonMesh);

    stateRef.current.updateNeon = (isOpen) => {
      neonMesh.material.map = createNeonTexture(isOpen);
      neonMesh.material.needsUpdate = true;
    };

    // Sliding Glass Door
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.0, 0.2), windowFrameMat);
    doorFrame.position.set(0, 2.0, 10);
    scene.add(doorFrame);

    const leftDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.8), glassMat);
    leftDoor.position.set(-2.0, 1.9, 10.03);
    scene.add(leftDoor);

    const rightDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 3.8), glassMat);
    rightDoor.position.set(2.0, 1.9, 10.03);
    scene.add(rightDoor);

    // Cardboard Delivery Drop Zone
    const dropZone = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.05, 3.5),
      new THREE.MeshBasicMaterial({ color: 0xeab308, wireframe: true })
    );
    dropZone.position.set(0, 0.02, 14.0);
    scene.add(dropZone);

    // Checkout Counter
    const registerGroup = new THREE.Group();
    registerGroup.position.set(7.5, 0, 1.0);
    scene.add(registerGroup);

    const counter = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.85, 3.0),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
    );
    counter.position.set(0, 0.425, 0);
    counter.castShadow = true;
    registerGroup.add(counter);

    const conveyor = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.05, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    conveyor.position.set(-0.3, 0.85, 0.3);
    registerGroup.add(conveyor);

    const scanPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.01, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    );
    scanPlate.position.set(-0.3, 0.88, -0.85);
    registerGroup.add(scanPlate);

    const laser = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.02, 0.02),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    laser.position.set(-0.3, 0.89, -0.85);
    registerGroup.add(laser);

    // 3D SHELVES SETUP
    const shelf3DMeshes = {};
    const buildShelves = (currentShop) => {
      SHELF_COORDS.forEach((sc) => {
        if (shelf3DMeshes[sc.id]) {
          scene.remove(shelf3DMeshes[sc.id]);
        }

        const unlocked = PRODUCTS[sc.id].minLevel <= currentShop.level;
        const group = new THREE.Group();
        group.position.set(sc.x, 0, sc.z);
        scene.add(group);
        shelf3DMeshes[sc.id] = group;

        // Back Panel
        const panel = new THREE.Mesh(
          new THREE.BoxGeometry(2.3, 2.0, 0.05),
          new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 })
        );
        panel.position.set(0, 1.0, -0.4);
        panel.castShadow = true;
        group.add(panel);

        // Posts
        const postMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7 });
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.1, 0.08), postMat);
        postL.position.set(-1.15, 1.05, -0.38);
        group.add(postL);
        const postR = postL.clone();
        postR.position.x = 1.15;
        group.add(postR);

        // Planks
        const plankMat = new THREE.MeshStandardMaterial({
          color: unlocked ? 0xf8fafc : 0x94a3b8,
          roughness: 0.6
        });
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.04, 0.75), plankMat);
        bottom.position.set(0, 0.25, 0);
        bottom.castShadow = true;
        group.add(bottom);

        const mid = bottom.clone();
        mid.position.y = 0.9;
        group.add(mid);

        const top = bottom.clone();
        top.position.y = 1.55;
        group.add(top);

        // Product Items rendering
        if (unlocked) {
          const inv = currentShop.inventory[sc.id];
          const stockQty = inv ? inv.quantity : 0;
          const displayCount = Math.min(stockQty, 12);

          for (let i = 0; i < displayCount; i++) {
            const item = new THREE.Mesh(
              new THREE.BoxGeometry(0.24, 0.3, 0.24),
              new THREE.MeshStandardMaterial({ color: sc.color, roughness: 0.3 })
            );
            item.castShadow = true;

            const isBottomRow = i < 4;
            const isMidRow = i >= 4 && i < 8;
            const isTopRow = i >= 8;

            if (isBottomRow) item.position.y = 0.42;
            else if (isMidRow) item.position.y = 1.07;
            else item.position.y = 1.72;

            const colIdx = i % 4;
            item.position.x = -0.68 + colIdx * 0.45;
            item.position.z = -0.05 + Math.random() * 0.03;
            group.add(item);
          }
        }
      });
    };

    // CARDBOARD BOXES SYNCS
    const box3DMeshes = {};
    const syncBoxes = (currentShop) => {
      const dbList = currentShop.deliveryBoxes || [];
      
      // Remove stale boxes
      Object.keys(box3DMeshes).forEach(id => {
        if (!dbList.find(b => b.id === id)) {
          scene.remove(box3DMeshes[id]);
          delete box3DMeshes[id];
        }
      });

      // Spawn boxes in exterior zone
      dbList.forEach((box, index) => {
        if (!box3DMeshes[box.id]) {
          const group = new THREE.Group();
          const col = index % 3;
          const row = Math.floor(index / 3);
          const xOffset = col * 1.3 - 1.3;
          const zOffset = row * 1.3 + 14.0;
          group.position.set(xOffset, 0.38, zOffset);
          scene.add(group);
          box3DMeshes[box.id] = group;

          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.75, 0.85),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 })
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);

          const tape = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.76, 0.86),
            new THREE.MeshBasicMaterial({ color: 0xfef08a })
          );
          group.add(tape);

          mesh.userData = { boxId: box.id, productId: box.productId, name: PRODUCTS[box.productId].name, quantity: box.quantity };
        }
      });
    };

    // HOLOGRAM DECORATIVE (Attraction Upgrade)
    const hologramGroup = new THREE.Group();
    hologramGroup.position.set(0, 1.2, 0);
    scene.add(hologramGroup);

    const buildHologram = (level) => {
      while (hologramGroup.children.length > 0) {
        hologramGroup.remove(hologramGroup.children[0]);
      }
      if (level >= 3) {
        const ico = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.65, 1),
          new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.7 })
        );
        hologramGroup.add(ico);
        const pl = new THREE.PointLight(0x06b6d4, 1.5, 6);
        hologramGroup.add(pl);
      }
    };

    // INIT SCENE
    const initialShop = stateRef.current.shopData;
    if (initialShop) {
      buildShelves(initialShop);
      syncBoxes(initialShop);
      buildHologram(initialShop.upgrades.attraction);
    }

    // CONTROLS MOUSE DRAGGING & WASD
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let camRadius = 14;
    let camTheta = Math.PI / 4;
    let camPhi = Math.PI / 5;

    const onMouseDown = (e) => {
      if (stateRef.current.controlMode === 'orbit') {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      }
    };

    const onMouseMove = (e) => {
      const mode = stateRef.current.controlMode;
      if (mode === 'orbit' && isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        camTheta -= dx * 0.005;
        camPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, camPhi + dy * 0.005));
      } else if (mode === 'firstperson' && stateRef.current.isPointerLocked) {
        const mx = e.movementX || 0;
        const my = e.movementY || 0;
        stateRef.current.yaw += mx * 0.0025;
        stateRef.current.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, stateRef.current.pitch - my * 0.0025));
      }
    };

    const onMouseUp = () => { isDragging = false; };
    const onWheel = (e) => {
      if (stateRef.current.controlMode === 'orbit') {
        camRadius = Math.max(4, Math.min(22, camRadius + e.deltaY * 0.015));
      }
    };

    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e'].includes(k)) {
        stateRef.current.keys[k] = true;
      }
    };

    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'e'].includes(k)) {
        stateRef.current.keys[k] = false;
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onCanvasClick = (e) => {
      const mode = stateRef.current.controlMode;
      if (mode === 'firstperson') {
        if (!stateRef.current.isPointerLocked) {
          canvas.requestPointerLock();
        } else {
          raycast(e);
        }
      } else {
        raycast(e);
      }
    };
    canvas.addEventListener('click', onCanvasClick);

    const onPointerLockChange = () => {
      stateRef.current.isPointerLocked = (document.pointerLockElement === canvas);
    };
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // CLICK RAYCAST INTERACTION
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const raycast = (e) => {
      const shopData = stateRef.current.shopData;
      if (!shopData) return;

      if (stateRef.current.isPointerLocked) {
        mouse.set(0, 0);
      } else {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      if (intersects.length === 0) return;

      let clickedBox = null;
      let clickedReg = false;
      let clickedShelf = null;

      for (let i = 0; i < intersects.length; i++) {
        let curr = intersects[i].object;
        while (curr) {
          if (curr.userData && curr.userData.boxId) {
            clickedBox = curr.userData;
            break;
          }
          if (curr === registerGroup) {
            clickedReg = true;
            break;
          }
          const shelfId = Object.keys(shelf3DMeshes).find(id => shelf3DMeshes[id] === curr);
          if (shelfId) {
            clickedShelf = shelfId;
            break;
          }
          curr = curr.parent;
        }
        if (clickedBox || clickedReg || clickedShelf) break;
      }

      // Check distance in First Person mode
      if (stateRef.current.controlMode === 'firstperson') {
        const hit = intersects[0].point;
        if (stateRef.current.playerPos.distanceTo(hit) > 4.5) {
          setActiveMessage('⚠️ Move closer to interact!');
          setTimeout(() => setActiveMessage(''), 2000);
          return;
        }
      }

      if (clickedBox) {
        if (stateRef.current.carryingBox) {
          setActiveMessage('⚠️ Already carrying a box!');
        } else {
          const box = (shopData.deliveryBoxes || []).find(b => b.id === clickedBox.boxId);
          if (box) {
            setCarryingBox({ ...box, name: PRODUCTS[box.productId].name });
            setActiveMessage(`📦 Carrying Box: ${PRODUCTS[box.productId].name} (${box.quantity}x)`);
            triggerSound('success');
          }
        }
      } else if (clickedShelf && stateRef.current.carryingBox) {
        attemptStockShelf(clickedShelf);
      } else if (clickedReg) {
        setIsNearRegister(true);
        if (stateRef.current.isPointerLocked) {
          document.exitPointerLock();
        }
      }
    };

    const attemptStockShelf = (shelfId) => {
      const box = stateRef.current.carryingBox;
      if (!box) return;

      if (box.productId !== shelfId) {
        setActiveMessage(`❌ This shelf only holds ${PRODUCTS[shelfId].name}!`);
        triggerSound('error');
        setTimeout(() => setActiveMessage(''), 2000);
        return;
      }

      restockItem(box.id, 1);
      triggerSound('success');
      useEnergy(3); // Drains energy

      const nextBox = { ...box, quantity: box.quantity - 1 };
      if (nextBox.quantity <= 0) {
        setCarryingBox(null);
        setActiveMessage('📦 Box emptied.');
      } else {
        setCarryingBox(nextBox);
        setActiveMessage(`📦 Carrying: ${box.name} (${nextBox.quantity}x)`);
      }
    };

    // NPC CUSTOMERS SPANNING
    const names = ['Zara', 'Kael', 'Rin', 'V', 'Dexter', 'Lina', 'Sora', 'Tifa', 'Cloud', 'Ken', 'Yuki', 'Mia'];
    const colors = [0xf472b6, 0x38bdf8, 0x4ade80, 0xfbbf24, 0xa78bfa, 0x2dd4bf, 0xfb7185, 0xf97316];

    const spawnCustomer = () => {
      const currentShop = stateRef.current.shopData;
      if (!currentShop || !stateRef.current.isStoreOpen) return;

      const itemsInStock = Object.keys(currentShop.inventory).filter(id => currentShop.inventory[id].quantity > 0);
      let targetProd = 'cyber_drink';
      if (itemsInStock.length > 0) {
        targetProd = itemsInStock[Math.floor(Math.random() * itemsInStock.length)];
      }

      const shelfCoord = SHELF_COORDS.find(sc => sc.id === targetProd) || SHELF_COORDS[0];

      // Custom Blocky Customer body
      const group = new THREE.Group();
      group.position.set(0, 0.45, 10.5);
      scene.add(group);

      const color = colors[Math.floor(Math.random() * colors.length)];
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.35), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({ color: 0xffd1b3 }));
      head.position.y = 0.52;
      group.add(head);

      const customer = {
        mesh: group,
        color,
        productId: targetProd,
        shelfPos: new THREE.Vector3(shelfCoord.x, 0.45, shelfCoord.z + 1.1),
        state: 'entering',
        pauseTimer: 0,
        speed: 1.4 + Math.random() * 0.4,
        bobAngle: Math.random() * 10,
        bobSpeed: 0.16,
        hasItem: false,
        name: names[Math.floor(Math.random() * names.length)]
      };
      stateRef.current.customers.push(customer);
    };

    const cashierTrigger = (cust) => {
      const info = PRODUCTS[cust.productId];
      const qty = Math.floor(Math.random() * 2) + 1;

      const itemMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xeab308 })
      );
      itemMesh.position.set(7.2, 0.90, 1.0 + (stateRef.current.scanningItems.length * 0.35));
      scene.add(itemMesh);

      const list = [...stateRef.current.scanningItems, {
        mesh: itemMesh,
        productId: cust.productId,
        name: info.name,
        quantity: qty,
        emoji: info.emoji
      }];
      stateRef.current.scanningItems = list;
      setScanningItems(list);
    };

    // RENDER ANIMATION LOOP
    const clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();
      const currentShop = stateRef.current.shopData;
      if (!currentShop) {
        requestAnimationFrame(animate);
        return;
      }

      // Spawn customer loop (if open)
      if (stateRef.current.isStoreOpen) {
        const lvl = currentShop.upgrades.marketing;
        const interval = Math.max(3000, 15000 - (lvl - 1) * 2000);
        stateRef.current.spawnTimer += delta * 1000;
        if (stateRef.current.spawnTimer >= interval) {
          stateRef.current.spawnTimer = 0;
          if (stateRef.current.customers.length < 5) {
            spawnCustomer();
          }
        }
      }

      // Rebuild shelves and sync box lists
      buildShelves(currentShop);
      syncBoxes(currentShop);
      buildHologram(currentShop.upgrades.attraction);

      hologramGroup.rotation.y += 0.02;

      // Camera Movements
      const mode = stateRef.current.controlMode;
      if (mode === 'orbit') {
        const target = new THREE.Vector3(0, 0.5, 0);
        camera.position.x = target.x + camRadius * Math.sin(camTheta) * Math.cos(camPhi);
        camera.position.y = target.y + camRadius * Math.sin(camPhi);
        camera.position.z = target.z + camRadius * Math.cos(camTheta) * Math.cos(camPhi);
        camera.lookAt(target);
      } else {
        const pos = stateRef.current.playerPos;
        const keys = stateRef.current.keys;
        const moveSpeed = (stateRef.current.isSprinting ? 6.5 : 3.8) * delta;

        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);

        if (keys.w) pos.addScaledVector(forward, moveSpeed);
        if (keys.s) pos.addScaledVector(forward, -moveSpeed);
        if (keys.a) pos.addScaledVector(right, -moveSpeed);
        if (keys.d) pos.addScaledVector(right, moveSpeed);

        // Keep inside boundary walls
        pos.x = Math.max(-11.0, Math.min(11.0, pos.x));
        pos.z = Math.max(-9.0, Math.min(13.0, pos.z));

        camera.position.copy(pos);
        const look = new THREE.Vector3(0, 0, -1);
        look.applyAxisAngle(new THREE.Vector3(1, 0, 0), stateRef.current.pitch);
        look.applyAxisAngle(new THREE.Vector3(0, 1, 0), stateRef.current.yaw);
        look.add(pos);
        camera.lookAt(look);
      }

      // Customer paths
      stateRef.current.customers.forEach((cust, idx) => {
        cust.bobAngle += cust.bobSpeed;
        cust.mesh.position.y = 0.45 + Math.abs(Math.sin(cust.bobAngle)) * 0.1;

        let target = new THREE.Vector3(0, 0.45, 9);
        if (cust.state === 'entering') {
          target.set(0, 0.45, 5);
          if (cust.mesh.position.distanceTo(target) < 0.5) {
            cust.state = 'browsing';
          }
        } else if (cust.state === 'browsing') {
          target.copy(cust.shelfPos);
          if (cust.mesh.position.distanceTo(target) < 0.4) {
            if (cust.pauseTimer === 0) {
              cust.pauseTimer = 90;
              const stock = currentShop.inventory[cust.productId];
              cust.hasItem = stock && stock.quantity > 0;
            } else {
              cust.pauseTimer--;
              if (cust.pauseTimer <= 0) {
                cust.state = cust.hasItem ? 'checkout' : 'leaving';
              }
            }
          }
        } else if (cust.state === 'checkout') {
          target.set(7.0, 0.45, 1.8);
          if (cust.mesh.position.distanceTo(target) < 0.5) {
            cashierTrigger(cust);
            cust.state = 'leaving';
          }
        } else if (cust.state === 'leaving') {
          target.set(0, 0.45, 11);
          if (cust.mesh.position.distanceTo(target) < 0.5) {
            scene.remove(cust.mesh);
            stateRef.current.customers.splice(idx, 1);
          }
        }

        const dir = new THREE.Vector3().subVectors(target, cust.mesh.position);
        dir.y = 0;
        if (dir.length() > 0.1) {
          dir.normalize();
          cust.mesh.position.addScaledVector(dir, cust.speed * delta);
          cust.mesh.rotation.y = Math.atan2(dir.x, dir.z);
        }
      });

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // CLEANUP
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onCanvasClick);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      scene.clear();
      renderer.dispose();
    };
  }, [hasStarted, controlMode]);

  const handleManualDropBox = () => {
    if (!carryingBox) return;
    setCarryingBox(null);
    setActiveMessage('📦 Box dropped.');
    triggerSound('success');
  };

  const handleManualStock = () => {
    if (!carryingBox) return;
    const box = carryingBox;
    restockItem(box.id, 1);
    useEnergy(4);
    triggerSound('success');

    const nextBox = { ...box, quantity: box.quantity - 1 };
    if (nextBox.quantity <= 0) {
      setCarryingBox(null);
      setActiveMessage('📦 Box emptied.');
    } else {
      setCarryingBox(nextBox);
      setActiveMessage(`📦 Carrying: ${box.name} (${nextBox.quantity}x)`);
    }
  };

  const scanConveyorItem = (index) => {
    const list = [...scanningItems];
    const item = list[index];
    if (!item) return;

    triggerSound('sale');
    const result = processCustomerSale();

    if (result) {
      const scene = sceneRef.current;
      if (scene) scene.remove(item.mesh);
    }

    list.splice(index, 1);
    setScanningItems(list);
    stateRef.current.scanningItems = list;

    if (list.length === 0) {
      setIsNearRegister(false);
      setActiveMessage('✅ Customer checked out!');
    }
  };

  if (!shop) return null;

  return (
    <div style={styles.simulatorWrapper}>
      {/* 1. Splash Welcome Screen - "kirishda katta qilib zazudo deb kutib olsin" */}
      {!hasStarted && (
        <div style={styles.splashScreen}>
          <div style={styles.splashCard}>
            <div style={styles.splashLogo}>ZAZUDO</div>
            <div style={styles.splashSubtitle}>3D SUPERMARKET SIMULATOR</div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
              Stock shelves, checkout customers, upgrade your attraction, and build a retail empire!
            </p>
            <button 
              onClick={() => {
                setHasStarted(true);
                triggerSound('upgrade');
              }}
              style={styles.splashBtn}
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* 2. Top HUD Bar (Exact Mobile Supermarket Sim Style) */}
      <div style={styles.hudTopBar}>
        {/* Settings gear */}
        <button onClick={toggleSound} style={styles.gearBtn}>
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* Day Card */}
        <div style={styles.dayCard}>
          <div style={styles.dayHeader}>DAY</div>
          <div style={styles.dayValue}>{currentDay}</div>
        </div>

        {/* Clock card */}
        <div style={styles.hudBadge}>
          🕒 {currentTime}
        </div>

        {/* Energy bar */}
        <div style={styles.energyBadge}>
          <span style={{ fontSize: '1rem', marginRight: '4px' }}>⚡</span>
          <div style={styles.energyBarWrapper}>
            <div style={{ ...styles.energyBarFill, width: `${energy}%` }}></div>
          </div>
          <span style={{ fontSize: '0.75rem', marginLeft: '6px', fontWeight: 'bold' }}>{energy}</span>
        </div>

        {/* Cash indicator */}
        <div style={styles.cashBadge}>
          💵 ${shop.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>

        {/* Shop Level pill & XP progress */}
        <div style={styles.lvlBadge}>
          <span style={{ fontWeight: 'bold', color: '#fef08a' }}>LVL {shop.level}</span>
          <div style={styles.xpBarWrapper}>
            <div style={{ ...styles.xpBarFill, width: `${(shop.xp / shop.xpToNextLevel) * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={styles.logoTitle}>ZAZUDO SUPERSTORE</div>

      {/* Main 3D Screen Area */}
      <div ref={containerRef} style={styles.canvasContainer}>
        {hasStarted && <canvas ref={canvasRef} style={styles.canvasElement}></canvas>}

        {/* Closed banner or checklist warning on the right side */}
        {!isStoreOpen ? (
          <div style={styles.urgentPanel}>
            <div style={styles.avatarWrapper}>👩‍💼</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>URGENT</span>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', margin: '4px 0' }}>Your store is closed, open it to sell products</span>
              <button onClick={toggleStoreOpen} style={styles.openBtn}>OPEN STORE</button>
            </div>
          </div>
        ) : (
          <div style={styles.urgentPanelOpen}>
            <div style={styles.avatarWrapper}>👩‍💼</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '0.8rem' }}>STORE OPEN</span>
              <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>Mijozlar kelishmoqda... Shoshiling!</span>
              <button onClick={toggleStoreOpen} style={styles.closeBtn}>CLOSE STORE</button>
            </div>
          </div>
        )}

        {/* Joystick indicator bottom left (for visual mobile style) */}
        {controlMode === 'firstperson' && hasStarted && (
          <div style={styles.virtualJoystick}>
            <div style={styles.joystickKnob}></div>
          </div>
        )}

        {/* Action Buttons Bottom Right */}
        {hasStarted && (
          <div style={styles.actionButtonsCol}>
            {carryingBox && (
              <>
                <button onClick={handleManualStock} style={styles.actionBtnGreen}>
                  🤲 STOCK ({carryingBox.quantity})
                </button>
                <button onClick={handleManualDropBox} style={styles.actionBtnRed}>
                  📦⬇ DROP
                </button>
              </>
            )}

            <button 
              onClick={() => setIsSprinting(!isSprinting)} 
              style={isSprinting ? styles.actionBtnSprintActive : styles.actionBtnGold}
            >
              🏃 SPRINT
            </button>

            <button 
              onClick={() => {
                const next = controlMode === 'orbit' ? 'firstperson' : 'orbit';
                setControlMode(next);
                setActiveMessage(next === 'firstperson' ? 'Walking (WASD) - Click to look' : 'Orbit View');
              }}
              style={styles.actionBtnBlue}
            >
              🎥 VIEW
            </button>
          </div>
        )}

        {/* HUD Alerts */}
        {activeMessage && (
          <div style={styles.hudAlert}>{activeMessage}</div>
        )}

        {/* Conveyor scan overlay */}
        {isNearRegister && scanningItems.length > 0 && (
          <div style={styles.scanModal}>
            <div style={styles.scanHeader}>
              <h4 style={{ margin: 0 }}>Scan & Pack items</h4>
              <button onClick={() => setIsNearRegister(false)} style={styles.scanClose}>✕</button>
            </div>
            <div style={styles.scanBody}>
              {scanningItems.map((item, idx) => (
                <div key={idx} style={styles.scanRow}>
                  <span>{item.emoji} {item.name} (x{item.quantity})</span>
                  <button onClick={() => scanConveyorItem(idx)} style={styles.rowScanBtn}>SCAN</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* HUD Info Footer */}
      <div style={styles.hudFooter}>
        <div>📦 Deliveries: <b>{(shop.deliveryBoxes || []).length} boxes</b></div>
        <div>📣 Marketing: <b>Lv.{shop.upgrades.marketing}</b></div>
        <div>✨ Attraction: <b>Lv.{shop.upgrades.attraction}</b></div>
        <button onClick={quickStockAll} disabled={!(shop.deliveryBoxes && shop.deliveryBoxes.length > 0)} style={styles.quickStockBtn}>
          ⚡ QUICK STOCK ALL
        </button>
      </div>
    </div>
  );
}

const styles = {
  simulatorWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    fontFamily: '"Arial", sans-serif',
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid #1e293b',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.55)',
    position: 'relative'
  },
  splashScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem'
  },
  splashCard: {
    backgroundColor: '#1e293b',
    border: '2px solid #3b82f6',
    borderRadius: '24px',
    padding: '3rem',
    textAlign: 'center',
    maxWidth: '480px',
    boxShadow: '0 0 40px rgba(59, 130, 246, 0.35)'
  },
  splashLogo: {
    fontSize: '4rem',
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: '4px',
    textShadow: '0 0 15px rgba(59, 130, 246, 0.8)',
    marginBottom: '0.2rem'
  },
  splashSubtitle: {
    fontSize: '0.95rem',
    fontWeight: 'bold',
    color: '#60a5fa',
    letterSpacing: '2px',
    marginBottom: '1.5rem'
  },
  splashBtn: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '12px',
    padding: '0.85rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4)',
    transition: 'transform 0.1s'
  },
  hudTopBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#1e293b',
    borderBottom: '2px solid #334155',
    flexWrap: 'wrap',
    gap: '0.8rem'
  },
  gearBtn: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#334155',
    fontSize: '1.1rem',
    cursor: 'pointer',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: '8px',
    width: '56px',
    overflow: 'hidden',
    border: '1.5px solid #ef4444'
  },
  dayHeader: {
    fontSize: '0.65rem',
    color: '#fca5a5',
    fontWeight: 'bold',
    padding: '2px 0'
  },
  dayValue: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#7f1d1d',
    width: '100%',
    textAlign: 'center',
    padding: '2px 0'
  },
  hudBadge: {
    backgroundColor: '#0f172a',
    border: '1.5px solid #334155',
    color: '#f8fafc',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  energyBadge: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    border: '1.5px solid #eab308',
    color: '#fff',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem'
  },
  energyBarWrapper: {
    width: '60px',
    height: '10px',
    backgroundColor: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  energyBarFill: {
    height: '100%',
    backgroundColor: '#eab308'
  },
  cashBadge: {
    backgroundColor: '#166534',
    border: '1.5px solid #22c55e',
    color: '#4ade80',
    borderRadius: '8px',
    padding: '0.4rem 1rem',
    fontSize: '1.05rem',
    fontWeight: 'bold',
    textShadow: '0 0 4px rgba(34, 197, 94, 0.4)'
  },
  lvlBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#7c3aed',
    border: '1.5px solid #a78bfa',
    color: '#fff',
    borderRadius: '8px',
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem'
  },
  xpBarWrapper: {
    width: '50px',
    height: '8px',
    backgroundColor: '#4c1d95',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: '#a78bfa'
  },
  logoTitle: {
    backgroundColor: '#111827',
    color: '#ef4444',
    textAlign: 'center',
    fontSize: '1.1rem',
    fontWeight: '950',
    letterSpacing: '2px',
    padding: '0.35rem 0',
    borderBottom: '2.5px solid #ef4444',
    textTransform: 'uppercase'
  },
  canvasContainer: {
    position: 'relative',
    height: '460px',
    width: '100%',
    backgroundColor: '#bae6fd',
    cursor: 'crosshair'
  },
  canvasElement: {
    width: '100%',
    height: '100%',
    display: 'block'
  },
  urgentPanel: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '210px',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    padding: '0.75rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    boxShadow: '0 10px 15px rgba(0,0,0,0.5)',
    zIndex: 10
  },
  urgentPanelOpen: {
    position: 'absolute',
    top: '15px',
    right: '15px',
    width: '210px',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    border: '2px solid #22c55e',
    borderRadius: '12px',
    padding: '0.75rem',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    boxShadow: '0 10px 15px rgba(0,0,0,0.5)',
    zIndex: 10
  },
  avatarWrapper: {
    fontSize: '2rem',
    backgroundColor: '#334155',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  openBtn: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '6px'
  },
  closeBtn: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '6px'
  },
  virtualJoystick: {
    position: 'absolute',
    bottom: '25px',
    left: '25px',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(148, 163, 184, 0.3)',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none'
  },
  joystickKnob: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  actionButtonsCol: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    zIndex: 10
  },
  actionBtnGreen: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: '2px solid #4ade80',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  actionBtnRed: {
    backgroundColor: '#ef4444',
    color: '#fff',
    border: '2px solid #fca5a5',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  actionBtnGold: {
    backgroundColor: '#d97706',
    color: '#fff',
    border: '2px solid #fbbf24',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  actionBtnSprintActive: {
    backgroundColor: '#fbbf24',
    color: '#0f172a',
    border: '2px solid #ffffff',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(251, 191, 36, 0.5)'
  },
  actionBtnBlue: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: '2px solid #60a5fa',
    borderRadius: '10px',
    padding: '0.6rem 1.2rem',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  hudAlert: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    color: '#fff',
    padding: '0.4rem 1.2rem',
    borderRadius: '8px',
    fontSize: '0.8rem',
    border: '1.5px solid #334155',
    pointerEvents: 'none'
  },
  scanModal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '320px',
    backgroundColor: '#1e293b',
    border: '2.5px solid #2563eb',
    borderRadius: '16px',
    padding: '1.25rem',
    color: '#fff',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
    zIndex: 20
  },
  scanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1.5px solid #334155',
    paddingBottom: '0.5rem',
    marginBottom: '0.8rem'
  },
  scanClose: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: '1.1rem',
    cursor: 'pointer'
  },
  scanBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem'
  },
  scanRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px'
  },
  rowScanBtn: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 12px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  hudFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    backgroundColor: '#1e293b',
    borderTop: '2px solid #334155',
    color: '#cbd5e1',
    fontSize: '0.85rem',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  quickStockBtn: {
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};
