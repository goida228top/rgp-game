
// interaction.ts: Обработка кликов, добычи и строительства
import { Player, ObjectType } from './types';
import { TILE_SIZE } from './constants';
import { gameState, getLocalPlayer } from './state';
import { getCameraZoom, addFloatingText } from './renderer';
import { inputState } from './input';
import { getInteractionType, tryPickupItem, pickupItemAt, canPlaceObject, placeObject, placeFloor, destroyTileObject, dropItemOnGround } from './world';
import { getSelectedItem, setWorkbenchActive, toggleInventory, addItem, isInventoryOpen } from './inventory';
import { isChatOpen } from './chat';
import { emitWorldUpdate } from './network';

export let placementRotation = 0;
export function setPlacementRotation(val: number) { placementRotation = val; }

let miningStartTime = 0;
let miningTargetKey = "";
export let currentMiningProgress = 0;
export let currentMiningTargetX = 0;
export let currentMiningTargetY = 0;
let miningDuration = 300;
let lastInteractionTime = 0;

export function handleInteraction(me: Player) {
    if (isInventoryOpen || isChatOpen) {
        currentMiningProgress = 0;
        return;
    }
    const zoom = getCameraZoom(); 
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;
    const worldX = (inputState.mouseX - screenCX) / zoom + me.x;
    const worldY = (inputState.mouseY - screenCY) / zoom + me.y;
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const tileWorldX = tileX * TILE_SIZE + TILE_SIZE/2;
    const tileWorldY = tileY * TILE_SIZE + TILE_SIZE/2;
    const objectType = getInteractionType(tileX, tileY);
    const activeItem = getSelectedItem();

    if (inputState.isLeftMouseDown) {
        if (Date.now() - lastInteractionTime > 250) {
            if (objectType === 'workbench') {
                const pTileX = Math.floor(me.x / TILE_SIZE);
                const pTileY = Math.floor(me.y / TILE_SIZE);
                const dist = Math.sqrt((pTileX - tileX)**2 + (pTileY - tileY)**2);
                if (dist < 2.0) {
                    setWorkbenchActive(true);
                    toggleInventory();
                    lastInteractionTime = Date.now();
                    inputState.isLeftMouseDown = false; 
                    return;
                }
            }
            if (tryPickupItem(worldX, worldY)) {
                const item = pickupItemAt(tileX, tileY);
                if (item) {
                    addItem(item, 1);
                    addFloatingText(worldX, worldY - 20, `+1 ${item}`, '#4ade80');
                    if (!gameState.isOffline) emitWorldUpdate({ x: tileX, y: tileY, action: 'pickup_item' });
                }
                lastInteractionTime = Date.now();
                return; 
            }
            if (objectType === 'tree') {
                 if (Math.random() < 0.4) { 
                     addItem('stick', 1);
                     addFloatingText(tileWorldX, tileWorldY - 40, "+1 Stick", '#d4c5a3');
                 } else addFloatingText(tileWorldX, tileWorldY - 40, "*shake*", '#ffffffaa');
                 lastInteractionTime = Date.now();
                 return;
            }
            
            // СТРОИТЕЛЬСТВО
            if (activeItem && (activeItem.type === 'plywood' || activeItem.type === 'workbench' || activeItem.type === 'wall_item' || activeItem.type === 'door_item')) {
                 const isFloor = activeItem.type === 'plywood';
                 if (canPlaceObject(tileX, tileY, isFloor)) {
                     if (isFloor) {
                        placeFloor(tileX, tileY);
                        addItem('plywood', -1);
                        if (!gameState.isOffline) emitWorldUpdate({ x: tileX, y: tileY, action: 'place_floor' });
                        lastInteractionTime = Date.now();
                        return;
                     } else {
                        let placeType: ObjectType | null = null;
                        if (activeItem.type === 'workbench') placeType = 'workbench';
                        if (activeItem.type === 'wall_item' || activeItem.type === 'door_item') {
                            const prefix = activeItem.type === 'wall_item' ? 'wall_wood_' : 'door_wood_';
                            if (placementRotation === 0) placeType = (prefix + 't') as ObjectType;
                            else if (placementRotation === 1) placeType = (prefix + 'r') as ObjectType;
                            else if (placementRotation === 2) placeType = (prefix + 'b') as ObjectType;
                            else if (placementRotation === 3) placeType = (prefix + 'l') as ObjectType;
                        }
                        if (placeType) {
                            placeObject(tileX, tileY, placeType);
                            addItem(activeItem.type, -1);
                            if (!gameState.isOffline) emitWorldUpdate({ x: tileX, y: tileY, action: 'place_object', data: placeType });
                            lastInteractionTime = Date.now();
                            return;
                        }
                     }
                 }
            }
        }
        return;
    }

    if (!inputState.isRightMouseDown) {
        miningTargetKey = ""; miningStartTime = 0; currentMiningProgress = 0;
        return;
    }

    const playerTileX = Math.floor(me.x / TILE_SIZE);
    const playerTileY = Math.floor(me.y / TILE_SIZE);
    const dist = Math.sqrt(Math.pow(playerTileX - tileX, 2) + Math.pow(playerTileY - tileY, 2));
    if (dist > 4.0) { currentMiningProgress = 0; return; }

    const key = `${tileX},${tileY}`;
    const activeType = activeItem ? activeItem.type : 'hand';
    const TIER_1_TOOLS = ['sharp_pebble', 'sharp_rock', 'stone_axe'];

    let duration = 300; 
    if (objectType === 'tree' && activeType === 'stone_axe') duration = 1500;
    if (objectType === 'big_rock') duration = 2000;
    if (objectType === 'floor_wood') duration = 500;

    if (miningTargetKey !== key) {
        miningTargetKey = key; miningStartTime = Date.now(); miningDuration = duration;
        if (objectType === 'stone' && !TIER_1_TOOLS.includes(activeType)) addFloatingText(worldX, worldY, "Need Sharp Tool", '#ef4444');
        if (objectType === 'big_rock' && activeType !== 'stone_axe') {
             if (!TIER_1_TOOLS.includes(activeType)) addFloatingText(worldX, worldY, "Hard Rock!", '#ef4444');
        }
        if (objectType === 'tree' && activeType !== 'stone_axe') addFloatingText(worldX, worldY, "Need Axe to Chop", '#ef4444');
    }

    const isMinable = (
        objectType === 'high_grass' ||
        (objectType === 'tree' && activeType === 'stone_axe') || 
        (objectType === 'tree' && activeType === 'sharp_rock') || 
        (objectType === 'stone' && TIER_1_TOOLS.includes(activeType)) ||
        (objectType === 'big_rock' && TIER_1_TOOLS.includes(activeType)) ||
        objectType.startsWith('wall_wood') || 
        objectType.startsWith('door_wood') || 
        objectType === 'floor_wood' ||
        objectType === 'workbench'
    );

    if (isMinable) {
        const elapsed = Date.now() - miningStartTime;
        currentMiningProgress = Math.min(elapsed / miningDuration, 1.0);
        currentMiningTargetX = tileX;
        currentMiningTargetY = tileY;
    } else currentMiningProgress = 0;

    if (currentMiningProgress < 1.0) return;
    miningStartTime = Date.now(); 

    const syncDrop = (tX: number, tY: number, iType: string, count: number = 1) => {
        for(let i=0; i<count; i++) dropItemOnGround(tX, tY, iType); 
        if (!gameState.isOffline) for(let i=0; i<count; i++) emitWorldUpdate({ x: tX, y: tY, action: 'place_item', data: iType });
    };
    
    // Универсальная функция удаления с учетом слоев
    const syncDestroy = (tX: number, tY: number, type: string) => {
        const isFloor = type === 'floor_wood';
        destroyTileObject(tX, tY);
        if (!gameState.isOffline) {
            if (isFloor) emitWorldUpdate({ x: tX, y: tY, action: 'destroy_floor' });
            else emitWorldUpdate({ x: tX, y: tY, action: 'destroy_object' });
        }
        
        // РЕСПАВН В ТЕСТОВОМ МИРЕ
        if (gameState.useTestWorld) {
            setTimeout(() => {
                if (isFloor) placeFloor(tX, tY);
                else placeObject(tX, tY, type as ObjectType);
                addFloatingText(tX * TILE_SIZE + 20, tY * TILE_SIZE + 20, "Respawned", '#60a5fa');
            }, 1000);
        }
    };

    if (objectType === 'high_grass') {
        syncDestroy(tileX, tileY, objectType);
        if (Math.random() < 0.5) { 
             const drop = Math.random() > 0.5 ? 'stick' : 'pebble';
             syncDrop(tileX, tileY, drop);
        }
    } else if (objectType === 'tree') {
        if (activeType === 'sharp_rock') { addItem('bark', 1); addFloatingText(tileWorldX, tileWorldY - 40, "+1 Bark", '#d97706'); } 
        else if (activeType === 'stone_axe') {
            syncDestroy(tileX, tileY, objectType);
            addItem('wood', 3);
        }
    } else if (objectType === 'stone') { syncDestroy(tileX, tileY, objectType); addItem('rock', 1); }
    else if (objectType === 'big_rock') { syncDestroy(tileX, tileY, objectType); addItem('rock', 5); }
    else if (objectType.startsWith('wall_wood')) { syncDestroy(tileX, tileY, objectType); syncDrop(tileX, tileY, 'plywood'); }
    else if (objectType.startsWith('door_wood')) { syncDestroy(tileX, tileY, objectType); syncDrop(tileX, tileY, 'door_item'); }
    else if (objectType === 'floor_wood') { syncDestroy(tileX, tileY, objectType); syncDrop(tileX, tileY, 'plywood'); }
    else if (objectType === 'workbench') { syncDestroy(tileX, tileY, objectType); syncDrop(tileX, tileY, 'plywood'); }
}
