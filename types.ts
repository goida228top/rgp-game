
// types.ts: Определяет общие типы данных для всего приложения.

export type TerrainType = 'grass' | 'water';
export type ObjectType = 'tree' | 'stone' | 'high_grass' | 'none';

export type Direction = 'front' | 'back' | 'left' | 'right';

// Новая структура данных тайла
// Это ОЧЕНЬ легко сохранять: просто массив таких объектов
export interface TileData {
    terrain: TerrainType;   // Базовый слой (по чему ходим)
    object: ObjectType;     // Слой препятствий (что ломаем/обходим)
    items: string[];        // Слой лута (массив ID предметов: ['stick', 'rock'])
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

export interface Movement {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean; // Флаг спринта
}
