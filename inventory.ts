
// inventory.ts: Логика инвентаря
import { Item } from './types';
import { INVENTORY_SIZE, HOTBAR_SIZE, ICONS } from './constants';
import { getLocalPlayer } from './state';
import { renderInventoryUI, renderHotbar } from './inventoryUI';
import { Recipe } from './recipes';

export let selectedSlotIndex = 0;
export let isDragging = false;
export let dragSourceIndex: number | null = null;
export let isInventoryOpen = false;
export let isWorkbenchActive = false;

let els: any = null;

export function setWorkbenchActive(active: boolean) { isWorkbenchActive = active; }

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

export function getInventory(): (Item | null)[] {
    const me = getLocalPlayer();
    if (!me) return [];
    if (!me.inventory || me.inventory.length !== INVENTORY_SIZE) me.inventory = new Array(INVENTORY_SIZE).fill(null);
    return me.inventory;
}

export function resetInventory() {
    const me = getLocalPlayer();
    if (me) me.inventory = new Array(INVENTORY_SIZE).fill(null);
    renderInventoryUI(els, countItem);
}

export function getSelectedItem(): Item | null { return getInventory()[selectedSlotIndex] || null; }

export function syncInventoryWithServer(serverInv: any) {}

export function addItem(type: string, count: number) {
    const inv = getInventory();
    let remaining = count;
    const icon = ICONS[type] || ICONS['default'];
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        const slot = inv[i];
        if (slot && slot.type === type && slot.count < 64) {
            const add = Math.min(64 - slot.count, remaining);
            slot.count += add; remaining -= add;
        }
        if (remaining <= 0) break;
    }
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        if (remaining <= 0) break;
        if (inv[i] === null) { const add = Math.min(64, remaining); inv[i] = { type, count: add, icon }; remaining -= add; }
    }
    renderInventoryUI(els, countItem);
}

export function removeItem(type: string, count: number) {
    const inv = getInventory();
    let remaining = count;
    for (let i = INVENTORY_SIZE - 1; i >= 0; i--) {
        const slot = inv[i];
        if (slot && slot.type === type) {
            if (slot.count > remaining) { slot.count -= remaining; remaining = 0; }
            else { remaining -= slot.count; inv[i] = null; }
        }
        if (remaining <= 0) break;
    }
    renderInventoryUI(els, countItem);
}

export function countItem(type: string): number {
    return getInventory().reduce((acc, slot) => slot && slot.type === type ? acc + slot.count : acc, 0);
}

export function toggleInventory() {
    if (!els) return;
    isInventoryOpen = !isInventoryOpen;
    if (isInventoryOpen) { els.modal.classList.remove('hidden'); renderInventoryUI(els, countItem); }
    else { els.modal.classList.add('hidden'); setWorkbenchActive(false); if (isDragging) { isDragging = false; els.ghost.style.display = 'none'; renderInventoryUI(els, countItem); } }
}

export function handleHotbarKey(index: number) { selectedSlotIndex = index; renderHotbar(els); }

export function cycleHotbar(direction: number) {
    selectedSlotIndex = (selectedSlotIndex + direction + HOTBAR_SIZE) % HOTBAR_SIZE;
    renderHotbar(els);
}

export function tryCraft(recipe: Recipe) {
    if (recipe.station === 'workbench' && !isWorkbenchActive) return;
    for (const cost of recipe.cost) if (countItem(cost.type) < cost.count) return;
    for (const cost of recipe.cost) removeItem(cost.type, cost.count);
    addItem(recipe.output.type, recipe.output.count);
}

export function unequipArmor(part: 'head' | 'body' | 'legs') {
    const me = getLocalPlayer();
    if (!me) return;
    const armorType = me.equipment[part];
    if (!armorType) return;
    const inv = getInventory();
    const freeSlot = inv.findIndex(s => s === null);
    if (freeSlot !== -1) {
        me.equipment[part] = null;
        let icon = ICONS[armorType] || ICONS['default'];
        inv[freeSlot] = { type: armorType, count: 1, icon };
        renderInventoryUI(els, countItem);
    }
}

export function equipArmor(item: Item, slotIndex: number) {
    const me = getLocalPlayer();
    if (!me) return;
    let part: 'head'|'body'|'legs'|null = null;
    if (item.type.includes('head') || item.type.includes('helm')) part = 'head';
    else if (item.type.includes('body') || item.type.includes('chest')) part = 'body';
    else if (item.type.includes('legs')) part = 'legs';
    if (part) {
        const inv = getInventory();
        const currentArmor = me.equipment[part];
        if (currentArmor) inv[slotIndex] = { type: currentArmor, count: 1, icon: ICONS[currentArmor] || ICONS['default'] };
        else inv[slotIndex] = null;
        me.equipment[part] = item.type;
        renderInventoryUI(els, countItem);
    }
}

export function onSlotMouseDown(e: MouseEvent, index: number) {
    if (e.button !== 0 || !els) return;
    const item = getInventory()[index];
    if (!item) return;
    if (e.shiftKey) { equipArmor(item, index); return; }
    isDragging = true; dragSourceIndex = index;
    els.ghost.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-count">${item.count}</div>`;
    els.ghost.style.display = 'flex';
    updateGhostPos(e);
    renderInventoryUI(els, countItem);
}

function updateGhostPos(e: MouseEvent) {
    if (els) { els.ghost.style.left = (e.clientX - 26) + 'px'; els.ghost.style.top = (e.clientY - 26) + 'px'; }
}

function handleMouseUp(e: MouseEvent) {
    if (!isDragging || !els) return;
    const inv = getInventory();
    const target = e.target as HTMLElement;
    const slotDiv = target.closest('.modern-slot') as HTMLElement;
    if (slotDiv && slotDiv.dataset.index && dragSourceIndex !== null) {
        const targetIndex = parseInt(slotDiv.dataset.index);
        if (targetIndex !== dragSourceIndex) {
            const srcItem = inv[dragSourceIndex], tgtItem = inv[targetIndex];
            if (srcItem) {
                 if (tgtItem && tgtItem.type === srcItem.type) {
                    const total = tgtItem.count + srcItem.count;
                    if (total <= 64) { tgtItem.count = total; inv[dragSourceIndex] = null; }
                    else { tgtItem.count = 64; srcItem.count = total - 64; }
                } else { inv[dragSourceIndex] = tgtItem || null; inv[targetIndex] = srcItem; }
            }
        }
    }
    isDragging = false; dragSourceIndex = null; els.ghost.style.display = 'none';
    renderInventoryUI(els, countItem);
}
