
// debug.ts: Секретная панель отладки
import { gameState } from './state';
import { addItem, getInventory, resetInventory } from './inventory';
import { ICONS } from './constants';

export function initDebugLogic(els: any) {
    window.addEventListener('keydown', (e) => {
        if (e.shiftKey && e.code === 'F2') toggleDebugPanel(els);
    });

    let triggerClicks = 0;
    els.debugTriggerArea?.addEventListener('click', () => {
        triggerClicks++;
        if (triggerClicks >= 3) { toggleDebugPanel(els); triggerClicks = 0; }
        setTimeout(() => triggerClicks = 0, 1000);
    });

    let isDragging = false;
    let offset = { x: 0, y: 0 };
    els.debugHeader?.addEventListener('mousedown', (e: MouseEvent) => {
        isDragging = true;
        offset.x = e.clientX - els.debugPanel.offsetLeft;
        offset.y = e.clientY - els.debugPanel.offsetTop;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
        if (!isDragging) return;
        els.debugPanel.style.left = (e.clientX - offset.x) + 'px';
        els.debugPanel.style.top = (e.clientY - offset.y) + 'px';
        els.debugPanel.style.right = 'auto';
    });
    window.addEventListener('mouseup', () => isDragging = false);

    els.debugMinimizeBtn?.addEventListener('click', () => {
        els.debugPanel.style.display = 'none';
        els.debugMinimized.style.display = 'block';
    });

    els.debugMinimized?.addEventListener('click', () => {
        els.debugPanel.style.display = 'block';
        els.debugMinimized.style.display = 'none';
    });

    // Отрисовка кастомной дебаг-панели
    const debugContent = document.getElementById('debug-content');
    if (debugContent) {
        debugContent.innerHTML = `
            <div class="flex items-center justify-between mb-4 p-2 bg-slate-900 rounded border border-slate-800">
                <span class="text-[10px] font-bold text-slate-400 uppercase">God Mode</span>
                <input type="checkbox" id="debug-god-mode-toggle" class="w-4 h-4 accent-emerald-500">
            </div>

            <div class="flex items-center justify-between mb-4 p-2 bg-slate-900 rounded border border-slate-800">
                <span class="text-[10px] font-bold text-slate-400 uppercase">Test World Mode</span>
                <input type="checkbox" id="debug-test-world-toggle" class="w-4 h-4 accent-blue-500">
            </div>

            <span class="debug-label">Time Control</span>
            <div class="grid grid-cols-2 gap-1 mb-4">
                <button class="debug-btn time-set" data-time="6000">☀️ Day</button>
                <button class="debug-btn time-set" data-time="14000">🌅 Sunset</button>
                <button class="debug-btn time-set" data-time="18000">🌑 Night</button>
                <button class="debug-btn" id="debug-time-pause">⏸ Pause</button>
            </div>

            <span class="debug-label">System</span>
            <button id="debug-refill-stats" class="debug-btn">❤️ Refill Stats</button>
            <button id="debug-give-all" class="debug-btn active">🎒 GIVE ALL ITEMS</button>
            <button id="debug-toggle-grid" class="debug-btn">🌐 Toggle Grid</button>

            <span class="debug-label">Quick Spawn</span>
            <div id="debug-spawn-list" class="grid grid-cols-4 gap-1 max-h-[150px] overflow-y-auto custom-scroll p-1 bg-black/20 rounded">
            </div>
        `;

        // Заполняем список всех предметов
        const spawnList = document.getElementById('debug-spawn-list');
        if (spawnList) {
            Object.keys(ICONS).forEach(key => {
                if (key === 'default') return;
                const btn = document.createElement('button');
                btn.className = 'debug-btn text-lg p-0 h-10';
                btn.innerHTML = ICONS[key];
                btn.title = key;
                btn.onclick = () => addItem(key, 32);
                spawnList.appendChild(btn);
            });
        }

        // Обработчики кнопок времени
        document.querySelectorAll('.time-set').forEach(btn => {
            btn.addEventListener('click', () => {
                gameState.worldTime = parseInt((btn as HTMLElement).dataset.time || '6000');
            });
        });

        document.getElementById('debug-time-pause')?.addEventListener('click', (e) => {
            gameState.isTimePaused = !gameState.isTimePaused;
            (e.target as HTMLElement).textContent = gameState.isTimePaused ? '▶ Resume' : '⏸ Pause';
        });

        document.getElementById('debug-test-world-toggle')?.addEventListener('change', (e: any) => {
            gameState.useTestWorld = e.target.checked;
        });

        document.getElementById('debug-give-all')?.addEventListener('click', () => {
            resetInventory();
            Object.keys(ICONS).forEach(key => {
                if (key !== 'default') addItem(key, 64);
            });
        });

        document.getElementById('debug-god-mode-toggle')?.addEventListener('change', (e: any) => {
            gameState.debug.godMode = e.target.checked;
        });

        document.getElementById('debug-refill-stats')?.addEventListener('click', () => {
            const me = gameState.players[gameState.localPlayerId];
            if (me && me.stats) {
                me.stats.hp = me.stats.maxHp;
                me.stats.energy = me.stats.maxEnergy;
                me.stats.hunger = me.stats.maxHunger;
            }
        });

        document.getElementById('debug-toggle-grid')?.addEventListener('click', () => {
            gameState.showDebugGrid = !gameState.showDebugGrid;
        });

        // Синхронизация галочки при открытии панели
        const testToggle = document.getElementById('debug-test-world-toggle') as HTMLInputElement;
        if (testToggle) testToggle.checked = gameState.useTestWorld;
        const godToggle = document.getElementById('debug-god-mode-toggle') as HTMLInputElement;
        if (godToggle) godToggle.checked = gameState.debug.godMode;
    }

    setInterval(() => {
        if (gameState.debug.godMode) {
            const me = gameState.players[gameState.localPlayerId];
            if (me && me.stats) {
                me.stats.hp = me.stats.maxHp; me.stats.energy = me.stats.maxEnergy; me.stats.hunger = me.stats.maxHunger;
            }
        }
    }, 500);
}

function toggleDebugPanel(els: any) {
    const isVisible = els.debugPanel.style.display === 'block';
    if (isVisible) els.debugPanel.style.display = 'none';
    else { 
        els.debugPanel.style.display = 'block'; 
        els.debugMinimized.style.display = 'none';
        // Обновляем галочки при открытии
        const testToggle = document.getElementById('debug-test-world-toggle') as HTMLInputElement;
        if (testToggle) testToggle.checked = gameState.useTestWorld;
    }
}
