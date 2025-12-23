
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateStoneAssets(textures: Record<string, HTMLCanvasElement>) {
    // Маленький камень
    const stoneSize = TILE_SIZE * 1.5;
    const [stoneC, sCtx] = createHiResCanvas(stoneSize, stoneSize);
    const cx = stoneSize / 2; const cy = stoneSize / 2 + 5;
    sCtx.translate(cx, cy);
    sCtx.scale(1.5, 1.5); 
    sCtx.translate(-TILE_SIZE/2, -(TILE_SIZE/2 + 5));
    const cxBase = TILE_SIZE / 2; const cyBase = TILE_SIZE / 2 + 5;
    sCtx.fillStyle = 'rgba(0,0,0,0.2)'; 
    sCtx.beginPath(); sCtx.ellipse(cxBase, cyBase + 5, 8, 3, 0, 0, Math.PI*2); sCtx.fill();
    const rockGrad = sCtx.createLinearGradient(0, 0, TILE_SIZE, TILE_SIZE);
    rockGrad.addColorStop(0, '#90A4AE'); rockGrad.addColorStop(1, '#546E7A'); 
    sCtx.fillStyle = rockGrad;
    sCtx.beginPath(); sCtx.moveTo(cxBase - 7, cyBase + 2); 
    sCtx.bezierCurveTo(cxBase - 7, cyBase - 8, cxBase + 7, cyBase - 8, cxBase + 7, cyBase + 2);
    sCtx.lineTo(cxBase, cyBase + 6); sCtx.fill();
    textures['stone'] = stoneC;

    // Большой камень
    const bigRockW = 100; const bigRockH = 80;
    const [bigRockC, brCtx] = createHiResCanvas(bigRockW, bigRockH);
    brCtx.fillStyle = 'rgba(0,0,0,0.3)';
    brCtx.beginPath(); brCtx.ellipse(bigRockW/2, bigRockH - 10, bigRockW/2 - 10, 10, 0, 0, Math.PI*2); brCtx.fill();
    const brGrad = brCtx.createLinearGradient(20, 0, bigRockW, bigRockH);
    brGrad.addColorStop(0, '#78909c'); brGrad.addColorStop(1, '#37474f');
    brCtx.fillStyle = brGrad;
    brCtx.beginPath(); brCtx.moveTo(20, bigRockH - 10); brCtx.lineTo(10, 40); brCtx.lineTo(30, 10); brCtx.lineTo(70, 5); brCtx.lineTo(90, 30); brCtx.lineTo(95, bigRockH - 15); brCtx.closePath(); brCtx.fill();
    brCtx.strokeStyle = '#263238'; brCtx.lineWidth = 2; brCtx.beginPath(); brCtx.moveTo(30, 20); brCtx.lineTo(40, 35); brCtx.lineTo(35, 50); brCtx.stroke();
    textures['big_rock'] = bigRockC;

    // Камешек (лут)
    const [pebbleC, pCtx] = createHiResCanvas(16, 16);
    pCtx.translate(8, 8);
    pCtx.fillStyle = 'rgba(0,0,0,0.3)';
    pCtx.beginPath(); pCtx.ellipse(1, 2, 4, 2, 0, 0, Math.PI*2); pCtx.fill();
    pCtx.fillStyle = '#78909c';
    pCtx.beginPath(); pCtx.arc(0, 0, 3.5, 0, Math.PI*2); pCtx.fill();
    pCtx.fillStyle = 'rgba(255,255,255,0.2)';
    pCtx.beginPath(); pCtx.arc(-1, -1, 1.5, 0, Math.PI*2); pCtx.fill();
    textures['ground_pebble'] = pebbleC;
}
