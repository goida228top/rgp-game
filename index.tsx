
// index.tsx: Главная точка входа (Bootstrapper)
import { Players, Player, Direction } from './types';
import { TILE_SIZE } from './constants';
import { initInput, inputState } from './input';

// Modules
import { gameState, setPlayers, setLocalPlayerId, getLocalPlayer } from './state';
import { initRenderer, renderGame, adjustZoom, getCameraZoom, initRenderer as initCanvasCtx, addFloatingText } from './renderer';
import { generateAssets } from './assets';
import { initWorld, getInteractionType, destroyTileObject, dropItemOnGround, canMoveTo, tryPickupItem } from './world';
import { initInventory, addItem, syncInventoryWithServer, toggleInventory, handleHotbarKey, resetInventory, isInventoryOpen, getSelectedItem, cycleHotbar } from './inventory';
import { initUI, showGameScreen, updateOnlineCount, updateRoomList } from './ui';
import { initNetwork, emitMovement } from './network';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

// HUD Elements (Bars & Text)
const hudEls = {
    // Bars
    hp: document.getElementById('bar-hp-fill'),
    hunger: document.getElementById('bar-hunger-fill'),
    mana: document.getElementById('bar-mana-fill'),
    energy: document.getElementById('bar-energy-fill'),
    xp: document.getElementById('bar-xp-fill'),
    level: document.getElementById('level-val'),
    // Texts (Quantities)
    textHp: document.getElementById('text-hp'),
    textHunger: document.getElementById('text-hunger'),
    textMana: document.getElementById('text-mana'),
    textEnergy: document.getElementById('text-energy')
};

// Состояние майнинга
let miningStartTime = 0;
let miningTargetKey = "";
let currentMiningProgress = 0; // 0..1
let currentMiningTargetX = 0;
let currentMiningTargetY = 0;

const MINING_DURATION = 300; // мс

// Скорости
const WALK_SPEED = 3;
const SPRINT_SPEED = 6;

// FPS
let fps = 0;
let lastLoop = 0;
const fpsEl = document.getElementById('fps-counter');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация подсистем
    initCanvasCtx(canvas);
    generateAssets();
    initInventory();
    
    const movement = initInput(canvas);

    // 2. Инициализация UI и Сети
    initUI({
        onStartOffline: startGameOffline
    });

    initNetwork({
        onConnect: (id) => setLocalPlayerId(id),
        onOnlineCount: updateOnlineCount,
        onRoomList: updateRoomList,
        onGameStart: (players) => {
            gameState.isOffline = false;
            startGame(players, gameState.localPlayerId);
        },
        onState: (serverPlayers) => {
            setPlayers(serverPlayers);
            const me = serverPlayers[gameState.localPlayerId];
            if (me && me.inventory) syncInventoryWithServer(me.inventory);
        },
        onError: (msg) => alert(`Ошибка: ${msg}`)
    });

    // 3. Обработка ввода (глобальная)
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('wheel', (e) => {
        if (!gameContainer.classList.contains('hidden')) {
            e.preventDefault();
            adjustZoom(e.deltaY);
        }
    }, { passive: false });
    
    window.addEventListener('keydown', (e) => {
        const startScreen = document.getElementById('start-screen');
        if (startScreen && startScreen.classList.contains('hidden')) {
            // ИНВЕНТАРЬ: Tab или I
            if (e.code === 'Tab' || e.code === 'KeyI') {
                e.preventDefault();
                toggleInventory();
            }

            // ПЕРЕКЛЮЧЕНИЕ СЛОТОВ: Q (влево) / E (вправо)
            if (e.code === 'KeyQ') cycleHotbar(-1);
            if (e.code === 'KeyE') cycleHotbar(1);

            if (e.key >= '1' && e.key <= '9') {
                handleHotbarKey(parseInt(e.key) - 1);
            }
        }
    });

    function resizeCanvas() { 
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr; 
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        }
    }

    // 4. Логика старта игры
    function startGame(initialPlayers: Players, playerId: string) {
        setPlayers(initialPlayers);
        setLocalPlayerId(playerId);
        resetInventory();
        
        const me = initialPlayers[playerId];
        if (me && me.inventory) syncInventoryWithServer(me.inventory);

        initWorld(me.x, me.y);
        showGameScreen();
        resizeCanvas();
        if (fpsEl) fpsEl.classList.remove('hidden');
        gameLoop();
    }

    function startGameOffline() {
        const nickname = "Guest_" + Math.floor(Math.random() * 1000);
        const pid = 'offline_hero';
        const player: Player = {
            id: pid,
            x: window.innerWidth / 2, y: window.innerHeight / 2,
            color: '#fff',
            nickname: nickname,
            direction: 'front',
            inventory: [],
            // Убрана начальная броня
            equipment: { head: null, body: null, legs: null },
            // Инициализация статов (ВСЕ ПО 20, КРОМЕ XP)
            stats: {
                hp: 20, maxHp: 20,
                hunger: 20, maxHunger: 20,
                mana: 20, maxMana: 20,
                energy: 20, maxEnergy: 20,
                xp: 15, maxXp: 100,
                level: 1
            }
        };
        startGame({ [pid]: player }, pid);
    }

    // 5. Игровой цикл
    function handleMiningLogic(me: Player) {
        if (isInventoryOpen) {
            currentMiningProgress = 0;
            return;
        }
        
        const isMiningAction = inputState.isRightMouseDown || inputState.isLeftMouseDown;

        if (!isMiningAction) {
            miningTargetKey = "";
            miningStartTime = 0;
            currentMiningProgress = 0;
            return;
        }

        const zoom = getCameraZoom(); 
        const screenCX = window.innerWidth / 2;
        const screenCY = window.innerHeight / 2;
        const worldX = (inputState.mouseX - screenCX) / zoom + me.x;
        const worldY = (inputState.mouseY - screenCY) / zoom + me.y;
        
        // 1. Попытка поднять предмет (ПРИОРИТЕТ)
        const itemType = tryPickupItem(worldX, worldY);
        if (itemType) {
            addItem(itemType, 1);
            addFloatingText(worldX, worldY - 20, `+1 ${itemType}`, '#4ade80');
            return; 
        }

        // 2. Логика разрушения тайлов
        const targetTileX = Math.floor(worldX / TILE_SIZE);
        const targetTileY = Math.floor(worldY / TILE_SIZE);
        const playerTileX = Math.floor(me.x / TILE_SIZE);
        const playerTileY = Math.floor(me.y / TILE_SIZE);
        
        const dist = Math.sqrt(Math.pow(playerTileX - targetTileX, 2) + Math.pow(playerTileY - targetTileY, 2));
        if (dist > 4.0) {
             currentMiningProgress = 0;
             return; 
        }

        const objectType = getInteractionType(targetTileX, targetTileY); // Получаем объект на тайле
        const key = `${targetTileX},${targetTileY}`;
        const activeItem = getSelectedItem();
        const activeType = activeItem ? activeItem.type : 'hand';

        const TIER_1_TOOLS = ['sharp_pebble', 'sharp_rock', 'stone_axe'];
        const TIER_2_TOOLS = ['sharp_rock', 'stone_axe'];

        // --- ИНИЦИАЛИЗАЦИЯ ---
        if (miningTargetKey !== key) {
            miningTargetKey = key;
            miningStartTime = Date.now();
            
            if (objectType === 'tree' && !TIER_2_TOOLS.includes(activeType)) {
                 addFloatingText(worldX, worldY, "Need Sharp Tool", '#ef4444');
            } else if (objectType === 'stone' && !TIER_1_TOOLS.includes(activeType)) {
                addFloatingText(worldX, worldY, "Need Sharp Tool", '#ef4444');
            }
        }

        // --- РАСЧЕТ ПРОГРЕССА ---
        if (objectType !== 'grass' && objectType !== 'water' && objectType !== 'none') {
            const elapsed = Date.now() - miningStartTime;
            currentMiningProgress = Math.min(elapsed / MINING_DURATION, 1.0);
            currentMiningTargetX = targetTileX;
            currentMiningTargetY = targetTileY;
        } else {
            currentMiningProgress = 0;
        }

        // --- ДЕЙСТВИЕ ---
        if (Date.now() - miningStartTime < MINING_DURATION) return;
        
        miningStartTime = Date.now(); 

        const tileWorldX = targetTileX * TILE_SIZE + TILE_SIZE/2;
        const tileWorldY = targetTileY * TILE_SIZE + TILE_SIZE/2;

        if (objectType === 'high_grass') {
            destroyTileObject(targetTileX, targetTileY);
            if (Math.random() < 0.3) {
                 const drop = Math.random() > 0.5 ? 'stick' : 'pebble';
                 dropItemOnGround(targetTileX, targetTileY, drop); // Падает на землю тайла
                 addFloatingText(tileWorldX, tileWorldY - 20, `Drop: ${drop}`, '#fff');
            }
        }
        else if (objectType === 'tree') {
            if (activeType === 'sharp_rock') {
                addItem('bark', 1);
                addFloatingText(tileWorldX, tileWorldY - 40, "+1 Bark", '#d97706');
            } else if (activeType === 'stone_axe') {
                destroyTileObject(targetTileX, targetTileY);
                addItem('wood', 2);
                addFloatingText(tileWorldX, tileWorldY - 40, "+2 Logs", '#fff');
            }
        }
        else if (objectType === 'stone') {
            if (TIER_1_TOOLS.includes(activeType)) {
                destroyTileObject(targetTileX, targetTileY);
                addItem('rock', 1);
                addFloatingText(tileWorldX, tileWorldY - 20, "+1 Rock", '#94a3b8');
            }
        }
    }

    function gameLoop() {
        if (gameContainer.classList.contains('hidden')) return;
        
        const now = performance.now();
        const delta = now - lastLoop;
        lastLoop = now;
        if (delta > 0) {
            const currentFps = 1000 / delta;
            fps = fps * 0.9 + currentFps * 0.1;
            if (fpsEl && Math.random() < 0.1) { 
                fpsEl.textContent = `FPS: ${Math.round(fps)}`;
                fpsEl.style.color = fps < 30 ? '#ef4444' : (fps < 50 ? '#fcd34d' : '#4ade80');
            }
        }

        const me = getLocalPlayer();
        
        if (me) {
            handleMiningLogic(me);

            // --- РАСЧЕТ СКОРОСТИ ---
            // 1. Управление энергией
            let canSprint = false;
            if (me.stats) {
                // Если пытаемся бежать
                if (movement.sprint && me.stats.energy > 0) {
                    canSprint = true;
                    me.stats.energy -= 0.2; // Тратим энергию (медленнее для 20 единиц)
                    if (me.stats.energy < 0) me.stats.energy = 0;
                } else if (!movement.sprint) {
                    // Если не бежим, восстанавливаем энергию
                    if (me.stats.energy < me.stats.maxEnergy) {
                        me.stats.energy += 0.1;
                    }
                }
            }

            // 2. Базовая скорость
            let currentSpeed = canSprint ? SPRINT_SPEED : WALK_SPEED;
            
            // 3. Модификаторы местности
            const tileX = Math.floor(me.x / TILE_SIZE);
            const tileY = Math.floor(me.y / TILE_SIZE);
            const currentTileData = getInteractionType(tileX, tileY); 
            
            // В воде скорость делится на 2 (и шаг, и бег)
            if (currentTileData === 'water') {
                currentSpeed *= 0.5;
            }

            const PLAYER_RADIUS = 16;
            let dx = 0, dy = 0;
            let newDir: Direction = me.direction;
            
            if (movement.up) { dy -= currentSpeed; newDir = 'back'; }
            if (movement.down) { dy += currentSpeed; newDir = 'front'; }
            if (movement.left) { dx -= currentSpeed; newDir = 'left'; }
            if (movement.right) { dx += currentSpeed; newDir = 'right'; }
            
            if (dx !== 0 || dy !== 0) { 
                me.direction = newDir; 
                (window as any).isLocalMoving = true; 
            } else { 
                (window as any).isLocalMoving = false; 
            }
            
            if (gameState.isOffline) { 
                // Sliding Movement Logic
                
                // 1. Проверяем движение по X
                if (dx !== 0 && canMoveTo(me.x + dx, me.y, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) {
                    me.x += dx;
                }
                
                // 2. Проверяем движение по Y
                if (dy !== 0 && canMoveTo(me.x, me.y + dy, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2)) {
                    me.y += dy;
                }
            } else { 
                const filteredMovement = { ...movement, sprint: canSprint }; 
                emitMovement(filteredMovement);
            }

            // --- ОБНОВЛЕНИЕ HUD ---
            if (me.stats) {
                // Обновляем ширину полосок
                if (hudEls.hp) hudEls.hp.style.width = `${(me.stats.hp / me.stats.maxHp) * 100}%`;
                if (hudEls.hunger) hudEls.hunger.style.width = `${(me.stats.hunger / me.stats.maxHunger) * 100}%`;
                if (hudEls.mana) hudEls.mana.style.width = `${(me.stats.mana / me.stats.maxMana) * 100}%`;
                if (hudEls.energy) hudEls.energy.style.width = `${(me.stats.energy / me.stats.maxEnergy) * 100}%`;
                if (hudEls.xp) hudEls.xp.style.width = `${(me.stats.xp / me.stats.maxXp) * 100}%`;
                
                // Обновляем текст (округляем до целого)
                if (hudEls.textHp) hudEls.textHp.textContent = String(Math.floor(me.stats.hp));
                if (hudEls.textHunger) hudEls.textHunger.textContent = String(Math.floor(me.stats.hunger));
                if (hudEls.textMana) hudEls.textMana.textContent = String(Math.floor(me.stats.mana));
                if (hudEls.textEnergy) hudEls.textEnergy.textContent = String(Math.floor(me.stats.energy));
                
                if (hudEls.level) hudEls.level.textContent = String(me.stats.level);
            }
        }
        
        // Передаем флаг спринта (movement.sprint) и реальную возможность бежать (me.stats.energy > 0)
        // Но для камеры используем просто намерение игрока или факт бега
        const isSprintingEffective = movement.sprint && me?.stats && me.stats.energy > 0;
        
        renderGame(currentMiningProgress, currentMiningTargetX, currentMiningTargetY, !!isSprintingEffective);
        requestAnimationFrame(gameLoop);
    }
});
