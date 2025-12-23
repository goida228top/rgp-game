
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateWallAssets(textures: Record<string, HTMLCanvasElement>) {
    const createWallTexture = (type: 't'|'b'|'l'|'r') => {
        const [w, ctx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
        const thickness = 10;
        ctx.fillStyle = '#5d4037';
        if (type === 't') ctx.fillRect(0, 0, TILE_SIZE, thickness);
        if (type === 'b') ctx.fillRect(0, TILE_SIZE - thickness, TILE_SIZE, thickness);
        if (type === 'l') ctx.fillRect(0, 0, thickness, TILE_SIZE);
        if (type === 'r') ctx.fillRect(TILE_SIZE - thickness, 0, thickness, TILE_SIZE);
        ctx.fillStyle = '#3e2723';
        if (type === 't' || type === 'b') {
            ctx.fillRect(0, type === 't' ? 3 : TILE_SIZE - thickness + 3, TILE_SIZE, 1);
            ctx.fillRect(0, type === 't' ? 7 : TILE_SIZE - thickness + 7, TILE_SIZE, 1);
        } else {
            ctx.fillRect(type === 'l' ? 3 : TILE_SIZE - thickness + 3, 0, 1, TILE_SIZE);
            ctx.fillRect(type === 'l' ? 7 : TILE_SIZE - thickness + 7, 0, 1, TILE_SIZE);
        }
        return w;
    };
    textures['wall_wood_t'] = createWallTexture('t');
    textures['wall_wood_b'] = createWallTexture('b');
    textures['wall_wood_l'] = createWallTexture('l');
    textures['wall_wood_r'] = createWallTexture('r');
}
