
// inventory.ts: Логика инвентаря и управление его UI
import { Item, Player } from './types';
import { INVENTORY_SIZE, HOTBAR_SIZE, ICONS } from './constants';
import { gameState, getLocalPlayer } from './state';
import { drawCharacterPreview } from './renderer';

// Локальное состояние UI
let selectedSlotIndex = 0;
let isDragging = false;
let dragSourceIndex: number | null = null;
export let isInventoryOpen = false;

// Определение рецептов
interface Recipe {
    name: string;
    output: { type: string, count: number };
    cost: { type: string, count: number }[];
}

const RECIPES: Recipe[] = [
    {
        name: 'Остр. Галька',
        output: { type: 'sharp_pebble', count: 1 },
        cost: [{ type: 'pebble', count: 2 }]
    },
    {
        name: 'Рубило',
        output: { type: 'sharp_rock', count: 1 },
        cost: [{ type: 'rock', count: 2 }]
    },
    {
        name: 'Веревка',
        output: { type: 'rope', count: 1 },
        cost: [{ type: 'bark', count: 3 }]
    },
    {
        name: 'Кам. Топор',
        output: { type: 'stone_axe', count: 1 },
        cost: [
            { type: 'stick', count: 1 },
            { type: 'sharp_rock', count: 1 },
            { type: 'rope', count: 1 }
        ]
    },
    {
        name: 'Доски',
        output: { type: 'plank', count: 4 },
        cost: [{ type: 'wood', count: 1 }]
    },
    {
        name: 'Верстак',
        output: { type: 'workbench', count: 1 },
        cost: [{ type: 'plank', count: 4 }]
    }
];

// DOM Элементы
let els: {
    hotbar: HTMLElement,
    modal: HTMLElement,
    grid: HTMLElement,
    hotbarMirror: HTMLElement,
    ghost: HTMLElement,
    slotHead: HTMLElement,
    slotBody: HTMLElement,
    slotLegs: HTMLElement,
    slotWeapon: HTMLElement,
    slotOffhand: HTMLElement,
    slotBoots: HTMLElement,
    previewCanvas: HTMLCanvasElement,
    previewCtx: CanvasRenderingContext2D | null,
    recipeList: HTMLElement
} | null = null;

export function initInventory() {
    els = {
        hotbar: document.getElementById('hotbar')!,
        modal: document.getElementById('inventory-modal')!,
        grid: document.getElementById('inventory-grid')!,
        hotbarMirror: document.getElementById('hotbar-mirror')!,
        ghost: document.getElementById('drag-ghost')!,
        slotHead: document.getElementById('slot-head')!,
        slotBody: document.getElementById('slot-body')!,
        slotLegs: document.getElementById('slot-legs')!,
        slotWeapon: document.getElementById('slot-weapon')!,
        slotOffhand: document.getElementById('slot-offhand')!,
        slotBoots: document.getElementById('slot-boots')!,
        previewCanvas: document.getElementById('char-preview-canvas') as HTMLCanvasElement,
        previewCtx: (document.getElementById('char-preview-canvas') as HTMLCanvasElement).getContext('2d'),
        recipeList: document.getElementById('recipe-list')!
    };
    
    document.getElementById('btn-inventory-close')?.addEventListener('click', toggleInventory);
    window.addEventListener('mousemove', (e) => { if (isDragging) updateGhostPos(e); });
    window.addEventListener('mouseup', handleMouseUp);
}

// Получаем массив слотов НАПРЯМУЮ из игрока. 
// Это делает систему готовой к сохранениям и онлайну.
function getInventory(): (Item | null)[] {
    const me = getLocalPlayer();
    if (!me) return [];
    // Если инвентаря нет или он пуст (например пришел с сервера пустым), инициализируем
    if (!me.inventory || me.inventory.length !== INVENTORY_SIZE) {
        me.inventory = new Array(INVENTORY_SIZE).fill(null);
    }
    return me.inventory;
}

export function resetInventory() {
    const me = getLocalPlayer();
    if (me) {
        me.inventory = new Array(INVENTORY_SIZE).fill(null);
    }
    renderInventoryUI();
}

export function getSelectedItem(): Item | null {
    const inv = getInventory();
    return inv[selectedSlotIndex] || null;
}

export function syncInventoryWithServer(serverInv: any) {
    // В будущем здесь будет сложная логика слияния (merge),
    // но пока мы просто доверяем серверу или локальному состоянию в зависимости от режима.
    // Так как структура теперь едина (Item[]), синхронизация становится тривиальной заменой массива.
}

export function addItem(type: string, count: number) {
    const inv = getInventory();
    let remaining = count;
    const icon = ICONS[type] || ICONS['default'];
    
    // 1. Стакаем в существующие слоты
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (remaining <= 0) break;
        const slot = inv[i];
        if (slot && slot.type === type && slot.count < 64) {
            const space = 64 - slot.count;
            const add = Math.min(space, remaining);
            slot.count += add;
            remaining -= add;
        }
    }
    
    // 2. Кладем в пустые слоты
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (remaining <= 0) break;
        if (inv[i] === null) {
            const add = Math.min(64, remaining);
            inv[i] = { type, count: add, icon };
            remaining -= add;
        }
    }

    // ВАЖНО: Мы изменили объект игрока по ссылке (inv), так что состояние обновлено глобально.
    renderInventoryUI();
    
    // Визуальное обновление только хотбара, если инвентарь закрыт
    if (!isInventoryOpen && els) {
        renderHotbar();
    }
}

function removeItem(type: string, count: number) {
    const inv = getInventory();
    let remaining = count;
    
    // Ищем с конца, чтобы тратить последние стаки
    for (let i = INVENTORY_SIZE - 1; i >= 0; i--) {
        if (remaining <= 0) break;
        const slot = inv[i];
        if (slot && slot.type === type) {
            if (slot.count > remaining) {
                slot.count -= remaining;
                remaining = 0;
            } else {
                remaining -= slot.count;
                inv[i] = null;
            }
        }
    }
    renderInventoryUI();
    if (!isInventoryOpen) renderHotbar();
}

function countItem(type: string): number {
    const inv = getInventory();
    let total = 0;
    for (const slot of inv) {
        if (slot && slot.type === type) total += slot.count;
    }
    return total;
}

export function toggleInventory() {
    if (!els) return;
    isInventoryOpen = !isInventoryOpen;
    if (isInventoryOpen) {
        els.modal.classList.remove('hidden');
        renderInventoryUI();
        updatePreview();
    } else {
        els.modal.classList.add('hidden');
        if (isDragging) { isDragging = false; els.ghost.style.display = 'none'; renderInventoryUI(); }
    }
}

export function handleHotbarKey(index: number) {
    selectedSlotIndex = index;
    renderHotbar();
}

// Функция для циклического переключения хотбара (Q/E)
export function cycleHotbar(direction: number) {
    selectedSlotIndex += direction;
    // Зацикливаем (wrap around)
    if (selectedSlotIndex < 0) selectedSlotIndex = HOTBAR_SIZE - 1;
    if (selectedSlotIndex >= HOTBAR_SIZE) selectedSlotIndex = 0;
    renderHotbar();
}

// --- LOGIC: CRAFTING ---

function tryCraft(recipe: Recipe) {
    // 1. Проверка
    for (const cost of recipe.cost) {
        if (countItem(cost.type) < cost.count) return; 
    }
    // 2. Списание
    for (const cost of recipe.cost) {
        removeItem(cost.type, cost.count);
    }
    // 3. Выдача
    addItem(recipe.output.type, recipe.output.count);
}

// --- RENDER UI ---

function renderRecipes() {
    if (!els) return;
    els.recipeList.innerHTML = '';
    
    RECIPES.forEach(recipe => {
        const div = document.createElement('div');
        let canCraft = true;
        for (const cost of recipe.cost) {
            if (countItem(cost.type) < cost.count) canCraft = false;
        }

        div.className = `recipe-item ${canCraft ? 'can-craft' : 'cannot-craft'}`;
        const outIcon = ICONS[recipe.output.type] || ICONS['default'];
        const costStr = recipe.cost.map(c => `${c.count} ${ICONS[c.type] || c.type}`).join(', ');

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">${outIcon}</span>
                <div class="flex flex-col">
                    <span class="font-bold text-sm text-slate-200">${recipe.name}</span>
                    <span class="text-xs text-slate-400">Нужно: ${costStr}</span>
                </div>
            </div>
            ${canCraft ? '<span class="text-emerald-400 text-xs font-bold">OK</span>' : ''}
        `;
        if (canCraft) div.addEventListener('click', () => tryCraft(recipe));
        els.recipeList.appendChild(div);
    });
}

function renderHotbar() {
    if (!els) return;
    const inv = getInventory();
    els.hotbar.innerHTML = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        els.hotbar.appendChild(createSlotElement(i, true, inv[i]));
    }
}

function renderInventoryUI() {
    if (!els) return;
    const inv = getInventory();
    
    renderHotbar(); // Обновляем HUD

    if (isInventoryOpen) {
        els.grid.innerHTML = '';
        els.hotbarMirror.innerHTML = '';
        
        for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) {
            els.grid.appendChild(createSlotElement(i, false, inv[i]));
        }
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            els.hotbarMirror.appendChild(createSlotElement(i, false, inv[i]));
        }
        
        renderArmorSlots();
        renderRecipes();
        updatePreview();
    }
}

function createSlotElement(index: number, isActiveHotbar: boolean = false, item: Item | null): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'modern-slot';
    if (isActiveHotbar && index === selectedSlotIndex) div.classList.add('active');
    div.dataset.index = index.toString();

    // Не рендерим предмет, если мы его сейчас перетаскиваем (он в "призраке")
    if (item && !(isDragging && dragSourceIndex === index)) {
        div.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-count">${item.count}</div>`;
        div.title = item.type;
    }

    div.addEventListener('mousedown', (e) => onSlotMouseDown(e, index));
    return div;
}

function renderArmorSlots() {
    if (!els) return;
    const me = getLocalPlayer();
    if (!me || !me.equipment) return;

    const renderSlot = (el: HTMLElement, part: string, type: string | null) => {
        const bgIcon = el.querySelector('.armor-bg-icon');
        el.innerHTML = '';
        if (bgIcon) el.appendChild(bgIcon);

        if (type) {
            let displayIcon = '🛡️';
            if (type.includes('head')) displayIcon = ICONS['iron_helm'];
            if (type.includes('body')) displayIcon = ICONS['iron_chest'];
            if (type.includes('legs')) displayIcon = ICONS['iron_legs'];

            el.innerHTML += `<div class="item-icon">${displayIcon}</div>`;
            el.onclick = () => unequipArmor(part as 'head'|'body'|'legs');
        } else {
            el.onclick = null;
        }
    };

    renderSlot(els.slotHead, 'head', me.equipment.head);
    renderSlot(els.slotBody, 'body', me.equipment.body);
    renderSlot(els.slotLegs, 'legs', me.equipment.legs);
}

function updatePreview() {
    if (!isInventoryOpen || !els || !els.previewCtx) return;
    const me = getLocalPlayer();
    if (me) drawCharacterPreview(els.previewCtx, me);
}

// --- LOGIC: Armor & Dragging ---

function unequipArmor(part: 'head' | 'body' | 'legs') {
    const me = getLocalPlayer();
    if (!me) return;
    const armorType = me.equipment[part];
    if (!armorType) return;
    
    // Ищем свободное место
    const inv = getInventory();
    let freeSlot = -1;
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (inv[i] === null) { freeSlot = i; break; }
    }

    if (freeSlot !== -1) {
        me.equipment[part] = null;
        let icon = ICONS['default'];
        if (armorType.includes('head')) icon = ICONS['iron_helm'];
        if (armorType.includes('body')) icon = ICONS['iron_chest'];
        if (armorType.includes('legs')) icon = ICONS['iron_legs'];

        inv[freeSlot] = { type: armorType, count: 1, icon };
        renderInventoryUI();
    }
}

function equipArmor(item: Item, slotIndex: number) {
    const me = getLocalPlayer();
    if (!me) return;
    const inv = getInventory();
    
    let part: 'head' | 'body' | 'legs' | null = null;
    if (item.type.includes('head') || item.type.includes('helm')) part = 'head';
    else if (item.type.includes('body') || item.type.includes('chest')) part = 'body';
    else if (item.type.includes('legs')) part = 'legs';

    if (part) {
        const currentArmor = me.equipment[part];
        if (currentArmor) {
            // Swap
            let icon = ICONS['default'];
            if (currentArmor.includes('head')) icon = ICONS['iron_helm'];
            if (currentArmor.includes('body')) icon = ICONS['iron_chest'];
            if (currentArmor.includes('legs')) icon = ICONS['iron_legs'];
            inv[slotIndex] = { type: currentArmor, count: 1, icon };
        } else {
            inv[slotIndex] = null;
        }
        me.equipment[part] = item.type;
        renderInventoryUI();
    }
}

function onSlotMouseDown(e: MouseEvent, index: number) {
    if (e.button !== 0 || !els) return;
    const inv = getInventory();
    const item = inv[index];
    if (!item) return;

    if (e.shiftKey) {
        equipArmor(item, index);
        return;
    }

    isDragging = true;
    dragSourceIndex = index;
    els.ghost.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-count">${item.count}</div>`;
    els.ghost.style.display = 'flex';
    updateGhostPos(e);
    renderInventoryUI();
}

function updateGhostPos(e: MouseEvent) {
    if (!els) return;
    els.ghost.style.left = (e.clientX - 26) + 'px';
    els.ghost.style.top = (e.clientY - 26) + 'px';
}

function handleMouseUp(e: MouseEvent) {
    if (!isDragging || !els) return;
    const inv = getInventory();
    
    const target = e.target as HTMLElement;
    const slotDiv = target.closest('.modern-slot') as HTMLElement;
    
    if (slotDiv && slotDiv.dataset.index && dragSourceIndex !== null) {
        const targetIndex = parseInt(slotDiv.dataset.index);
        
        if (targetIndex !== dragSourceIndex) {
            const srcItem = inv[dragSourceIndex];
            const tgtItem = inv[targetIndex];
            
            if (srcItem) {
                 if (tgtItem && tgtItem.type === srcItem.type) {
                     // Stack merge
                    const total = tgtItem.count + srcItem.count;
                    if (total <= 64) { 
                        tgtItem.count = total; 
                        inv[dragSourceIndex] = null; 
                    } else { 
                        tgtItem.count = 64; 
                        srcItem.count = total - 64; 
                    }
                } else {
                    // Swap
                    inv[dragSourceIndex] = tgtItem || null;
                    inv[targetIndex] = srcItem;
                }
            }
        }
    }
    
    isDragging = false;
    dragSourceIndex = null;
    els.ghost.style.display = 'none';
    renderInventoryUI();
}
