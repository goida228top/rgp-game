
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto'); // Для генерации ID комнат

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// Раздаем файлы из корневой директории (поднимаемся на уровень выше от server/)
app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Глобальные переменные
const rooms = {}; // { roomId: { id, name, players: {}, worldChanges: [] } }
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Константы скорости (Должны совпадать с клиентом)
const WALK_SPEED = 3;
const SPRINT_SPEED = 6;

// Вспомогательная функция для получения списка комнат для лобби
function getRoomList() {
  const list = [];
  for (const id in rooms) {
    list.push({
      id: id,
      name: rooms[id].name,
      players: Object.keys(rooms[id].players).length
    });
  }
  return list;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Отправляем клиенту текущий онлайн и список комнат
  io.emit('onlineCount', io.engine.clientsCount);
  socket.emit('roomList', getRoomList());

  // Игрок создает комнату
  socket.on('createRoom', (roomName, nickname) => {
    const roomId = crypto.randomBytes(4).toString('hex'); // Генерируем ID
    const name = roomName || `Комната ${roomId.substr(0,4)}`;

    rooms[roomId] = {
      id: roomId,
      name: name,
      players: {},
      worldChanges: [] // Храним изменения мира (дельта)
    };

    joinRoom(socket, roomId, nickname);
    // Обновляем список комнат для всех в лобби
    io.emit('roomList', getRoomList());
  });

  // Игрок присоединяется к комнате
  socket.on('joinRoom', (roomId, nickname) => {
    if (rooms[roomId]) {
      joinRoom(socket, roomId, nickname);
    } else {
      socket.emit('error', 'Комната не найдена');
    }
  });

  socket.on('movement', (movement) => {
    // Находим комнату
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    
    if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
      const player = rooms[roomId].players[socket.id];
      const currentSpeed = movement.sprint ? SPRINT_SPEED : WALK_SPEED;
      
      // Сервер все еще считает физику, чтобы иметь "авторитетное" состояние
      if (movement.left) { player.x -= currentSpeed; player.direction = 'left'; }
      if (movement.up) { player.y -= currentSpeed; player.direction = 'back'; }
      if (movement.right) { player.x += currentSpeed; player.direction = 'right'; }
      if (movement.down) { player.y += currentSpeed; player.direction = 'front'; }
    }
  });

  // Обработка изменений мира
  socket.on('worldUpdate', (update) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    if (roomId && rooms[roomId]) {
        // Сохраняем изменение в истории комнаты (чтобы новые игроки получили актуальный мир)
        rooms[roomId].worldChanges.push(update);
        
        // Ограничиваем историю изменений (опционально, чтобы память не текла вечно)
        if (rooms[roomId].worldChanges.length > 5000) {
            rooms[roomId].worldChanges.shift();
        }

        // Рассылаем всем в комнате, включая отправителя (или кроме, но проще всем для надежности, хотя клиент уже применил)
        // Но лучше: socket.to(roomId).emit(...) - всем КРОМЕ отправителя, т.к. отправитель уже применил
        socket.to(roomId).emit('worldUpdate', update);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    io.emit('onlineCount', io.engine.clientsCount);
    
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        
        if (Object.keys(rooms[roomId].players).length === 0) {
          delete rooms[roomId];
        }
        break; 
      }
    }
    
    io.emit('roomList', getRoomList());
  });
});

function joinRoom(socket, roomId, nickname) {
  socket.join(roomId); 
  
  // Создаем игрока
  rooms[roomId].players[socket.id] = {
    x: Math.random() * (CANVAS_WIDTH - 100) + 50,
    y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    id: socket.id,
    nickname: nickname || "Player",
    direction: 'front', 
    inventory: [], 
    equipment: { head: null, body: null, legs: null },
    stats: {
        hp: 20, maxHp: 20,
        hunger: 20, maxHunger: 20,
        mana: 20, maxMana: 20,
        energy: 20, maxEnergy: 20,
        xp: 0, maxXp: 100,
        level: 1
    }
  };

  // Отправляем игроку список игроков И историю изменений мира
  socket.emit('gameStart', rooms[roomId].players, rooms[roomId].worldChanges);
}

// Игровой цикл сервера
setInterval(() => {
  for (const roomId in rooms) {
    io.to(roomId).emit('state', rooms[roomId].players);
  }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
