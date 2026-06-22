import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';

// Constant coordinates for visual anchors
const ENTRANCE = { x: 80, y: 380 };
const EXIT = { x: 50, y: 380 };
const CASHIER = { x: 700, y: 150 };
const WAITING_SPOT = { x: 700, y: 220 }; // queue spot

// Coordinates of shelves (8 items in catalog)
const SHELVES = [
  { id: 'cyber_drink', name: 'Cyber Cola', x: 220, y: 160, emoji: '🥤', color: '#c084fc' },
  { id: 'coffee_beans', name: 'Organic Beans', x: 320, y: 160, emoji: '☕', color: '#60a5fa' },
  { id: 'tech_gadget', name: 'Smart Ring', x: 420, y: 160, emoji: '💍', color: '#f43f5e' },
  { id: 'retro_console', name: 'Retro Console', x: 520, y: 160, emoji: '🎮', color: '#10b981' },
  { id: 'designer_shoes', name: 'Aero Sneakers', x: 220, y: 280, emoji: '👟', color: '#fbbf24' },
  { id: 'solar_charger', name: 'Solar Backpack', x: 320, y: 280, emoji: '🎒', color: '#3b82f6' },
  { id: 'ai_chip', name: 'AI Core', x: 420, y: 280, emoji: '🧠', color: '#ec4899' },
  { id: 'luxury_watch', name: 'Chrono Gold', x: 520, y: 280, emoji: '⌚', color: '#14b8a6' }
];

export default function ShopCanvas() {
  const { shop, processCustomerSale, setIsVisualSimulationActive, triggerSound, soundEnabled, toggleSound } = useGame();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // UI state
  const [activeTheme, setActiveTheme] = useState('cyberpunk'); // cyberpunk | arcade
  const [activeAdBlast, setActiveAdBlast] = useState(false);
  const [customerCount, setCustomerCount] = useState(0);

  // Refs for animation loops & state lists to avoid closure issues in canvas loop
  const stateRef = useRef({
    customers: [],
    particles: [],
    spawnTimer: 0,
    adBlastCooldown: 0,
    prevTickTime: 0,
    shopData: null
  });

  // Sync shop data
  useEffect(() => {
    stateRef.current.shopData = shop;
  }, [shop]);

  // Activate visual simulation mode on mount, deactivate on unmount
  useEffect(() => {
    setIsVisualSimulationActive(true);
    return () => {
      setIsVisualSimulationActive(false);
    };
  }, [setIsVisualSimulationActive]);

  // Handle Canvas Drawing and Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Set canvas dimensions
    canvas.width = 850;
    canvas.height = 450;

    const namesList = ['Neo', 'Trinity', 'Morpheus', 'Zara', 'Kaelen', 'Aria', 'Kael', 'Rin', 'V', 'Dexter', 'Lina', 'Sora', 'Tifa', 'Cloud', 'Ken', 'Yuki'];
    const bodyColors = ['#f472b6', '#38bdf8', '#4ade80', '#fbbf24', '#a78bfa', '#2dd4bf', '#fb7185', '#a3e635'];

    // Spawn a customer
    const spawnCustomer = (forcedProduct = null) => {
      const currentShop = stateRef.current.shopData;
      if (!currentShop) return;

      const randomName = namesList[Math.floor(Math.random() * namesList.length)];
      const randomColor = bodyColors[Math.floor(Math.random() * bodyColors.length)];
      
      // Determine what product they want to browse
      let targetProduct = null;
      const inStockProducts = Object.keys(currentShop.inventory).filter(
        id => currentShop.inventory[id].quantity > 0
      );

      if (forcedProduct) {
        targetProduct = forcedProduct;
      } else if (inStockProducts.length > 0 && Math.random() < 0.85) {
        // 85% chance to seek something in stock
        targetProduct = inStockProducts[Math.floor(Math.random() * inStockProducts.length)];
      } else {
        // 15% chance to seek a random product from the list of unlocked ones
        const unlockedProducts = Object.keys(PRODUCTS).filter(
          id => PRODUCTS[id].minLevel <= currentShop.level
        );
        if (unlockedProducts.length > 0) {
          targetProduct = unlockedProducts[Math.floor(Math.random() * unlockedProducts.length)];
        } else {
          targetProduct = 'cyber_drink';
        }
      }

      // Find shelf coordinates
      const shelfIndex = SHELVES.findIndex(s => s.id === targetProduct);
      const targetShelf = shelfIndex !== -1 ? SHELVES[shelfIndex] : SHELVES[0];

      const productInfo = PRODUCTS[targetProduct];

      const newCustomer = {
        id: 'cust_' + Math.random().toString(36).substr(2, 9),
        name: randomName,
        x: ENTRANCE.x,
        y: ENTRANCE.y,
        speed: 1.5 + Math.random() * 0.8,
        color: randomColor,
        bob: 0,
        bobSpeed: 0.1 + Math.random() * 0.05,
        state: 'entering', // entering | browsing | going_to_checkout | checking_out | leaving
        targetX: 120,
        targetY: 280,
        productId: targetProduct,
        productName: productInfo ? productInfo.name : 'Unknown Item',
        productEmoji: productInfo ? productInfo.emoji : '📦',
        shelfIndex: shelfIndex !== -1 ? shelfIndex : 0,
        shelfX: targetShelf.x,
        shelfY: targetShelf.y + 40, // stand slightly below shelf
        pauseTimer: 0,
        bubbleText: `💬 Need ${productInfo ? productInfo.name : 'Item'}...`,
        bubbleTimer: 120,
        hasItem: false,
        size: 15,
        targetIndex: 0
      };

      stateRef.current.customers.push(newCustomer);
      setCustomerCount(stateRef.current.customers.length);
    };

    // Helper to add particles
    const addParticle = (x, y, text, color) => {
      stateRef.current.particles.push({
        id: 'part_' + Math.random().toString(36).substr(2, 9),
        x,
        y,
        text,
        color,
        vy: -0.8,
        alpha: 1.0,
        life: 120
      });
    };

    // Core Animation loop
    const tick = (timestamp) => {
      if (!stateRef.current.prevTickTime) stateRef.current.prevTickTime = timestamp;
      const elapsed = timestamp - stateRef.current.prevTickTime;
      stateRef.current.prevTickTime = timestamp;

      const currentShop = stateRef.current.shopData;
      if (!currentShop) {
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      // Update Spawning
      const marketingLevel = currentShop.upgrades.marketing;
      // Marketing Level decreases interval between customer spawns
      const spawnInterval = Math.max(3000, 15000 - (marketingLevel - 1) * 2200);
      
      stateRef.current.spawnTimer += elapsed;
      if (stateRef.current.spawnTimer >= spawnInterval) {
        stateRef.current.spawnTimer = 0;
        if (stateRef.current.customers.length < 8) {
          spawnCustomer();
        }
      }

      // Update Ad Blast Cooldown
      if (stateRef.current.adBlastCooldown > 0) {
        stateRef.current.adBlastCooldown = Math.max(0, stateRef.current.adBlastCooldown - elapsed / 1000);
      }

      // Update Particles
      stateRef.current.particles.forEach(p => {
        p.y += p.vy;
        p.life -= 1.5;
        p.alpha = Math.max(0, p.life / 120);
      });
      stateRef.current.particles = stateRef.current.particles.filter(p => p.life > 0);

      // Update Customers pathfinding & state machine
      stateRef.current.customers.forEach((cust, index) => {
        // Customer bobbing animation
        cust.bob += cust.bobSpeed;
        
        let dx = cust.targetX - cust.x;
        let dy = cust.targetY - cust.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 3) {
          cust.x += (dx / dist) * cust.speed;
          cust.y += (dy / dist) * cust.speed;
        } else {
          // Reached destination, process states
          if (cust.state === 'entering') {
            // Walked inside, now proceed to the shelf
            cust.state = 'browsing';
            cust.targetX = cust.shelfX;
            cust.targetY = cust.shelfY;
            cust.bubbleText = `🔍 Where is ${cust.productEmoji}?`;
            cust.bubbleTimer = 90;
          } else if (cust.state === 'browsing') {
            // Arrived at shelf. Let's stand there and browse
            if (cust.pauseTimer === 0) {
              cust.pauseTimer = 90; // stand for 1.5s
              
              // Check stock at this moment
              const inventoryItem = currentShop.inventory[cust.productId];
              const inStock = inventoryItem && inventoryItem.quantity > 0;
              
              if (inStock) {
                cust.bubbleText = `🛒 Found it! ${cust.productEmoji}`;
                cust.hasItem = true;
              } else {
                cust.bubbleText = `😢 Out of stock!`;
                cust.hasItem = false;
              }
              cust.bubbleTimer = 90;
            } else {
              cust.pauseTimer--;
              if (cust.pauseTimer <= 0) {
                if (cust.hasItem) {
                  // Grabbed item, go to checkout line
                  cust.state = 'going_to_checkout';
                  
                  // Simple queue layout: position in queue based on index in checkout queue
                  const checkoutQueue = stateRef.current.customers.filter(
                    c => c.state === 'going_to_checkout' || c.state === 'checking_out'
                  );
                  const queuePos = checkoutQueue.indexOf(cust);
                  
                  cust.targetX = WAITING_SPOT.x;
                  cust.targetY = WAITING_SPOT.y + queuePos * 30; // space out back in a line
                  cust.bubbleText = `💸 Heading to register...`;
                  cust.bubbleTimer = 80;
                } else {
                  // No item, sad walk out
                  cust.state = 'leaving';
                  cust.targetX = EXIT.x;
                  cust.targetY = EXIT.y;
                  cust.bubbleText = `🚶 Leaving empty-handed`;
                  cust.bubbleTimer = 100;
                }
              }
            }
          } else if (cust.state === 'going_to_checkout') {
            // Line up near cashier. If they are first in line, they check out!
            const checkoutQueue = stateRef.current.customers.filter(
              c => c.state === 'going_to_checkout' || c.state === 'checking_out'
            );
            
            const position = checkoutQueue.indexOf(cust);
            if (position === 0) {
              // First in line, walk to cash register desk
              cust.state = 'checking_out';
              cust.targetX = CASHIER.x - 30; // stand directly in front of desk
              cust.targetY = CASHIER.y + 40;
              cust.pauseTimer = 75; // 1.25s checkout delay
              cust.bubbleText = `💳 Paying...`;
              cust.bubbleTimer = 75;
            } else {
              // Adjust target dynamically to keep queuing straight down
              cust.targetX = WAITING_SPOT.x;
              cust.targetY = WAITING_SPOT.y + position * 30;
            }
          } else if (cust.state === 'checking_out') {
            if (cust.pauseTimer > 0) {
              cust.pauseTimer--;
            } else {
              // Trigger actual backend sale in GameContext!
              const result = processCustomerSale();
              
              if (result) {
                // Success! Create particles and show happy text
                addParticle(CASHIER.x - 30, CASHIER.y - 10, `${cust.productEmoji} Sold!`, '#4ade80');
                addParticle(CASHIER.x - 30, CASHIER.y - 30, `+$${result.revenue}`, '#4ade80');
                addParticle(CASHIER.x - 30, CASHIER.y - 50, `+${result.xpGained} XP`, '#60a5fa');
                
                cust.bubbleText = `✨ Thank you!`;
              } else {
                // Failed (e.g. stock disappeared right before pay)
                cust.bubbleText = `😟 Wait, no stock?`;
                addParticle(CASHIER.x - 30, CASHIER.y - 20, `No stock!`, '#f43f5e');
              }
              
              cust.bubbleTimer = 70;
              cust.state = 'leaving';
              cust.targetX = EXIT.x;
              cust.targetY = EXIT.y;
            }
          } else if (cust.state === 'leaving') {
            // Reached door, remove
            stateRef.current.customers.splice(index, 1);
            setCustomerCount(stateRef.current.customers.length);
          }
        }

        // decrement bubble timer
        if (cust.bubbleTimer > 0) cust.bubbleTimer--;
      });

      // --- RENDERING ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const colorPalette = activeTheme === 'cyberpunk' ? {
        borderGlow: 'rgba(192, 132, 252, 0.4)',
        borderLine: '#c084fc',
        gridLine: 'rgba(192, 132, 252, 0.08)',
        floorBg: '#090b11',
        wallColor: '#1e1b4b',
        checkoutNeon: '#38bdf8',
        checkoutFill: 'rgba(56, 189, 248, 0.15)',
        textMain: '#fff',
        shelfNeon: 'rgba(167, 139, 250, 0.3)'
      } : {
        borderGlow: 'rgba(16, 185, 129, 0.4)',
        borderLine: '#10b981',
        gridLine: 'rgba(16, 185, 129, 0.08)',
        floorBg: '#0b1610',
        wallColor: '#064e3b',
        checkoutNeon: '#fbbf24',
        checkoutFill: 'rgba(251, 191, 36, 0.15)',
        textMain: '#fff',
        shelfNeon: 'rgba(245, 158, 11, 0.3)'
      };

      // 1. Draw floor grid
      ctx.fillStyle = colorPalette.floorBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = colorPalette.gridLine;
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Warehouse expansion grid wall visual adjustment
      // Higher storage levels expand visual shop size by showing cleaner borders
      const storageLevel = currentShop.upgrades.storage;
      ctx.strokeStyle = colorPalette.borderLine;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = colorPalette.borderGlow;

      // Draw shop borders/walls
      ctx.strokeRect(30, 20, canvas.width - 60, canvas.height - 40);
      ctx.shadowBlur = 0; // reset shadow

      // Draw walls filled border blocks
      ctx.fillStyle = colorPalette.wallColor;
      ctx.fillRect(30, 0, canvas.width - 60, 20); // Top wall
      ctx.fillRect(30, canvas.height - 20, canvas.width - 60, 20); // Bottom wall
      ctx.fillRect(0, 20, 30, canvas.height - 40); // Left wall
      ctx.fillRect(canvas.width - 30, 20, 30, canvas.height - 40); // Right wall

      // Draw Shop Name Banner on Top Wall
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${currentShop.name.toUpperCase()} ⚡`, canvas.width / 2, 15);

      // Draw Entrance Doorway (glow green)
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(25, ENTRANCE.y - 30, 10, 60); // entrance doorway visual indicator
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(25, EXIT.y - 30, 10, 60); // exit sign

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('IN', 20, ENTRANCE.y - 4);
      ctx.fillText('OUT', 20, EXIT.y + 14);

      // Draw Cashier checkout zone
      ctx.strokeStyle = colorPalette.checkoutNeon;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = colorPalette.checkoutNeon;
      ctx.fillStyle = colorPalette.checkoutFill;
      
      // Checkout Desk Rect
      ctx.strokeRect(CASHIER.x - 40, CASHIER.y - 20, 80, 40);
      ctx.fillRect(CASHIER.x - 40, CASHIER.y - 20, 80, 40);
      ctx.shadowBlur = 0; // reset

      // Cashier desk details (computer screen)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(CASHIER.x - 20, CASHIER.y - 12, 10, 24); // computer
      ctx.fillStyle = '#10b981';
      ctx.fillRect(CASHIER.x - 18, CASHIER.y - 10, 6, 20); // glowing screen green

      // Cashier NPC (cute blue avatar sitting behind the counter)
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(CASHIER.x, CASHIER.y - 35, 12, 0, Math.PI * 2);
      ctx.fill();
      // Cashier eyes
      ctx.fillStyle = '#fff';
      ctx.fillRect(CASHIER.x - 6, CASHIER.y - 38, 3, 3);
      ctx.fillRect(CASHIER.x + 3, CASHIER.y - 38, 3, 3);
      
      ctx.fillStyle = colorPalette.textMain;
      ctx.font = '9px sans-serif';
      ctx.fillText('CASHIER', CASHIER.x, CASHIER.y + 35);

      // 2. Draw Shelves & Products
      SHELVES.forEach((shelf) => {
        const productStock = currentShop.inventory[shelf.id];
        const stockQty = productStock ? productStock.quantity : 0;
        const unlocked = PRODUCTS[shelf.id].minLevel <= currentShop.level;

        // Shelf base
        ctx.fillStyle = unlocked ? '#1e293b' : '#334155';
        ctx.fillRect(shelf.x - 30, shelf.y - 12, 60, 24);
        
        ctx.strokeStyle = unlocked ? (stockQty > 0 ? colorPalette.borderLine : '#ef4444') : '#475569';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(shelf.x - 30, shelf.y - 12, 60, 24);

        if (!unlocked) {
          // Locked shelf sign
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px sans-serif';
          ctx.fillText(`LVL ${PRODUCTS[shelf.id].minLevel}`, shelf.x, shelf.y + 4);
        } else {
          // Draw product stack if in stock
          if (stockQty > 0) {
            // Draw visual boxes on shelf
            ctx.fillStyle = shelf.color;
            ctx.fillRect(shelf.x - 20, shelf.y - 6, 12, 12);
            ctx.fillRect(shelf.x - 4, shelf.y - 6, 12, 12);
            ctx.fillRect(shelf.x + 12, shelf.y - 6, 8, 12);
            
            // Emoji Floating slightly above
            ctx.font = '16px sans-serif';
            ctx.fillText(shelf.emoji, shelf.x, shelf.y - 18);

            // Stock Count
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText(stockQty, shelf.x, shelf.y + 4);
          } else {
            // Empty shelf out-of-stock overlay
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(shelf.x - 30, shelf.y - 12, 60, 24);
            
            ctx.fillStyle = '#f87171';
            ctx.font = 'bold 8px sans-serif';
            ctx.fillText('OOS', shelf.x, shelf.y + 4);
            ctx.font = '12px sans-serif';
            ctx.fillText(shelf.emoji, shelf.x, shelf.y - 18);
          }
        }

        // Draw small label under shelf
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText(shelf.name, shelf.x, shelf.y + 24);
      });

      // 3. Draw Decorative elements based on Attraction level
      const attractionLevel = currentShop.upgrades.attraction;
      if (attractionLevel >= 2) {
        // Draw potted plants in corners
        // Top Left
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(60, 50, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.fillRect(55, 58, 10, 10);
        // Bottom Right
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(790, 390, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.fillRect(785, 398, 10, 10);
      }
      if (attractionLevel >= 3) {
        // Draw rotating holographic globe in center of shop
        const holoAngle = (timestamp / 800) % (Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#38bdf8';
        
        ctx.beginPath();
        ctx.arc(370, 380, 20, 0, Math.PI*2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fill();

        // hologram core spinning lines
        ctx.beginPath();
        ctx.moveTo(370 - Math.cos(holoAngle)*20, 380 - Math.sin(holoAngle)*5);
        ctx.lineTo(370 + Math.cos(holoAngle)*20, 380 + Math.sin(holoAngle)*5);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 8px sans-serif';
        ctx.fillText('HOLO CORE', 370, 360);
        ctx.shadowBlur = 0; // reset
      }
      if (attractionLevel >= 4) {
        // Draw glowing floor border lights
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(35, 25, canvas.width - 70, canvas.height - 50);
      }

      // Draw warehouse crates visual based on Storage Level
      if (storageLevel >= 2) {
        ctx.fillStyle = '#b45309';
        // storage boxes stacked in top-left
        ctx.fillRect(60, 80, 20, 20);
        ctx.strokeRect(60, 80, 20, 20);
        if (storageLevel >= 3) {
          ctx.fillRect(82, 80, 20, 20);
          ctx.strokeRect(82, 80, 20, 20);
          ctx.fillRect(71, 60, 20, 20);
          ctx.strokeRect(71, 60, 20, 20);
        }
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.fillText('OVERSTOCK', 80, 110);
      }

      // 4. Draw Customers
      stateRef.current.customers.forEach((cust) => {
        const bobOffset = Math.sin(cust.bob) * 3;

        // Draw shadow under customer
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(cust.x, cust.y + 4, cust.size - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw customer body
        ctx.fillStyle = cust.color;
        ctx.beginPath();
        ctx.arc(cust.x, cust.y + bobOffset, cust.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw customer eyes (looking towards target)
        let eyeOffsetX = 0;
        let eyeOffsetY = 0;
        if (cust.targetX > cust.x) eyeOffsetX = 3;
        else if (cust.targetX < cust.x) eyeOffsetX = -3;
        if (cust.targetY > cust.y) eyeOffsetY = 2;
        else if (cust.targetY < cust.y) eyeOffsetY = -2;

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cust.x - 4 + eyeOffsetX, cust.y - 2 + bobOffset + eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.arc(cust.x + 4 + eyeOffsetX, cust.y - 2 + bobOffset + eyeOffsetY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw small item box in front of body if they've picked it up
        if (cust.hasItem && cust.state !== 'leaving') {
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(cust.x - 7, cust.y + 5 + bobOffset, 14, 10);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.strokeRect(cust.x - 7, cust.y + 5 + bobOffset, 14, 10);
          
          ctx.fillStyle = '#fff';
          ctx.font = '7px sans-serif';
          ctx.fillText(cust.productEmoji, cust.x, cust.y + 13 + bobOffset);
        }

        // Draw customer name tag
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(cust.x - 25, cust.y - cust.size - 18 + bobOffset, 50, 10);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText(cust.name, cust.x, cust.y - cust.size - 10 + bobOffset);

        // Draw customer thought bubble
        if (cust.bubbleTimer > 0) {
          const bubbleHeight = 24;
          const bubbleWidth = ctx.measureText(cust.bubbleText).width + 12;

          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          
          const bx = cust.x - bubbleWidth / 2;
          const by = cust.y - cust.size - bubbleHeight - 16 + bobOffset;
          
          // draw rounded rectangle for thought bubble
          ctx.roundRect(bx, by, bubbleWidth, bubbleHeight, 6);
          ctx.fill();
          ctx.stroke();

          // draw small triangular pointer to head
          ctx.beginPath();
          ctx.moveTo(cust.x - 5, by + bubbleHeight);
          ctx.lineTo(cust.x, by + bubbleHeight + 6);
          ctx.lineTo(cust.x + 5, by + bubbleHeight);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.font = '10px sans-serif';
          ctx.fillText(cust.bubbleText, cust.x, by + 16);
        }
      });

      // 5. Draw Floating Particles
      stateRef.current.particles.forEach((p) => {
        ctx.fillStyle = `rgba(${p.color === '#60a5fa' ? '96, 165, 250' : '74, 222, 128'}, ${p.alpha})`;
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(p.text, p.x, p.y);
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [activeTheme]);

  // Manually trigger an advertising campaign ("Ad Blast")
  const triggerAdBlast = () => {
    if (!shop) return;
    if (shop.balance < 50) {
      alert("Insufficient funds for Ad Blast! Costs $50.");
      return;
    }

    // Deduct via direct balance update to simulated DB
    const rawShops = JSON.parse(localStorage.getItem('zazudo_shops') || '{}');
    const myShop = rawShops[shop.ownerId];
    if (myShop) {
      if (myShop.balance < 50) {
        triggerSound('error');
        return;
      }
      myShop.balance = parseFloat((myShop.balance - 50).toFixed(2));
      myShop.updatedAt = new Date().toISOString();
      rawShops[shop.ownerId] = myShop;
      localStorage.setItem('zazudo_shops', JSON.stringify(rawShops));
      
      // Update local storage will trigger live database updates for our active view
      // Save will notify listeners
      const changeEvent = new Event('storage');
      window.dispatchEvent(changeEvent); // force dispatch storage sync
    }

    triggerSound('upgrade');
    setActiveAdBlast(true);
    stateRef.current.adBlastCooldown = 15; // 15s cooldown

    // Spawn 3 customers immediately
    const namesList = ['Neo', 'Trinity', 'Morpheus', 'Zara', 'Kaelen', 'Aria', 'Kael', 'Rin', 'V', 'Dexter', 'Lina', 'Sora', 'Tifa', 'Cloud', 'Ken', 'Yuki'];
    const bodyColors = ['#f472b6', '#38bdf8', '#4ade80', '#fbbf24', '#a78bfa', '#2dd4bf', '#fb7185', '#a3e635'];

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        // Choose random product currently in stock
        const inStockProducts = Object.keys(shop.inventory).filter(
          id => shop.inventory[id].quantity > 0
        );
        let targetProduct = inStockProducts.length > 0
          ? inStockProducts[Math.floor(Math.random() * inStockProducts.length)]
          : 'cyber_drink';

        const shelfIndex = SHELVES.findIndex(s => s.id === targetProduct);
        const targetShelf = shelfIndex !== -1 ? SHELVES[shelfIndex] : SHELVES[0];
        const productInfo = PRODUCTS[targetProduct];

        const newCustomer = {
          id: 'cust_' + Math.random().toString(36).substr(2, 9),
          name: namesList[Math.floor(Math.random() * namesList.length)],
          x: ENTRANCE.x,
          y: ENTRANCE.y,
          speed: 1.8 + Math.random() * 0.8,
          color: bodyColors[Math.floor(Math.random() * bodyColors.length)],
          bob: 0,
          bobSpeed: 0.12 + Math.random() * 0.05,
          state: 'entering',
          targetX: 120,
          targetY: 280,
          productId: targetProduct,
          productName: productInfo ? productInfo.name : 'Unknown Item',
          productEmoji: productInfo ? productInfo.emoji : '📦',
          shelfIndex: shelfIndex !== -1 ? shelfIndex : 0,
          shelfX: targetShelf.x,
          shelfY: targetShelf.y + 40,
          pauseTimer: 0,
          bubbleText: `📢 Came for the Ad Sale!`,
          bubbleTimer: 100,
          hasItem: false,
          size: 15,
          targetIndex: 0
        };

        stateRef.current.customers.push(newCustomer);
        setCustomerCount(stateRef.current.customers.length);
      }, i * 400);
    }

    setTimeout(() => {
      setActiveAdBlast(false);
    }, 15000);
  };

  if (!shop) return null;

  return (
    <div ref={containerRef} className="card" style={styles.cardContainer}>
      {/* Visual Canvas Panel Header */}
      <div style={styles.panelHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            🏪 2D Shop Floor Simulation
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Watch AI customers visit shelves, choose products, and pay at the register.
          </span>
        </div>

        <div style={styles.controlsGroup}>
          {/* Theme selector */}
          <div style={styles.themeSelector}>
            <button 
              onClick={() => setActiveTheme('cyberpunk')} 
              style={{
                ...styles.themeBtn,
                ...(activeTheme === 'cyberpunk' ? styles.themeBtnActive : {})
              }}
            >
              Cyberpunk
            </button>
            <button 
              onClick={() => setActiveTheme('arcade')} 
              style={{
                ...styles.themeBtn,
                ...(activeTheme === 'arcade' ? styles.themeBtnActive : {})
              }}
            >
              Retro Arcade
            </button>
          </div>

          {/* Sound toggle button */}
          <button 
            onClick={toggleSound}
            style={styles.controlIconBtn}
            title={soundEnabled ? "Mute Sounds" : "Enable Sounds"}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Main Canvas Element */}
      <div style={styles.canvasWrapper}>
        <canvas ref={canvasRef} style={styles.canvasElement}></canvas>

        {/* Ad Blast Floating Button Action */}
        <div style={styles.floatingActionPanel}>
          <button 
            onClick={triggerAdBlast}
            disabled={stateRef.current.adBlastCooldown > 0 || shop.balance < 50}
            className="btn btn-primary"
            style={{
              ...styles.adBlastBtn,
              ...((stateRef.current.adBlastCooldown > 0 || shop.balance < 50) ? styles.adBlastBtnDisabled : {})
            }}
          >
            📢 Launch Neon Ad Blast (-$50)
            {stateRef.current.adBlastCooldown > 0 && ` (${Math.ceil(stateRef.current.adBlastCooldown)}s)`}
          </button>
        </div>
      </div>

      {/* Live Simulation Stats Panel */}
      <div style={styles.panelFooter}>
        <div style={styles.footerStat}>
          <span style={styles.footerStatLabel}>Customers in Shop</span>
          <span style={styles.footerStatValue} className="text-glow-blue">{customerCount} / 8</span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.footerStatLabel}>Ad Campaign Status</span>
          <span style={{
            ...styles.footerStatValue,
            color: activeAdBlast ? 'var(--accent-green)' : 'var(--text-muted)'
          }}>
            {activeAdBlast ? '🟢 ACTIVE' : '⚪ IDLE'}
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.footerStatLabel}>Marketing Rate</span>
          <span style={styles.footerStatValue} className="text-glow-purple">
            Lv.{shop.upgrades.marketing} ({(15 - (shop.upgrades.marketing - 1) * 2.2).toFixed(1)}s)
          </span>
        </div>
        <div style={styles.footerStat}>
          <span style={styles.footerStatLabel}>Max Attraction markup</span>
          <span style={styles.footerStatValue} className="text-glow-green">
            +{Math.round((UPGRADES.attraction.getMaxPriceMarkup(shop.upgrades.attraction) - 1.0) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  cardContainer: {
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    background: 'rgba(15, 23, 42, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.55)',
    width: '100%',
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.8rem'
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  themeSelector: {
    display: 'flex',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  themeBtn: {
    padding: '0.35rem 0.75rem',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-family-title)',
    color: 'var(--text-secondary)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 'calc(var(--radius-sm) - 1px)',
    transition: 'all var(--transition-fast)'
  },
  themeBtnActive: {
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontWeight: 'bold'
  },
  controlIconBtn: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 'var(--radius-sm)',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: '1rem',
    transition: 'all var(--transition-fast)'
  },
  canvasWrapper: {
    position: 'relative',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.05)',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
  },
  canvasElement: {
    display: 'block',
    width: '100%',
    height: 'auto',
    cursor: 'crosshair'
  },
  floatingActionPanel: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    display: 'flex',
    gap: '0.5rem',
    pointerEvents: 'auto'
  },
  adBlastBtn: {
    fontSize: '0.8rem',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(167, 139, 250, 0.35)',
    background: 'linear-gradient(135deg, var(--accent-purple) 0%, var(--accent-blue) 100%)'
  },
  adBlastBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: '#1e293b',
    color: 'var(--text-muted)',
    boxShadow: 'none'
  },
  panelFooter: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    background: 'rgba(0,0,0,0.2)',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.03)'
  },
  footerStat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '0.15rem'
  },
  footerStatLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  footerStatValue: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)'
  }
};
