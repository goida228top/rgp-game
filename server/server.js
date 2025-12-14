const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ИСПРАВЛЕНИЕ ПУТИ:
// Мы используем path.join(__dirname, '../'), чтобы сервер раздавал файлы
// из папки на уровень выше (из корня), где лежит index.html.
app.use(express.static(path.join(__dirname, '../')));

let scores = {
  red: 0,
  blue: 0
};

io.on('connection', (socket) => {
  // Отправляем текущее состояние при подключении
  socket.emit('updateScores', scores);

  socket.on('click', (team) => {
    if (scores[team] !== undefined) {
      scores[team]++;
      // broadcast: отправляем всем, включая отправителя
      io.emit('updateScores', scores);
      io.emit('clickEffect', { team });
    }
  });

  socket.on('reset', () => {
    scores = { red: 0, blue: 0 };
    io.emit('updateScores', scores);
    io.emit('resetEffect');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});