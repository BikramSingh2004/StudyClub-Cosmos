export default function Toolbar({ currentRoom, roomName, mediaState, onToggleMic, onToggleCamera, onToggleScreen, onToggleChat, chatOpen }) {
  if (!currentRoom) {
    return (
      <div className="h-14 bg-[#1e2035] border-t border-[#2d2f4a] flex items-center justify-center px-4">
        <p className="text-xs text-[#4a4d6a]">Walk into a room to start collaborating</p>
      </div>
    );
  }

  return (
    <div className="h-14 bg-[#1e2035] border-t border-[#2d2f4a] flex items-center justify-between px-4">
      {/* Left: room info */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 pulse-gentle" />
        <span className="text-xs text-white font-medium">{roomName}</span>
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-2">
        {/* Mic */}
        <button
          onClick={onToggleMic}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            mediaState.mic
              ? 'bg-[#2d2f4a] hover:bg-[#3a3d5c] text-white'
              : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
          title={mediaState.mic ? 'Mute' : 'Unmute'}
        >
          {mediaState.mic ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Camera */}
        <button
          onClick={onToggleCamera}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            mediaState.camera
              ? 'bg-[#2d2f4a] hover:bg-[#3a3d5c] text-white'
              : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
          title={mediaState.camera ? 'Camera Off' : 'Camera On'}
        >
          {mediaState.camera ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreen}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            mediaState.screen
              ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
              : 'bg-[#2d2f4a] hover:bg-[#3a3d5c] text-[#6b7194]'
          }`}
          title={mediaState.screen ? 'Stop Sharing' : 'Share Screen'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-[#2d2f4a] mx-1" />

        {/* Chat */}
        <button
          onClick={onToggleChat}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            chatOpen
              ? 'bg-indigo-500/15 text-indigo-400'
              : 'bg-[#2d2f4a] hover:bg-[#3a3d5c] text-[#6b7194]'
          }`}
          title="Chat"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* Right: leave hint */}
      <div className="text-[10px] text-[#4a4d6a]">Walk out to leave</div>
    </div>
  );
}
