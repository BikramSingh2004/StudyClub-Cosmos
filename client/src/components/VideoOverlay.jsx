import { useEffect, useRef } from 'react';

function VideoTile({ stream, username, avatarColor, muted, isLocal, mic, camera, isScreen }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = camera || isScreen;

  return (
    <div className="relative w-[180px] h-[120px] rounded-xl overflow-hidden bg-[#12131e] border border-[#2d2f4a] shadow-lg shadow-black/30 shrink-0">
      {stream && hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#1e2035]">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: avatarColor }}
          >
            {username?.[0]?.toUpperCase() || '?'}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white font-medium truncate">
            {isScreen ? 'Screen' : username}
            {isLocal && !isScreen ? ' (You)' : ''}
          </span>
          {!isScreen && !mic && (
            <div className="w-4 h-4 rounded-full bg-red-500/60 flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <line x1="3" y1="3" x2="21" y2="21" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VideoOverlay({ localStream, screenStream, remoteStreams, members, username, avatarColor, mediaState }) {
  // Only show if someone has media active
  const hasAnyMedia = mediaState.camera || mediaState.mic || mediaState.screen ||
    members.some((m) => m.camera || m.screen);

  if (!hasAnyMedia) return null;

  return (
    <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end max-h-[calc(100%-80px)] overflow-y-auto custom-scroll">
      {/* Local video */}
      {(mediaState.camera || mediaState.mic) && (
        <VideoTile
          stream={localStream}
          username={username}
          avatarColor={avatarColor}
          muted={true}
          isLocal={true}
          mic={mediaState.mic}
          camera={mediaState.camera}
        />
      )}

      {/* Local screen share */}
      {screenStream && (
        <VideoTile
          stream={screenStream}
          username={username}
          avatarColor={avatarColor}
          muted={true}
          isLocal={true}
          isScreen={true}
          mic={true}
          camera={true}
        />
      )}

      {/* Remote streams */}
      {members
        .filter((m) => m.socketId !== undefined)
        .map((m) => {
          const remote = remoteStreams.get(m.socketId);
          return (
            <div key={m.socketId} className="contents">
              {(m.camera || m.mic) && (
                <VideoTile
                  stream={remote?.media}
                  username={m.username}
                  avatarColor={m.avatarColor}
                  muted={false}
                  isLocal={false}
                  mic={m.mic}
                  camera={m.camera}
                />
              )}
              {remote?.screen && (
                <VideoTile
                  stream={remote.screen}
                  username={m.username}
                  avatarColor={m.avatarColor}
                  muted={false}
                  isLocal={false}
                  isScreen={true}
                  mic={true}
                  camera={true}
                />
              )}
            </div>
          );
        })}
    </div>
  );
}
