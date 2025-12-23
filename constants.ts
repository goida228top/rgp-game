// constants.ts: Глобальные константы игры

export const TILE_SIZE = 40;
export const INVENTORY_SIZE = 36; // 9 хотбар + 27 рюкзак
export const HOTBAR_SIZE = 9;

// Иконки предметов
export const ICONS: Record<string, string> = {
    // Basic
    'stick': '🥢',       // Палка
    'pebble': '⚪',      // Галька
    
    // Tier 1
    'sharp_pebble': '🔺', // Острая галька
    
    // Resources
    'rock': '🪨',        // Камень
    'wood': '🪵',        // Бревна
    'bark': '📜',        // Кора
    
    // Tier 2
    'sharp_rock': '🔪',  // Рубило
    'rope': '➰',        // Веревка
    
    // Tier 3
    'stone_axe': '🪓',   // Топор
    'plywood': '🟫',     // Фанера (была plank)
    'wall_item': '🧱',   // Предмет "Стена" в инвентаре
    'door_item': '🚪',   // Предмет "Дверь"
    'workbench': '🪚',
    
    // Armor
    'iron_helm': '🪖',
    'iron_chest': '👕',
    'iron_legs': '👖',
    
    'default': '❓'
};