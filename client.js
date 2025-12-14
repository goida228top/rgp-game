const socket = io();

// Элементы
const btnRed = document.getElementById('btn-red');
const btnBlue = document.getElementById('btn-blue');
const btnReset = document.getElementById('btn-reset');
const scoreRedEl = document.getElementById('score-red');
const scoreBlueEl = document.getElementById('score-blue');
const effectsContainer = document.getElementById('effects-container');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const body = document.getElementById('main-body');

// --- ЗВУКОВОЙ ДВИЖОК (Web Audio API) ---
// Используем синтезатор, чтобы не зависеть от внешних файлов
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playTone(freq, type = 'sine', duration = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

function playClickSound(team) {
    // Красные - ниже тон, Синие - выше
    const freq = team === 'red' ? 300 : 500;
    playTone(freq, 'square', 0.15);
}

function playResetSound() {
    playTone(150, 'sawtooth', 0.4);
}

// --- СОБЫТИЯ ---

// Клик по кнопкам
btnRed.addEventListener('click', () => {
    socket.emit('click', 'red');
    // Оптимистичное обновление UI не делаем, ждем сервера для синхронности,
    // но можно добавить локальную анимацию нажатия через CSS (:active)
});

btnBlue.addEventListener('click', () => {
    socket.emit('click', 'blue');
});

btnReset.addEventListener('click', () => {
    if(confirm('Сбросить счет игры?')) {
        socket.emit('reset');
    }
});

// --- SOCKET.IO ОБРАБОТЧИКИ ---

socket.on('connect', () => {
    statusDot.classList.remove('bg-red-500');
    statusDot.classList.add('bg-green-500');
    statusText.innerText = 'ONLINE';
    statusText.classList.replace('text-slate-300', 'text-green-400');
});

socket.on('disconnect', () => {
    statusDot.classList.remove('bg-green-500');
    statusDot.classList.add('bg-red-500');
    statusText.innerText = 'OFFLINE';
    statusText.classList.replace('text-green-400', 'text-slate-300');
});

socket.on('updateScores', (scores) => {
    scoreRedEl.innerText = scores.red;
    scoreBlueEl.innerText = scores.blue;
    updateLeadingBackground(scores);
});

socket.on('clickEffect', ({ team }) => {
    createParticle(team);
    playClickSound(team);
    
    // Анимация дерганья текста счета
    const el = team === 'red' ? scoreRedEl : scoreBlueEl;
    el.style.transform = 'scale(1.2)';
    setTimeout(() => el.style.transform = 'scale(1)', 100);
});

socket.on('resetEffect', () => {
    playResetSound();
    // Эффект вспышки экрана
    const flash = document.createElement('div');
    flash.className = 'absolute inset-0 bg-white/50 z-[100] pointer-events-none transition-opacity duration-300';
    document.body.appendChild(flash);
    setTimeout(() => flash.classList.add('opacity-0'), 50);
    setTimeout(() => flash.remove(), 350);
});

// --- ВИЗУАЛ ---

function updateLeadingBackground(scores) {
    if (scores.red > scores.blue) {
        body.className = "bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 select-none shadow-[inset_0_0_200px_rgba(220,38,38,0.2)]";
    } else if (scores.blue > scores.red) {
        body.className = "bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 select-none shadow-[inset_0_0_200px_rgba(37,99,235,0.2)]";
    } else {
        body.className = "bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 select-none";
    }
}

function createParticle(team) {
    const el = document.createElement('div');
    el.classList.add('click-particle');
    el.innerText = '+1';
    el.style.color = team === 'red' ? '#fca5a5' : '#93c5fd';
    
    // Позиция зависит от команды (слева или справа)
    const containerRect = document.body.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    
    // Случайное смещение
    const randomX = (Math.random() - 0.5) * 200; 
    const randomY = (Math.random() - 0.5) * 100;

    let startX;
    if (window.innerWidth < 768) {
        // Мобилка: сверху и снизу
        const startY = team === 'red' ? window.innerHeight * 0.25 : window.innerHeight * 0.75;
        el.style.left = `calc(50% + ${randomX}px)`;
        el.style.top = `${startY + randomY}px`;
    } else {
        // Десктоп: слева и справа
        startX = team === 'red' ? centerX - 300 : centerX + 300;
        el.style.left = `${startX + randomX}px`;
        el.style.top = `calc(50% + ${randomY}px)`;
    }
    
    effectsContainer.appendChild(el);
    setTimeout(() => el.remove(), 800);
}