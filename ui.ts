
// ui.ts: Управление экранами меню, лобби, настроек и ЧАТА
import { RoomInfo } from './types';
import { gameState } from './state';
import { connectToServer, emitCreateRoom, emitJoinRoom, disconnectFromServer, emitChatMessage } from './network';

let els: any = {};

// Callbacks для старта игры
let onStartOffline: () => void = () => {};

// CHAT STATE
export let isChatOpen = false;

// Генератор случайного числового сида (как в Minecraft)
// Возвращает строку от "-999999999" до "999999999"
function generateRandomSeed(): string {
    const min = -999999999;
    const max = 999999999;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

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
        roomSeedInput: document.getElementById('room-seed-input'),
        createRoomBtn: document.getElementById('create-room-button'),
        settingsModal: document.getElementById('settings-modal'),
        toggleTestWorld: document.getElementById('toggle-test-world'),
        toggleDebugGrid: document.getElementById('toggle-debug-grid'),
        seedInput: document.getElementById('seed-input'),
        // Chat
        chatInputWrapper: document.getElementById('chat-input-wrapper'),
        chatInput: document.getElementById('chat-input'),
        chatMessages: document.getElementById('chat-messages')
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
    
    // ЛОГИКА СОЗДАНИЯ КОМНАТЫ С СИДОМ
    els.createRoomBtn?.addEventListener('click', () => {
        // Если поле пустое, генерируем случайный числовой сид
        const rawSeed = els.roomSeedInput.value.trim();
        const specificSeed = rawSeed.length > 0 ? rawSeed : generateRandomSeed();
        
        emitCreateRoom(els.roomNameInput.value.trim(), els.nicknameInput.value.trim(), specificSeed);
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

    // CHAT Listeners
    els.chatInput?.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            const text = els.chatInput.value.trim();
            if (text.length > 0) {
                handleChatSend(text);
            }
            toggleChat(false);
            els.chatInput.value = '';
        }
        e.stopPropagation(); // Чтобы не срабатывали игровые бинды
    });
}

// --- CHAT LOGIC ---

export function toggleChat(forceState?: boolean) {
    if (typeof forceState !== 'undefined') {
        isChatOpen = forceState;
    } else {
        isChatOpen = !isChatOpen;
    }

    if (isChatOpen) {
        els.chatInputWrapper.style.display = 'block';
        els.chatInput.focus();
    } else {
        els.chatInputWrapper.style.display = 'none';
        els.chatInput.blur();
        // Возвращаем фокус на игру
        if (els.canvas) els.canvas.focus();
    }
}

export function addChatMessage(nickname: string, text: string, color: string = 'white', isSystem: boolean = false) {
    const div = document.createElement('div');
    div.className = `chat-message ${isSystem ? 'system' : ''}`;
    
    if (isSystem) {
         div.innerHTML = `<span>${text}</span>`;
    } else {
        // Экранирование HTML
        const safeNick = nickname.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        div.innerHTML = `<span style="color: ${color}; font-weight: bold;">${safeNick}:</span> <span style="color: #e2e8f0;">${safeText}</span>`;
    }

    els.chatMessages.appendChild(div);
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

    // Авто-удаление через 15 сек (опционально, но делает чат чище)
    setTimeout(() => {
        if (div.parentNode) {
            div.style.opacity = '0';
            div.style.transition = 'opacity 1s';
            setTimeout(() => div.remove(), 1000);
        }
    }, 15000);
}

function handleChatSend(text: string) {
    if (text.startsWith('/seed')) {
        // Локальная команда
        const seed = gameState.worldSeed;
        addChatMessage("SYSTEM", `Current Seed: ${seed}`, "#facc15", true);
        
        // Копирование в буфер
        navigator.clipboard.writeText(seed).then(() => {
            addChatMessage("SYSTEM", "(Copied to clipboard)", "#4ade80", true);
        }).catch(err => {
             console.error('Could not copy seed: ', err);
        });
        
    } else {
        // Обычное сообщение -> на сервер
        if (gameState.isOffline) {
            addChatMessage("YOU", text, "#fff");
            addChatMessage("SYSTEM", "Chat is disabled in offline mode.", "#ef4444", true);
        } else {
            emitChatMessage(text);
        }
    }
}

// --- SETTINGS LOGIC ---

function openSettings() { els.settingsModal.classList.remove('hidden'); }
function closeSettings() { els.settingsModal.classList.add('hidden'); }
function saveSettings() { 
    gameState.useTestWorld = els.toggleTestWorld.checked; 
    gameState.showDebugGrid = els.toggleDebugGrid.checked;
    
    const seedVal = els.seedInput.value.trim();
    
    // Если пользователь оставил поле пустым, мы пока сохраняем пустую строку,
    // чтобы при запуске сгенерировать случайный сид.
    // Если он ввел что-то - сохраняем это.
    gameState.worldSeed = seedVal; 
    
    closeSettings(); 
}

export function showStartScreen() {
    els.startScreen.classList.remove('hidden');
    els.onlineMenu.classList.add('hidden');
    els.gameContainer.classList.add('hidden');
    disconnectFromServer();
    // Очистка чата при выходе
    els.chatMessages.innerHTML = '';
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
