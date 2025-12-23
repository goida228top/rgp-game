// physics.ts: Коллизии и физика
import { TILE_SIZE } from './constants';
import { getTileData, world } from './world';
import { gameState } from './state';

export function isPositionInWater(x: number, y: number): boolean {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    const data = getTileData(tileX, tileY);
    if (data.terrain !== 'water') return false;
    const isTopLand = getTileData(tileX, tileY - 1).terrain !== 'water';
    const isBottomLand = getTileData(tileX, tileY + 1).terrain !== 'water';
    const isLeftLand = getTileData(tileX - 1, tileY).terrain !== 'water';
    const isRightLand = getTileData(tileX + 1, tileY).terrain !== 'water';
    const lx = ((x % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
    const ly = ((y % TILE_SIZE) + TILE_SIZE) % TILE_SIZE;
    if (isTopLand && isLeftLand && lx + ly < TILE_SIZE) return false;
    if (isTopLand && isRightLand && lx > ly) return false;
    if (isBottomLand && isLeftLand && lx < ly) return false;
    if (isBottomLand && isRightLand && lx + ly > TILE_SIZE) return false;
    return true;
}

export function updateDoorPhysics() {
    const keys = Object.keys(world);
    const players = Object.values(gameState.players);
    
    for (const key of keys) {
        const tile = world[key];
        if (!tile.object.startsWith('door_wood')) continue;

        if (!gameState.doorStates[key]) {
            gameState.doorStates[key] = { angle: 0, vel: 0 };
        }

        const state = gameState.doorStates[key];
        const [tx, ty] = key.split(',').map(Number);
        const type = tile.object.split('_').pop(); // t, b, l, r
        
        // Точка петли (hinge)
        let hX = tx * TILE_SIZE;
        let hY = ty * TILE_SIZE;
        if (type === 'r') hX += TILE_SIZE;
        if (type === 'b') hY += TILE_SIZE;

        // Физика пружины (возврат в закрытое состояние)
        const springK = 0.08;
        const damping = 0.75;
        state.vel += -state.angle * springK;
        state.vel *= damping;

        // Взаимодействие с игроками
        for (const p of players) {
            const dx = p.x - hX;
            const dy = p.y - hY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Если игрок касается двери (радиус чуть больше тайла для плавности)
            if (dist < TILE_SIZE * 1.1) {
                // Вычисляем угол между петлёй и игроком
                const pAngle = Math.atan2(dy, dx);
                
                // Базовый угол двери в закрытом состоянии
                let doorBaseAngle = 0;
                if (type === 'l' || type === 'r') doorBaseAngle = Math.PI / 2;
                if (type === 't' || type === 'b') doorBaseAngle = 0;

                // Разница углов говорит нам, с какой стороны игрок
                let diff = pAngle - (doorBaseAngle + state.angle);
                // Нормализация угла
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                // Толкаем дверь в сторону от игрока
                const pushPower = 0.15 * (1 - dist / (TILE_SIZE * 1.1));
                if (diff > 0) state.vel -= pushPower;
                else state.vel += pushPower;
            }
        }

        state.angle += state.vel;

        // Ограничиваем вращение (дверь не может крутиться на 360)
        const limit = Math.PI * 0.55; // ~100 градусов
        if (state.angle > limit) { state.angle = limit; state.vel = 0; }
        if (state.angle < -limit) { state.angle = -limit; state.vel = 0; }
    }
}

export function canMoveTo(x: number, y: number, width: number, height: number): boolean {
    const padding = 12;
    const checkWidth = width - padding;
    const checkHeight = height - padding;
    const corners = [
        { x: x - checkWidth / 2, y: y - checkHeight / 2 + 10 },
        { x: x + checkWidth / 2, y: y - checkHeight / 2 + 10 },
        { x: x - checkWidth / 2, y: y + checkHeight / 2 },
        { x: x + checkWidth / 2, y: y + checkHeight / 2 }
    ];

    for (const corner of corners) {
        const tileX = Math.floor(corner.x / TILE_SIZE);
        const tileY = Math.floor(corner.y / TILE_SIZE);
        const data = getTileData(tileX, tileY);

        if (data.object === 'tree' || data.object === 'big_rock' || data.object === 'workbench') return false;
        
        if (data.object.startsWith('wall_wood')) {
            const th = 10;
            const tx = tileX * TILE_SIZE;
            const ty = tileY * TILE_SIZE;
            let rect = { x: 0, y: 0, w: 0, h: 0 };
            const type = data.object.split('_').pop();
            if (type === 't') rect = { x: tx, y: ty, w: TILE_SIZE, h: th };
            else if (type === 'b') rect = { x: tx, y: ty + TILE_SIZE - th, w: TILE_SIZE, h: th };
            else if (type === 'l') rect = { x: tx, y: ty, w: th, h: TILE_SIZE };
            else if (type === 'r') rect = { x: tx + TILE_SIZE - th, y: ty, w: th, h: TILE_SIZE };
            if (corner.x >= rect.x && corner.x <= rect.x + rect.w && corner.y >= rect.y && corner.y <= rect.y + rect.h) return false;
        }

        if (data.object.startsWith('door_wood')) {
            const key = `${tileX},${tileY}`;
            const state = gameState.doorStates[key];
            
            // Если дверь отклонена более чем на 15 градусов, считаем её проходимой
            if (state && Math.abs(state.angle) > 0.25) continue;

            const th = 10;
            const tx = tileX * TILE_SIZE;
            const ty = tileY * TILE_SIZE;
            let rect = { x: 0, y: 0, w: 0, h: 0 };
            const type = data.object.split('_').pop();
            if (type === 't') rect = { x: tx, y: ty, w: TILE_SIZE, h: th };
            else if (type === 'b') rect = { x: tx, y: ty + TILE_SIZE - th, w: TILE_SIZE, h: th };
            else if (type === 'l') rect = { x: tx, y: ty, w: th, h: TILE_SIZE };
            else if (type === 'r') rect = { x: tx + TILE_SIZE - th, y: ty, w: th, h: TILE_SIZE };
            
            if (corner.x >= rect.x && corner.x <= rect.x + rect.w && corner.y >= rect.y && corner.y <= rect.y + rect.h) return false;
        }
    }
    return true;
}
