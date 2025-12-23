
// input.ts: Управляет обработкой ввода от пользователя.
import { Movement } from './types';

export const inputState = {
    mouseX: 0,
    mouseY: 0,
    isRightMouseDown: false,
    isLeftMouseDown: false
};

/**
 * Инициализирует обработчики событий клавиатуры и мыши.
 * @param canvas - Элемент HTMLCanvasElement для отслеживания кликов.
 * @returns {Movement} - Объект состояния движения.
 */
export function initInput(canvas: HTMLCanvasElement): Movement {
    const movement: Movement = { up: false, down: false, left: false, right: false, sprint: false, rotate: false };
    
    // Оставляем базовую защиту от закрытия (диалоговое окно), это полезно в любой игре
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = '';
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        
        // --- СПРИНТ: SHIFT (Зажатие) ---
        if (key === 'shift') {
            movement.sprint = true;
        }
        // --- РОТАЦИЯ: R ---
        if (key === 'r' || key === 'к') {
            movement.rotate = true;
        }

        switch (key) {
            case 'w': case 'arrowup': case 'ц': movement.up = true; break;
            case 'a': case 'arrowleft': case 'ф': movement.left = true; break;
            case 's': case 'arrowdown': case 'ы': movement.down = true; break;
            case 'd': case 'arrowright': case 'в': movement.right = true; break;
        }
    });

    document.addEventListener('keyup', (e: KeyboardEvent) => {
         const key = e.key.toLowerCase();

        // --- СПРИНТ: SHIFT (Отпускание) ---
        if (key === 'shift') {
            movement.sprint = false;
        }
        if (key === 'r' || key === 'к') {
            movement.rotate = false;
        }

         switch (key) {
            case 'w': case 'arrowup': case 'ц': movement.up = false; break;
            case 'a': case 'arrowleft': case 'ф': movement.left = false; break;
            case 's': case 'arrowdown': case 'ы': movement.down = false; break;
            case 'd': case 'arrowright': case 'в': movement.right = false; break;
        }
    });

    // --- Мышь ---
    document.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        return false;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        inputState.mouseX = e.clientX - rect.left;
        inputState.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
        if (e.button === 2) inputState.isRightMouseDown = true;
        if (e.button === 0) inputState.isLeftMouseDown = true;
    });

    window.addEventListener('mouseup', (e: MouseEvent) => {
        if (e.button === 2) inputState.isRightMouseDown = false;
        if (e.button === 0) inputState.isLeftMouseDown = false;
    });

    return movement;
}
