import { useState } from 'react';
import { getRandomColor } from '../constants';

export default function JoinScreen({ onJoin }) {
  const [username, setUsername] = useState('');
  const [color] = useState(getRandomColor);

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    onJoin({ username: name, avatarColor: color });
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#12131e]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative bg-[#1e2035] border border-[#2d2f4a] rounded-2xl p-10 w-full max-w-[420px] shadow-2xl shadow-black/40">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Virtual Cosmos</h1>
          </div>
          <p className="text-[#6b7194] text-sm">Step into your virtual office</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#8b8fb0] uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              autoFocus
              className="w-full px-4 py-3 bg-[#12131e] border border-[#2d2f4a] rounded-xl text-white placeholder-[#3d4062] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
            />
          </div>

          {/* Avatar preview */}
          <div className="flex items-center gap-4 p-4 bg-[#12131e] rounded-xl border border-[#2d2f4a]">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0"
              style={{ backgroundColor: color }}
            >
              {username.trim() ? username.trim()[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-white text-sm font-medium">{username.trim() || 'Your Name'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[11px] text-[#6b7194]">Available</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-[#2d2f4a] disabled:to-[#2d2f4a] disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 text-sm"
          >
            Enter Office
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-6 text-[11px] text-[#4a4d6a]">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-[#2d2f4a] rounded text-[#6b7194] font-mono text-[10px]">WASD</kbd>
            Move
          </span>
          <span>Walk into rooms to join</span>
        </div>
      </div>
    </div>
  );
}
