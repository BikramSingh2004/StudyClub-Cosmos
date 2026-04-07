import { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { socket } from '../socket';
import { WORLD_WIDTH, WORLD_HEIGHT, MOVE_SPEED, AVATAR_RADIUS, PROXIMITY_RADIUS } from '../constants';
import useWebRTC from '../hooks/useWebRTC';
import Sidebar from './Sidebar';
import Toolbar from './Toolbar';
import RoomChat from './RoomChat';
import VideoOverlay from './VideoOverlay';

// ── Office floor plan drawing ────────────────────────────────────────
function drawOfficeFloor(container, rooms) {
  // Background
  const bg = new PIXI.Graphics();
  bg.beginFill(0x1a1c2e);
  bg.drawRect(-200, -200, WORLD_WIDTH + 400, WORLD_HEIGHT + 400);
  bg.endFill();
  container.addChild(bg);

  // Floor
  const floor = new PIXI.Graphics();
  floor.beginFill(0x252840);
  floor.drawRoundedRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 12);
  floor.endFill();
  container.addChild(floor);

  // Grid dots
  const dots = new PIXI.Graphics();
  for (let x = 30; x < WORLD_WIDTH; x += 30) {
    for (let y = 30; y < WORLD_HEIGHT; y += 30) {
      dots.beginFill(0xffffff, 0.03);
      dots.drawCircle(x, y, 1);
      dots.endFill();
    }
  }
  container.addChild(dots);

  // Draw each room
  rooms.forEach((room) => {
    const roomG = new PIXI.Graphics();
    const hex = PIXI.utils.string2hex(room.color);

    // Room fill
    roomG.beginFill(hex, 0.08);
    roomG.lineStyle(1.5, hex, 0.25);
    roomG.drawRoundedRect(room.x, room.y, room.w, room.h, 10);
    roomG.endFill();

    // Inner subtle border
    roomG.lineStyle(0.5, hex, 0.1);
    roomG.drawRoundedRect(room.x + 4, room.y + 4, room.w - 8, room.h - 8, 8);

    container.addChild(roomG);

    // Room label background
    const labelBg = new PIXI.Graphics();
    const labelX = room.x + 12;
    const labelY = room.y + 10;
    labelBg.beginFill(hex, 0.15);
    labelBg.drawRoundedRect(labelX - 2, labelY - 2, 10, 10, 3);
    labelBg.endFill();
    container.addChild(labelBg);

    // Room type icon (small dot)
    const iconDot = new PIXI.Graphics();
    iconDot.beginFill(hex, 0.6);
    iconDot.drawCircle(labelX + 3, labelY + 3, 2.5);
    iconDot.endFill();
    container.addChild(iconDot);

    // Room name
    const nameText = new PIXI.Text(room.name, {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: hex,
      letterSpacing: 0.3,
    });
    nameText.alpha = 0.7;
    nameText.x = labelX + 14;
    nameText.y = labelY - 2;
    container.addChild(nameText);

    // Room type subtitle
    const typeText = new PIXI.Text(room.type === 'meeting' ? 'Meeting Room' : 'Spatial Area', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 8,
      fill: 0x6b7194,
    });
    typeText.x = labelX + 14;
    typeText.y = labelY + 12;
    container.addChild(typeText);

    // Furniture hints (simple shapes)
    drawFurniture(container, room);
  });
}

function drawFurniture(container, room) {
  const g = new PIXI.Graphics();
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;

  if (room.type === 'meeting') {
    // Conference table
    g.beginFill(0xffffff, 0.04);
    g.drawRoundedRect(cx - 40, cy - 15, 80, 30, 8);
    g.endFill();
    g.lineStyle(0.5, 0xffffff, 0.06);
    g.drawRoundedRect(cx - 40, cy - 15, 80, 30, 8);

    // Chairs
    for (let i = 0; i < 3; i++) {
      g.beginFill(0xffffff, 0.03);
      g.drawCircle(cx - 30 + i * 30, cy - 28, 6);
      g.drawCircle(cx - 30 + i * 30, cy + 28, 6);
      g.endFill();
    }
  } else if (room.id === 'cafe') {
    // Small round tables
    for (let i = 0; i < 3; i++) {
      const tx = room.x + 50 + i * 80;
      const ty = room.y + room.h / 2 + (i % 2 ? -20 : 20);
      g.beginFill(0xffffff, 0.03);
      g.drawCircle(tx, ty, 14);
      g.endFill();
      g.lineStyle(0.5, 0xffffff, 0.04);
      g.drawCircle(tx, ty, 14);
      g.lineStyle(0);
    }
  } else if (room.id === 'focus-zone') {
    // Desk rows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const dx = room.x + 60 + col * 110;
        const dy = room.y + 80 + row * 120;
        g.beginFill(0xffffff, 0.03);
        g.drawRoundedRect(dx, dy, 50, 30, 4);
        g.endFill();
      }
    }
  } else if (room.id === 'open-space') {
    // Scattered desks
    const desks = [[80, 60], [200, 100], [320, 60], [440, 100], [150, 200], [300, 220], [460, 200]];
    desks.forEach(([dx, dy]) => {
      g.beginFill(0xffffff, 0.025);
      g.drawRoundedRect(room.x + dx, room.y + dy, 40, 25, 4);
      g.endFill();
    });
  } else {
    // Generic furniture
    g.beginFill(0xffffff, 0.03);
    g.drawRoundedRect(cx - 30, cy - 10, 60, 20, 6);
    g.endFill();
  }

  container.addChild(g);
}

// ── Avatar ───────────────────────────────────────────────────────────
function createAvatar(username, color, isLocal = false) {
  const container = new PIXI.Container();
  const hexColor = PIXI.utils.string2hex(color);

  // Proximity area box (for local player)
  if (isLocal) {
    const box = new PIXI.Graphics();
    box.beginFill(hexColor, 0.04);
    box.lineStyle(1, hexColor, 0.12);
    box.drawRoundedRect(-PROXIMITY_RADIUS / 2, -PROXIMITY_RADIUS / 2, PROXIMITY_RADIUS, PROXIMITY_RADIUS, 8);
    box.endFill();
    container.addChild(box);
  }

  // Shadow
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.15);
  shadow.drawEllipse(0, AVATAR_RADIUS - 2, AVATAR_RADIUS - 4, 5);
  shadow.endFill();
  container.addChild(shadow);

  // Outer glow ring
  const glow = new PIXI.Graphics();
  glow.beginFill(hexColor, 0.12);
  glow.drawCircle(0, 0, AVATAR_RADIUS + 4);
  glow.endFill();
  container.addChild(glow);

  // Main circle
  const circle = new PIXI.Graphics();
  circle.beginFill(hexColor);
  circle.drawCircle(0, 0, AVATAR_RADIUS);
  circle.endFill();
  circle.lineStyle(2, 0xffffff, isLocal ? 0.35 : 0.15);
  circle.drawCircle(0, 0, AVATAR_RADIUS);
  container.addChild(circle);

  // Initial
  const letter = new PIXI.Text(username[0].toUpperCase(), {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: 'bold',
    fill: 0xffffff,
  });
  letter.anchor.set(0.5);
  container.addChild(letter);

  // Name label
  const name = new PIXI.Text(username, {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 9,
    fontWeight: '600',
    fill: 0xffffff,
    dropShadow: true,
    dropShadowAlpha: 0.6,
    dropShadowBlur: 4,
    dropShadowDistance: 0,
  });
  name.anchor.set(0.5);
  name.y = AVATAR_RADIUS + 10;
  container.addChild(name);

  return container;
}

// ── Main Component ───────────────────────────────────────────────────
export default function Cosmos({ username, avatarColor }) {
  const canvasRef = useRef(null);
  const playersRef = useRef(new Map());
  const keysRef = useRef(new Set());
  const localPosRef = useRef({ x: 0, y: 0 });

  const [allPlayers, setAllPlayers] = useState({});
  const [rooms, setRooms] = useState([]);
  const [, setOfficeLayout] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [status, setStatus] = useState('available');

  const webrtc = useWebRTC(currentRoom?.roomId, username);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    socket.emit('player:status', { status: newStatus });
  };

  // ── Connect to new room peers ──────────────────────────────────
  useEffect(() => {
    if (!currentRoom) return;
    const others = roomMembers.filter((m) => m.socketId !== socket.id);
    others.forEach((m) => webrtc.connectToPeer(m.socketId));
  }, [currentRoom?.roomId]);

  useEffect(() => {
    // ── PixiJS ───────────────────────────────────────────────────
    const app = new PIXI.Application({
      width: window.innerWidth - 260, // sidebar
      height: window.innerHeight - 56, // toolbar
      backgroundColor: 0x1a1c2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    canvasRef.current.appendChild(app.view);

    const world = new PIXI.Container();
    app.stage.addChild(world);

    let localAvatar = null;

    // ── Keyboard ──────────────────────────────────────────────────
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      keysRef.current.add(e.key.toLowerCase());
    };
    const onKeyUp = (e) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      const chatW = chatOpen ? 300 : 0;
      app.renderer.resize(window.innerWidth - 260 - chatW, window.innerHeight - 56);
    };
    window.addEventListener('resize', onResize);

    // ── Socket ────────────────────────────────────────────────────
    socket.connect();
    socket.emit('player:join', { username, avatarColor });

    socket.on('init', (data) => {
      setAllPlayers(data.players);
      setRooms(data.rooms);
      setOfficeLayout(data.officeLayout);

      // Draw office
      drawOfficeFloor(world, data.officeLayout);

      // Create all players
      for (const [sid, p] of Object.entries(data.players)) {
        if (sid === socket.id) {
          localPosRef.current = { x: p.x, y: p.y };
          localAvatar = createAvatar(username, avatarColor, true);
          localAvatar.x = p.x;
          localAvatar.y = p.y;
          world.addChild(localAvatar);
        } else {
          const avatar = createAvatar(p.username, p.avatarColor, false);
          avatar.x = p.x;
          avatar.y = p.y;
          world.addChild(avatar);
          playersRef.current.set(sid, avatar);
        }
      }
    });

    socket.on('player:joined', ({ socketId, username: name, avatarColor: color, x, y, status: s }) => {
      if (playersRef.current.has(socketId)) return;
      const avatar = createAvatar(name, color, false);
      avatar.x = x;
      avatar.y = y;
      world.addChild(avatar);
      playersRef.current.set(socketId, avatar);
      setAllPlayers((prev) => ({ ...prev, [socketId]: { username: name, avatarColor: color, x, y, status: s } }));
    });

    socket.on('player:moved', ({ socketId, x, y }) => {
      const avatar = playersRef.current.get(socketId);
      if (avatar) { avatar.x = x; avatar.y = y; }
      setAllPlayers((prev) => prev[socketId] ? { ...prev, [socketId]: { ...prev[socketId], x, y } } : prev);
    });

    socket.on('player:left', ({ socketId }) => {
      const avatar = playersRef.current.get(socketId);
      if (avatar) {
        world.removeChild(avatar);
        avatar.destroy({ children: true });
        playersRef.current.delete(socketId);
      }
      setAllPlayers((prev) => {
        const next = { ...prev };
        delete next[socketId];
        return next;
      });
    });

    socket.on('player:status-changed', ({ socketId, status: s }) => {
      setAllPlayers((prev) => prev[socketId] ? { ...prev, [socketId]: { ...prev[socketId], status: s } } : prev);
    });

    // Room events
    socket.on('rooms:update', (data) => setRooms(data));

    socket.on('room:joined', (data) => {
      setCurrentRoom(data);
      setRoomMembers(data.members || []);
    });

    socket.on('room:left', () => {
      setCurrentRoom(null);
      setRoomMembers([]);
    });

    socket.on('room:member-joined', (data) => {
      setRoomMembers((prev) => {
        if (prev.some((m) => m.socketId === data.socketId)) return prev;
        return [...prev, data];
      });
    });

    socket.on('room:member-left', ({ socketId }) => {
      setRoomMembers((prev) => prev.filter((m) => m.socketId !== socketId));
    });

    socket.on('media:state-changed', ({ socketId, mic, camera, screen }) => {
      setRoomMembers((prev) =>
        prev.map((m) => m.socketId === socketId ? { ...m, mic, camera, screen } : m)
      );
    });

    // Proximity (for spatial rooms)
    socket.on('proximity:near', () => {
      // Visual feedback handled by proximity box overlap
    });

    // ── Game Loop ────────────────────────────────────────────────
    let lastEmit = 0;
    app.ticker.add(() => {
      if (!localAvatar) return;
      const keys = keysRef.current;
      let dx = 0, dy = 0;

      if (keys.has('w') || keys.has('arrowup')) dy -= MOVE_SPEED;
      if (keys.has('s') || keys.has('arrowdown')) dy += MOVE_SPEED;
      if (keys.has('a') || keys.has('arrowleft')) dx -= MOVE_SPEED;
      if (keys.has('d') || keys.has('arrowright')) dx += MOVE_SPEED;

      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }

      if (dx !== 0 || dy !== 0) {
        let newX = localPosRef.current.x + dx;
        let newY = localPosRef.current.y + dy;
        newX = Math.max(AVATAR_RADIUS, Math.min(WORLD_WIDTH - AVATAR_RADIUS, newX));
        newY = Math.max(AVATAR_RADIUS, Math.min(WORLD_HEIGHT - AVATAR_RADIUS, newY));

        localPosRef.current = { x: newX, y: newY };
        localAvatar.x = newX;
        localAvatar.y = newY;

        const now = Date.now();
        if (now - lastEmit > 33) {
          socket.emit('player:move', { x: newX, y: newY });
          lastEmit = now;
        }
      }

      // Camera follow
      const vw = app.renderer.width / (window.devicePixelRatio || 1);
      const vh = app.renderer.height / (window.devicePixelRatio || 1);
      const targetX = -localPosRef.current.x + vw / 2;
      const targetY = -localPosRef.current.y + vh / 2;
      world.x += (targetX - world.x) * 0.1;
      world.y += (targetY - world.y) * 0.1;
    });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      socket.off('init');
      socket.off('player:joined');
      socket.off('player:moved');
      socket.off('player:left');
      socket.off('player:status-changed');
      socket.off('rooms:update');
      socket.off('room:joined');
      socket.off('room:left');
      socket.off('room:member-joined');
      socket.off('room:member-left');
      socket.off('media:state-changed');
      socket.off('proximity:near');
      socket.off('proximity:far');
      socket.disconnect();
      app.destroy(true, { children: true });
    };
  }, [username, avatarColor]);

  // When room changes, cleanup webrtc
  useEffect(() => {
    if (!currentRoom) {
      webrtc.cleanup();
      setChatOpen(false);
    }
  }, [currentRoom]);

  return (
    <div className="flex h-screen w-screen">
      {/* Left Sidebar */}
      <Sidebar
        rooms={rooms}
        players={allPlayers}
        currentRoom={currentRoom?.roomId}
        username={username}
        status={status}
        onStatusChange={handleStatusChange}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Canvas + overlays */}
        <div className="flex-1 relative overflow-hidden">
          <div ref={canvasRef} className="absolute inset-0" />

          {/* Video tiles overlay */}
          <VideoOverlay
            localStream={webrtc.localStream}
            screenStream={webrtc.screenStream}
            remoteStreams={webrtc.remoteStreams}
            members={roomMembers.filter((m) => m.socketId !== socket.id)}
            username={username}
            avatarColor={avatarColor}
            mediaState={webrtc.mediaState}
          />

          {/* Room indicator */}
          {currentRoom && (
            <div className="absolute top-3 left-3 z-20 bg-[#1e2035]/90 backdrop-blur-lg border border-[#2d2f4a] rounded-xl px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-gentle" />
              <span className="text-xs text-white font-medium">{currentRoom.roomName}</span>
              <span className="text-[10px] text-[#4a4d6a]">· {roomMembers.length} here</span>
            </div>
          )}

          {/* Controls hint when not in room */}
          {!currentRoom && (
            <div className="absolute bottom-3 left-3 z-20 bg-[#1e2035]/80 backdrop-blur-sm border border-[#2d2f4a] rounded-lg px-3 py-1.5">
              <span className="text-[10px] text-[#4a4d6a]">
                <kbd className="px-1 py-0.5 bg-[#2d2f4a] rounded text-[#6b7194] font-mono text-[9px] mr-1">WASD</kbd>
                Move · Walk into a room to join
              </span>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <Toolbar
          currentRoom={currentRoom?.roomId}
          roomName={currentRoom?.roomName}
          mediaState={webrtc.mediaState}
          onToggleMic={webrtc.toggleMic}
          onToggleCamera={webrtc.toggleCamera}
          onToggleScreen={webrtc.toggleScreen}
          onToggleChat={() => setChatOpen((v) => !v)}
          chatOpen={chatOpen}
        />
      </div>

      {/* Right Chat Panel */}
      {chatOpen && currentRoom && (
        <RoomChat
          roomId={currentRoom.roomId}
          username={username}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
