import { useState, useEffect, useRef } from "react";
import { socket } from "../socket";

export default function RoomChat({ roomId, username, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    const onMsg = (msg) => setMessages((prev) => [...prev, msg]);
    const onHistory = ({ history }) => setMessages(history || []);

    socket.on("room:chat-message", onMsg);
    socket.on("room:chat-history", onHistory);
    if (roomId) {
      socket.emit("room:chat-history-request", { roomId });
    }
    return () => {
      socket.off("room:chat-message", onMsg);
      socket.off("room:chat-history", onHistory);
    };
  }, [roomId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit("room:chat", { roomId, content: input.trim() });
    setInput("");
  };

  return (
    <div className="w-[340px] bg-[#1e2035] border-l border-[#2d2f4a] flex flex-col h-full shrink-0 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#2d2f4a] bg-[#1a1c2e]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
          <span className="text-sm font-semibold text-white">Room Chat</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#4a4d6a] hover:text-white transition-colors p-1 rounded hover:bg-[#2d2f4a]"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scroll">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-[#4a4d6a] text-sm mb-2">👋</div>
            <p className="text-[#4a4d6a] text-sm">No messages yet</p>
            <p className="text-[#3a3d5c] text-xs mt-1">
              Start the conversation!
            </p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === username;
          return (
            <div
              key={i}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[85%]">
                {!isMe && (
                  <span
                    className="text-xs ml-1 mb-1 block font-medium"
                    style={{ color: msg.senderColor }}
                  >
                    {msg.sender}
                  </span>
                )}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                    isMe
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-[#2d2f4a] text-[#c8cbe0] rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-[#3a3d5c] mt-1 block px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#2d2f4a] bg-[#1a1c2e]">
        <form onSubmit={send} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 bg-[#12131e] border border-[#2d2f4a] rounded-xl text-sm text-white placeholder-[#4a4d6a] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-[#2d2f4a] disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 hover:shadow-lg disabled:hover:shadow-none flex items-center justify-center min-w-[48px]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <div className="text-xs text-[#4a4d6a] text-center">
            Press Enter to send • Messages are visible to room members
          </div>
        </form>
      </div>
    </div>
  );
}
