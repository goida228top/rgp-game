
// world.ts: Управление данными карты
import { WorldMap, TileData, WorldUpdate, ObjectType } from './types';
import { TILE_SIZE } from './constants';
import { gameState } from './state';
import { generateBiomedWorld, generateTestWorld } from './generation';

export let world: WorldMap = {};

export function getTileData(tileX: number, tileY: number): TileData {
    const key = `${tileX},${tileY}`;
    if (world[key]) return world[key];
    return { terrain: 'grass', floor: 'none', object: 'none', items: [] };
}

export function getInteractionType(tileX: number, tileY: number): string {
    const data = getTileData(tileX, tileY);
    if (data.object !== 'none') return data.object;
    if (data.floor !== 'none') return 'floor_wood';
    if (data.terrain === 'water') return 'water';
    return 'grass';
}

export function destroyTileObject(tileX: number, tileY: number) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) return;
    
    // Если есть объект сверху - ломаем его
    if (world[key].object !== 'none') {
        world[key].object = 'none';
    } 
    // Если объекта нет, но есть пол - ломаем пол
    else if (world[key].floor !== 'none') {
        world[key].floor = 'none';
    }
}

export function applyWorldUpdate(update: WorldUpdate) {
    const { x, y, action, data } = update;
    const key = `${x},${y}`;
    if (!world[key]) world[key] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
    
    if (action === 'destroy_object') world[key].object = 'none';
    else if (action === 'place_item' && data) world[key].items.push(data);
    else if (action === 'pickup_item') world[key].items.pop();
    else if (action === 'place_object' && data) world[key].object = data as ObjectType;
    else if (action === 'place_floor') world[key].floor = 'wood';
    else if (action === 'destroy_floor') world[key].floor = 'none';
}

export function tryPickupItem(worldX: number, worldY: number): string | null {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const key = `${tileX},${tileY}`;
    const tile = world[key];
    if (tile && tile.items.length > 0) return tile.items[tile.items.length - 1]; 
    return null;
}

export function pickupItemAt(tileX: number, tileY: number): string | null {
    const key = `${tileX},${tileY}`;
    const tile = world[key];
    if (tile && tile.items.length > 0) return tile.items.pop() || null;
    return null;
}

export function dropItemOnGround(originX: number, originY: number, itemType: string) {
    if (tryPlaceItemAt(originX, originY, itemType)) return;
    const neighbors = [{dx:0,dy:-1},{dx:1,dy:-1},{dx:1,dy:0},{dx:1,dy:1},{dx:0,dy:1},{dx:-1,dy:1},{dx:-1,dy:0},{dx:-1,dy:-1}];
    for (const n of neighbors) if (tryPlaceItemAt(originX + n.dx, originY + n.dy, itemType)) return;
    forcePlaceItem(originX, originY, itemType);
}

function tryPlaceItemAt(tileX: number, tileY: number, itemType: string): boolean {
    const key = `${tileX},${tileY}`;
    const data = getTileData(tileX, tileY);
    if (data.object !== 'none' && data.object !== 'high_grass') return false;
    if (data.terrain === 'water' || data.items.length > 0) return false;
    if (!world[key]) world[key] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
    world[key].items.push(itemType);
    return true;
}

export function forcePlaceItem(tileX: number, tileY: number, itemType: string) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) world[key] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
    world[key].items.push(itemType);
}

export function canPlaceObject(tileX: number, tileY: number, isFloor: boolean = false): boolean {
    const data = getTileData(tileX, tileY);
    if (data.terrain === 'water') return false;
    
    // Если это пол
    if (isFloor) {
        return data.floor === 'none'; // Можно ставить, если там еще нет пола
    }

    // Если это объект (стена, верстак и т.д.)
    if (data.object !== 'none' && data.object !== 'high_grass') return false;
    
    // Проверка коллизии с игроками только для ОБЪЕКТОВ (пол можно ставить под игрока)
    const tWX = tileX * TILE_SIZE + TILE_SIZE / 2, tWY = tileY * TILE_SIZE + TILE_SIZE / 2;
    for (const id in gameState.players) {
        const p = gameState.players[id];
        if (Math.sqrt((p.x-tWX)**2 + (p.y-tWY)**2) < 25) return false;
    }
    return true;
}

export function placeObject(tileX: number, tileY: number, type: ObjectType) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) world[key] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
    world[key].object = type;
}

export function placeFloor(tileX: number, tileY: number) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) world[key] = { terrain: 'grass', floor: 'none', object: 'none', items: [] };
    world[key].floor = 'wood';
}

export function initWorld(playerX: number, playerY: number) {
    if (gameState.useTestWorld) generateTestWorld(playerX, playerY);
    else generateBiomedWorld(playerX, playerY);
}

export { isPositionInWater, canMoveTo } from './physics';
