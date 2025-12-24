
// renderer.ts: Отрисовка игрового мира и сущностей
import { TILE_SIZE } from './constants';
import { Player } from './types';
import { gameState } from './state';
import { textures, charSprites, AnimFrame } from './assets';
import { getTileData, isPositionInWater, canPlaceObject, getInteractionType } from './world';
import { getSelectedItem } from './inventory';
import { inputState } from './input';
import { placementRotation } from './interaction'; 

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
export let cameraZoom = 1.5; 

let camX = 0;
let camY = 0;
let isCameraInitialized = false;
let snapFrames = 0; // Счетчик кадров для принудительной центровки

interface FloatingText {
    x: number; y: number; text: string; life: number; maxLife: number; color: string;
}
const floatingTexts: FloatingText[] = [];

export function addFloatingText(x: number, y: number, text: string, color: string = '#ffffff') {
    floatingTexts.push({ x, y, text, life: 60, maxLife: 60, color });
}

export function getCameraZoom() { return cameraZoom; }

export function initRenderer(canvasEl: HTMLCanvasElement) {
    canvas = canvasEl; ctx = canvas.getContext('2d');
    if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
}

export function resetCamera(x: number, y: number) {
    camX = x;
    camY = y;
    isCameraInitialized = true;
    snapFrames = 120; // 2 секунды (при 60fps) жесткой привязки
}

export function adjustZoom(deltaY: number) {
    cameraZoom -= deltaY * 0.001;
    if (cameraZoom < 0.8) cameraZoom = 0.8;
    if (cameraZoom > 3.0) cameraZoom = 3.0;
}

function getAnimationFrame(isMoving: boolean, isSprinting: boolean): AnimFrame {
    if (!isMoving) return 0;
    const frameDuration = isSprinting ? 75 : 150;
    const now = Date.now();
    const cycle = Math.floor(now / frameDuration) % 4;
    return (cycle === 3) ? 2 : (cycle as AnimFrame);
}

export function drawCharacterPreview(ctxPreview: CanvasRenderingContext2D, player: Player) {
    const w = ctxPreview.canvas.width; const h = ctxPreview.canvas.height;
    ctxPreview.clearRect(0, 0, w, h); ctxPreview.save(); ctxPreview.translate(w/2, h/2); ctxPreview.scale(1.2, 1.2); ctxPreview.translate(-32, -42); 
    
    // Выбираем спрайт по цвету игрока
    const baseKey = `base_${player.color}`;
    const baseSprite = (charSprites[baseKey] && charSprites[baseKey][0]) ? charSprites[baseKey][0] : (charSprites['base_#FFFFFF'] ? charSprites['base_#FFFFFF'][0] : charSprites['base'][0]);
    
    if (baseSprite) ctxPreview.drawImage(baseSprite, 0, 0, 64, 84);
    
    if (player.equipment.legs && charSprites[player.equipment.legs]) ctxPreview.drawImage(charSprites[player.equipment.legs][0], 0, 0, 64, 84);
    if (player.equipment.body && charSprites[player.equipment.body]) ctxPreview.drawImage(charSprites[player.equipment.body][0], 0, 0, 64, 84);
    if (player.equipment.head && charSprites[player.equipment.head]) ctxPreview.drawImage(charSprites[player.equipment.head][0], 0, 0, 64, 84);
    ctxPreview.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isLocal: boolean, isMoving: boolean, isSprinting: boolean) {
    const isInWater = isPositionInWater(player.x, player.y);
    const x = player.x; let y = player.y;
    if (isInWater) y += 5 + Math.sin(Date.now() / 400) * 2; 
    const frame = getAnimationFrame(isMoving, isSprinting);
    const dir = player.direction || 'front';
    const isFlipped = dir === 'right';
    ctx.save(); ctx.translate(x, y);
    if (!isLocal) {
        ctx.fillStyle = '#FFFFFF'; ctx.shadowColor = 'black'; ctx.shadowBlur = 4; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(player.nickname, 0, -55); ctx.shadowBlur = 0;
    }
    if (!isInWater) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 12, 16, 6, 0, 0, Math.PI*2); ctx.fill(); }
    else {
        const ripple = (Math.sin(Date.now() / 500) + 1) / 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 - ripple * 0.2})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 12 + ripple * 4, 6 + ripple * 2, 0, 0, Math.PI*2); ctx.stroke();
    }
    if (isFlipped) ctx.scale(-1, 1);
    if (isInWater) { ctx.beginPath(); ctx.rect(-40, -100, 80, 100); ctx.clip(); }
    ctx.translate(-32, -60); 

    // Выбираем правильный спрайт базы на основе цвета игрока
    const baseKey = `base_${player.color}`;
    // Fallback: если цвет не найден (например, старый кеш), берем белый
    const baseSpriteSet = charSprites[baseKey] || charSprites['base_#FFFFFF'] || charSprites['base'];
    
    if (baseSpriteSet && baseSpriteSet[frame]) ctx.drawImage(baseSpriteSet[frame], 0, 0, 64, 84);
    
    if (player.equipment) {
        if (player.equipment.legs && charSprites[player.equipment.legs]) ctx.drawImage(charSprites[player.equipment.legs][frame], 0, 0, 64, 84);
        if (player.equipment.body && charSprites[player.equipment.body]) ctx.drawImage(charSprites[player.equipment.body][frame], 0, 0, 64, 84);
        if (player.equipment.head && charSprites[player.equipment.head]) ctx.drawImage(charSprites[player.equipment.head][frame], 0, 0, 64, 84);
    }
    if (isLocal) {
        const item = getSelectedItem();
        if (item) {
            ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
            
            // Если персонаж развернут, нужно развернуть текст обратно,
            // но при этом скорректировать координату X, так как система координат смещена
            if (isFlipped) {
                ctx.scale(-1, 1);
                // В развернутой системе координат центр спрайта смещается
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; 
                ctx.fillText(item.icon, -32, -15 + Math.sin(Date.now() / 300) * 3); 
                ctx.shadowBlur = 0;
            } else {
                ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 10; 
                ctx.fillText(item.icon, 32, -15 + Math.sin(Date.now() / 300) * 3); 
                ctx.shadowBlur = 0;
            }
        }
    }
    ctx.restore();
}

interface RenderObject { y: number; type: string; data: any; }

function lerp(start: number, end: number, t: number) { return start * (1 - t) + end * t; }

export function renderGame(miningProgress: number = 0, targetX: number = 0, targetY: number = 0, isSprinting: boolean = false) {
  if (!ctx || !canvas) return;
  const me = gameState.players[gameState.localPlayerId];
  if (!me) return;
  
  // --- ЛОГИКА КАМЕРЫ (АГРЕССИВНАЯ) ---

  // Если камера не инициализирована или идет фаза "приклеивания" (snapFrames > 0)
  if (!isCameraInitialized || snapFrames > 0) {
      camX = me.x;
      camY = me.y;
      isCameraInitialized = true;
      if (snapFrames > 0) snapFrames--;
  } else {
      // Проверка дистанции: если игрок слишком далеко (например, телепорт или лаг) - мгновенный прыжок
      // 300 пикселей - это чуть меньше половины экрана по вертикали, надежный порог
      const dist = Math.sqrt((camX - me.x)**2 + (camY - me.y)**2);
      
      // Защита от "нулевого бага": если камера в 0,0, а игрок далеко - прыгаем
      const isZeroBug = (Math.abs(camX) < 1 && Math.abs(camY) < 1 && (Math.abs(me.x) > 50 || Math.abs(me.y) > 50));
      
      if (dist > 300 || isZeroBug) { 
          camX = me.x; 
          camY = me.y; 
      } else {
          // Иначе плавное слежение
          const lerpFactor = isSprinting ? 0.1 : 0.15; // Чуть быстрее для спринта
          camX = lerp(camX, me.x, lerpFactor); 
          camY = lerp(camY, me.y, lerpFactor);
      }
  }

  // Защита от NaN (если координаты игрока пришли битые)
  if (isNaN(camX)) camX = me.x;
  if (isNaN(camY)) camY = me.y;

  const dpr = window.devicePixelRatio || 1;
  
  // ФОН: Если тестовый мир - белый/серый, иначе зеленый
  ctx.fillStyle = gameState.useTestWorld ? '#e2e8f0' : '#4e8c33'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  ctx.scale(dpr, dpr);
  // Используем размеры канваса для точного центрирования
  const logicalWidth = canvas.width / dpr; 
  const logicalHeight = canvas.height / dpr;
  
  ctx.translate(Math.floor(logicalWidth / 2), Math.floor(logicalHeight / 2));
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-Math.floor(camX), -Math.floor(camY)); // Округляем для четкости пикселей

  const viewW = logicalWidth / cameraZoom, viewH = logicalHeight / cameraZoom;
  const startTileX = Math.floor((camX - viewW/2) / TILE_SIZE) - 1;
  const endTileX = Math.floor((camX + viewW/2) / TILE_SIZE) + 2;
  const startTileY = Math.floor((camY - viewH/2) / TILE_SIZE) - 2; 
  const endTileY = Math.floor((camY + viewH/2) / TILE_SIZE) + 4;
  
  const renderList: RenderObject[] = [];

  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
        const screenX = x * TILE_SIZE, screenY = y * TILE_SIZE;
        const tileData = getTileData(x, y);
        
        // РЕНДЕРИНГ ПОВЕРХНОСТИ
        if (tileData.terrain === 'water') {
            ctx.drawImage(textures['water'], screenX, screenY, TILE_SIZE, TILE_SIZE);
            
            // --- ЛОГИКА БЕРЕГОВ (СКРУГЛЕНИЯ) ---
            const isN = getTileData(x, y - 1).terrain === 'grass';
            const isS = getTileData(x, y + 1).terrain === 'grass';
            const isW = getTileData(x - 1, y).terrain === 'grass';
            const isE = getTileData(x + 1, y).terrain === 'grass';

            if (isN && isW) ctx.drawImage(textures['mask_corner_tl'], screenX, screenY, TILE_SIZE, TILE_SIZE);
            if (isN && isE) ctx.drawImage(textures['mask_corner_tr'], screenX, screenY, TILE_SIZE, TILE_SIZE);
            if (isS && isW) ctx.drawImage(textures['mask_corner_bl'], screenX, screenY, TILE_SIZE, TILE_SIZE);
            if (isS && isE) ctx.drawImage(textures['mask_corner_br'], screenX, screenY, TILE_SIZE, TILE_SIZE);

            const waveHash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
            if ((waveHash - Math.floor(waveHash)) > 0.85) ctx.drawImage(textures['water_wave'], screenX, screenY + Math.sin(Date.now() / 500) * 2, TILE_SIZE, TILE_SIZE);
        } else if (!gameState.useTestWorld) {
            ctx.drawImage(textures['grass'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tileData.floor === 'wood') ctx.drawImage(textures['floor_wood'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        
        if (gameState.showDebugGrid || gameState.useTestWorld) {
            ctx.strokeStyle = gameState.useTestWorld ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'; 
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }

        if (tileData.object === 'tree') renderList.push({ y: screenY + 35, type: 'tree', data: { x: screenX - 50, y: screenY - 180 } });
        else if (tileData.object === 'stone') renderList.push({ y: screenY + 30, type: 'stone', data: { x: screenX, y: screenY } });
        else if (tileData.object === 'big_rock') renderList.push({ y: screenY + 38, type: 'big_rock', data: { x: screenX - 30, y: screenY - 40 } });
        else if (tileData.object === 'workbench') renderList.push({ y: screenY + 30, type: 'workbench', data: { x: screenX, y: screenY } });
        else if (tileData.object === 'high_grass') ctx.drawImage(textures['high_grass'], screenX, screenY, TILE_SIZE, TILE_SIZE);
        else if (tileData.object.startsWith('wall_wood') || tileData.object.startsWith('door_wood')) {
             let sortY = screenY + TILE_SIZE; if (tileData.object.includes('_t')) sortY = screenY + 10;
             let angle = 0; if (tileData.object.startsWith('door_wood')) { const k = `${x},${y}`; if (gameState.doorStates[k]) angle = gameState.doorStates[k].angle; }
             renderList.push({ y: sortY, type: tileData.object.startsWith('door_wood') ? 'door' : 'wall', data: { x: screenX, y: screenY, tex: textures[tileData.object], angle, subType: tileData.object.split('_').pop() } });
        }
        tileData.items.forEach((item, i) => {
            const seed = x * 1000 + y + i * 50;
            renderList.push({ y: screenY + TILE_SIZE/2, type: 'ground_item', data: { x: screenX + TILE_SIZE/2 + Math.sin(seed)*10, y: screenY + TILE_SIZE/2 + Math.cos(seed)*10, type: item, rotation: Math.sin(seed*0.1)*Math.PI } });
        });
    }
  }
  for (const id in gameState.players) renderList.push({ y: gameState.players[id].y + 12, type: 'player', data: { player: gameState.players[id], isLocal: id === gameState.localPlayerId, isMoving: id === gameState.localPlayerId ? (window as any).isLocalMoving : false, isSprinting: id === gameState.localPlayerId ? isSprinting : false } });
  renderList.sort((a, b) => a.y - b.y);

  for (const obj of renderList) {
      if (obj.type === 'tree') {
          const dist = Math.sqrt((me.x - (obj.data.x + 70))**2 + (me.y - (obj.data.y + 110))**2);
          ctx.drawImage(textures['tree_trunk'], obj.data.x, obj.data.y, 140, 220);
          if (dist < 220 && me.y < obj.y) ctx.globalAlpha = 0.4;
          ctx.drawImage(textures['tree_canopy'], obj.data.x, obj.data.y, 140, 220); ctx.globalAlpha = 1.0; 
      } else if (obj.type === 'stone') ctx.drawImage(textures['stone'], obj.data.x - 10, obj.data.y - 10, TILE_SIZE*1.5, TILE_SIZE*1.5);
      else if (obj.type === 'big_rock') ctx.drawImage(textures['big_rock'], obj.data.x, obj.data.y, 100, 80);
      else if (obj.type === 'wall') ctx.drawImage(obj.data.tex, obj.data.x, obj.data.y, TILE_SIZE, TILE_SIZE);
      else if (obj.type === 'door') {
          ctx.save(); const { x, y, angle, subType } = obj.data;
          // Убран минус перед углом для типов 'b' и 'r', чтобы они открывались в правильную сторону от игрока
          if (subType === 't') { ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(obj.data.tex, 0, 0, TILE_SIZE, TILE_SIZE); }
          else if (subType === 'b') { ctx.translate(x, y + TILE_SIZE); ctx.rotate(angle); ctx.drawImage(obj.data.tex, 0, -TILE_SIZE, TILE_SIZE, TILE_SIZE); }
          else if (subType === 'l') { ctx.translate(x, y); ctx.rotate(angle); ctx.drawImage(obj.data.tex, 0, 0, TILE_SIZE, TILE_SIZE); }
          else if (subType === 'r') { ctx.translate(x + TILE_SIZE, y); ctx.rotate(angle); ctx.drawImage(obj.data.tex, -TILE_SIZE, 0, TILE_SIZE, TILE_SIZE); }
          ctx.restore();
      } else if (obj.type === 'workbench') ctx.drawImage(textures['workbench'], obj.data.x, obj.data.y, TILE_SIZE, TILE_SIZE);
      else if (obj.type === 'player') drawPlayer(ctx, obj.data.player, obj.data.isLocal, obj.data.isMoving, obj.data.isSprinting);
      else if (obj.type === 'ground_item') {
          const item = obj.data; ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(item.rotation);
          const tex = (item.type === 'stick' || item.type === 'wood') ? textures['ground_twig'] : textures['ground_pebble'];
          if (tex) { const w = (item.type === 'stick' || item.type === 'wood') ? 32 : 16; ctx.drawImage(tex, -w/2, -w/2, w, w); }
          ctx.restore();
      }
  }

  // --- DAY/NIGHT OVERLAY ---
  ctx.restore(); // Выходим из мировых координат для полноэкранного фильтра
  ctx.save();
  const time = gameState.worldTime;
  let nightAlpha = 0;
  if (!gameState.useTestWorld && time > 14000 && time < 22000) { // В тестовом мире всегда день
      if (time < 18000) nightAlpha = (time - 14000) / 4000;
      else nightAlpha = 1 - (time - 18000) / 4000;
  }
  if (nightAlpha > 0) {
      const maxNight = 0.65;
      ctx.fillStyle = `rgba(10, 10, 40, ${nightAlpha * maxNight})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Легкое свечение вокруг игрока
      const gradient = ctx.createRadialGradient(logicalWidth/2, logicalHeight/2, 0, logicalWidth/2, logicalHeight/2, 200);
      gradient.addColorStop(0, 'rgba(255, 255, 200, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();

  // Возвращаемся в мировые координаты для UI элементов над миром (прогресс добычи и т.д.)
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(Math.floor(logicalWidth / 2), Math.floor(logicalHeight / 2));
  ctx.scale(cameraZoom, cameraZoom);
  ctx.translate(-Math.floor(camX), -Math.floor(camY));

  if (miningProgress > 0) {
      const worldX = targetX * TILE_SIZE + TILE_SIZE / 2, worldY = targetY * TILE_SIZE; 
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(worldX - 20, worldY - 15, 40, 6);
      ctx.fillStyle = '#4ade80'; ctx.fillRect(worldX - 20 + 1, worldY - 14, 38 * miningProgress, 4);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i]; ft.life--; ft.y -= 0.5; ctx.globalAlpha = ft.life / ft.maxLife;
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.strokeText(ft.text, ft.x, ft.y); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y);
      ctx.globalAlpha = 1.0; if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
  ctx.restore(); 
}
