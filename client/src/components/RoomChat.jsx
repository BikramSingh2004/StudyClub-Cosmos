import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

export default function RoomChat({ roomId, username, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    const onMsg = (msg) => setMessages((prev) => [...prev, msg]);
    const onHistory = ({ history }) => setMessages(history || []);

    socket.on('room:chat-message', onMsg);
    socket.on('room:chat-history', onHistory);
    return () => {
      socket.off('room:chat-message', onMsg);
      socket.off('room:chat-history', onHistory);
    };
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit('room:chat', { roomId, content: input.trim() });
    setInput('');
  };

  return (
    <div className="w-[300px] bg-[#1e2035] border-l border-[#2d2f4a] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d2f4a]">
        <span className="text-xs font-semibold text-white">Chat</span>
        <button onClick={onClose} className="text-[#4a4d6a] hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scroll">
        {messages.length === 0 && (
          <p className="text-center text-[#4a4d6a] text-xs py-8">No messages yet</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === username;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%]">
                {!isMe && (
                  <span className="text-[10px] ml-1 mb-0.5 block" style={{ color: msg.senderColor }}>
                    {msg.sender}
                  </span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed break-words ${
                  isMe
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-[#2d2f4a] text-[#c8cbe0] rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-[#3a3d5c] mt-0.5 block px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="p-3 border-t border-[#2d2f4a]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 px-3 py-2 bg-[#12131e] border border-[#2d2f4a] rounded-lg text-xs text-white placeholder-[#3a3d5c] focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#2d2f4a] text-white rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
