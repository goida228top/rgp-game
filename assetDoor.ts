import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateDoorAssets(textures: Record<string, HTMLCanvasElement>) {
    const createDoorTexture = (type: 't'|'b'|'l'|'r') => {
        const [w, ctx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
        const thickness = 10;
        
        // Цвет двери теперь идентичен цвету стен (#5d4037)
        ctx.fillStyle = '#5d4037';
        if (type === 't') ctx.fillRect(0, 0, TILE_SIZE, thickness);
        if (type === 'b') ctx.fillRect(0, TILE_SIZE - thickness, TILE_SIZE, thickness);
        if (type === 'l') ctx.fillRect(0, 0, thickness, TILE_SIZE);
        if (type === 'r') ctx.fillRect(TILE_SIZE - thickness, 0, thickness, TILE_SIZE);
        
        // Детали: золотистые ручки с обеих сторон дверного полотна
        ctx.fillStyle = '#ffca28'; 
        const handleSize = 3;
        const mid = TILE_SIZE / 2 - 1.5;

        if (type === 't') {
            ctx.fillRect(mid, 1, handleSize, handleSize); // Снаружи
            ctx.fillRect(mid, thickness - 4, handleSize, handleSize); // Внутри
        }
        if (type === 'b') {
            ctx.fillRect(mid, TILE_SIZE - thickness + 1, handleSize, handleSize);
            ctx.fillRect(mid, TILE_SIZE - 4, handleSize, handleSize);
        }
        if (type === 'l') {
            ctx.fillRect(1, mid, handleSize, handleSize);
            ctx.fillRect(thickness - 4, mid, handleSize, handleSize);
        }
        if (type === 'r') {
            ctx.fillRect(TILE_SIZE - thickness + 1, mid, handleSize, handleSize);
            ctx.fillRect(TILE_SIZE - 4, mid, handleSize, handleSize);
        }

        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 1;
        if (type === 't') ctx.strokeRect(0, 0, TILE_SIZE, thickness);
        if (type === 'b') ctx.strokeRect(0, TILE_SIZE - thickness, TILE_SIZE, thickness);
        if (type === 'l') ctx.strokeRect(0, 0, thickness, TILE_SIZE);
        if (type === 'r') ctx.strokeRect(TILE_SIZE - thickness, 0, thickness, TILE_SIZE);

        return w;
    };
    
    textures['door_wood_t'] = createDoorTexture('t');
    textures['door_wood_b'] = createDoorTexture('b');
    textures['door_wood_l'] = createDoorTexture('l');
    textures['door_wood_r'] = createDoorTexture('r');
}