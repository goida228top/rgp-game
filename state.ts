// state.ts: Централизованное хранилище состояния
import { Players, Player } from './types';

export interface DoorState {
    angle: number;   // Текущий угол в радианах
    vel: number;     // Угловая скорость
}

export const gameState = {
    players: {} as Players,
    localPlayerId: 'offline-player',
    isOffline: false,
    useTestWorld: false,
    showDebugGrid: false,
    worldSeed: 'terrawilds', 
    worldTime: 6000, // 0-24000, 6000 = полдень, 18000 = полночь
    isTimePaused: false,
    lastServerInventory: { wood: 0, stone: 0 },
    doorStates: {} as Record<string, DoorState>,
    debug: {
        speedMult: 1,
        godMode: false
    }
};

export function getLocalPlayer(): Player | null {
    return gameState.players[gameState.localPlayerId] || null;
}

export function setPlayers(newPlayers: Players) {
    gameState.players = newPlayers;
}

export function setLocalPlayerId(id: string) {
    gameState.localPlayerId = id;
}