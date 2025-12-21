
// network.ts: Управление сетевым соединением
import { Players, RoomInfo } from './types';

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
let onGameStartCb: (players: Players) => void = () => {};
let onStateCb: (players: Players) => void = () => {};
let onErrorCb: (msg: string) => void = () => {};

export function initNetwork(callbacks: {
    onConnect: (id: string) => void,
    onOnlineCount: (count: number) => void,
    onRoomList: (rooms: RoomInfo[]) => void,
    onGameStart: (players: Players) => void,
    onState: (players: Players) => void,
    onError: (msg: string) => void
}) {
    onConnectCb = callbacks.onConnect;
    onOnlineCountCb = callbacks.onOnlineCount;
    onRoomListCb = callbacks.onRoomList;
    onGameStartCb = callbacks.onGameStart;
    onStateCb = callbacks.onState;
    onErrorCb = callbacks.onError;
}

export function connectToServer() {
    if (socket) return;
    socket = io("https://rgp-game.onrender.com");
    socket.on('connect', () => onConnectCb(socket!.id));
    socket.on('onlineCount', onOnlineCountCb);
    socket.on('roomList', onRoomListCb);
    socket.on('gameStart', onGameStartCb);
    socket.on('state', onStateCb);
    socket.on('error', onErrorCb);
}

export function disconnectFromServer() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function emitCreateRoom(roomName: string, nickname: string) {
    socket?.emit('createRoom', roomName, nickname);
}

export function emitJoinRoom(roomId: string, nickname: string) {
    socket?.emit('joinRoom', roomId, nickname);
}

export function emitMovement(movement: any) {
    socket?.emit('movement', movement);
}
