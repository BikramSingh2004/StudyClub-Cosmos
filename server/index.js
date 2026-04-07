const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ── Predefined office rooms ──────────────────────────────────────────
const OFFICE_ROOMS = [
  { id: 'lounge', name: 'Lounge', type: 'spatial', x: 60, y: 60, w: 380, h: 280, color: '#e8f5e9' },
  { id: 'meeting-1', name: 'Meeting Room A', type: 'meeting', x: 480, y: 60, w: 280, h: 280, color: '#e3f2fd' },
  { id: 'meeting-2', name: 'Meeting Room B', type: 'meeting', x: 800, y: 60, w: 280, h: 280, color: '#fce4ec' },
  { id: 'open-space', name: 'Open Space', type: 'spatial', x: 60, y: 380, w: 600, h: 320, color: '#fff8e1' },
  { id: 'focus-zone', name: 'Focus Zone', type: 'spatial', x: 700, y: 380, w: 380, h: 320, color: '#f3e5f5' },
  { id: 'cafe', name: 'Cafe', type: 'spatial', x: 1120, y: 60, w: 280, h: 280, color: '#fff3e0' },
  { id: 'boardroom', name: 'Boardroom', type: 'meeting', x: 1120, y: 380, w: 280, h: 320, color: '#e0f2f1' },
];

// ── In-memory state ──────────────────────────────────────────────────
const activePlayers = new Map(); // socketId → { username, x, y, avatarColor, status, currentRoom }
const roomMembers = new Map();   // roomId → Set<socketId>

// Init room member sets
OFFICE_ROOMS.forEach((r) => roomMembers.set(r.id, new Set()));

const PROXIMITY_RADIUS = 120;

// ── Helpers ──────────────────────────────────────────────────────────
function getDistance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function findRoomAt(x, y) {
  for (const room of OFFICE_ROOMS) {
    if (x >= room.x && x <= room.x + room.w && y >= room.y && y <= room.y + room.h) {
      return room;
    }
  }
  return null;
}

function getRoomInfo() {
  return OFFICE_ROOMS.map((r) => {
    const members = [];
    const memberSet = roomMembers.get(r.id);
    if (memberSet) {
      for (const sid of memberSet) {
        const p = activePlayers.get(sid);
        if (p) members.push({ socketId: sid, username: p.username, avatarColor: p.avatarColor, mic: p.mic, camera: p.camera, screen: p.screen });
      }
    }
    return { ...r, members, memberCount: members.length };
  });
}

function handleRoomTransition(socketId) {
  const player = activePlayers.get(socketId);
  if (!player) return;

  const newRoom = findRoomAt(player.x, player.y);
  const newRoomId = newRoom?.id || null;
  const oldRoomId = player.currentRoom;

  if (newRoomId === oldRoomId) return;

  // Leave old room
  if (oldRoomId) {
    const oldSet = roomMembers.get(oldRoomId);
    oldSet?.delete(socketId);
    io.sockets.sockets.get(socketId)?.leave('room_' + oldRoomId);

    // Notify others in old room
    for (const sid of oldSet || []) {
      io.to(sid).emit('room:member-left', { socketId, roomId: oldRoomId });
    }

    const oldRoomDef = OFFICE_ROOMS.find((r) => r.id === oldRoomId);

    // If it was a meeting room, disconnect from all peers
    if (oldRoomDef?.type === 'meeting') {
      io.to(socketId).emit('room:left', { roomId: oldRoomId });
    }
  }

  // Join new room
  player.currentRoom = newRoomId;

  if (newRoomId) {
    const newSet = roomMembers.get(newRoomId);
    newSet.add(socketId);
    io.sockets.sockets.get(socketId)?.join('room_' + newRoomId);

    // Build member list
    const members = [];
    for (const sid of newSet) {
      const p = activePlayers.get(sid);
      if (p) members.push({ socketId: sid, username: p.username, avatarColor: p.avatarColor, mic: p.mic || false, camera: p.camera || false, screen: p.screen || false });
    }

    // Tell the player they joined
    io.to(socketId).emit('room:joined', {
      roomId: newRoomId,
      roomName: newRoom.name,
      roomType: newRoom.type,
      members,
    });

    // Notify others in new room
    for (const sid of newSet) {
      if (sid !== socketId) {
        io.to(sid).emit('room:member-joined', {
          socketId,
          username: player.username,
          avatarColor: player.avatarColor,
          roomId: newRoomId,
          mic: player.mic || false,
          camera: player.camera || false,
          screen: player.screen || false,
        });
      }
    }

    // Load room chat history
    Message.find({ roomId: 'room_' + newRoomId })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()
      .then((msgs) => {
        io.to(socketId).emit('room:chat-history', { roomId: newRoomId, history: msgs.reverse() });
      })
      .catch(() => {});
  }

  // Broadcast updated room info
  io.emit('rooms:update', getRoomInfo());
}

// Proximity detection for spatial rooms
function checkSpatialProximity(socketId) {
  const player = activePlayers.get(socketId);
  if (!player || !player.currentRoom) return;

  const roomDef = OFFICE_ROOMS.find((r) => r.id === player.currentRoom);
  if (!roomDef || roomDef.type !== 'spatial') return;

  const roomSet = roomMembers.get(player.currentRoom);
  if (!roomSet) return;

  for (const otherSid of roomSet) {
    if (otherSid === socketId) continue;
    const other = activePlayers.get(otherSid);
    if (!other) continue;

    const dist = getDistance(player, other);

    if (dist < PROXIMITY_RADIUS) {
      // Notify both about proximity (client handles WebRTC)
      io.to(socketId).emit('proximity:near', { peerId: otherSid, username: other.username, avatarColor: other.avatarColor, distance: dist });
      io.to(otherSid).emit('proximity:near', { peerId: socketId, username: player.username, avatarColor: player.avatarColor, distance: dist });
    } else {
      io.to(socketId).emit('proximity:far', { peerId: otherSid });
      io.to(otherSid).emit('proximity:far', { peerId: socketId });
    }
  }
}

// ── Socket handlers ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  socket.on('player:join', async (data) => {
    const { username, avatarColor } = data;
    // Spawn in the lounge area
    const x = 150 + Math.random() * 200;
    const y = 150 + Math.random() * 100;

    const playerData = {
      username, x, y, avatarColor,
      status: 'available',
      currentRoom: null,
      mic: false, camera: false, screen: false,
    };
    activePlayers.set(socket.id, playerData);

    try {
      await User.findOneAndUpdate(
        { username },
        { avatarColor, lastPosition: { x, y }, lastActive: new Date() },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('DB error:', err.message);
    }

    // Send initial state
    const allPlayers = {};
    for (const [sid, p] of activePlayers) {
      allPlayers[sid] = { username: p.username, x: p.x, y: p.y, avatarColor: p.avatarColor, status: p.status, currentRoom: p.currentRoom };
    }

    socket.emit('init', {
      players: allPlayers,
      rooms: getRoomInfo(),
      officeLayout: OFFICE_ROOMS,
    });

    socket.broadcast.emit('player:joined', { socketId: socket.id, ...playerData });

    // Check if spawned inside a room
    handleRoomTransition(socket.id);
  });

  socket.on('player:move', (data) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;

    player.x = data.x;
    player.y = data.y;

    socket.broadcast.emit('player:moved', { socketId: socket.id, x: data.x, y: data.y });

    handleRoomTransition(socket.id);
    checkSpatialProximity(socket.id);
  });

  socket.on('player:status', (data) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;
    player.status = data.status;
    io.emit('player:status-changed', { socketId: socket.id, status: data.status });
  });

  // ── Media state ────────────────────────────────────────────────
  socket.on('media:state', (data) => {
    const player = activePlayers.get(socket.id);
    if (!player) return;

    if (data.mic !== undefined) player.mic = data.mic;
    if (data.camera !== undefined) player.camera = data.camera;
    if (data.screen !== undefined) player.screen = data.screen;

    // Broadcast to room members
    if (player.currentRoom) {
      socket.to('room_' + player.currentRoom).emit('media:state-changed', {
        socketId: socket.id,
        mic: player.mic,
        camera: player.camera,
        screen: player.screen,
      });
    }
  });

  // ── WebRTC signaling ───────────────────────────────────────────
  socket.on('webrtc:offer', ({ to, offer }) => {
    io.to(to).emit('webrtc:offer', { from: socket.id, offer });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    io.to(to).emit('webrtc:answer', { from: socket.id, answer });
  });

  socket.on('webrtc:ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('webrtc:ice-candidate', { from: socket.id, candidate });
  });

  // ── Room chat ──────────────────────────────────────────────────
  socket.on('room:chat', async ({ roomId, content }) => {
    const player = activePlayers.get(socket.id);
    if (!player || !content?.trim()) return;

    const msg = {
      sender: player.username,
      senderColor: player.avatarColor,
      content: content.trim(),
      roomId: 'room_' + roomId,
      timestamp: new Date(),
    };

    try { await Message.create(msg); } catch (e) {}

    io.to('room_' + roomId).emit('room:chat-message', msg);
  });

  // ── Disconnect ─────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`💤 Disconnected: ${socket.id}`);
    const player = activePlayers.get(socket.id);

    if (player?.currentRoom) {
      const set = roomMembers.get(player.currentRoom);
      set?.delete(socket.id);
      for (const sid of set || []) {
        io.to(sid).emit('room:member-left', { socketId: socket.id, roomId: player.currentRoom });
      }
    }

    if (player) {
      User.findOneAndUpdate(
        { username: player.username },
        { lastPosition: { x: player.x, y: player.y }, lastActive: new Date() }
      ).catch(() => {});
    }

    activePlayers.delete(socket.id);
    io.emit('player:left', { socketId: socket.id });
    io.emit('rooms:update', getRoomInfo());
  });
});

// ── REST ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', players: activePlayers.size }));

// ── Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtual-cosmos');
    console.log('📦 MongoDB connected');
  } catch (err) {
    console.warn('⚠️  MongoDB not available – running without persistence');
  }
  server.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}

start();
