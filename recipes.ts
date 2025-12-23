// recipes.ts: Данные рецептов крафта
export interface Recipe {
    name: string;
    output: { type: string, count: number };
    cost: { type: string, count: number }[];
    station?: 'workbench';
}

export const RECIPES: Recipe[] = [
    { name: 'Остр. Галька', output: { type: 'sharp_pebble', count: 1 }, cost: [{ type: 'pebble', count: 2 }] },
    { name: 'Рубило', output: { type: 'sharp_rock', count: 1 }, cost: [{ type: 'rock', count: 2 }] },
    { name: 'Веревка', output: { type: 'rope', count: 1 }, cost: [{ type: 'bark', count: 3 }] },
    { name: 'Кам. Топор', output: { type: 'stone_axe', count: 1 }, cost: [{ type: 'stick', count: 1 }, { type: 'sharp_rock', count: 1 }, { type: 'rope', count: 1 }] },
    { name: 'Фанера (Пол)', output: { type: 'plywood', count: 4 }, cost: [{ type: 'wood', count: 1 }] },
    { name: 'Палки (из фан.)', output: { type: 'stick', count: 4 }, cost: [{ type: 'plywood', count: 1 }] },
    { name: 'Стена (Дер.)', output: { type: 'wall_item', count: 1 }, cost: [{ type: 'plywood', count: 2 }, { type: 'stick', count: 2 }] },
    { name: 'Дверь (Дер.)', output: { type: 'door_item', count: 1 }, cost: [{ type: 'plywood', count: 4 }, { type: 'stick', count: 2 }] },
    { name: 'Верстак', output: { type: 'workbench', count: 1 }, cost: [{ type: 'plywood', count: 6 }, { type: 'stick', count: 4 }] },
    { name: 'Шлем (Жел)', output: { type: 'iron_helm', count: 1 }, cost: [{ type: 'rock', count: 10 }, { type: 'rope', count: 2 }], station: 'workbench' },
    { name: 'Нагрудник', output: { type: 'iron_chest', count: 1 }, cost: [{ type: 'rock', count: 20 }, { type: 'rope', count: 4 }], station: 'workbench' },
    { name: 'Поножи', output: { type: 'iron_legs', count: 1 }, cost: [{ type: 'rock', count: 15 }, { type: 'rope', count: 3 }], station: 'workbench' }
];