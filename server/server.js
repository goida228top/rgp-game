const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Раздаем файлы клиента, если они лежат рядом (на всякий случай)
app.use(express.static(path.join(__dirname, '../')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// === Хранилище игроков RPG ===
let players = {};

io.on('connection', (socket) => {
  console.log('Новый RPG игрок:', socket.id);

  // 1. Создаем игрока в случайном месте
  players[socket.id] = {
    x: Math.random() * 500,
    y: Math.random() * 500,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`, // Случайный яркий цвет
    id: socket.id
  };

  // 2. Отправляем всем текущий список
  io.emit('updatePlayers', players);

  // 3. Слушаем движение
  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      // Рассылаем всем новые координаты
      io.emit('updatePlayers', players);
    }
  });

  // 4. Удаляем ушедших
  socket.on('disconnect', () => {
    console.log('Игрок вышел:', socket.id);
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`RPG Server запущен на порту ${PORT}`);
});