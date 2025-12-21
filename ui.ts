
// ui.ts: Управление экранами меню, лобби и настроек
import { RoomInfo } from './types';
import { gameState } from './state';
import { connectToServer, emitCreateRoom, emitJoinRoom, disconnectFromServer } from './network';

let els: any = {};

// Callbacks для старта игры
let onStartOffline: () => void = () => {};

export function initUI(callbacks: { onStartOffline: () => void }) {
    onStartOffline = callbacks.onStartOffline;
    
    // Кэшируем элементы
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
        createRoomBtn: document.getElementById('create-room-button'),
        settingsModal: document.getElementById('settings-modal'),
        toggleTestWorld: document.getElementById('toggle-test-world'),
        toggleDebugGrid: document.getElementById('toggle-debug-grid'),
        seedInput: document.getElementById('seed-input'),
    };

    // Слушатели кнопок
    document.getElementById('btn-online')?.addEventListener('click', showOnlineMenu);
    document.getElementById('btn-offline')?.addEventListener('click', () => { 
        gameState.isOffline = true; 
        onStartOffline(); 
    });
    document.getElementById('btn-settings')?.addEventListener('click', openSettings);
    document.getElementById('btn-settings-close')?.addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
    document.getElementById('btn-back-menu')?.addEventListener('click', showStartScreen);
    
    els.nicknameInput?.addEventListener('input', updateLobbyButtons);
    els.createRoomBtn?.addEventListener('click', () => {
        // Передаем текущий сид из настроек
        emitCreateRoom(els.roomNameInput.value.trim(), els.nicknameInput.value.trim(), gameState.worldSeed);
    });

    els.roomList?.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.join-room-button')) {
            const roomId = target.getAttribute('data-room-id');
            const nickname = els.nicknameInput.value.trim();
            if (!nickname) { els.nicknameInput.focus(); return; }
            if (roomId) emitJoinRoom(roomId, nickname);
        }
    });
}

function openSettings() { els.settingsModal.classList.remove('hidden'); }
function closeSettings() { els.settingsModal.classList.add('hidden'); }
function saveSettings() { 
    gameState.useTestWorld = els.toggleTestWorld.checked; 
    gameState.showDebugGrid = els.toggleDebugGrid.checked;
    // Сохраняем сид. Если пустой - дефолтный
    const seedVal = els.seedInput.value.trim();
    gameState.worldSeed = seedVal.length > 0 ? seedVal : 'terrawilds';
    closeSettings(); 
}

export function showStartScreen() {
    els.startScreen.classList.remove('hidden');
    els.onlineMenu.classList.add('hidden');
    els.gameContainer.classList.add('hidden');
    disconnectFromServer();
}

function showOnlineMenu() {
    els.startScreen.classList.add('hidden');
    els.onlineMenu.classList.remove('hidden');
    connectToServer();
}

export function showGameScreen() {
    els.startScreen.classList.add('hidden');
    els.onlineMenu.classList.add('hidden');
    els.gameContainer.classList.remove('hidden');
}

export function updateOnlineCount(count: number) {
    if (els.onlineCount) els.onlineCount.textContent = String(count);
}

export function updateRoomList(rooms: RoomInfo[]) {
    els.roomList.innerHTML = '';
    if (rooms.length === 0) {
        els.roomList.appendChild(els.noRoomsMsg);
        els.noRoomsMsg.classList.remove('hidden');
    } else {
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
    document.querySelectorAll<HTMLButtonElement>('.join-room-button').forEach(btn => {
        btn.disabled = !hasNickname;
        if (!hasNickname) btn.classList.add('opacity-50', 'cursor-not-allowed'); 
        else btn.classList.remove('opacity-50', 'cursor-not-allowed');
    });
}
