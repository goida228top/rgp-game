
// state.ts: Централизованное хранилище состояния
import { Players, Player } from './types';

export const gameState = {
    players: {} as Players,
    localPlayerId: 'offline-player',
    isOffline: false,
    useTestWorld: false,
    showDebugGrid: false,
    worldSeed: 'terrawilds', // Значение по умолчанию
    lastServerInventory: { wood: 0, stone: 0 }
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
