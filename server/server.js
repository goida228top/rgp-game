
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

// Глобальные константы
const TILE_SIZE = 40;
const PRESET_COLORS = [
    '#000000', // Черный
    '#FFFFFF', // Белый
    '#FF0000', // Красный
    '#0000FF', // Синий
    '#FFFF00', // Желтый
    '#008000', // Зеленый
    '#FFA500', // Оранжевый
    '#A52A2A', // Коричневый
    '#808080'  // Серый
];

const rooms = {}; 

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

function isColliding(roomId, worldX, worldY) {
    const room = rooms[roomId];
    if (!room) return false;
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    
    let currentObject = 'none';
    
    // Проверяем динамические изменения (постройки игроков)
    for (let i = room.worldChanges.length - 1; i >= 0; i--) {
        const u = room.worldChanges[i];
        if (u.x === tileX && u.y === tileY) {
            if (u.action === 'destroy_object') { currentObject = 'none'; break; }
            else if (u.action === 'place_object') { currentObject = u.data; break; }
        }
    }

    // Если нет динамики, берем из генерации шума
    if (currentObject === 'none') {
        const distFromCenter = Math.sqrt(tileX*tileX + tileY*tileY);
        if (distFromCenter >= 5) {
            const gens = getNoiseGenerators(roomId, room.seed);
            const scale = 0.08;
            const elev = gens.elevation.get(tileX * scale, tileY * scale);
            const moist = gens.moisture.get(tileX * scale, tileY * scale);
            const rnd = gens.object.get(tileX * 0.5, tileY * 0.5);

            if (elev >= 0.35) {
                if (moist > 0.55 || moist > 0.3) {
                    const isSpacingValid = (Math.abs(tileX) % 2 === 0) && (Math.abs(tileY) % 2 === 0);
                    if (isSpacingValid && rnd > 0.25) {
                        currentObject = 'tree';
                    }
                } else {
                    const clusterNoise = gens.object.get(tileX * 0.1, tileY * 0.1); 
                    if (clusterNoise > 0.82) {
                        currentObject = (rnd > 0.2) ? 'big_rock' : 'stone';
                    }
                }
            }
        }
    }

    // ЛОГИКА КОЛЛИЗИЙ
    if (currentObject === 'tree' || currentObject === 'big_rock' || currentObject === 'workbench') return true;
    
    // Стены и двери
    if (currentObject.startsWith('wall_wood') || currentObject.startsWith('door_wood')) {
        const th = 10;
        const tx = tileX * TILE_SIZE;
        const ty = tileY * TILE_SIZE;
        let rect = { x: 0, y: 0, w: 0, h: 0 };
        const type = currentObject.split('_').pop(); // t, b, l, r
        
        if (type === 't') rect = { x: tx, y: ty, w: TILE_SIZE, h: th };
        else if (type === 'b') rect = { x: tx, y: ty + TILE_SIZE - th, w: TILE_SIZE, h: th };
        else if (type === 'l') rect = { x: tx, y: ty, w: th, h: TILE_SIZE };
        else if (type === 'r') rect = { x: tx + TILE_SIZE - th, y: ty, w: th, h: TILE_SIZE };
        
        const inRect = (worldX >= rect.x && worldX <= rect.x + rect.w && worldY >= rect.y && worldY <= rect.y + rect.h);
        if (inRect) {
            // Если это дверь, проверяем её состояние (если есть физика на сервере)
            // Пока считаем все двери закрытыми для простоты сервера
            return true;
        }
    }

    return false;
}

function canMoveTo(roomId, x, y) {
    const checkSize = 10; // Небольшой хитбокс для проверки углов игрока
    const points = [
        { x: x - checkSize, y: y },
        { x: x + checkSize, y: y },
        { x: x, y: y - checkSize },
        { x: x, y: y + checkSize }
    ];
    for (const p of points) {
        if (isColliding(roomId, p.x, p.y)) return false;
    }
    return true;
}

function getRoomList() {
  const list = [];
  for (const id in rooms) {
    list.push({ id: id, name: rooms[id].name, players: Object.keys(rooms[id].players).length });
  }
  return list;
}

io.on('connection', (socket) => {
  io.emit('onlineCount', io.engine.clientsCount);
  socket.emit('roomList', getRoomList());

  socket.on('createRoom', (roomName, nickname, seed) => {
    const roomId = crypto.randomBytes(4).toString('hex');
    rooms[roomId] = { 
        id: roomId, 
        name: roomName || `Room ${roomId.substr(0,4)}`, 
        seed: seed || 'terrawilds', 
        players: {}, 
        worldChanges: [],
        worldTime: 6000 // Старт в полдень
    };
    joinRoom(socket, roomId, nickname);
    io.emit('roomList', getRoomList());
  });

  socket.on('joinRoom', (roomId, nickname) => {
    if (rooms[roomId]) joinRoom(socket, roomId, nickname);
    else socket.emit('error', 'Room not found');
  });

  socket.on('movement', (data) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
      const player = rooms[roomId].players[socket.id];
      const dist = Math.sqrt(Math.pow(data.x - player.x, 2) + Math.pow(data.y - player.y, 2));
      
      if (dist > 150.0) return; // Защита от телепортации
      
      // Серверная проверка движения
      if (canMoveTo(roomId, data.x, data.y)) {
          player.x = data.x; 
          player.y = data.y; 
          player.direction = data.direction;
          
          if (data.sprint && player.stats.energy > 0) {
              player.stats.energy = Math.max(0, player.stats.energy - 0.15);
          } else {
              player.stats.energy = Math.min(player.stats.maxEnergy, player.stats.energy + 0.1);
          }
      }
    }
  });

  socket.on('worldUpdate', (update) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    if (roomId && rooms[roomId]) {
        rooms[roomId].worldChanges.push(update);
        if (rooms[roomId].worldChanges.length > 5000) rooms[roomId].worldChanges.shift();
        socket.to(roomId).emit('worldUpdate', update);
    }
  });

  socket.on('chatMessage', (text) => {
    const roomId = Array.from(socket.rooms).find(r => rooms[r]);
    if (roomId && rooms[roomId] && rooms[roomId].players[socket.id]) {
        const player = rooms[roomId].players[socket.id];
        io.to(roomId).emit('chatMessage', { 
            senderId: socket.id, 
            nickname: player.nickname, 
            text: text, 
            color: player.color 
        });
    }
  });

  socket.on('disconnect', () => {
    io.emit('onlineCount', io.engine.clientsCount);
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        if (Object.keys(rooms[roomId].players).length === 0) { 
            delete rooms[roomId]; 
            delete noiseCache[roomId]; 
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
  
  // Случайный цвет из твоего списка
  const shirtColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  
  room.players[socket.id] = {
    x: 0,
    y: 0,
    color: shirtColor,
    id: socket.id, 
    nickname: nickname || "Player", 
    direction: 'front', 
    inventory: new Array(36).fill(null), 
    equipment: { head: null, body: null, legs: null },
    stats: { 
        hp: 20, maxHp: 20, 
        hunger: 20, maxHunger: 20, 
        mana: 20, maxMana: 20, 
        energy: 20, maxEnergy: 20, 
        xp: 0, maxXp: 100, level: 1 
    }
  };
  
  socket.emit('gameStart', room.players, room.worldChanges, room.seed);
}

// ГЛАВНЫЙ ЦИКЛ СЕРВЕРА
setInterval(() => {
  for (const roomId in rooms) {
      const room = rooms[roomId];
      
      // Продвигаем время на сервере
      room.worldTime = (room.worldTime + 5) % 24000;
      
      // Рассылаем состояние, включая время
      io.to(roomId).emit('state', room.players, room.worldTime);
  }
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
