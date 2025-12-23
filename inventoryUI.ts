
// inventoryUI.ts: Отрисовка UI инвентаря
import { Item } from './types';
import { HOTBAR_SIZE, INVENTORY_SIZE, ICONS } from './constants';
import { getLocalPlayer } from './state';
import { drawCharacterPreview } from './renderer';
import { 
    getInventory, 
    selectedSlotIndex, 
    isDragging, 
    dragSourceIndex, 
    isInventoryOpen, 
    isWorkbenchActive, 
    onSlotMouseDown, 
    unequipArmor, 
    tryCraft 
} from './inventory';
import { RECIPES } from './recipes';

export function renderHotbar(els: any) {
    if (!els) return;
    const inv = getInventory();
    els.hotbar.innerHTML = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
        els.hotbar.appendChild(createSlotElement(i, true, inv[i]));
    }
}

export function createSlotElement(index: number, isActiveHotbar: boolean = false, item: Item | null): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'modern-slot';
    if (isActiveHotbar && index === selectedSlotIndex) div.classList.add('active');
    div.dataset.index = index.toString();
    if (item && !(isDragging && dragSourceIndex === index)) {
        div.innerHTML = `<div class="item-icon">${item.icon}</div><div class="item-count">${item.count}</div>`;
        div.title = item.type;
    }
    div.addEventListener('mousedown', (e) => onSlotMouseDown(e, index));
    return div;
}

export function renderRecipes(els: any, countItem: (t: string) => number) {
    if (!els) return;
    els.recipeList.innerHTML = '';
    if (isWorkbenchActive) {
         const header = document.createElement('div');
         header.className = 'text-center text-xs font-bold text-emerald-400 mb-2 border-b border-emerald-500/30 pb-1';
         header.textContent = "ВЕРСТАК АКТИВЕН";
         els.recipeList.appendChild(header);
    }
    RECIPES.forEach(recipe => {
        const stationReq = recipe.station === 'workbench';
        if (stationReq && !isWorkbenchActive) return;
        const div = document.createElement('div');
        let canCraft = true;
        for (const cost of recipe.cost) if (countItem(cost.type) < cost.count) canCraft = false;
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

export function renderArmorSlots(els: any) {
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
        } else el.onclick = null;
    };
    renderSlot(els.slotHead, 'head', me.equipment.head);
    renderSlot(els.slotBody, 'body', me.equipment.body);
    renderSlot(els.slotLegs, 'legs', me.equipment.legs);
}

export function renderInventoryUI(els: any, countItem: (t: string) => number) {
    if (!els) return;
    const inv = getInventory();
    renderHotbar(els);
    if (isInventoryOpen) {
        els.grid.innerHTML = '';
        els.hotbarMirror.innerHTML = '';
        for (let i = HOTBAR_SIZE; i < INVENTORY_SIZE; i++) els.grid.appendChild(createSlotElement(i, false, inv[i]));
        for (let i = 0; i < HOTBAR_SIZE; i++) els.hotbarMirror.appendChild(createSlotElement(i, false, inv[i]));
        renderArmorSlots(els);
        renderRecipes(els, countItem);
        if (els.previewCtx) {
            const me = getLocalPlayer();
            if (me) drawCharacterPreview(els.previewCtx, me);
        }
    }
}
