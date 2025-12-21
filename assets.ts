
// assets.ts: Генерация графических ресурсов (текстуры, спрайты)
import { TILE_SIZE } from './constants';

// Глобальный множитель разрешения. 
// Снижено до 2x для оптимизации. 4x слишком тяжело для Canvas 2D API при большом разрешении экрана.
const RES = 2; 

// Кэш текстур
export const textures: Record<string, HTMLCanvasElement> = {};
// Кэш спрайтов: [partName][AnimFrame] -> Canvas
export type AnimFrame = 0 | 1 | 2;
export const charSprites: Record<string, HTMLCanvasElement[]> = {};

/**
 * Создает Canvas увеличенного разрешения, но с настроенным контекстом масштабирования.
 * Это позволяет использовать те же координаты рисования (например, 10, 20),
 * но получать четкую картинку высокого разрешения.
 */
function createHiResCanvas(logicalW: number, logicalH: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = logicalW * RES;
    c.height = logicalH * RES;
    const ctx = c.getContext('2d')!;
    ctx.scale(RES, RES); // Масштабируем систему координат
    return [c, ctx];
}

/**
 * Рисует кадр человека.
 * Стиль: 3/4 вид (45 градусов).
 * Худое телосложение, небольшой зазор между ногами, руки МАКСИМАЛЬНО прижаты.
 */
function drawHumanFrame(ctx: CanvasRenderingContext2D, frame: AnimFrame, part: string) {
    const cx = 32; // Центр X (Canvas 64px)
    
    // Пропорции (ХУДЕЕ)
    const headRadius = 10;
    const headY = 20;
    
    const bodyW = 16;
    const bodyH = 24;
    const bodyY = headY + 8; 
    
    // НОГИ
    const legW = 5;
    const legH = 22;
    const legY = bodyY + bodyH - 2; 
    const legGap = 1;

    // Анимация ходьбы
    let leftLegY = legY;
    let rightLegY = legY;
    let leftArmAngle = 0;
    let rightArmAngle = 0;
    let bodyBob = 0;

    // frame 0 = idle, 1 = walk 1, 2 = walk 2
    if (frame === 1) { 
        leftLegY -= 4; 
        rightLegY += 0;
        leftArmAngle = -0.5; 
        rightArmAngle = 0.5;
        bodyBob = -1;
    } else if (frame === 2) { 
        leftLegY += 0;
        rightLegY -= 4; 
        leftArmAngle = 0.5;
        rightArmAngle = -0.5;
        bodyBob = -1;
    }

    const currentBodyY = bodyY + bodyBob;
    const currentHeadY = headY + bodyBob;

    // Цвета
    const skinColor = '#ffdbac';
    const pantsColor = '#1e293b'; 
    const shirtColor = '#3b82f6'; 
    const shoesColor = '#0f172a';

    // Функция рисования конечности
    const drawLimb = (x: number, y: number, w: number, h: number, angle: number, color: string) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(-w/2, 0, w, h, w/2);
        ctx.fill();
        ctx.restore();
    };

    // --- БАЗОВОЕ ТЕЛО ---
    if (part === 'base') {
        // 1. НОГИ
        const leftLegX = cx - legGap - legW;
        ctx.fillStyle = pantsColor;
        ctx.beginPath();
        ctx.roundRect(leftLegX, leftLegY, legW, legH, 3);
        ctx.fill();
        ctx.fillStyle = shoesColor;
        ctx.beginPath();
        ctx.roundRect(leftLegX, leftLegY + legH - 4, legW, 6, 2);
        ctx.fill();

        const rightLegX = cx + legGap;
        ctx.fillStyle = pantsColor;
        ctx.beginPath();
        ctx.roundRect(rightLegX, rightLegY, legW, legH, 3);
        ctx.fill();
        ctx.fillStyle = shoesColor;
        ctx.beginPath();
        ctx.roundRect(rightLegX, rightLegY + legH - 4, legW, 6, 2);
        ctx.fill();

        // 2. Левая рука (Задний план)
        // Сдвигаем внутрь еще сильнее: +3
        drawLimb(cx - bodyW/2 + 3, currentBodyY + 4, 6, 20, leftArmAngle, skinColor);
        drawLimb(cx - bodyW/2 + 3, currentBodyY + 4, 6, 7, leftArmAngle, shirtColor);

        // 3. Туловище
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.roundRect(cx - bodyW/2, currentBodyY, bodyW, bodyH, 6);
        ctx.fill();

        // 4. Голова
        ctx.fillStyle = skinColor;
        ctx.beginPath();
        ctx.arc(cx, currentHeadY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Блик
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(cx - 3, currentHeadY - 3, 3, 1.5, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // 5. Правая рука (Передний план)
        // Сдвигаем внутрь еще сильнее: -3
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 20, rightArmAngle, skinColor);
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 7, rightArmAngle, shirtColor);
    }

    // --- БРОНЯ (УПРОЩЕННАЯ) ---
    const armorColorLight = '#9ca3af'; // Светло-серый металл
    const armorColorDark = '#4b5563';  // Темно-серый металл (для ног)

    if (part === 'armor_iron_head') {
        ctx.fillStyle = armorColorLight;
        ctx.beginPath();
        // Просто перекрываем верхнюю половину головы (полусфера)
        ctx.arc(cx, currentHeadY, headRadius + 1, Math.PI, 0, false);
        ctx.fill();
    }
    
    if (part === 'armor_iron_body') {
        ctx.fillStyle = armorColorLight;
        ctx.beginPath();
        // Просто заливаем туловище одним цветом
        ctx.roundRect(cx - bodyW/2, currentBodyY, bodyW, bodyH, 6);
        ctx.fill();
        
        // ПЕРЕРИСОВЫВАЕМ ПРАВУЮ РУКУ
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 20, rightArmAngle, skinColor);
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 7, rightArmAngle, shirtColor);
    }
    
    if (part === 'armor_iron_legs') {
        ctx.fillStyle = armorColorDark;
        
        // Броня должна идти от legY до legY + legH - 4
        const shoeOffset = 4;
        const armorHeight = legH - shoeOffset;

        const leftLegX = cx - legGap - legW;
        ctx.beginPath(); 
        ctx.roundRect(leftLegX, leftLegY, legW, armorHeight, 2); 
        ctx.fill();
        
        const rightLegX = cx + legGap;
        ctx.beginPath(); 
        ctx.roundRect(rightLegX, rightLegY, legW, armorHeight, 2); 
        ctx.fill();
    }
}

function generateHumanSprites() {
    const w = 64; 
    const h = 84;
    const parts = ['base', 'armor_iron_head', 'armor_iron_body', 'armor_iron_legs'];
    const frames: AnimFrame[] = [0, 1, 2];

    parts.forEach(part => {
        charSprites[part] = [];
        frames.forEach(frame => {
            const [c, ctx] = createHiResCanvas(w, h);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            drawHumanFrame(ctx, frame, part);
            charSprites[part][frame] = c;
        });
    });
}

// Генерация масок для углов воды (ДИАГОНАЛЬНОЕ ОБРЕЗАНИЕ)
function generateWaterMasks() {
    const corners = ['tl', 'tr', 'bl', 'br'];
    
    corners.forEach(corner => {
        const [c, ctx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
        
        // Настраиваем цвет травы
        ctx.fillStyle = '#4e8c33';
        
        ctx.beginPath();
        
        // Логика: Разрезаем квадрат по диагонали на 2 треугольника.
        // Заливаем тот треугольник, который прилегает к суше.
        
        if (corner === 'tl') {
            // Маска для ВЕРХНЕГО ЛЕВОГО угла.
            ctx.moveTo(0, 0);           // Top Left
            ctx.lineTo(TILE_SIZE, 0);   // Top Right
            ctx.lineTo(0, TILE_SIZE);   // Bottom Left
        } 
        else if (corner === 'tr') {
            // Маска для ВЕРХНЕГО ПРАВОГО угла.
            ctx.moveTo(0, 0);           // Top Left
            ctx.lineTo(TILE_SIZE, 0);   // Top Right
            ctx.lineTo(TILE_SIZE, TILE_SIZE); // Bottom Right
        }
        else if (corner === 'bl') {
            // Маска для НИЖНЕГО ЛЕВОГО угла.
            ctx.moveTo(0, 0);           // Top Left
            ctx.lineTo(0, TILE_SIZE);   // Bottom Left
            ctx.lineTo(TILE_SIZE, TILE_SIZE); // Bottom Right
        }
        else if (corner === 'br') {
            // Маска для НИЖНЕГО ПРАВОГО угла.
            ctx.moveTo(TILE_SIZE, 0);   // Top Right
            ctx.lineTo(TILE_SIZE, TILE_SIZE); // Bottom Right
            ctx.lineTo(0, TILE_SIZE);   // Bottom Left
        }
        
        ctx.closePath();
        ctx.fill();
        
        // Добавляем шум на траву (только внутри нарисованной фигуры)
        ctx.save();
        ctx.clip(); 
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for(let i=0; i<10; i++) {
             ctx.fillRect(Math.random()*TILE_SIZE, Math.random()*TILE_SIZE, 2, 2);
        }
        ctx.restore();

        // УБРАНА ОТРИСОВКА ОБВОДКИ (ctx.stroke)

        textures[`mask_corner_${corner}`] = c;
    });
}

export function generateAssets() {
    // 1. Обычная трава (Однотонная)
    const [grassC, gCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    // Просто заливка без деталей
    gCtx.fillStyle = '#4e8c33'; 
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Чуть-чуть шума для текстуры
    gCtx.fillStyle = 'rgba(255,255,255,0.03)';
    for(let i=0; i<5; i++) {
        gCtx.fillRect(Math.random()*TILE_SIZE, Math.random()*TILE_SIZE, 2, 2);
    }
    textures['grass'] = grassC;

    // 1.1 Высокая трава (High Grass) - ПРОЗРАЧНАЯ
    const [hGrassC, hgCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    
    const bladeCount = 8; 
    for(let i=0; i<bladeCount; i++) {
        const x = Math.random() * (TILE_SIZE - 4);
        const y = Math.random() * (TILE_SIZE - 6) + 3;
        const h = 5 + Math.random() * 6;
        hgCtx.fillStyle = '#6ab04c'; 
        hgCtx.beginPath(); 
        hgCtx.ellipse(x, y, 1.5, h/2, 0, 0, Math.PI*2); 
        hgCtx.fill();
        hgCtx.strokeStyle = '#3a6629';
        hgCtx.lineWidth = 0.5;
        hgCtx.stroke();
    }
    textures['high_grass'] = hGrassC;

    // 2. Вода (Сплошной цвет)
    const [waterC, wCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    wCtx.fillStyle = '#3b82f6'; // Однотонный ярко-голубой
    wCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    textures['water'] = waterC;

    // 2.1 Текстура ВОЛНЫ (Отдельный оверлей)
    const [waveC, waveCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    waveCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Белая полупрозрачная
    waveCtx.lineWidth = 2;
    waveCtx.lineCap = 'round';
    waveCtx.beginPath();
    // Рисуем маленькую аккуратную волну в центре
    waveCtx.moveTo(12, 22);
    waveCtx.quadraticCurveTo(20, 18, 28, 22);
    waveCtx.stroke();
    textures['water_wave'] = waveC;

    generateWaterMasks(); // Генерируем маски

    // 3. Камень (Big Stone Node) - 1.5x size
    const stoneSize = TILE_SIZE * 1.5; // 60px
    const [stoneC, sCtx] = createHiResCanvas(stoneSize, stoneSize);
    
    // Scale up rendering context so we draw a bigger vector stone.
    
    const cx = stoneSize / 2; const cy = stoneSize / 2 + 5;
    
    // Рисуем камень чуть больше (векторно)
    sCtx.translate(cx, cy);
    sCtx.scale(1.5, 1.5); // 1.5x от базового размера тайла
    sCtx.translate(-TILE_SIZE/2, -(TILE_SIZE/2 + 5));

    const cxBase = TILE_SIZE / 2; 
    const cyBase = TILE_SIZE / 2 + 5;

    // Тень камня
    sCtx.fillStyle = 'rgba(0,0,0,0.2)'; 
    sCtx.beginPath(); 
    sCtx.ellipse(cxBase, cyBase + 5, 8, 3, 0, 0, Math.PI*2); 
    sCtx.fill();
    
    const rockGrad = sCtx.createLinearGradient(0, 0, TILE_SIZE, TILE_SIZE);
    rockGrad.addColorStop(0, '#90A4AE'); rockGrad.addColorStop(1, '#546E7A'); 
    sCtx.fillStyle = rockGrad;
    sCtx.beginPath(); 
    sCtx.moveTo(cxBase - 7, cyBase + 2); 
    sCtx.bezierCurveTo(cxBase - 7, cyBase - 8, cxBase + 7, cyBase - 8, cxBase + 7, cyBase + 2);
    sCtx.lineTo(cxBase, cyBase + 6);
    sCtx.fill();
    
    textures['stone'] = stoneC;

    // 4. Дерево (РАЗДЕЛЕННОЕ)
    const treeW = 140; const treeH = 220; 
    const tX = treeW / 2; const tBaseY = treeH - 15;
    
    const [trunkC, trCtx] = createHiResCanvas(treeW, treeH);
    trCtx.fillStyle = 'rgba(0,0,0,0.25)'; trCtx.filter = 'blur(6px)'; trCtx.beginPath(); trCtx.ellipse(tX, tBaseY - 5, 30, 10, 0, 0, Math.PI*2); trCtx.fill(); trCtx.filter = 'none';
    const trunkGrad = trCtx.createLinearGradient(tX - 15, 0, tX + 15, 0); trunkGrad.addColorStop(0, '#3E2723'); trunkGrad.addColorStop(0.4, '#5D4037'); trunkGrad.addColorStop(1, '#251714'); 
    trCtx.fillStyle = trunkGrad; trCtx.beginPath(); trCtx.moveTo(tX - 15, tBaseY); trCtx.quadraticCurveTo(tX - 10, tBaseY - 30, tX - 10, tBaseY - 80); trCtx.lineTo(tX + 10, tBaseY - 80); trCtx.quadraticCurveTo(tX + 10, tBaseY - 30, tX + 15, tBaseY); trCtx.fill();
    textures['tree_trunk'] = trunkC;

    const [canopyC, canCtx] = createHiResCanvas(treeW, treeH);
    const canopyCenterY = tBaseY - 140;
    const drawLeafClump = (ctx: CanvasRenderingContext2D, lx: number, ly: number, size: number, colorBase: string, colorLight: string) => {
        const grad = ctx.createRadialGradient(lx - size/3, ly - size/3, size/4, lx, ly, size);
        grad.addColorStop(0, colorLight); grad.addColorStop(1, colorBase);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(lx, ly, size, 0, Math.PI*2); ctx.fill();
    };
    const layers = [{ y: 60, w: 50, count: 12, s: 20, c: '#1B5E20', l: '#2E7D32' }, { y: 30, w: 55, count: 14, s: 22, c: '#2E7D32', l: '#43A047' }, { y: 0, w: 45, count: 12, s: 24, c: '#43A047', l: '#66BB6A' }, { y: -30, w: 30, count: 8, s: 22, c: '#66BB6A', l: '#A5D6A7' }];
    layers.forEach(layer => { for(let i=0; i<layer.count; i++) { drawLeafClump(canCtx, tX + (Math.random()-0.5)*layer.w*2, canopyCenterY + layer.y + (Math.random()-0.5)*20, layer.s + Math.random()*5, layer.c, layer.l); }});
    textures['tree_canopy'] = canopyC;
    
    // 5. ВЕТКА (Ground Twig)
    const [twigC, tgCtx] = createHiResCanvas(32, 32);
    tgCtx.translate(16, 16);
    tgCtx.strokeStyle = '#4e342e'; // Dark brown
    tgCtx.lineWidth = 2.5;
    tgCtx.lineCap = 'round';
    tgCtx.beginPath();
    tgCtx.moveTo(-8, 4);
    tgCtx.lineTo(0, 0); // Center
    tgCtx.lineTo(8, -4); // Main branch
    tgCtx.moveTo(0, 0);
    tgCtx.lineTo(4, 6); // Small branch
    tgCtx.stroke();
    textures['ground_twig'] = twigC;

    // 6. КАМЕШЕК (Ground Pebble)
    const [pebbleC, pCtx] = createHiResCanvas(16, 16);
    pCtx.translate(8, 8);
    // Shadow
    pCtx.fillStyle = 'rgba(0,0,0,0.3)';
    pCtx.beginPath(); pCtx.ellipse(1, 2, 4, 2, 0, 0, Math.PI*2); pCtx.fill();
    // Rock body
    pCtx.fillStyle = '#78909c';
    pCtx.beginPath(); pCtx.arc(0, 0, 3.5, 0, Math.PI*2); pCtx.fill();
    // Highlight
    pCtx.fillStyle = 'rgba(255,255,255,0.2)';
    pCtx.beginPath(); pCtx.arc(-1, -1, 1.5, 0, Math.PI*2); pCtx.fill();
    textures['ground_pebble'] = pebbleC;

    generateHumanSprites();
}
