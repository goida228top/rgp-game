// types.ts: Определяет общие типы данных для всего приложения.

export type TerrainType = 'grass' | 'water';
// Удален floor_wood из ObjectType, так как теперь это отдельный слой
export type ObjectType = 'tree' | 'stone' | 'big_rock' | 'high_grass' | 'none' | 'workbench' | 
                         'wall_wood_t' | 'wall_wood_b' | 'wall_wood_l' | 'wall_wood_r' | 
                         'door_wood_t' | 'door_wood_b' | 'door_wood_l' | 'door_wood_r' | 'gemi';

export type Direction = 'front' | 'back' | 'left' | 'right';

// Тип для кадров анимации (0 - стоит, 1 и 2 - шаги)
export type AnimFrame = 0 | 1 | 2;

// Новая структура данных тайла с тремя слоями
export interface TileData {
    terrain: TerrainType;   // Базовый слой (трава/вода)
    floor: 'none' | 'wood'; // Слой покрытия (фанера)
    object: ObjectType;     // Слой препятствий
    items: string[];        // Слой лута
}

// Карта - это словарь координат "x,y" -> Данные тайла
export type WorldMap = {
  [key: string]: TileData; 
};

export interface Item {
    type: string;
    count: number;
    icon: string;
}

export interface PlayerStats {
    hp: number;
    maxHp: number;
    hunger: number;
    maxHunger: number;
    mana: number;
    maxMana: number;
    energy: number;
    maxEnergy: number;
    xp: number;
    maxXp: number;
    level: number;
}

export interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  nickname: string;
  direction: Direction;
  inventory: (Item | null)[]; 
  equipment: {
      head: string | null;
      body: string | null;
      legs: string | null;
  };
  stats: PlayerStats;
}

export interface Players {
  [id: string]: Player;
}

export interface RoomInfo {
  id: string;
  name: string;
  players: number;
}

export interface WorldUpdate {
    x: number;
    y: number;
    action: 'destroy_object' | 'place_item' | 'pickup_item' | 'place_object' | 'place_floor' | 'destroy_floor';
    data?: string;
}

export interface Movement {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    sprint: boolean;
    rotate: boolean;
}