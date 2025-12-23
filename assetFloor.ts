import { TILE_SIZE } from './constants';
import { createHiResCanvas } from './assetUtils';

export function generateFloorAssets(textures: Record<string, HTMLCanvasElement>) {
    const [floorC, flCtx] = createHiResCanvas(TILE_SIZE, TILE_SIZE);
    
    // Цвет теперь соответствует стенам (#5d4037), но чуть светлее для контраста
    flCtx.fillStyle = '#5d4037';
    flCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    // Прорисовка волокон дерева
    flCtx.strokeStyle = '#4e342e';
    flCtx.lineWidth = 1;
    flCtx.beginPath();
    flCtx.moveTo(0, 5); flCtx.bezierCurveTo(10, 8, 20, 2, 40, 6);
    flCtx.moveTo(0, 20); flCtx.bezierCurveTo(15, 25, 30, 15, 40, 22);
    flCtx.moveTo(0, 35); flCtx.bezierCurveTo(10, 32, 25, 38, 40, 34);
    flCtx.stroke();
    
    // Рамка тайла
    flCtx.strokeStyle = '#3e2723';
    flCtx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    
    textures['floor_wood'] = floorC;
}