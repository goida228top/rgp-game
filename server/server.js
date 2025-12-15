const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с CORS для разрешения подключений
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Раздаем статические файлы из корня проекта (на уровень выше папки server)
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Хранилище состояния игроков
const players = {};

// Константы игры
const SPEED = 5;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_RADIUS = 20;

io.on('connection', (socket) => {
  console.log('Подключился клиент:', socket.id);

  // ВАЖНО: Мы НЕ создаем игрока здесь автоматически.
  // Мы ждем, пока клиент пришлет событие 'joinGame' с ником.

  socket.on('joinGame', (nickname) => {
    console.log(`Игрок ${nickname} (${socket.id}) вошел в игру`);
    
    // Создаем сущность игрока
    players[socket.id] = {
      id: socket.id,
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      name: nickname || "Player"
    };

    // Отправляем всем обновленный список
    io.emit('updatePlayers', players);
  });

  socket.on('movement', (movement) => {
    const player = players[socket.id];
    // Двигаем только если игрок уже "вошел" в игру (есть в списке players)
    if (player) {
      if (movement.left) player.x -= SPEED;
      if (movement.up) player.y -= SPEED;
      if (movement.right) player.x += SPEED;
      if (movement.down) player.y += SPEED;

      // Ограничение границами карты
      player.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, player.y));
    }
  });

  socket.on('disconnect', () => {
    console.log('Клиент отключился:', socket.id);
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('updatePlayers', players);
    }
  });
});

// Игровой цикл сервера (60 FPS)
setInterval(() => {
  io.emit('state', players);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});