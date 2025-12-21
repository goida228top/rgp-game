
// renderer.ts: Отрисовка игрового мира и сущностей
import { TILE_SIZE } from './constants';
import { Player } from './types';
import { gameState } from './state';
import { textures, charSprites, AnimFrame } from './assets';
import { getTileData } from './world';
import { getSelectedItem } from './inventory';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
export let cameraZoom = 1.5; 

// --- CAMERA STATE ---
// Храним текущую позицию камеры отдельно от игрока для плавности
let camX = 0;
let camY = 0;
let isCameraInitialized = false;

// FLOATING TEXT SYSTEM
interface FloatingText {
    x: number;
    y: number;
    text: string;
    life: number; // frames
    maxLife: number;
    color: string;
}
const floatingTexts: FloatingText[] = [];

export function addFloatingText(x: number, y: number, text: string, color: string = '#ffffff') {
    floatingTexts.push({
        x, y, text, life: 60, maxLife: 60, color
    });
}

export function getCameraZoom() {
    return cameraZoom;
}

export function initRenderer(canvasEl: HTMLCanvasElement) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    }
}

export function adjustZoom(deltaY: number) {
    const sensitivity = 0.001;
    cameraZoom -= deltaY * sensitivity;
    if (cameraZoom < 0.8) cameraZoom = 0.8;
    if (cameraZoom > 3.0) cameraZoom = 3.0;
}

// Изменено: теперь принимает isSprinting для ускорения анимации
function getAnimationFrame(isMoving: boolean, isSprinting: boolean): AnimFrame {
    if (!isMoving) return 0;
    
    // Если спринт, анимация в 2 раза быстрее (75мс против 150мс)
    const frameDuration = isSprinting ? 75 : 150;
    
    const now = Date.now();
    const cycle = Math.floor(now / frameDuration) % 4;
    if (cycle === 0) return 0;
    if (cycle === 1) return 1;
    if (cycle === 2) return 0;
    return 2;
}

export function drawCharacterPreview(ctxPreview: CanvasRenderingContext2D, player: Player) {
    const w = ctxPreview.canvas.width;
    const h = ctxPreview.canvas.height;
    ctxPreview.clearRect(0, 0, w, h);
    ctxPreview.save();
    ctxPreview.imageSmoothingEnabled = true;
    ctxPreview.imageSmoothingQuality = 'high';
    ctxPreview.translate(w/2, h/2);
    ctxPreview.scale(1.2, 1.2);
    ctxPreview.translate(-32, -42); 
    if (charSprites['base'] && charSprites['base'][0]) ctxPreview.drawImage(charSprites['base'][0], 0, 0, 64, 84);
    if (player.equipment.legs && charSprites[player.equipment.legs]) ctxPreview.drawImage(charSprites[player.equipment.legs][0], 0, 0, 64, 84);
    if (player.equipment.body && charSprites[player.equipment.body]) ctxPreview.drawImage(charSprites[player.equipment.body][0], 0, 0, 64, 84);
    if (player.equipment.head && charSprites[player.equipment.head]) ctxPreview.drawImage(charSprites[player.equipment.head][0], 0, 0, 64, 84);
    ctxPreview.restore();
}

// Изменено: принимает isSprinting
function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isLocal: boolean, isMoving: boolean, isSprinting: boolean) {
    const tileX = Math.floor(player.x / TILE_SIZE);
    const tileY = Math.floor(player.y / TILE_SIZE);
    const tileData = getTileData(tileX, tileY);
    const isInWater = tileData.terrain === 'water';

    const x = player.x;
    let y = player.y;
    if (isInWater) {
        const waterBob = Math.sin(Date.now() / 400) * 2;
        y += 5 + waterBob; 
    }

    // Передаем спринт в анимацию
    const frame = getAnimationFrame(isMoving, isSprinting);
    const dir = player.direction || 'front';
    const isFlipped = dir === 'right';

    ctx.save();
    ctx.translate(x, y);

    // Никнейм
    if (!isLocal) {
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.nickname, 0, -55);
        ctx.shadowBlur = 0;
    }

    // Тень
    if (!isInWater) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI*2); 
        ctx.fill();
    } else {
        const rippleScale = (Math.sin(Date.now() / 500) + 1) / 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 - rippleScale * 0.2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 12 + rippleScale * 4, 6 + rippleScale * 2, 0, 0, Math.PI*2);
        ctx.stroke();
    }

    if (isFlipped) ctx.scale(-1, 1);
    
    if (isInWater) {
        ctx.beginPath();
        ctx.rect(-40, -100, 80, 100);
        ctx.clip();
    }

    ctx.translate(-32, -60); 

    const w = 64;
    const h = 84;

    if (charSprites['base'] && charSprites['base'][frame]) ctx.drawImage(charSprites['base'][frame], 0, 0, w, h);
    if (player.equipment) {
        if (player.equipment.legs && charSprites[player.equipment.legs]) ctx.drawImage(charSprites[player.equipment.legs][frame], 0, 0, w, h);
        if (player.equipment.body && charSprites[player.equipment.body]) ctx.drawImage(charSprites[player.equipment.body][frame], 0, 0, w, h);
        if (player.equipment.head && charSprites[player.equipment.head]) ctx.drawImage(charSprites[player.equipment.head][frame], 0, 0, w, h);
    }

    // --- ОТРИСОВКА ПРЕДМЕТА НАД ГОЛОВОЙ ---
    if (isLocal) {
        const item = getSelectedItem();
        if (item) {
            const hoverOffset = Math.sin(Date.now() / 300) * 3;
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isFlipped) ctx.scale(-1, 1);
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 10;
            ctx.fillText(item.icon, 32, -15 + hoverOffset); 
            ctx.shadowBlur = 0;
            if (isFlipped) ctx.scale(-1, 1);
        }
    }

    ctx.restore();
}

interface RenderObject {
    y: number; 
    type: 'tree' | 'stone' | 'player' | 'ground_item';
    data: any;
}

// Линейная интерполяция
function lerp(start: number, end: number, t: number) {
    return start * (1 - t) + end * t;
}

// Добавлен аргумент isSprinting
export function renderGame(miningProgress: number = 0, targetX: number = 0, targetY: number = 0, isSprinting: boolean = false) {
  if (!ctx || !canvas) return;
  const me = gameState.players[gameState.localPlayerId];
  if (!me) return;

  // Инициализация камеры при первом старте
  if (!isCameraInitialized) {
      camX = me.x;
      camY = me.y;
      isCameraInitialized = true;
  }

  // --- ЛОГИКА ПЛАВНОЙ КАМЕРЫ ---
  // Если мы бежим (isSprinting), lerpFactor меньше (камера отстает), но теперь 0.08, чтобы не так сильно.
  // Если идем, lerpFactor побольше (камера успевает).
  const lerpFactor = isSprinting ? 0.08 : 0.15;
  
  camX = lerp(camX, me.x, lerpFactor);
  camY = lerp(camY, me.y, lerpFactor);
  // ------------------------------

  const dpr = window.devicePixelRatio || 1;

  ctx.fillStyle = '#4e8c33'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(dpr, dpr);

  const logicalWidth = canvas.width / dpr;
  const logicalHeight = canvas.height / dpr;

  ctx.translate(logicalWidth / 2, logicalHeight / 2);
  ctx.scale(cameraZoom, cameraZoom);
  
  // Используем сглаженные координаты камеры, а не жесткие me.x/me.y
  ctx.translate(-camX, -camY);

  // Используем camX/camY для расчета видимой области
  const viewW = logicalWidth / cameraZoom;
  const viewH = logicalHeight / cameraZoom;
  const startTileX = Math.floor((camX - viewW/2) / TILE_SIZE) - 1;
  const endTileX = Math.floor((camX + viewW/2) / TILE_SIZE) + 2;
  const startTileY = Math.floor((camY - viewH/2) / TILE_SIZE) - 2; 
  const endTileY = Math.floor((camY + viewH/2) / TILE_SIZE) + 4;
  
  const renderList: RenderObject[] = [];

  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
        const screenX = x * TILE_SIZE;
        const screenY = y * TILE_SIZE;
        
        const tileData = getTileData(x, y);
        
        if (tileData.terrain === 'water') {
            ctx.drawImage(textures['water'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        } else {
            ctx.drawImage(textures['grass'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        }
        
        if (gameState.showDebugGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${x},${y}`, screenX + TILE_SIZE/2, screenY + TILE_SIZE/2);
        }

        if (gameState.useTestWorld && !gameState.showDebugGrid) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tileData.object === 'tree') {
            renderList.push({ y: screenY + TILE_SIZE, type: 'tree', data: { x: screenX - 50, y: screenY - 180 } });
        } else if (tileData.object === 'stone') {
            renderList.push({ y: screenY + TILE_SIZE, type: 'stone', data: { x: screenX, y: screenY } });
        } else if (tileData.object === 'high_grass') {
            ctx.drawImage(textures['high_grass'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tileData.items.length > 0) {
            tileData.items.forEach((itemType, index) => {
                let offsetX = TILE_SIZE / 2;
                let offsetY = TILE_SIZE / 2;
                let rotation = 0;

                if (!gameState.showDebugGrid) {
                     const seed = x * 1000 + y + index * 50;
                     offsetX += Math.sin(seed) * (TILE_SIZE / 4);
                     offsetY += Math.cos(seed) * (TILE_SIZE / 4);
                     rotation = Math.sin(seed * 0.1) * Math.PI;
                }

                renderList.push({ 
                    y: screenY + offsetY, 
                    type: 'ground_item', 
                    data: { 
                        x: screenX + offsetX, 
                        y: screenY + offsetY, 
                        type: itemType, 
                        rotation: rotation 
                    } 
                });
            });
        }
    }
  }

  for (const id in gameState.players) {
      const p = gameState.players[id];
      const isLocal = id === gameState.localPlayerId;
      // Определяем, движется ли этот игрок. 
      // Для локального берем из window.isLocalMoving.
      // Для остальных (сетевых) пока считаем false или можно доработать логику интерполяции.
      const isMoving = isLocal ? (window as any).isLocalMoving : false; 
      
      // Считаем спринт только для локального (для сети нужно передавать флаг спринта в Player)
      const pSprint = isLocal ? isSprinting : false; 

      renderList.push({ y: p.y, type: 'player', data: { player: p, isLocal: isLocal, isMoving: isMoving, isSprinting: pSprint } });
  }

  renderList.sort((a, b) => a.y - b.y);

  for (const obj of renderList) {
      if (obj.type === 'tree') {
          const treeCenterX = obj.data.x + 70;
          const treeCenterY = obj.data.y + 110;
          const dist = Math.sqrt(Math.pow(me.x - treeCenterX, 2) + Math.pow(me.y - treeCenterY, 2));
          
          ctx.drawImage(textures['tree_trunk'], obj.data.x, obj.data.y, 140, 220);
          
          const transparencyRadius = 220; 
          let alpha = 1.0;
          if (dist < transparencyRadius) alpha = Math.max(0.3, dist / transparencyRadius);
          
          ctx.globalAlpha = alpha;
          ctx.drawImage(textures['tree_canopy'], obj.data.x, obj.data.y, 140, 220);
          ctx.globalAlpha = 1.0; 

      } else if (obj.type === 'stone') {
          const stoneSize = TILE_SIZE * 1.5;
          const offset = (stoneSize - TILE_SIZE) / 2;
          ctx.drawImage(textures['stone'], obj.data.x - offset, obj.data.y - offset, stoneSize, stoneSize);
      } else if (obj.type === 'player') {
          drawPlayer(ctx, obj.data.player, obj.data.isLocal, obj.data.isMoving, obj.data.isSprinting);
      } else if (obj.type === 'ground_item') {
          const item = obj.data;
          ctx.save();
          ctx.translate(item.x, item.y);
          ctx.rotate(item.rotation);
          const tex = (item.type === 'stick' || item.type === 'wood') ? textures['ground_twig'] : textures['ground_pebble'];
          if (tex) {
              const w = (item.type === 'stick' || item.type === 'wood') ? 32 : 16;
              const h = (item.type === 'stick' || item.type === 'wood') ? 32 : 16;
              ctx.drawImage(tex, -w/2, -h/2, w, h);
          }
          ctx.restore();
      }
  }

  if (miningProgress > 0) {
      const barW = 40;
      const barH = 6;
      const worldX = targetX * TILE_SIZE + TILE_SIZE / 2;
      const worldY = targetY * TILE_SIZE; 

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(worldX - barW/2, worldY - 15, barW, barH);
      
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(worldX - barW/2 + 1, worldY - 14, (barW - 2) * miningProgress, barH - 2);
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.life--;
      ft.y -= 0.5; 
      
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
  ctx.restore(); 
}
