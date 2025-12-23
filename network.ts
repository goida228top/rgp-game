
// network.ts: Управление сетевым соединением
import { Players, RoomInfo, WorldUpdate } from './types';

interface Socket {
  id: string;
  on(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): this;
  connect(): void;
  disconnect(): void;
}
declare const io: (url: string, options?: any) => Socket;

export let socket: Socket | null = null;

// Callbacks
let onConnectCb: (id: string) => void = () => {};
let onOnlineCountCb: (count: number) => void = () => {};
let onRoomListCb: (rooms: RoomInfo[]) => void = () => {};
let onGameStartCb: (players: Players, worldChanges: WorldUpdate[], seed?: string) => void = () => {};
let onStateCb: (players: Players, worldTime?: number) => void = () => {};
let onWorldUpdateCb: (update: WorldUpdate) => void = () => {};
let onErrorCb: (msg: string) => void = () => {};
let onDebugLogCb: (msg: string) => void = () => {};
// Chat
let onChatMessageCb: (data: { senderId: string, nickname: string, text: string, color: string }) => void = () => {};

export function initNetwork(callbacks: {
    onConnect: (id: string) => void,
    onOnlineCount: (count: number) => void,
    onRoomList: (rooms: RoomInfo[]) => void,
    onGameStart: (players: Players, worldChanges: WorldUpdate[], seed?: string) => void,
    onState: (players: Players, worldTime?: number) => void,
    onWorldUpdate: (update: WorldUpdate) => void,
    onError: (msg: string) => void,
    onDebugLog?: (msg: string) => void,
    onChatMessage?: (data: { senderId: string, nickname: string, text: string, color: string }) => void
}) {
    onConnectCb = callbacks.onConnect;
    onOnlineCountCb = callbacks.onOnlineCount;
    onRoomListCb = callbacks.onRoomList;
    onGameStartCb = callbacks.onGameStart;
    onStateCb = callbacks.onState;
    onWorldUpdateCb = callbacks.onWorldUpdate;
    onErrorCb = callbacks.onError;
    if (callbacks.onDebugLog) onDebugLogCb = callbacks.onDebugLog;
    if (callbacks.onChatMessage) onChatMessageCb = callbacks.onChatMessage;
}

export function connectToServer() {
    if (socket) return;
    socket = io("https://rgp-game.onrender.com");
    socket.on('connect', () => onConnectCb(socket!.id));
    socket.on('onlineCount', onOnlineCountCb);
    socket.on('roomList', onRoomListCb);
    socket.on('gameStart', onGameStartCb);
    socket.on('state', (players, worldTime) => onStateCb(players, worldTime));
    socket.on('worldUpdate', onWorldUpdateCb);
    socket.on('error', onErrorCb);
    socket.on('debugLog', onDebugLogCb);
    socket.on('chatMessage', onChatMessageCb);
}

export function disconnectFromServer() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function emitCreateRoom(roomName: string, nickname: string, seed: string) {
    socket?.emit('createRoom', roomName, nickname, seed);
}

export function emitJoinRoom(roomId: string, nickname: string) {
    socket?.emit('joinRoom', roomId, nickname);
}

export function emitMovement(movement: any) {
    socket?.emit('movement', movement);
}

export function emitWorldUpdate(update: WorldUpdate) {
    socket?.emit('worldUpdate', update);
}

export function emitChatMessage(text: string) {
    socket?.emit('chatMessage', text);
}
