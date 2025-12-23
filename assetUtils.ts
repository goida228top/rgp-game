
// assetUtils.ts: Общие утилиты для генерации ассетов
import { TILE_SIZE } from './constants';

export const RES = 2; 

// Центральное хранилище текстур
export const textures: Record<string, HTMLCanvasElement> = {};
export const charSprites: Record<string, HTMLCanvasElement[]> = {};

/**
 * Создает Canvas увеличенного разрешения с настроенным масштабированием.
 */
export function createHiResCanvas(logicalW: number, logicalH: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = logicalW * RES;
    c.height = logicalH * RES;
    const ctx = c.getContext('2d')!;
    ctx.scale(RES, RES);
    return [c, ctx];
}
