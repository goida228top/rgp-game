
// generation.ts: Генерация мира
import { TILE_SIZE } from './constants';
import { gameState } from './state';
import { world } from './world';
import { TileData, ObjectType } from './types';
import { Noise2D } from './math';

export function generateTestWorld(playerX: number, playerY: number) {
    // Очищаем мир в радиусе 50 тайлов
    const R = 50;
    for (let x = -R; x < R; x++) {
        for (let y = -R; y < R; y++) {
            world[`${x},${y}`] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
        }
    }

    // Список всех объектов для выставки
    const baseItems = ['tree', 'stone', 'big_rock', 'high_grass', 'workbench'];
    const walls = ['wall_wood_t', 'wall_wood_r', 'wall_wood_b', 'wall_wood_l'];
    const doors = ['door_wood_t', 'door_wood_r', 'door_wood_b', 'door_wood_l'];

    // Ряд 1: Базовые объекты (Дерево, Камень и т.д.)
    baseItems.forEach((obj, i) => {
        const tx = i * 5 - 10;
        const ty = -5;
        if (world[`${tx},${ty}`]) world[`${tx},${ty}`].object = obj as ObjectType;
    });

    // Ряд 2: Стены
    walls.forEach((obj, i) => {
        const tx = i * 5 - 10;
        const ty = 0;
        if (world[`${tx},${ty}`]) world[`${tx},${ty}`].object = obj as ObjectType;
    });

    // Ряд 3: Двери
    doors.forEach((obj, i) => {
        const tx = i * 5 - 10;
        const ty = 5;
        if (world[`${tx},${ty}`]) world[`${tx},${ty}`].object = obj as ObjectType;
    });

    // Специальные зоны: Вода и Полы
    // Вода (квадрат 3x3)
    for(let x = -10; x <= -8; x++) {
        for(let y = 10; y <= 12; y++) {
            if (world[`${x},${y}`]) world[`${x},${y}`].terrain = 'water';
        }
    }
    // Пол (квадрат 3x3)
    for(let x = -5; x <= -3; x++) {
        for(let y = 10; y <= 12; y++) {
            if (world[`${x},${y}`]) world[`${x},${y}`].floor = 'wood';
        }
    }
}

export function generateBiomedWorld(playerX: number, playerY: number) {
    const playerTileX = Math.floor(playerX / TILE_SIZE);
    const playerTileY = Math.floor(playerY / TILE_SIZE);
    const RADIUS = 50;
    const seed = gameState.worldSeed;
    const elevationGen = new Noise2D(seed + "_elevation");
    const moistureGen = new Noise2D(seed + "_moisture");
    const objectGen = new Noise2D(seed + "_objects");

    for (let x = playerTileX - RADIUS; x < playerTileX + RADIUS; x++) {
        for (let y = playerTileY - RADIUS; y < playerTileY + RADIUS; y++) {
            const key = `${x},${y}`;
            const tile: TileData = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
            const distFromCenter = Math.sqrt(x*x + y*y);
            if (distFromCenter < 5) { world[key] = tile; continue; }

            const scale = 0.08;
            const elev = elevationGen.get(x * scale, y * scale);
            const moist = moistureGen.get(x * scale, y * scale);
            const rnd = objectGen.get(x * 0.5, y * 0.5);

            if (elev < 0.35) {
                tile.terrain = 'water';
            } else {
                if (moist > 0.55) {
                    const isSpacingValid = (Math.abs(x) % 2 === 0) && (Math.abs(y) % 2 === 0);
                    if (isSpacingValid && rnd > 0.25) {
                        let isWaterNear = false;
                        for(let dx=-2; dx<=2; dx++) {
                            for(let dy=-2; dy<=2; dy++) {
                                if (elevationGen.get((x+dx)*scale, (y+dy)*scale) < 0.35) { isWaterNear = true; break; }
                            }
                            if(isWaterNear) break;
                        }
                        if (!isWaterNear) {
                             tile.object = 'tree';
                        } else tile.object = 'high_grass';
                    } else if (rnd > 0.1) tile.object = 'high_grass';
                } else if (moist > 0.3) {
                    const isSpacingValid = (Math.abs(x) % 2 === 0) && (Math.abs(y) % 2 === 0);
                    if (isSpacingValid && rnd > 0.85) {
                         tile.object = 'tree';
                    } else if (rnd > 0.5) tile.object = 'high_grass';
                } else {
                    const clusterNoise = objectGen.get(x * 0.1, y * 0.1);
                    if (clusterNoise > 0.82) {
                        if (rnd > 0.2) tile.object = 'big_rock';
                        else tile.object = 'stone';
                    }
                }
            }
            world[key] = tile;
        }
    }
}
