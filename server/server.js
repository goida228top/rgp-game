const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Настройка Socket.io с CORS
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Раздаем файлы из текущей папки
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
  console.log('New connection:', socket.id);

  // Теперь мы НЕ создаем игрока сразу. Ждем события joinGame.
  
  socket.on('joinGame', (playerName) => {
    // Создаем игрока только когда он нажал "Играть"
    players[socket.id] = {
      x: Math.random() * (CANVAS_WIDTH - 100) + 50,
      y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      id: socket.id,
      name: playerName || `Player ${socket.id.substr(0,4)}` // Имя или дефолтное
    };
    
    // Сообщаем всем (включая нового), что список обновился
    io.emit('updatePlayers', players);
  });

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
    console.log('Disconnected:', socket.id);
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('updatePlayers', players);
    }
  });
});

setInterval(() => {
  io.emit('state', players);
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});