
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateGrassAssets(textures: Record<string, HTMLCanvasElement>) {
    // Обычная трава
    const [grassC, gCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    gCtx.fillStyle = '#4e8c33'; 
    gCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gCtx.fillStyle = 'rgba(255,255,255,0.03)';
    for(let i=0; i<5; i++) {
        gCtx.fillRect(Math.random()*TILE_SIZE, Math.random()*TILE_SIZE, 2, 2);
    }
    textures['grass'] = grassC;

    // Высокая трава (High Grass)
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
}
