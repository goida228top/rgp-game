
import { AnimFrame } from './types';
import { createHiResCanvas } from './assetUtils';

// Цвета должны совпадать со списком в server.js
export const PLAYER_COLORS = [
    '#000000', // Черный
    '#FFFFFF', // Белый
    '#FF0000', // Красный
    '#0000FF', // Синий
    '#FFFF00', // Желтый
    '#008000', // Зеленый
    '#FFA500', // Оранжевый
    '#A52A2A', // Коричневый
    '#808080'  // Серый
];

function drawHumanFrame(ctx: CanvasRenderingContext2D, frame: AnimFrame, part: string, shirtColorOverride: string = '#FFFFFF') {
    const cx = 32; const headRadius = 10; const headY = 20;
    const bodyW = 16; const bodyH = 24; const bodyY = headY + 8; 
    const legW = 5; const legH = 22; const legY = bodyY + bodyH - 2; const legGap = 1;

    let leftLegY = legY, rightLegY = legY, leftArmAngle = 0, rightArmAngle = 0, bodyBob = 0;
    if (frame === 1) { leftLegY -= 4; rightArmAngle = 0.5; leftArmAngle = -0.5; bodyBob = -1; } 
    else if (frame === 2) { rightLegY -= 4; leftArmAngle = 0.5; rightArmAngle = -0.5; bodyBob = -1; }

    const currentBodyY = bodyY + bodyBob;
    const currentHeadY = headY + bodyBob;
    const skinColor = '#ffdbac', pantsColor = '#1e293b', shoesColor = '#0f172a';
    
    // Используем переданный цвет или дефолтный
    const shirtColor = shirtColorOverride;

    const drawLimb = (x: number, y: number, w: number, h: number, angle: number, color: string) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(-w/2, 0, w, h, w/2); ctx.fill(); ctx.restore();
    };

    if (part === 'base') {
        ctx.fillStyle = pantsColor; ctx.beginPath(); ctx.roundRect(cx - legGap - legW, leftLegY, legW, legH, 3); ctx.fill();
        ctx.fillStyle = shoesColor; ctx.beginPath(); ctx.roundRect(cx - legGap - legW, leftLegY + legH - 4, legW, 6, 2); ctx.fill();
        ctx.fillStyle = pantsColor; ctx.beginPath(); ctx.roundRect(cx + legGap, rightLegY, legW, legH, 3); ctx.fill();
        ctx.fillStyle = shoesColor; ctx.beginPath(); ctx.roundRect(cx + legGap, rightLegY + legH - 4, legW, 6, 2); ctx.fill();
        drawLimb(cx - bodyW/2 + 3, currentBodyY + 4, 6, 20, leftArmAngle, skinColor);
        drawLimb(cx - bodyW/2 + 3, currentBodyY + 4, 6, 7, leftArmAngle, shirtColor);
        ctx.fillStyle = shirtColor; ctx.beginPath(); ctx.roundRect(cx - bodyW/2, currentBodyY, bodyW, bodyH, 6); ctx.fill();
        ctx.fillStyle = skinColor; ctx.beginPath(); ctx.arc(cx, currentHeadY, headRadius, 0, Math.PI * 2); ctx.fill();
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 20, rightArmAngle, skinColor);
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 7, rightArmAngle, shirtColor);
    }

    const armorColorLight = '#9ca3af', armorColorDark = '#4b5563';
    if (part === 'armor_iron_head') { ctx.fillStyle = armorColorLight; ctx.beginPath(); ctx.arc(cx, currentHeadY, headRadius + 1, Math.PI, 0, false); ctx.fill(); }
    if (part === 'armor_iron_body') {
        ctx.fillStyle = armorColorLight; ctx.beginPath(); ctx.roundRect(cx - bodyW/2, currentBodyY, bodyW, bodyH, 6); ctx.fill();
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 20, rightArmAngle, skinColor);
        drawLimb(cx + bodyW/2 - 3, currentBodyY + 4, 6, 7, rightArmAngle, shirtColor);
    }
    if (part === 'armor_iron_legs') {
        ctx.fillStyle = armorColorDark;
        ctx.beginPath(); ctx.roundRect(cx - legGap - legW, leftLegY, legW, legH - 4, 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx + legGap, rightLegY, legW, legH - 4, 2); ctx.fill();
    }
}

export function generateHumanAssets(charSprites: Record<string, HTMLCanvasElement[]>) {
    const w = 64, h = 84;
    const armorParts = ['armor_iron_head', 'armor_iron_body', 'armor_iron_legs'];
    const frames: AnimFrame[] = [0, 1, 2];

    // Генерируем броню (она одинаковая для всех)
    armorParts.forEach(part => {
        charSprites[part] = [];
        frames.forEach(frame => {
            const [c, ctx] = createHiResCanvas(w, h);
            drawHumanFrame(ctx, frame, part);
            charSprites[part][frame] = c;
        });
    });

    // Генерируем базовые тела для КАЖДОГО цвета
    PLAYER_COLORS.forEach(color => {
        const spriteKey = `base_${color}`;
        charSprites[spriteKey] = [];
        frames.forEach(frame => {
            const [c, ctx] = createHiResCanvas(w, h);
            drawHumanFrame(ctx, frame, 'base', color);
            charSprites[spriteKey][frame] = c;
        });
    });
    
    // Fallback: генерируем дефолтный белый 'base' на случай ошибок
    if (!charSprites['base']) {
         charSprites['base'] = [];
         frames.forEach(frame => {
            const [c, ctx] = createHiResCanvas(w, h);
            drawHumanFrame(ctx, frame, 'base', '#FFFFFF');
            charSprites['base'][frame] = c;
        });
    }
}
