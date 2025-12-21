
// world.ts: Управление данными карты и коллизиями
import { WorldMap, TileData, WorldUpdate } from './types';
import { TILE_SIZE } from './constants';
import { gameState } from './state';

export let world: WorldMap = {};

// --- СИСТЕМА ГЕНЕРАЦИИ (SEED & NOISE) ---

// Простой хэш строки в число (для сида)
function cyrb128(str: string) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return (h1^h2^h3^h4) >>> 0;
}

// Генератор случайных чисел Mulberry32 (Seeded PRNG)
class SeededRandom {
    private state: number;
    constructor(seedStr: string) {
        this.state = cyrb128(seedStr);
    }
    // Возвращает число от 0 до 1
    next(): number {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// Простой 2D Value Noise (сглаженный шум)
class Noise2D {
    private rng: SeededRandom;
    private perm: number[];

    constructor(seedStr: string) {
        this.rng = new SeededRandom(seedStr);
        this.perm = new Array(512);
        const p = new Array(256);
        for(let i=0; i<256; i++) p[i] = i;
        // Shuffle
        for(let i=255; i>0; i--) {
            const r = Math.floor(this.rng.next() * (i+1));
            [p[i], p[r]] = [p[r], p[i]];
        }
        for(let i=0; i<512; i++) this.perm[i] = p[i & 255];
    }

    private fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    private lerp(t: number, a: number, b: number) { return a + t * (b - a); }

    // Возвращает значение примерно от 0 до 1
    get(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        
        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X+1] + Y];
        const bb = this.perm[this.perm[X+1] + Y + 1];

        const val = (h: number) => (h % 256) / 255.0;

        const res = this.lerp(v, 
            this.lerp(u, val(aa), val(ba)), 
            this.lerp(u, val(ab), val(bb))
        );
        return res; 
    }
}

// --- WORLD LOGIC ---

export function getTileData(tileX: number, tileY: number): TileData {
    const key = `${tileX},${tileY}`;
    if (world[key]) return world[key];
    return { terrain: 'grass', object: 'none', items: [] };
}

export function getInteractionType(tileX: number, tileY: number): string {
    const data = getTileData(tileX, tileY);
    if (data.object !== 'none') return data.object;
    if (data.terrain === 'water') return 'water';
    return 'grass';
}

export function destroyTileObject(tileX: number, tileY: number) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) world[key] = { terrain: 'grass', object: 'none', items: [] };
    
    // Если объект есть, удаляем его
    if (world[key].object !== 'none') {
        world[key].object = 'none';
    }
}

// Применение обновлений из сети
export function applyWorldUpdate(update: WorldUpdate) {
    const { x, y, action, data } = update;
    const key = `${x},${y}`;
    
    if (!world[key]) world[key] = { terrain: 'grass', object: 'none', items: [] };

    if (action === 'destroy_object') {
        world[key].object = 'none';
    } else if (action === 'place_item' && data) {
        world[key].items.push(data);
    } else if (action === 'pickup_item') {
        world[key].items.pop();
    }
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
    if (tile && tile.items.length > 0) {
        return tile.items.pop() || null;
    }
    return null;
}

export function dropItemOnGround(originX: number, originY: number, itemType: string) {
    if (tryPlaceItemAt(originX, originY, itemType)) return;
    
    const neighbors = [
        {dx: 0, dy: -1}, {dx: 1, dy: -1}, {dx: 1, dy: 0}, {dx: 1, dy: 1},
        {dx: 0, dy: 1}, {dx: -1, dy: 1}, {dx: -1, dy: 0}, {dx: -1, dy: -1}
    ];
    for (const n of neighbors) {
        if (tryPlaceItemAt(originX + n.dx, originY + n.dy, itemType)) return;
    }
    forcePlaceItem(originX, originY, itemType);
}

function tryPlaceItemAt(tileX: number, tileY: number, itemType: string): boolean {
    const key = `${tileX},${tileY}`;
    const data = getTileData(tileX, tileY);
    if (data.object !== 'none' && data.object !== 'high_grass') return false;
    if (data.terrain === 'water') return false;
    if (data.items.length > 0) return false;
    
    if (!world[key]) world[key] = { terrain: 'grass', object: 'none', items: [] };
    world[key].items.push(itemType);
    return true;
}

export function forcePlaceItem(tileX: number, tileY: number, itemType: string) {
    const key = `${tileX},${tileY}`;
    if (!world[key]) world[key] = { terrain: 'grass', object: 'none', items: [] };
    world[key].items.push(itemType);
}

// --- INITIALIZATION ---

export function initWorld(playerX: number, playerY: number) {
    if (gameState.useTestWorld) {
        generateTestWorld(playerX, playerY);
    } else {
        generateBiomedWorld(playerX, playerY);
    }
}

function generateTestWorld(playerX: number, playerY: number) {
    world = {};
    const playerTileX = Math.floor(playerX / TILE_SIZE);
    const playerTileY = Math.floor(playerY / TILE_SIZE);
    
    const RADIUS = 20;
    for (let x = playerTileX - RADIUS; x < playerTileX + RADIUS; x++) {
        for (let y = playerTileY - RADIUS; y < playerTileY + RADIUS; y++) {
            const key = `${x},${y}`;
            world[key] = { terrain: 'grass', object: 'none', items: [] };
            if (Math.random() < 0.2) world[key].object = 'high_grass';
        }
    }
    const tKey = `${playerTileX-6},${playerTileY}`; world[tKey] = { terrain: 'grass', object: 'tree', items: [] };
    const sKey = `${playerTileX+6},${playerTileY}`; world[sKey] = { terrain: 'grass', object: 'stone', items: [] };
    const wKey = `${playerTileX},${playerTileY+6}`; world[wKey] = { terrain: 'water', object: 'none', items: [] };
}

// ГЕНЕРАЦИЯ НА ОСНОВЕ СИДА (BIOMES)
function generateBiomedWorld(playerX: number, playerY: number) {
    world = {}; 
    const playerTileX = Math.floor(playerX / TILE_SIZE);
    const playerTileY = Math.floor(playerY / TILE_SIZE);
    
    // Радиус генерации (вокруг игрока)
    const RADIUS = 50; 
    
    const seed = gameState.worldSeed;
    const elevationGen = new Noise2D(seed + "_elevation");
    const moistureGen = new Noise2D(seed + "_moisture");
    const objectGen = new Noise2D(seed + "_objects"); 

    for (let x = playerTileX - RADIUS; x < playerTileX + RADIUS; x++) {
        for (let y = playerTileY - RADIUS; y < playerTileY + RADIUS; y++) {
            const key = `${x},${y}`;
            const tile: TileData = { terrain: 'grass', object: 'none', items: [] };

            // ИСПРАВЛЕНИЕ: Безопасная зона теперь в центре мира (0,0), а не вокруг игрока.
            // Это гарантирует, что сервер и клиент видят одинаковые деревья, независимо от того, где спавнится игрок.
            const distFromCenter = Math.sqrt(x*x + y*y);
            if (distFromCenter < 5) { // 5 тайлов от (0,0) чисто
                world[key] = tile;
                continue;
            }

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
                        tile.object = 'tree';
                        if (rnd > 0.8) tile.items.push('stick');
                    } else if (rnd > 0.1) {
                        tile.object = 'high_grass';
                    }
                } 
                else if (moist > 0.3) {
                    const isSpacingValid = (Math.abs(x) % 2 === 0) && (Math.abs(y) % 2 === 0);
                    if (isSpacingValid && rnd > 0.75) {
                        tile.object = 'tree';
                    } else if (rnd > 0.4) {
                        tile.object = 'high_grass';
                    }
                }
                else {
                    if (rnd > 0.85) {
                        tile.object = 'stone';
                        if (rnd > 0.92) tile.items.push('pebble');
                    }
                }
            }
            world[key] = tile;
        }
    }
}

export function canMoveTo(x: number, y: number, width: number, height: number): boolean {
    // ВАЖНО: Эти параметры должны совпадать с сервером
    const padding = 15; 
    const checkWidth = width - padding;
    const checkHeight = height - padding;
    const corners = [
        { x: x - checkWidth / 2, y: y - checkHeight / 2 + 10 }, 
        { x: x + checkWidth / 2, y: y - checkHeight / 2 + 10 }, 
        { x: x - checkWidth / 2, y: y + checkHeight / 2 }, 
        { x: x + checkWidth / 2, y: y + checkHeight / 2 }
    ];
    for (const corner of corners) {
        const tileX = Math.floor(corner.x / TILE_SIZE);
        const tileY = Math.floor(corner.y / TILE_SIZE);
        const data = getTileData(tileX, tileY);
        if (data.object === 'tree') return false;
    }
    return true;
}
