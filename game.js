// === 1. НАСТРОЙКИ ===
const SERVER_URL = 'https://rgp-game.onrender.com';
const SPEED = 5;

// === 2. ИНИЦИАЛИЗАЦИЯ ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const coordsDiv = document.getElementById('coords');

// Растягиваем на весь экран
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Если меняют размер окна — подстраиваемся
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Переменные игры
let players = {};
let myId = null;
const keys = {};

// === 3. СЕТЬ (SOCKET.IO) ===
console.log("Загрузка логики игры...");
const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
    console.log("✅ Ура! Соединение установлено");
    statusDiv.innerText = "🟢 ONLINE";
    statusDiv.style.color = "#00ff00"; // Зеленый текст
    myId = socket.id;
});

socket.on('connect_error', (err) => {
    console.error("Ошибка сети:", err);
    statusDiv.innerText = "🔴 SERVER ERROR";
    statusDiv.style.color = "#ff0000"; // Красный текст
});

socket.on('disconnect', () => {
    statusDiv.innerText = "🟠 DISCONNECTED";
    statusDiv.style.color = "orange";
});

// Получаем список игроков от сервера
socket.on('updatePlayers', (serverPlayers) => {
    players = serverPlayers;
});

// === 4. УПРАВЛЕНИЕ ===
window.addEventListener('keydown', (e) => keys[e.key] = true);
window.addEventListener('keyup', (e) => keys[e.key] = false);

// === 5. ОТРИСОВКА (ИГРОВОЙ ЦИКЛ) ===
function gameLoop() {
    // Чистим экран
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Логика движения (только если мы подключены)
    if (myId && players[myId]) {
        const me = players[myId];
        let moved = false;

        if (keys['w'] || keys['ArrowUp'])    { me.y -= SPEED; moved = true; }
        if (keys['s'] || keys['ArrowDown'])  { me.y += SPEED; moved = true; }
        if (keys['a'] || keys['ArrowLeft'])  { me.x -= SPEED; moved = true; }
        if (keys['d'] || keys['ArrowRight']) { me.x += SPEED; moved = true; }

        if (moved) {
            // Отправляем новые координаты на сервер
            socket.emit('move', { x: me.x, y: me.y });
            // Обновляем текст координат
            coordsDiv.innerText = `X: ${Math.round(me.x)} Y: ${Math.round(me.y)}`;
        }
    }

    // Рисуем ВСЕХ игроков
    for (let id in players) {
        const p = players[id];
        
        // 1. Тень
        ctx.beginPath();
        ctx.arc(p.x, p.y + 10, 20, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();

        // 2. Тело (Круг)
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = p.color || 'white';
        ctx.fill();

        // 3. Если это Я — рисуем обводку и стрелочку
        if (id === myId) {
            ctx.lineWidth = 4;
            ctx.strokeStyle = "white";
            ctx.stroke();
            
            // Желтый треугольник над головой
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 35);
            ctx.lineTo(p.x - 10, p.y - 50);
            ctx.lineTo(p.x + 10, p.y - 50);
            ctx.fillStyle = "gold";
            ctx.fill();
        } else {
            // Чужой игрок
            ctx.lineWidth = 2;
            ctx.strokeStyle = "black";
            ctx.stroke();
        }
    }

    // Зацикливаем (60 кадров в секунду)
    requestAnimationFrame(gameLoop);
}

// Погнали!
gameLoop();