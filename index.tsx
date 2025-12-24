
// index.tsx: Главная точка входа
import { Players, Player, Direction } from './types';
import { TILE_SIZE } from './constants';
import { initInput, inputState } from './input';

// Modules
import { gameState, setPlayers, setLocalPlayerId, getLocalPlayer } from './state';
import { initRenderer, renderGame, adjustZoom, getCameraZoom, addFloatingText, resetCamera } from './renderer';
import { generateAssets } from './assets';
import { initWorld, applyWorldUpdate, canMoveTo, isPositionInWater } from './world';
import { updateDoorPhysics } from './physics'; 
import { initInventory, syncInventoryWithServer, toggleInventory, handleHotbarKey, resetInventory, isInventoryOpen, getSelectedItem, cycleHotbar } from './inventory';
import { initUI, showGameScreen, updateOnlineCount, updateRoomList } from './ui';
import { initNetwork, emitMovement } from './network';
import { isChatOpen, toggleChat, addChatMessage } from './chat';
import { handleInteraction, currentMiningProgress, currentMiningTargetX, currentMiningTargetY, placementRotation, setPlacementRotation } from './interaction';
import { PLAYER_COLORS } from './assetHuman';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

const hudEls = {
    hp: document.getElementById('bar-hp-fill'),
    hunger: document.getElementById('bar-hunger-fill'),
    mana: document.getElementById('bar-mana-fill'),
    energy: document.getElementById('bar-energy-fill'),
    xp: document.getElementById('bar-xp-fill'),
    level: document.getElementById('level-val'),
    textHp: document.getElementById('text-hp'),
    textHunger: document.getElementById('text-hunger'),
    textMana: document.getElementById('text-mana'),
    textEnergy: document.getElementById('text-energy')
};

const BASE_WALK_SPEED = 3;
const BASE_SPRINT_SPEED = 6;
let fps = 0;
let lastLoop = 0;
let isGameRunning = false;
const fpsEl = document.getElementById('fps-counter');
let lastRotateTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    initRenderer(canvas);
    generateAssets();
    initInventory();
    
    // Сразу устанавливаем размеры канваса, чтобы избежать проблем с координатами
    resizeCanvas();
    
    const movement = initInput(canvas);

    initUI({ onStartOffline: startGameOffline });

    initNetwork({
        onConnect: (id) => setLocalPlayerId(id),
        onOnlineCount: updateOnlineCount,
        onRoomList: updateRoomList,
        onGameStart: (players, worldChanges, seed) => {
            gameState.isOffline = false;
            if (seed) gameState.worldSeed = seed;
            if (worldChanges) worldChanges.forEach(update => applyWorldUpdate(update));
            startGame(players, gameState.localPlayerId);
            addChatMessage("SYSTEM", `Welcome to Terra Wilds! Seed: ${gameState.worldSeed}`, "#fbbf24", true);
        },
        onState: (serverPlayers, serverTime) => {
            const me = getLocalPlayer();
            const serverMe = serverPlayers[gameState.localPlayerId];
            
            // Синхронизация времени с сервера
            if (typeof serverTime === 'number') {
                gameState.worldTime = serverTime;
            }

            if (me && serverMe) {
                if (serverMe.inventory) syncInventoryWithServer(serverMe.inventory);
                if (serverMe.stats) {
                    me.stats.hp = serverMe.stats.hp;
                    me.stats.maxHp = serverMe.stats.maxHp;
                    me.stats.hunger = serverMe.stats.hunger;
                    me.stats.xp = serverMe.stats.xp;
                    me.stats.level = serverMe.stats.level;
                    if (Math.abs(me.stats.energy - serverMe.stats.energy) > 5) me.stats.energy = serverMe.stats.energy;
                }
                const dist = Math.sqrt(Math.pow(me.x - serverMe.x, 2) + Math.pow(me.y - serverMe.y, 2));
                if (dist > 150) { 
                    me.x = serverMe.x; 
                    me.y = serverMe.y;
                    // Если произошла телепортация (первая синхронизация), сбрасываем камеру в renderer
                    resetCamera(me.x, me.y);
                }
                else serverPlayers[gameState.localPlayerId] = me;
            }
            setPlayers(serverPlayers);
        },
        onWorldUpdate: (update) => applyWorldUpdate(update),
        onError: (msg) => alert(`Ошибка: ${msg}`),
        onDebugLog: (msg) => console.error(msg),
        onChatMessage: (data) => addChatMessage(data.nickname, data.text, data.color)
    });

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('wheel', (e) => {
        if (!gameContainer.classList.contains('hidden')) { e.preventDefault(); adjustZoom(e.deltaY); }
    }, { passive: false });
    
    window.addEventListener('keydown', (e) => {
        const startScreen = document.getElementById('start-screen');
        if (startScreen && startScreen.classList.contains('hidden')) {
            if (!isChatOpen && (e.code === 'Enter' || e.code === 'KeyT')) { e.preventDefault(); toggleChat(true); return; }
            if (e.code === 'Escape') { if (isChatOpen) toggleChat(false); else if (isInventoryOpen) toggleInventory(); return; }
            if (isChatOpen) return;
            if (e.code === 'Tab') { e.preventDefault(); toggleInventory(); }
            if (e.code === 'KeyQ') cycleHotbar(-1);
            if (e.code === 'KeyE') cycleHotbar(1);
            if (e.key >= '1' && e.key <= '9') handleHotbarKey(parseInt(e.key) - 1);
        }
    });

    function resizeCanvas() { 
        const dpr = window.devicePixelRatio || 1;
        // Округляем до целых для избежания субпиксельных артефактов
        const w = Math.floor(window.innerWidth * dpr);
        const h = Math.floor(window.innerHeight * dpr);
        
        // Обновляем только если размеры изменились
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; 
            canvas.height = h;
            canvas.style.width = window.innerWidth + 'px'; 
            canvas.style.height = window.innerHeight + 'px';
            const ctx = canvas.getContext('2d');
            if (ctx) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; }
        }
    }

    function startGame(initialPlayers: Players, playerId: string) {
        setPlayers(initialPlayers);
        setLocalPlayerId(playerId);
        resetInventory();
        const me = initialPlayers[playerId];
        if (me && me.inventory) syncInventoryWithServer(me.inventory);
        initWorld(me.x, me.y);
        showGameScreen();
        resizeCanvas();
        resetCamera(me.x, me.y); // Центрируем камеру на старте (включит snapFrames)
        if (fpsEl) fpsEl.classList.remove('hidden');
        
        // Запускаем цикл только если он еще не запущен
        if (!isGameRunning) {
            isGameRunning = true;
            gameLoop();
        }
    }

    function startGameOffline() {
        const pid = 'offline_hero';
        if (!gameState.worldSeed || gameState.worldSeed === 'terrawilds') gameState.worldSeed = Math.floor(Math.random() * 1999999999 - 999999999).toString();
        const player: Player = {
            id: pid, x: 0, y: 0, 
            color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)], 
            nickname: "Explorer", direction: 'front',
            inventory: [], equipment: { head: null, body: null, legs: null },
            stats: { hp: 20, maxHp: 20, hunger: 20, maxHunger: 20, mana: 20, maxMana: 20, energy: 20, maxEnergy: 20, xp: 0, maxXp: 100, level: 1 }
        };
        startGame({ [pid]: player }, pid);
        if (gameState.useTestWorld) {
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) debugPanel.style.display = 'block';
            addChatMessage("DEV", "ТЕСТОВЫЙ МИР: Бесконечные ресурсы и респавн включены.", "#60a5fa", true);
        } else {
            addChatMessage("AI", "Мир готов! Смена дня и ночи запущена. Загляни в дебаг-меню (/debug) для управления временем!", "#10b981");
        }
    }

    function gameLoop() {
        if (gameContainer.classList.contains('hidden')) {
            isGameRunning = false;
            return;
        }
        
        // Легковесная проверка изменения размера окна (например, на мобильных при скрытии адресной строки)
        const dpr = window.devicePixelRatio || 1;
        if (Math.abs(canvas.width - window.innerWidth * dpr) > 10) {
            resizeCanvas();
        }

        const now = performance.now();
        const delta = now - lastLoop;
        lastLoop = now;

        // Продвижение времени (только в офлайне, в онлайне берем с сервера)
        if (gameState.isOffline && !gameState.isTimePaused) {
            gameState.worldTime = (gameState.worldTime + 5) % 24000;
        }

        const me = getLocalPlayer();
        if (me) {
            if (movement.rotate && now - lastRotateTime > 200) { setPlacementRotation((placementRotation + 1) % 4); lastRotateTime = now; }
            handleInteraction(me);
            updateDoorPhysics(); 
            let canSprint = false; let currentSpeed = BASE_WALK_SPEED; let dx = 0, dy = 0; let newDir: Direction = me.direction;
            if (!isChatOpen) {
                if (me.stats) {
                    if (movement.sprint && me.stats.energy > 0) { canSprint = true; me.stats.energy -= 0.15; }
                    else if (!movement.sprint && me.stats.energy < me.stats.maxEnergy) me.stats.energy += 0.1;
                }
                currentSpeed = (canSprint ? BASE_SPRINT_SPEED : BASE_WALK_SPEED) * gameState.debug.speedMult;
                if (isPositionInWater(me.x, me.y)) currentSpeed *= 0.5;
                if (movement.up) { dy -= currentSpeed; newDir = 'back'; }
                if (movement.down) { dy += currentSpeed; newDir = 'front'; }
                if (movement.left) { dx -= currentSpeed; newDir = 'left'; }
                if (movement.right) { dx += currentSpeed; newDir = 'right'; }
            }
            if (dx !== 0 || dy !== 0) { 
                me.direction = newDir; (window as any).isLocalMoving = true; 
                if (dx !== 0 && canMoveTo(me.x + dx, me.y, 32, 32)) me.x += dx;
                if (dy !== 0 && canMoveTo(me.x, me.y + dy, 32, 32)) me.y += dy;
            } else (window as any).isLocalMoving = false;
            if (!gameState.isOffline) emitMovement({ x: me.x, y: me.y, direction: me.direction, sprint: canSprint });
            if (me.stats && hudEls.hp) {
                hudEls.hp.style.width = `${(me.stats.hp / me.stats.maxHp) * 100}%`;
                hudEls.hunger!.style.width = `${(me.stats.hunger / me.stats.maxHunger) * 100}%`;
                hudEls.mana!.style.width = `${(me.stats.mana / me.stats.maxMana) * 100}%`;
                hudEls.energy!.style.width = `${(me.stats.energy / me.stats.maxEnergy) * 100}%`;
                hudEls.xp!.style.width = `${(me.stats.xp / me.stats.maxXp) * 100}%`;
                hudEls.textHp!.textContent = String(Math.floor(me.stats.hp));
                hudEls.textHunger!.textContent = String(Math.floor(me.stats.hunger));
                hudEls.textEnergy!.textContent = String(Math.floor(me.stats.energy));
                hudEls.level!.textContent = String(me.stats.level);
            }
        }
        renderGame(currentMiningProgress, currentMiningTargetX, currentMiningTargetY, !isChatOpen && movement.sprint && me?.stats && me.stats.energy > 0);
        requestAnimationFrame(gameLoop);
    }
});
