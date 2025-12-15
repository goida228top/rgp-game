const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с CORS, чтобы можно было подключаться с других доменов
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// ВАЖНО: Раздаем файлы из ТЕКУЩЕЙ папки (корня), а не из public
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Хранилище состояния игроков
const players = {};

// Константы игры
const SPEED = 5;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_RADIUS = 20;

io.on('connection', (socket) => {
  console.log('New player connected:', socket.id);

  // Создаем нового игрока
  players[socket.id] = {
    x: Math.random() * (CANVAS_WIDTH - 100) + 50,
    y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    id: socket.id
  };

  io.emit('updatePlayers', players);

  socket.on('movement', (movement) => {
    const player = players[socket.id];
    if (player) {
      if (movement.left) player.x -= SPEED;
      if (movement.up) player.y -= SPEED;
      if (movement.right) player.x += SPEED;
      if (movement.down) player.y += SPEED;

      player.x = Math.max(PLAYER_RADIUS, Math.min(CANVAS_WIDTH - PLAYER_RADIUS, player.x));
      player.y = Math.max(PLAYER_RADIUS, Math.min(CANVAS_HEIGHT - PLAYER_RADIUS, player.y));
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

setInterval(() => {
  io.emit('state', players);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});