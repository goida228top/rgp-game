// assets.ts: Основной файл управления ассетами
import { textures, charSprites } from './assetUtils';
import { generateGrassAssets } from './assetGrass';
import { generateWaterAssets } from './assetWater';
import { generateStoneAssets } from './assetStone';
import { generateTreeAssets } from './assetTree';
import { generateWallAssets } from './assetWall';
import { generateDoorAssets } from './assetDoor';
import { generateFloorAssets } from './assetFloor';
import { generateWorkbenchAssets } from './assetWorkbench';
import { generateHumanAssets } from './assetHuman';
import { AnimFrame } from './types';

export { textures, charSprites };
export type { AnimFrame };

/**
 * Инициализирует генерацию всех игровых ресурсов.
 */
export function generateAssets() {
    generateGrassAssets(textures);
    generateWaterAssets(textures);
    generateStoneAssets(textures);
    generateTreeAssets(textures);
    generateWallAssets(textures);
    generateDoorAssets(textures);
    generateFloorAssets(textures);
    generateWorkbenchAssets(textures);
    generateHumanAssets(charSprites);
}