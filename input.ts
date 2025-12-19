// input.ts: Управляет обработкой ввода от пользователя.
import { Movement } from './types';

/**
 * Инициализирует обработчики событий клавиатуры и мыши.
 * @param canvas - Элемент HTMLCanvasElement для отслеживания кликов.
 * @param onMouseClick - Callback-функция, вызываемая при клике.
 * @returns {Movement} - Объект состояния движения.
 */
export function initInput(canvas: HTMLCanvasElement, onMouseClick: (x: number, y: number) => void): Movement {
    const movement: Movement = { up: false, down: false, left: false, right: false };

    window.addEventListener('keydown', (e: KeyboardEvent) => {
        // Приводим к нижнему регистру для надежности
        const key = e.key.toLowerCase();
        
        switch (key) {
            case 'w': case 'arrowup': case 'ц': movement.up = true; break;
            case 'a': case 'arrowleft': case 'ф': movement.left = true; break;
            case 's': case 'arrowdown': case 'ы': movement.down = true; break;
            case 'd': case 'arrowright': case 'в': movement.right = true; break;
        }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
         const key = e.key.toLowerCase();

         switch (key) {
            case 'w': case 'arrowup': case 'ц': movement.up = false; break;
            case 'a': case 'arrowleft': case 'ф': movement.left = false; break;
            case 's': case 'arrowdown': case 'ы': movement.down = false; break;
            case 'd': case 'arrowright': case 'в': movement.right = false; break;
        }
    });

    canvas.addEventListener('click', (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        onMouseClick(mouseX, mouseY);
    });

    return movement;
}
