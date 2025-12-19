// index.tsx: Связывает все вместе, управляет UI, сетевым взаимодействием и игровым циклом.
import { init as initGame, renderGame, getTile, destroyTile, canMoveTo, TILE_SIZE } from './game';
import { initInput } from './input';
import { Players, RoomInfo, Movement, Player, TileType } from './types';

interface Socket {
  id: string;
  on(event: string, callback: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): this;
  connect(): void;
  disconnect(): void;
}
declare const io: (url: string, options?: any) => Socket;

document.addEventListener('DOMContentLoaded', () => {
    // --- UI ЭЛЕМЕНТЫ ---
    const startScreen = document.getElementById('start-screen') as HTMLDivElement;
    const onlineMenu = document.getElementById('online-menu') as HTMLDivElement;
    const gameContainer = document.getElementById('game-container') as HTMLDivElement;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    // Кнопки главного меню
    const btnOnline = document.getElementById('btn-online') as HTMLButtonElement;
    const btnOffline = document.getElementById('btn-offline') as HTMLButtonElement;
    const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
    const btnBackMenu = document.getElementById('btn-back-menu') as HTMLButtonElement;

    // Элементы Онлайн меню
    const onlineCountSpan = document.getElementById('online-count') as HTMLSpanElement;
    const nicknameInput = document.getElementById('nickname-input') as HTMLInputElement;
    const roomNameInput = document.getElementById('room-name-input') as HTMLInputElement;
    const createRoomButton = document.getElementById('create-room-button') as HTMLButtonElement;
    const roomListContainer = document.getElementById('room-list-container') as HTMLDivElement;
    const noRoomsMessage = document.getElementById('no-rooms-message') as HTMLParagraphElement;

    // UI в игре
    const inventoryUI = document.getElementById('inventory-ui') as HTMLDivElement;
    const stoneCountSpan = document.getElementById('stone-count') as HTMLSpanElement;
    const woodCountSpan = document.getElementById('wood-count') as HTMLSpanElement;

    // Состояние клиента
    let players: Players = {};
    let localInventory = { stone: 0, wood: 0 };
    let isOffline = false;
    let localPlayerId = 'offline-player';
    
    // Подключение к серверу
    let socket: Socket | null = null;
    
    const movement: Movement = initInput(canvas, handleMouseClick);

    // --- ФУНКЦИИ РАЗМЕРА ЭКРАНА ---
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);


    // --- НАВИГАЦИЯ ПО МЕНЮ ---

    function showStartScreen() {
        startScreen.classList.remove('hidden');
        onlineMenu.classList.add('hidden');
        gameContainer.classList.add('hidden');
        // Если мы были подключены, отключаемся
        if (socket) {
            socket.disconnect();
            socket = null;
        }
    }

    function showOnlineMenu() {
        startScreen.classList.add('hidden');
        onlineMenu.classList.remove('hidden');
        // Инициируем подключение
        connectToServer();
    }

    btnOnline.addEventListener('click', showOnlineMenu);
    
    btnOffline.addEventListener('click', () => {
        isOffline = true;
        startGameOffline();
    });

    btnBackMenu.addEventListener('click', showStartScreen);

    btnSettings.addEventListener('click', () => {
        alert("Настройки пока в разработке!");
    });

    // --- ЛОГИКА ОНЛАЙН МЕНЮ ---

    function updateLobbyButtons() {
        const hasNickname = nicknameInput.value.trim().length > 0;
        createRoomButton.disabled = !hasNickname;
        
        document.querySelectorAll<HTMLButtonElement>('.join-room-button').forEach(btn => {
            btn.disabled = !hasNickname;
            if (!hasNickname) {
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    }

    nicknameInput.addEventListener('input', updateLobbyButtons);

    createRoomButton.addEventListener('click', () => {
        if (!socket) return;
        const roomName = roomNameInput.value.trim();
        const nickname = nicknameInput.value.trim();
        socket.emit('createRoom', roomName, nickname);
    });

    // --- УПРАВЛЕНИЕ ИГРОЙ ---

    function startGame(initialPlayers: Players, playerId: string) {
        startScreen.classList.add('hidden');
        onlineMenu.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        
        // Устанавливаем размер canvas на весь экран при старте
        resizeCanvas();

        players = initialPlayers;
        if(players[playerId].inventory) {
            localInventory = players[playerId].inventory;
        }

        initGame(canvas, players[playerId]);
        gameLoop();
    }
    
    function startGameOffline() {
        // Генерируем случайного гостя
        const nickname = "Guest_" + Math.floor(Math.random() * 1000);
        localPlayerId = 'offline_hero';
        
        const player: Player = {
            id: localPlayerId,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            nickname: nickname,
            inventory: { stone: 0, wood: 0 }
        };
        startGame({ [localPlayerId]: player }, localPlayerId);
    }
    
    // --- СЕТЕВОЕ ВЗАИМОДЕЙСТВИЕ ---

    function connectToServer() {
        if (socket) return; // Уже подключены
        
        // ВАЖНО: autoConnect: true по умолчанию, но мы создаем объект только здесь
        socket = io("https://rgp-game.onrender.com");
        
        socket.on('connect', () => {
            console.log('Connected to server with ID:', socket!.id);
            localPlayerId = socket!.id;
        });

        socket.on('onlineCount', (count: number) => {
            onlineCountSpan.textContent = String(count);
        });

        socket.on('roomList', (rooms: RoomInfo[]) => {
            roomListContainer.innerHTML = '';
            if (rooms.length === 0) {
                roomListContainer.appendChild(noRoomsMessage);
                noRoomsMessage.classList.remove('hidden');
            } else {
                if (noRoomsMessage) noRoomsMessage.classList.add('hidden');
                rooms.forEach(room => {
                    const roomElement = document.createElement('div');
                    // Обновлены стили для темной темы
                    roomElement.className = 'flex justify-between items-center p-4 bg-slate-900 border border-slate-700 rounded-xl mb-2 hover:border-slate-500 transition group';
                    roomElement.innerHTML = `
                        <div>
                            <span class="font-bold text-slate-200 group-hover:text-white transition">${room.name}</span>
                            <span class="text-slate-500 text-sm ml-2 font-mono">(${room.players}/10)</span>
                        </div>
                        <button data-room-id="${room.id}" class="join-room-button bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-5 rounded-lg transition disabled:bg-slate-700 disabled:text-slate-500">
                            Войти
                        </button>
                    `;
                    roomListContainer.appendChild(roomElement);
                });
                
                // Перепривязываем обработчики (так как DOM обновился)
                updateLobbyButtons();
            }
        });

        // Делегирование событий для кнопок "Войти"
        roomListContainer.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            if (target.matches('.join-room-button')) {
                const roomId = target.getAttribute('data-room-id');
                const nickname = nicknameInput.value.trim();
                
                if (!nickname) {
                    nicknameInput.focus();
                    nicknameInput.classList.add('border-red-500');
                    setTimeout(() => nicknameInput.classList.remove('border-red-500'), 500);
                    return;
                }

                if (roomId && socket) {
                    socket.emit('joinRoom', roomId, nickname);
                }
            }
        });

        socket.on('gameStart', (initialPlayers: Players) => {
            isOffline = false;
            startGame(initialPlayers, socket!.id);
        });
        
        socket.on('state', (serverPlayers: Players) => {
            players = serverPlayers;
        });

        socket.on('error', (message: string) => {
            alert(`Ошибка: ${message}`);
        });
    }


    // --- ОБРАБОТКА ВВОДА ---

    function handleMouseClick(mouseX: number, mouseY: number) {
        const me = players[localPlayerId];
        if (!me) return;

        const cameraX = me.x - canvas.width / 2;
        const cameraY = me.y - canvas.height / 2;
        const worldX = mouseX + cameraX;
        const worldY = mouseY + cameraY;
        const clickedTileX = Math.floor(worldX / TILE_SIZE);
        const clickedTileY = Math.floor(worldY / TILE_SIZE);
        const playerTileX = Math.floor(me.x / TILE_SIZE);
        const playerTileY = Math.floor(me.y / TILE_SIZE);
        const distance = Math.sqrt(Math.pow(playerTileX - clickedTileX, 2) + Math.pow(playerTileY - clickedTileY, 2));

        if (distance > 2.0) return; // Чуть увеличил радиус копания

        const tileType = getTile(clickedTileX, clickedTileY);
        if (tileType === 'tree') {
            destroyTile(clickedTileX, clickedTileY);
            localInventory.wood++;
        } else if (tileType === 'stone') {
            destroyTile(clickedTileX, clickedTileY);
            localInventory.stone++;
        }
    }

    // --- ИГРОВОЙ ЦИКЛ ---

    function gameLoop() {
        if (gameContainer.classList.contains('hidden')) return;
        
        const me = players[localPlayerId];
        if (me) {
            const SPEED = 5;
            const PLAYER_RADIUS = 20;

            if (isOffline) {
                // В оффлайн режиме двигаем игрока локально
                let dx = 0;
                let dy = 0;
                if (movement.up) dy -= SPEED;
                if (movement.down) dy += SPEED;
                if (movement.left) dx -= SPEED;
                if (movement.right) dx += SPEED;

                if (canMoveTo(me.x + dx, me.y + dy, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) {
                    me.x += dx;
                    me.y += dy;
                }
            } else {
                 // В онлайн режиме отправляем ввод на сервер
                const filteredMovement = { ...movement };
                if (filteredMovement.up && !canMoveTo(me.x, me.y - SPEED, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) filteredMovement.up = false;
                if (filteredMovement.down && !canMoveTo(me.x, me.y + SPEED, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) filteredMovement.down = false;
                if (filteredMovement.left && !canMoveTo(me.x - SPEED, me.y, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) filteredMovement.left = false;
                if (filteredMovement.right && !canMoveTo(me.x + SPEED, me.y, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) filteredMovement.right = false;
                socket?.emit('movement', filteredMovement);
            }
        }
        
        // Обновляем UI
        stoneCountSpan.textContent = String(localInventory.stone);
        woodCountSpan.textContent = String(localInventory.wood);

        renderGame(players, localPlayerId);
        requestAnimationFrame(gameLoop);
    }
});