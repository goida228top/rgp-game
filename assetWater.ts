
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateWaterAssets(textures: Record<string, HTMLCanvasElement>) {
    // Вода
    const [waterC, wCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    wCtx.fillStyle = '#3b82f6';
    wCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    textures['water'] = waterC;

    // Волны
    const [waveC, waveCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    waveCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    waveCtx.lineWidth = 2;
    waveCtx.lineCap = 'round';
    waveCtx.beginPath();
    waveCtx.moveTo(12, 22);
    waveCtx.quadraticCurveTo(20, 18, 28, 22);
    waveCtx.stroke();
    textures['water_wave'] = waveC;

    // Маски углов
    const corners = ['tl', 'tr', 'bl', 'br'];
    corners.forEach(corner => {
        const [c, ctx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4e8c33';
        ctx.beginPath();
        if (corner === 'tl') { ctx.moveTo(0, 0); ctx.lineTo(TILE_SIZE, 0); ctx.lineTo(0, TILE_SIZE); } 
        else if (corner === 'tr') { ctx.moveTo(0, 0); ctx.lineTo(TILE_SIZE, 0); ctx.lineTo(TILE_SIZE, TILE_SIZE); }
        else if (corner === 'bl') { ctx.moveTo(0, 0); ctx.lineTo(0, TILE_SIZE); ctx.lineTo(TILE_SIZE, TILE_SIZE); }
        else if (corner === 'br') { ctx.moveTo(TILE_SIZE, 0); ctx.lineTo(TILE_SIZE, TILE_SIZE); ctx.lineTo(0, TILE_SIZE); }
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.clip(); 
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for(let i=0; i<10; i++) ctx.fillRect(Math.random()*TILE_SIZE, Math.random()*TILE_SIZE, 2, 2);
        ctx.restore();
        textures[`mask_corner_${corner}`] = c;
    });
}
