// types.ts: Определяет общие типы данных для всего приложения.

export type TileType = 'grass' | 'tree' | 'water' | 'stone';

export type WorldMap = {
  [key: string]: TileType; // "x,y": "grass"
};

export interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  nickname: string;
  inventory: {
    stone: number;
    wood: number;
  };
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
}
