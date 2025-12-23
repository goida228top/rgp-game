
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateWorkbenchAssets(textures: Record<string, HTMLCanvasElement>) {
    const [wbC, wbCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    const wbTopH = 14;
    wbCtx.fillStyle = '#2e1c19';
    wbCtx.fillRect(4, TILE_SIZE/2, 4, TILE_SIZE/2);
    wbCtx.fillRect(TILE_SIZE-8, TILE_SIZE/2, 4, TILE_SIZE/2);
    wbCtx.fillStyle = '#5d4037';
    wbCtx.fillRect(2, wbTopH, TILE_SIZE-4, 10);
    wbCtx.fillStyle = '#3e2723';
    wbCtx.fillRect(2, wbTopH + 10, 4, TILE_SIZE - (wbTopH + 10));
    wbCtx.fillRect(TILE_SIZE-6, wbTopH + 10, 4, TILE_SIZE - (wbTopH + 10));
    wbCtx.fillStyle = '#a1887f';
    wbCtx.fillRect(0, 0, TILE_SIZE, wbTopH);
    wbCtx.fillStyle = '#d7ccc8';
    wbCtx.fillRect(0, 0, TILE_SIZE, 2);
    wbCtx.fillStyle = '#546e7a';
    wbCtx.fillRect(2, 2, 8, 8);
    wbCtx.fillStyle = '#b71c1c';
    wbCtx.fillRect(20, 5, 10, 3);
    textures['workbench'] = wbC;
}
