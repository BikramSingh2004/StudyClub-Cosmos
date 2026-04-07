import { useRef, useCallback, useEffect, useState } from 'react';
import { socket } from '../socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function useWebRTC(roomId, localUsername) {
  const peersRef = useRef(new Map()); // socketId → { pc, streams }
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map()); // socketId → { audio, video, screen }
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [mediaState, setMediaState] = useState({ mic: false, camera: false, screen: false });

  const updateRemoteStreams = useCallback((fn) => {
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      fn(next);
      return next;
    });
  }, []);

  // ── Create peer connection ─────────────────────────────────────
  const createPeerConnection = useCallback((peerId) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId).pc;

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', { to: peerId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      updateRemoteStreams((map) => {
        const existing = map.get(peerId) || {};
        // Determine stream type based on stream id or track kind
        if (stream.id.startsWith('screen_')) {
          map.set(peerId, { ...existing, screen: stream });
        } else {
          map.set(peerId, { ...existing, media: stream });
        }
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeer(peerId);
      }
    };

    // Add local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        // Tag screen stream
        const screenMediaStream = screenStreamRef.current;
        pc.addTrack(track, screenMediaStream);
      });
    }

    peersRef.current.set(peerId, { pc });
    return pc;
  }, [updateRemoteStreams]);

  const removePeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.pc.close();
      peersRef.current.delete(peerId);
    }
    updateRemoteStreams((map) => map.delete(peerId));
  }, [updateRemoteStreams]);

  // ── Initiate connection to a peer ──────────────────────────────
  const connectToPeer = useCallback(async (peerId) => {
    const pc = createPeerConnection(peerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { to: peerId, offer });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeerConnection]);

  // ── Media controls ─────────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (mediaState.mic) {
      // Turn off mic
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => t.stop());
        // Remove audio tracks from all peers
        for (const [, peer] of peersRef.current) {
          const senders = peer.pc.getSenders();
          senders.forEach((s) => {
            if (s.track?.kind === 'audio') {
              peer.pc.removeTrack(s);
            }
          });
        }
        // If no video tracks left, clear stream
        if (localStreamRef.current.getVideoTracks().length === 0) {
          localStreamRef.current = null;
          setLocalStream(null);
        } else {
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
      }
      setMediaState((s) => ({ ...s, mic: false }));
      socket.emit('room:media-state', { roomId, mic: false });
    } else {
      // Turn on mic
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        localStreamRef.current.addTrack(audioTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        // Add to all existing peers
        for (const [peerId, peer] of peersRef.current) {
          peer.pc.addTrack(audioTrack, localStreamRef.current);
          // Renegotiate
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { to: peerId, offer });
        }

        setMediaState((s) => ({ ...s, mic: true }));
        socket.emit('room:media-state', { roomId, mic: true });
      } catch (err) {
        console.error('Mic access denied:', err);
      }
    }
  }, [mediaState.mic, roomId]);

  const toggleCamera = useCallback(async () => {
    if (mediaState.camera) {
      // Turn off camera
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
        for (const [, peer] of peersRef.current) {
          const senders = peer.pc.getSenders();
          senders.forEach((s) => {
            if (s.track?.kind === 'video') {
              peer.pc.removeTrack(s);
            }
          });
        }
        if (localStreamRef.current.getTracks().length === 0) {
          localStreamRef.current = null;
          setLocalStream(null);
        } else {
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
      }
      setMediaState((s) => ({ ...s, camera: false }));
      socket.emit('room:media-state', { roomId, camera: false });
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        for (const [peerId, peer] of peersRef.current) {
          peer.pc.addTrack(videoTrack, localStreamRef.current);
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { to: peerId, offer });
        }

        setMediaState((s) => ({ ...s, camera: true }));
        socket.emit('room:media-state', { roomId, camera: true });
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }
  }, [mediaState.camera, roomId]);

  const toggleScreen = useCallback(async () => {
    if (mediaState.screen) {
      // Stop screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        for (const [, peer] of peersRef.current) {
          const senders = peer.pc.getSenders();
          senders.forEach((s) => {
            if (s.track && screenStreamRef.current?.getTracks().includes(s.track)) {
              peer.pc.removeTrack(s);
            }
          });
        }
        screenStreamRef.current = null;
        setScreenStream(null);
      }
      setMediaState((s) => ({ ...s, screen: false }));
      socket.emit('room:media-state', { roomId, screen: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Tag it for identification
        Object.defineProperty(stream, 'id', { value: 'screen_' + socket.id, writable: false });
        screenStreamRef.current = stream;
        setScreenStream(stream);

        // Handle user stopping share via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setMediaState((s) => ({ ...s, screen: false }));
          socket.emit('room:media-state', { roomId, screen: false });
          for (const [, peer] of peersRef.current) {
            const senders = peer.pc.getSenders();
            senders.forEach((s) => {
              if (s.track && stream.getTracks().includes(s.track)) {
                peer.pc.removeTrack(s);
              }
            });
          }
          screenStreamRef.current = null;
          setScreenStream(null);
        };

        for (const [peerId, peer] of peersRef.current) {
          stream.getTracks().forEach((track) => {
            peer.pc.addTrack(track, stream);
          });
          const offer = await peer.pc.createOffer();
          await peer.pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { to: peerId, offer });
        }

        setMediaState((s) => ({ ...s, screen: true }));
        socket.emit('room:media-state', { roomId, screen: true });
      } catch (err) {
        console.error('Screen share denied:', err);
      }
    }
  }, [mediaState.screen, roomId]);

  // ── Signaling listeners ────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const handleOffer = async ({ from, offer }) => {
      const pc = createPeerConnection(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtc:answer', { to: from, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async ({ from, answer }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        try {
          await peer.pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [roomId, createPeerConnection]);

  // ── Cleanup on unmount or room change ──────────────────────────
  const cleanup = useCallback(() => {
    for (const [, peer] of peersRef.current) {
      peer.pc.close();
    }
    peersRef.current.clear();
    setRemoteStreams(new Map());

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    setMediaState({ mic: false, camera: false, screen: false });
  }, []);

  return {
    localStream,
    screenStream,
    remoteStreams,
    mediaState,
    toggleMic,
    toggleCamera,
    toggleScreen,
    connectToPeer,
    removePeer,
    cleanup,
  };
}
