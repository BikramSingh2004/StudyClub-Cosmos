import { STATUSES } from '../constants';

function StatusDot({ status, size = 'w-2 h-2' }) {
  const s = STATUSES.find((st) => st.id === status) || STATUSES[0];
  return <div className={`${size} rounded-full shrink-0`} style={{ backgroundColor: s.color }} />;
}

function RoomTypeIcon({ type }) {
  if (type === 'meeting') {
    return (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function Sidebar({ rooms, players, currentRoom, username, status, onStatusChange }) {
  const onlineUsers = Object.entries(players);

  return (
    <div className="w-[260px] bg-[#1e2035] border-r border-[#2d2f4a] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#2d2f4a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-none">Virtual Cosmos</h2>
            <p className="text-[10px] text-[#6b7194] mt-0.5">Virtual Office</p>
          </div>
        </div>
      </div>

      {/* Current user */}
      <div className="px-4 py-3 border-b border-[#2d2f4a]">
        <div className="flex items-center gap-2.5">
          <StatusDot status={status} />
          <span className="text-xs text-white font-medium truncate flex-1">{username}</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-[10px] bg-[#12131e] border border-[#2d2f4a] text-[#6b7194] rounded-md px-1.5 py-1 focus:outline-none cursor-pointer"
          >
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="px-3 pt-4 pb-2">
          <h3 className="text-[10px] font-bold text-[#4a4d6a] uppercase tracking-widest px-1 mb-2">Rooms</h3>
          <div className="space-y-0.5">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all cursor-default ${
                  currentRoom === room.id
                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                    : 'hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: room.color, opacity: 0.8 }}
                >
                  <RoomTypeIcon type={room.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate leading-tight">{room.name}</p>
                  <p className="text-[10px] text-[#4a4d6a] leading-tight">
                    {room.type === 'meeting' ? 'Meeting' : 'Spatial'} · {room.memberCount} inside
                  </p>
                </div>
                {room.memberCount > 0 && (
                  <div className="flex -space-x-1">
                    {room.members.slice(0, 3).map((m) => (
                      <div
                        key={m.socketId}
                        className="w-4 h-4 rounded-full border border-[#1e2035] flex items-center justify-center text-[6px] text-white font-bold"
                        style={{ backgroundColor: m.avatarColor }}
                      />
                    ))}
                    {room.memberCount > 3 && (
                      <div className="w-4 h-4 rounded-full border border-[#1e2035] bg-[#2d2f4a] flex items-center justify-center text-[6px] text-[#6b7194]">
                        +{room.memberCount - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div className="px-3 pt-3 pb-4">
          <h3 className="text-[10px] font-bold text-[#4a4d6a] uppercase tracking-widest px-1 mb-2">
            Online — {onlineUsers.length}
          </h3>
          <div className="space-y-0.5">
            {onlineUsers.map(([sid, p]) => (
              <div key={sid} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03]">
                <div className="relative shrink-0">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.username[0].toUpperCase()}
                  </div>
                  <StatusDot status={p.status || 'available'} size="w-1.5 h-1.5 absolute -bottom-0 -right-0 border border-[#1e2035]" />
                </div>
                <span className="text-xs text-[#8b8fb0] truncate">{p.username}</span>
                {p.currentRoom && (
                  <span className="text-[9px] text-[#4a4d6a] ml-auto truncate">
                    {rooms.find((r) => r.id === p.currentRoom)?.name || ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
