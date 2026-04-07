# Virtual Cosmos

A 2D virtual office environment inspired by [Cosmos.video](https://cosmos.video) where users navigate a top-down floor plan, walk into rooms to join calls, and collaborate with audio, video, screen sharing, and chat — all in real time.

## Demo

1. Open **http://localhost:5173** in your browser
2. Enter your name → you spawn in the **Lounge**
3. Use **WASD** or **Arrow Keys** to move around the office
4. Walk into any room → you auto-join and see other members
5. Toggle **Mic / Camera / Screen Share** from the bottom toolbar
6. Open **Chat** to message room members
7. Walk out of a room → you auto-leave

## Features

### Office Floor Plan
- 7 predefined rooms: Lounge, Meeting Room A, Meeting Room B, Open Space, Focus Zone, Cafe, Boardroom
- **Spatial Areas** — proximity-based connection (overlap with nearby users)
- **Meeting Rooms** — everyone inside hears/sees everyone
- Rooms rendered with furniture hints, labels, and color-coded zones

### Avatars & Movement
- Smooth WASD / Arrow Key movement at 60fps
- Colored circle avatars with initials and name labels
- **Proximity box** around local player showing connection range
- Diagonal movement normalization for consistent speed

### Audio / Video / Screen Share (WebRTC)
- **Mic toggle** — push to unmute, red indicator when muted
- **Camera toggle** — live video tiles that float over the map
- **Screen sharing** — any room member can share their screen
- Peer-to-peer via WebRTC with STUN servers for NAT traversal
- Signaling through Socket.IO

### Chat
- Room-based group chat with message persistence (MongoDB)
- Chat history loads on room join
- Right-side panel with message bubbles and timestamps

### Status System
- **Available** (green) — auto-connects in spatial areas
- **Focusing** (blue) — visible but won't auto-join calls
- **Away** (yellow) — indicates inactive

### Professional UI
- Dark theme with color-coded room zones
- **Left sidebar** — rooms list with member counts, online users with status
- **Bottom toolbar** — media controls (mic, camera, screen, chat)
- **Floating video tiles** — overlay on the map canvas
- Clean, minimal design inspired by Cosmos.video

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 (Vite 8), PixiJS 7, Tailwind CSS 4 |
| Backend | Node.js, Express 5, Socket.IO 4 |
| Media | WebRTC (peer-to-peer) |
| Database | MongoDB (Mongoose 9) |

## Project Structure

```
virtual-cosmos/
├── client/
│   └── src/
│       ├── components/
│       │   ├── Cosmos.jsx       # Main canvas + game loop + room logic
│       │   ├── Sidebar.jsx      # Left sidebar (rooms, users, status)
│       │   ├── Toolbar.jsx      # Bottom media controls
│       │   ├── VideoOverlay.jsx # Floating video tiles
│       │   ├── RoomChat.jsx     # Right chat panel
│       │   └── JoinScreen.jsx   # Entry screen
│       ├── hooks/
│       │   └── useWebRTC.js     # WebRTC peer connections + media
│       ├── socket.js            # Socket.IO client
│       ├── constants.js         # Config values
│       └── App.jsx
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   └── Room.js
│   ├── index.js                 # Server + rooms + signaling
│   └── .env
└── README.md
```

## Setup

### Prerequisites
- Node.js >= 18
- MongoDB (optional — app works without it)

### Install & Run

```bash
# Install dependencies
npm run install:all

# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev
```

Open **http://localhost:5173** in multiple browser tabs to test.

### Environment

Edit `server/.env`:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/virtual-cosmos
CLIENT_URL=http://localhost:5173
```

## Architecture

```
User walks into room zone
        ↓
Server detects position inside room bounds
        ↓
Emits "room:joined" with member list
        ↓
Client establishes WebRTC peer connections to all members
        ↓
Audio/Video/Screen streams flow peer-to-peer
        ↓
User walks out → "room:left" → WebRTC cleanup
```

### Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `player:join` | C → S | Enter the office |
| `player:move` | C → S | Position update (~30fps) |
| `room:joined` | S → C | Auto-join when walking into a room |
| `room:left` | S → C | Auto-leave when walking out |
| `room:member-joined` | S → C | New person entered the room |
| `room:member-left` | S → C | Person left the room |
| `media:state` | C → S | Mic/camera/screen toggle |
| `webrtc:offer/answer/ice-candidate` | C ↔ C | WebRTC signaling |
| `room:chat` / `room:chat-message` | Bidirectional | Room messaging |

## Office Layout

| Room | Type | Description |
|------|------|-------------|
| Lounge | Spatial | Casual area, proximity-based connection |
| Meeting Room A | Meeting | Everyone hears everyone |
| Meeting Room B | Meeting | Everyone hears everyone |
| Open Space | Spatial | Large open area with desks |
| Focus Zone | Spatial | Quiet work area |
| Cafe | Spatial | Social area with tables |
| Boardroom | Meeting | Formal meeting space |
