// game.ts: Управляет отрисовкой игрового мира в стиле Modern Stylized RPG (2025 Vision).
import { Player, Players, WorldMap, TileType } from './types';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

export const TILE_SIZE = 40;
let world: WorldMap = {};

// Кэш текстур
const textures: Record<string, HTMLCanvasElement> = {};

// --- ГЕНЕРАЦИЯ ТЕКСТУР (High Fidelity) ---

function generateTextures() {
    // 1. Трава (Clean & Uniform)
    const grassC = document.createElement('canvas');
    grassC.width = TILE_SIZE;
    grassC.height = TILE_SIZE;
    const gCtx = grassC.getContext('2d')!;
    
    // Ровный цвет базы (без градиентов) - приятный RPG зеленый
    gCtx.fillStyle = '#4e8c33'; 
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Случайные травинки
    // Рисуем их простыми штрихами, чтобы не перегружать картинку
    const bladeCount = 6; // Количество травинок на тайл
    
    for(let i=0; i<bladeCount; i++) {
        const x = Math.random() * (TILE_SIZE - 4);
        const y = Math.random() * (TILE_SIZE - 6) + 3;
        const h = 3 + Math.random() * 3; // Высота от 3 до 6 пикселей

        // Травинка (Светлее фона)
        gCtx.fillStyle = '#6ab04c'; 
        gCtx.beginPath();
        gCtx.moveTo(x, y);
        gCtx.lineTo(x + 1, y - h); // Верхушка
        gCtx.lineTo(x + 2, y);
        gCtx.fill();
    }

    textures['grass'] = grassC;

    // 2. Вода (Deep & Reflective)
    const waterC = document.createElement('canvas');
    waterC.width = TILE_SIZE;
    waterC.height = TILE_SIZE;
    const wCtx = waterC.getContext('2d')!;

    // Глубокий океанический градиент
    const waterGrad = wCtx.createRadialGradient(TILE_SIZE/2, TILE_SIZE/2, 0, TILE_SIZE/2, TILE_SIZE/2, TILE_SIZE);
    waterGrad.addColorStop(0, '#4FA4F4'); // Светлее в центре
    waterGrad.addColorStop(1, '#2979FF'); // Глубокий синий
    wCtx.fillStyle = waterGrad;
    wCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Волны (Гладкие линии)
    wCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    wCtx.lineWidth = 1.5;
    wCtx.beginPath();
    wCtx.moveTo(5, 10);
    wCtx.quadraticCurveTo(15, 5, 25, 10);
    wCtx.stroke();

    wCtx.beginPath();
    wCtx.moveTo(15, 30);
    wCtx.quadraticCurveTo(25, 25, 35, 30);
    wCtx.stroke();

    textures['water'] = waterC;

    // 3. Камень (Realistic Rock)
    const stoneC = document.createElement('canvas');
    stoneC.width = TILE_SIZE;
    stoneC.height = TILE_SIZE;
    const sCtx = stoneC.getContext('2d')!;
    
    const cx = TILE_SIZE / 2;
    const cy = TILE_SIZE / 2 + 5;

    // Тень
    sCtx.fillStyle = 'rgba(0,0,0,0.3)';
    sCtx.beginPath();
    sCtx.ellipse(cx, cy + 10, 15, 6, 0, 0, Math.PI*2);
    sCtx.fill();

    // Форма камня (Сложная)
    sCtx.beginPath();
    sCtx.moveTo(cx - 15, cy + 5);
    sCtx.lineTo(cx - 10, cy - 10); // Left sharp edge
    sCtx.lineTo(cx, cy - 15);      // Top peak
    sCtx.lineTo(cx + 12, cy - 8);  // Right shoulder
    sCtx.lineTo(cx + 15, cy + 5);  // Right base
    sCtx.lineTo(cx, cy + 10);      // Bottom
    sCtx.closePath();

    // Градиентная заливка
    const rockGrad = sCtx.createLinearGradient(0, 0, TILE_SIZE, TILE_SIZE);
    rockGrad.addColorStop(0, '#90A4AE'); // Light Blue Grey
    rockGrad.addColorStop(1, '#546E7A'); // Dark Blue Grey
    sCtx.fillStyle = rockGrad;
    sCtx.fill();

    // Хайлайты (Трещины/Грани)
    sCtx.fillStyle = 'rgba(255,255,255,0.3)';
    sCtx.beginPath();
    sCtx.moveTo(cx - 10, cy - 10);
    sCtx.lineTo(cx, cy - 15);
    sCtx.lineTo(cx + 5, cy - 5);
    sCtx.fill();

    textures['stone'] = stoneC;

    // 4. ДЕРЕВО (HIGH FANTASY STYLE)
    // Огромное, высокое, детализированное
    const treeW = 140; 
    const treeH = 220; // Очень высокое!
    const treeC = document.createElement('canvas');
    treeC.width = treeW; 
    treeC.height = treeH; 
    const tCtx = treeC.getContext('2d')!;

    const tX = treeW / 2;
    const tBaseY = treeH - 15;

    // Тень от всего дерева
    tCtx.fillStyle = 'rgba(0,0,0,0.25)';
    tCtx.filter = 'blur(6px)';
    tCtx.beginPath();
    tCtx.ellipse(tX, tBaseY - 5, 30, 10, 0, 0, Math.PI*2);
    tCtx.fill();
    tCtx.filter = 'none';

    // Ствол (Реалистичный, темный)
    const trunkGrad = tCtx.createLinearGradient(tX - 15, 0, tX + 15, 0);
    trunkGrad.addColorStop(0, '#3E2723'); // Shadow side
    trunkGrad.addColorStop(0.4, '#5D4037'); // Highlight
    trunkGrad.addColorStop(1, '#251714'); // Dark side
    
    tCtx.fillStyle = trunkGrad;
    tCtx.beginPath();
    // Корни
    tCtx.moveTo(tX - 15, tBaseY); 
    tCtx.quadraticCurveTo(tX - 10, tBaseY - 30, tX - 10, tBaseY - 80); // Left side
    tCtx.lineTo(tX + 10, tBaseY - 80);
    tCtx.quadraticCurveTo(tX + 10, tBaseY - 30, tX + 15, tBaseY); // Right side
    tCtx.fill();

    // КРОНА (Procedural Fluffy Leaves)
    // Рисуем сотню маленьких кружочков, чтобы создать эффект листвы
    const canopyCenterY = tBaseY - 140;
    
    // Функция рисования пучка листвы
    const drawLeafClump = (lx: number, ly: number, size: number, colorBase: string, colorLight: string) => {
        const grad = tCtx.createRadialGradient(lx - size/3, ly - size/3, size/4, lx, ly, size);
        grad.addColorStop(0, colorLight);
        grad.addColorStop(1, colorBase);
        tCtx.fillStyle = grad;
        tCtx.beginPath();
        tCtx.arc(lx, ly, size, 0, Math.PI*2);
        tCtx.fill();
    };

    // Массив позиций для кроны (формируем форму гриба/дерева)
    const layers = [
        { y: 60, w: 50, count: 12, s: 20, c: '#1B5E20', l: '#2E7D32' }, // Bottom Darkest Layer
        { y: 30, w: 55, count: 14, s: 22, c: '#2E7D32', l: '#43A047' }, // Mid Layer
        { y: 0, w: 45, count: 12, s: 24, c: '#43A047', l: '#66BB6A' },  // Upper Layer
        { y: -30, w: 30, count: 8, s: 22, c: '#66BB6A', l: '#A5D6A7' }  // Top Highlights
    ];

    layers.forEach(layer => {
        for(let i=0; i<layer.count; i++) {
            // Случайное смещение внутри слоя
            const offsetX = (Math.random() - 0.5) * layer.w * 2;
            const offsetY = (Math.random() - 0.5) * 20;
            
            drawLeafClump(
                tX + offsetX, 
                canopyCenterY + layer.y + offsetY, 
                layer.s + Math.random()*5, 
                layer.c, 
                layer.l
            );
        }
    });

    textures['tree'] = treeC;
}

/**
 * Инициализация
 */
export function init(canvasElement: HTMLCanvasElement, player: Player) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  
  // Включаем High-Quality Rendering
  if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
  }

  generateTextures();
  generateWorld(player.x, player.y);
}

/**
 * Генерация мира
 */
function generateWorld(playerX: number, playerY: number) {
    world = {}; 
    const playerTileX = Math.floor(playerX / TILE_SIZE);
    const playerTileY = Math.floor(playerY / TILE_SIZE);
    
    const WORLD_RADIUS = 60; 
    for (let x = playerTileX - WORLD_RADIUS; x < playerTileX + WORLD_RADIUS; x++) {
        for (let y = playerTileY - WORLD_RADIUS; y < playerTileY + WORLD_RADIUS; y++) {
            const key = `${x},${y}`;
            const dist = Math.sqrt(Math.pow(playerTileX - x, 2) + Math.pow(playerTileY - y, 2));
            
            if (dist < 4) {
                world[key] = 'grass';
                continue;
            }

            // Шум Перлина (упрощенный) для биомов
            const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.random() * 0.1;
            
            if (noise > 0.65) {
                world[key] = 'water';
            } else if (noise > 0.3 && Math.random() < 0.2) { 
                // Деревья растут группами ("леса")
                world[key] = 'tree';
            } else if (Math.random() < 0.02) {
                world[key] = 'stone';
            } else {
                world[key] = 'grass';
            }
        }
    }
}

export function getTile(tileX: number, tileY: number): TileType {
    return world[`${Math.floor(tileX)},${Math.floor(tileY)}`] || 'grass';
}

export function destroyTile(tileX: number, tileY: number) {
    world[`${tileX},${tileY}`] = 'grass';
}

export function canMoveTo(x: number, y: number, width: number, height: number): boolean {
    const padding = 15; 
    const checkWidth = width - padding;
    const checkHeight = height - padding;

    // Проверка углов хитбокса
    const corners = [
        { x: x - checkWidth / 2, y: y - checkHeight / 2 + 10 }, // Чуть ниже, чтобы ноги были "в мире"
        { x: x + checkWidth / 2, y: y - checkHeight / 2 + 10 },
        { x: x - checkWidth / 2, y: y + checkHeight / 2 }, 
        { x: x + checkWidth / 2, y: y + checkHeight / 2 }, 
    ];

    for (const corner of corners) {
        const tileX = Math.floor(corner.x / TILE_SIZE);
        const tileY = Math.floor(corner.y / TILE_SIZE);
        const tileType = getTile(tileX, tileY);
        // Вода блокирует, деревья и камни блокируют
        if (tileType === 'tree' || tileType === 'stone' || tileType === 'water') {
            return false;
        }
    }
    return true;
}

// --- ОТРИСОВКА ИГРОКА (HERO STYLE) ---

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isLocal: boolean) {
    const x = player.x;
    const y = player.y;

    // Тень под персонажем
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 12, 5, 0, 0, Math.PI*2);
    ctx.fill();

    // Плащ/Накидка (Сзади)
    ctx.fillStyle = isLocal ? '#D32F2F' : '#5D4037'; // Красный плащ для себя
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 5);
    ctx.lineTo(x + 8, y - 5);
    ctx.lineTo(x + 10, y + 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.fill();

    // Тело (Броня)
    ctx.fillStyle = player.color; // Основной цвет (Броня)
    ctx.beginPath();
    ctx.roundRect(x - 9, y - 10, 18, 18, 5);
    ctx.fill();

    // Деталь брони (блик)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 9, y - 10, 18, 8);

    // Голова (Шлем)
    ctx.fillStyle = '#CFD8DC'; // Серебристый
    ctx.beginPath();
    ctx.arc(x, y - 16, 9, 0, Math.PI*2);
    ctx.fill();
    
    // Прорезь шлема
    ctx.fillStyle = '#263238';
    ctx.fillRect(x - 4, y - 18, 8, 3);
    ctx.fillRect(x - 1, y - 18, 2, 8);

    // Оружие (Меч в руке)
    ctx.save();
    ctx.translate(x + 12, y);
    ctx.rotate(Math.PI / 4); // Наклон меча
    
    // Лезвие
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(0, -12, 4, 16);
    // Рукоять
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 4, 4, 6);
    // Гарда
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-3, 2, 10, 2);
    
    ctx.restore();

    // Никнейм
    if (!isLocal) {
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(player.nickname, x, y - 35);
        ctx.shadowBlur = 0;
    }
}

interface RenderObject {
    y: number; // Z-index для сортировки (глубина)
    type: 'tree' | 'stone' | 'player';
    data: any;
}

export function renderGame(players: Players, myId: string) {
  if (!ctx || !canvas) return;
  const me = players[myId];
  if (!me) return;

  // Заливаем фон базовым цветом земли
  ctx.fillStyle = '#4e8c33'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Камера центрируется на игроке
  const cameraX = Math.floor(me.x - canvas.width / 2);
  const cameraY = Math.floor(me.y - canvas.height / 2);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Определяем границы видимости (culling)
  const startTileX = Math.floor(cameraX / TILE_SIZE) - 1;
  const endTileX = startTileX + Math.ceil(canvas.width / TILE_SIZE) + 2;
  const startTileY = Math.floor(cameraY / TILE_SIZE) - 2; // Берем запас сверху для высоких деревьев
  const endTileY = startTileY + Math.ceil(canvas.height / TILE_SIZE) + 4;
  
  const renderList: RenderObject[] = [];

  // 1. СЛОЙ ЗЕМЛИ (Рисуем сразу, без сортировки)
  for (let x = startTileX; x <= endTileX; x++) {
    for (let y = startTileY; y <= endTileY; y++) {
        const type = getTile(x, y);
        const screenX = x * TILE_SIZE;
        const screenY = y * TILE_SIZE;

        if (type === 'water') {
            ctx.drawImage(textures['water'], screenX, screenY);
        } else {
            // Трава везде как подложка
            ctx.drawImage(textures['grass'], screenX, screenY);
        }
        
        // Подготовка объектов для сортировки
        if (type === 'tree') {
            // Дерево 140x220. Центр текстуры по X (70) должен совпасть с центром тайла (20). Смещение: -50.
            // Основание дерева (220-15) должно быть внизу тайла.
            renderList.push({ 
                y: screenY + TILE_SIZE, // Сортируем по низу тайла
                type: 'tree', 
                data: { x: screenX - 50, y: screenY - 180 } // Рисуем сильно выше
            });
        } else if (type === 'stone') {
            renderList.push({ 
                y: screenY + TILE_SIZE, 
                type: 'stone', 
                data: { x: screenX, y: screenY } 
            });
        }
    }
  }

  // 2. ИГРОКИ
  for (const id in players) {
      const p = players[id];
      renderList.push({ y: p.y, type: 'player', data: { player: p, isLocal: id === myId } });
  }

  // 3. СОРТИРОВКА ПО ГЛУБИНЕ (Самое важное для RPG вида)
  renderList.sort((a, b) => a.y - b.y);

  // 4. ОТРИСОВКА ОБЪЕКТОВ
  for (const obj of renderList) {
      if (obj.type === 'tree') {
          // ЛОГИКА ПРОЗРАЧНОСТИ
          // Рассчитываем дистанцию до ЦЕНТРА спрайта дерева, а не до корней.
          // Спрайт 140x220. Центр: x+70, y+110.
          const treeCenterX = obj.data.x + 70;
          const treeCenterY = obj.data.y + 110;

          const dist = Math.sqrt(Math.pow(me.x - treeCenterX, 2) + Math.pow(me.y - treeCenterY, 2));

          // Если игрок внутри визуального радиуса дерева (с запасом)
          const transparencyRadius = 130; 
          
          let alpha = 1.0;
          if (dist < transparencyRadius) {
            // Плавный переход: чем ближе к центру, тем прозрачнее
            alpha = Math.max(0.4, dist / transparencyRadius);
          }

          ctx.globalAlpha = alpha;
          ctx.drawImage(textures['tree'], obj.data.x, obj.data.y);
          ctx.globalAlpha = 1.0; // Сброс прозрачности

      } else if (obj.type === 'stone') {
          ctx.drawImage(textures['stone'], obj.data.x, obj.data.y);
      } else if (obj.type === 'player') {
          drawPlayer(ctx, obj.data.player, obj.data.isLocal);
      }
  }

  // (Optional) Vignette effect для атмосферы
  ctx.restore(); // Возвращаемся к координатам экрана
  
  // Легкая виньетка поверх экрана
  const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.height/3, canvas.width/2, canvas.height/2, canvas.height);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
