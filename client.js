// --- ЛОГИРОВАНИЕ НА ЭКРАН (Чтобы ты видел ошибки) ---
function log(msg, color = 'text-green-500') {
    const consoleDiv = document.getElementById('debug-console');
    const line = document.createElement('div');
    line.className = color;
    line.innerText = `> ${msg}`;
    consoleDiv.prepend(line); // Новые сообщения сверху
}

log("Запуск клиента...", "text-yellow-400");

// --- ПОДКЛЮЧЕНИЕ К СЕРВЕРУ ---
// ВАЖНО: Тут стоит твоя ссылка на Render
const SERVER_URL = 'https://rgp-game.onrender.com'; 

log(`Подключаемся к: ${SERVER_URL}`, "text-blue-400");

const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'] // Используем все методы
});

// --- ЭЛЕМЕНТЫ УПРАВЛЕНИЯ ---
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const scoreRed = document.getElementById('score-red');
const scoreBlue = document.getElementById('score-blue');
const btnRed = document.getElementById('btn-red');
const btnBlue = document.getElementById('btn-blue');
const btnReset = document.getElementById('btn-reset');

// --- СОБЫТИЯ СЕТИ ---

socket.on('connect', () => {
    log("✅ УСПЕШНО ПОДКЛЮЧЕНО!", "text-green-400 font-bold");
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-green-500 transition-colors duration-300 shadow-[0_0_10px_#22c55e]";
    statusText.innerText = "ONLINE";
    statusText.className = "text-xs font-mono font-bold text-green-400";
});

socket.on('connect_error', (err) => {
    log(`❌ Ошибка соединения: ${err.message}`, "text-red-500");
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-red-600 transition-colors duration-300";
    statusText.innerText = "ERROR";
});

socket.on('disconnect', () => {
    log("⚠️ Соединение потеряно", "text-orange-500");
    statusDot.className = "w-2.5 h-2.5 rounded-full bg-gray-500";
    statusText.innerText = "OFFLINE";
});

// --- ИГРОВАЯ ЛОГИКА ---

// 1. Получение очков от сервера
socket.on('updateScores', (scores) => {
    scoreRed.innerText = scores.red;
    scoreBlue.innerText = scores.blue;
    // log(`Счет обновлен: R:${scores.red} B:${scores.blue}`, "text-gray-500");
});

// 2. Эффект клика (от другого игрока)
socket.on('clickEffect', (data) => {
    // Тут можно добавить визуальный эффект, если хочешь
    // log(`Кликнул игрок за команду: ${data.team}`);
});

// 3. Отправка кликов
btnRed.addEventListener('click', () => {
    socket.emit('click', 'red'); // Шлем на сервер "red"
    triggerClickEffect(btnRed);  // Визуальный эффект у себя
});

btnBlue.addEventListener('click', () => {
    socket.emit('click', 'blue'); // Шлем на сервер "blue"
    triggerClickEffect(btnBlue);
});

btnReset.addEventListener('click', () => {
    socket.emit('reset');
    log("Запрошен сброс игры", "text-purple-400");
});

// --- Визуальный эффект нажатия (локальный) ---
function triggerClickEffect(element) {
    element.style.transform = "scale(0.95)";
    setTimeout(() => {
        element.style.transform = "scale(1)";
    }, 100);
}