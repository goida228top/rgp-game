
import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateTreeAssets(textures: Record<string, HTMLCanvasElement>) {
    const treeW = 140; const treeH = 220; 
    const tX = treeW / 2; const tBaseY = treeH - 15;
    
    // Ствол
    const [trunkC, trCtx] = createHiResCanvas(treeW, treeH);
    trCtx.fillStyle = 'rgba(0,0,0,0.25)'; trCtx.filter = 'blur(6px)'; trCtx.beginPath(); trCtx.ellipse(tX, tBaseY - 5, 30, 10, 0, 0, Math.PI*2); trCtx.fill(); trCtx.filter = 'none';
    const trunkGrad = trCtx.createLinearGradient(tX - 15, 0, tX + 15, 0); trunkGrad.addColorStop(0, '#3E2723'); trunkGrad.addColorStop(0.4, '#5D4037'); trunkGrad.addColorStop(1, '#251714'); 
    trCtx.fillStyle = trunkGrad; trCtx.beginPath(); trCtx.moveTo(tX - 15, tBaseY); trCtx.quadraticCurveTo(tX - 10, tBaseY - 30, tX - 10, tBaseY - 80); trCtx.lineTo(tX + 10, tBaseY - 80); trCtx.quadraticCurveTo(tX + 10, tBaseY - 30, tX + 15, tBaseY); trCtx.fill();
    textures['tree_trunk'] = trunkC;

    // Крона
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
    
    // Ветка (лут)
    const [twigC, tgCtx] = createHiResCanvas(32, 32);
    tgCtx.translate(16, 16);
    tgCtx.strokeStyle = '#4e342e'; tgCtx.lineWidth = 2.5; tgCtx.lineCap = 'round';
    tgCtx.beginPath(); tgCtx.moveTo(-8, 4); tgCtx.lineTo(0, 0); tgCtx.lineTo(8, -4); tgCtx.moveTo(0, 0); tgCtx.lineTo(4, 6); tgCtx.stroke();
    textures['ground_twig'] = twigC;
}
