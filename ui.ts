
// ui.ts: Управление экранами меню и лобби
import { RoomInfo } from './types';
import { gameState } from './state';
import { connectToServer, emitCreateRoom, emitJoinRoom, disconnectFromServer } from './network';
import { initDebugLogic } from './debug';
import { toggleChat, handleChatSend } from './chat';

let els: any = {};
let onStartOffline: () => void = () => {};

function generateRandomSeed(): string {
    return Math.floor(Math.random() * 1999999999 - 999999999).toString();
}

export function initUI(callbacks: { onStartOffline: () => void }) {
    onStartOffline = callbacks.onStartOffline;
    els = {
        startScreen: document.getElementById('start-screen'),
        onlineMenu: document.getElementById('online-menu'),
        gameContainer: document.getElementById('game-container'),
        canvas: document.getElementById('game-canvas'),
        onlineCount: document.getElementById('online-count'),
        roomList: document.getElementById('room-list-container'),
        noRoomsMsg: document.getElementById('no-rooms-message'),
        nicknameInput: document.getElementById('nickname-input'),
        roomNameInput: document.getElementById('room-name-input'),
        roomSeedInput: document.getElementById('room-seed-input'),
        createRoomBtn: document.getElementById('create-room-button'),
        settingsModal: document.getElementById('settings-modal'),
        seedInput: document.getElementById('seed-input'),
        testWorldToggle: document.getElementById('test-world-toggle'),
        chatInputWrapper: document.getElementById('chat-input-wrapper'),
        chatInput: document.getElementById('chat-input'),
        chatMessages: document.getElementById('chat-messages'),
        debugPanel: document.getElementById('debug-panel'),
        debugHeader: document.getElementById('debug-header'),
        debugMinimized: document.getElementById('debug-minimized'),
        debugMinimizeBtn: document.getElementById('debug-minimize-btn'),
        debugTriggerArea: document.getElementById('debug-trigger-area'),
        godModeToggle: document.getElementById('debug-god-mode-toggle')
    };

    document.getElementById('btn-online')?.addEventListener('click', showOnlineMenu);
    document.getElementById('btn-offline')?.addEventListener('click', () => { gameState.isOffline = true; onStartOffline(); });
    document.getElementById('btn-settings')?.addEventListener('click', () => {
        if (els.seedInput) els.seedInput.value = gameState.worldSeed;
        if (els.testWorldToggle) els.testWorldToggle.checked = gameState.useTestWorld;
        els.settingsModal.classList.remove('hidden');
    });
    document.getElementById('btn-settings-close')?.addEventListener('click', () => els.settingsModal.classList.add('hidden'));
    document.getElementById('btn-save-settings')?.addEventListener('click', () => { 
        gameState.worldSeed = els.seedInput.value.trim(); 
        gameState.useTestWorld = els.testWorldToggle.checked;
        els.settingsModal.classList.add('hidden'); 
    });
    document.getElementById('btn-back-menu')?.addEventListener('click', showStartScreen);
    els.nicknameInput?.addEventListener('input', updateLobbyButtons);
    els.createRoomBtn?.addEventListener('click', () => {
        const rawSeed = els.roomSeedInput.value.trim();
        emitCreateRoom(els.roomNameInput.value.trim(), els.nicknameInput.value.trim(), rawSeed.length > 0 ? rawSeed : generateRandomSeed());
    });
    els.roomList?.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.join-room-button')) {
            const roomId = target.getAttribute('data-room-id'), nickname = els.nicknameInput.value.trim();
            if (!nickname) { els.nicknameInput.focus(); return; }
            if (roomId) emitJoinRoom(roomId, nickname);
        }
    });
    els.chatInput?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            const text = (els.chatInput as HTMLInputElement).value.trim();
            if (text.length > 0) handleChatSend(text);
            toggleChat(false);
            (els.chatInput as HTMLInputElement).value = '';
        }
        e.stopPropagation(); 
    });
    initDebugLogic(els);
}

export function showStartScreen() {
    els.startScreen.classList.remove('hidden');
    els.onlineMenu.classList.add('hidden');
    els.gameContainer.classList.add('hidden');
    disconnectFromServer();
    els.chatMessages.innerHTML = '';
}

function showOnlineMenu() { els.startScreen.classList.add('hidden'); els.onlineMenu.classList.remove('hidden'); connectToServer(); }

export function showGameScreen() { els.startScreen.classList.add('hidden'); els.onlineMenu.classList.add('hidden'); els.gameContainer.classList.remove('hidden'); }

export function updateOnlineCount(count: number) { if (els.onlineCount) els.onlineCount.textContent = String(count); }

export function updateRoomList(rooms: RoomInfo[]) {
    els.roomList.innerHTML = '';
    if (rooms.length === 0) { els.roomList.appendChild(els.noRoomsMsg); els.noRoomsMsg.classList.remove('hidden'); }
    else {
        els.noRoomsMsg.classList.add('hidden');
        rooms.forEach((room: RoomInfo) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-4 bg-slate-900 border border-slate-700 rounded-xl mb-2 hover:border-slate-500 transition group';
            div.innerHTML = `<div><span class="font-bold text-slate-200 group-hover:text-white transition">${room.name}</span> <span class="text-slate-500 text-sm ml-2 font-mono">(${room.players}/10)</span></div><button data-room-id="${room.id}" class="join-room-button bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg transition disabled:bg-slate-700 disabled:text-slate-500">Войти</button>`;
            els.roomList.appendChild(div);
        });
        updateLobbyButtons();
    }
}

function updateLobbyButtons() {
    const hasNickname = els.nicknameInput.value.trim().length > 0;
    els.createRoomBtn.disabled = !hasNickname;
    document.querySelectorAll<HTMLButtonElement>('.join-room-button').forEach(btn => { btn.disabled = !hasNickname; });
}
