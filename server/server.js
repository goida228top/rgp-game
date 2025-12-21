
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Глобальные переменные
const rooms = {}; // { roomId: { id, name, seed, players: {}, worldChanges: [] } }
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 40;

const WALK_SPEED = 3;
const SPRINT_SPEED = 6;

// --- МАТЕМАТИКА ГЕНЕРАЦИИ (КОПИЯ С КЛИЕНТА) ---
// Это нужно, чтобы сервер видел те же деревья, что и клиент

function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277,
        h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return (h1^h2^h3^h4) >>> 0;
}

class SeededRandom {
    constructor(seedStr) {
        this.state = cyrb128(seedStr);
    }
    next() {
        let t = this.state += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

class Noise2D {
    constructor(seedStr) {
        this.rng = new SeededRandom(seedStr);
        this.perm = new Array(512);
        const p = new Array(256);
        for(let i=0; i<256; i++) p[i] = i;
        for(let i=255; i>0; i--) {
            const r = Math.floor(this.rng.next() * (i+1));
            [p[i], p[r]] = [p[r], p[i]];
        }
        for(let i=0; i<512; i++) this.perm[i] = p[i & 255];
    }
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    get(x, y) {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        const u = this.fade(x);
        const v = this.fade(y);
        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X+1] + Y];
        const bb = this.perm[this.perm[X+1] + Y + 1];
        const val = (h) => (h % 256) / 255.0;
        return this.lerp(v, this.lerp(u, val(aa), val(ba)), this.lerp(u, val(ab), val(bb)));
    }
}

// Кэш генераторов шума для комнат: { roomId: { elevation, moisture, object } }
const noiseCache = {};

function getNoiseGenerators(roomId, seed) {
    if (!noiseCache[roomId]) {
        noiseCache[roomId] = {
            elevation: new Noise2D(seed + "_elevation"),
            moisture: new Noise2D(seed + "_moisture"),
            object: new Noise2D(seed + "_objects")
        };
    }
    return noiseCache[roomId];
}

// Проверка коллизии на сервере (On-the-fly generation)
function isColliding(roomId, worldX, worldY) {
    const room = rooms[roomId];
    if (!room) return false;

    // Сначала проверяем динамические изменения (если дерево срубили)
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    
    // Проверяем историю изменений: если объект здесь уничтожен, то коллизии нет
    // Это упрощенная проверка. В идеале нужно хранить актуальное состояние карты в памяти сервера,
    // если карта большая. Для MVP мы проверим последние изменения.
    const destroyed = room.worldChanges.some(u => u.x === tileX && u.y === tileY && u.action === 'destroy_object');
    if (destroyed) return false;

    // Генерируем тайл
    const gens = getNoiseGenerators(roomId, room.seed);
    const scale = 0.08;
    const elev = gens.elevation.get(tileX * scale, tileY * scale);
    const moist = gens.moisture.get(tileX * scale, tileY * scale);
    const rnd = gens.object.get(tileX * 0.5, tileY * 0.5);

    let object = 'none';

    if (elev < 0.35) {
        // Вода (сейчас считаем непроходимой для простоты сервера, или замедляющей)
        // Если хочешь плавать - убери return true
        // return true; 
    } else {
        if (moist > 0.55) {
            const isSpacingValid = (Math.abs(tileX) % 2 === 0) && (Math.abs(tileY) % 2 === 0);
            if (isSpacingValid && rnd > 0.25) object = 'tree';
        } 
        else if (moist > 0.3) {
            const isSpacingValid = (Math.abs(tileX) % 2 === 0) && (Math.abs(tileY) % 2 === 0);
            if (isSpacingValid && rnd > 0.75) object = 'tree';
        }
        else {
            if (rnd > 0.85) object = 'stone'; // Камни тоже твердые
        }
    }

    if (object === 'tree') return true;
    
    // Для камней можно сделать коллизию, если хочешь:
    // if (object === 'stone') return true; 

    return false;
}

// Проверка возможности перемещения (квадрат игрока)
function canMoveTo(roomId, x, y) {
    const width = 32; // Ширина хитбокса игрока
    const height = 32;
    
    const corners = [
        { x: x - width / 2, y: y - height / 2 + 10 },
        { x: x + width / 2, y: y - height / 2 + 10 },
        { x: x - width / 2, y: y + height / 2 },
        { x: x + width / 2, y: y + height / 2 }
    ];

    for (const corner of corners) {
        if (isColliding(roomId, corner.x, corner.y)) return false;
    }
    return true;
}


// --- SOCKET LOGIC ---

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
  
  io.emit('onlineCount', io.engine.clientsCount);
  socket.emit('roomList', getRoomList());

  // Создание комнаты теперь принимает SEED
  socket.on('createRoom', (roomName, nickname, seed) => {
    const roomId = crypto.randomBytes(4).toString('hex');
    const name = roomName || `Комната ${roomId.substr(0,4)}`;
    
    // Используем сид клиента или дефолтный
    const roomSeed = seed || 'terrawilds';

    rooms[roomId] = {
      id: roomId,
      name: name,
      seed: roomSeed,
      players: {},
      worldChanges: [] 
    };

    joinRoom(socket, roomId, nickname);
    io.emit('roomList', getRoomList());
  });

  socket.on('joinRoom', (roomId, nickname) => {
    if (rooms[roomId]) {
      joinRoom(socket, roomId, nickname);
    } else {
      socket.emit('error', 'Комната не найдена');
    }
  });

  socket.on('movement', (movement) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    
    if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
      const player = rooms[roomId].players[socket.id];
      const currentSpeed = movement.sprint ? SPRINT_SPEED : WALK_SPEED;
      
      let nextX = player.x;
      let nextY = player.y;

      if (movement.left) { nextX -= currentSpeed; player.direction = 'left'; }
      if (movement.up) { nextY -= currentSpeed; player.direction = 'back'; }
      if (movement.right) { nextX += currentSpeed; player.direction = 'right'; }
      if (movement.down) { nextY += currentSpeed; player.direction = 'front'; }

      // ВАЖНО: Сервер проверяет коллизию перед движением!
      // Проверяем отдельно X и Y для скольжения вдоль стен
      if (canMoveTo(roomId, nextX, player.y)) {
          player.x = nextX;
      }
      if (canMoveTo(roomId, player.x, nextY)) {
          player.y = nextY;
      }
    }
  });

  socket.on('worldUpdate', (update) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    if (roomId && rooms[roomId]) {
        rooms[roomId].worldChanges.push(update);
        if (rooms[roomId].worldChanges.length > 5000) {
            rooms[roomId].worldChanges.shift();
        }
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
          delete noiseCache[roomId]; // Чистим кэш
        }
        break; 
      }
    }
    
    io.emit('roomList', getRoomList());
  });
});

function joinRoom(socket, roomId, nickname) {
  socket.join(roomId); 
  
  const room = rooms[roomId];

  room.players[socket.id] = {
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

  // ОТПРАВЛЯЕМ SEED КОМНАТЫ КЛИЕНТУ
  socket.emit('gameStart', room.players, room.worldChanges, room.seed);
}

setInterval(() => {
  for (const roomId in rooms) {
    io.to(roomId).emit('state', rooms[roomId].players);
  }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
