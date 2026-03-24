import { useRef, useState, useCallback, useEffect } from 'react';

interface UseWebRTCStreamOptions {
  onStream?: (stream: MediaStream) => void;
  onError?: (error: string) => void;
}

interface StreamConnection {
  id: string;
  stream: MediaStream;
  deviceName: string;
  connectedAt: Date;
}

// Simple signaling using BroadcastChannel for same-origin communication
export function useWebRTCStream(options: UseWebRTCStreamOptions = {}) {
  const { onStream, onError } = options;
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [connections, setConnections] = useState<StreamConnection[]>([]);
  const [roomCode, setRoomCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Generate a simple room code
  const generateRoomCode = useCallback(() => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
    return code;
  }, []);

  // Start streaming from this device (camera source)
  const startStreaming = useCallback(async (facingMode: 'user' | 'environment' = 'environment') => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      localStreamRef.current = stream;
      setIsStreaming(true);
      
      // Store stream in localStorage for cross-tab access (simplified approach)
      const code = generateRoomCode();
      
      // Use BroadcastChannel for cross-tab communication
      const channel = new BroadcastChannel(`vitals-vision-${code}`);
      channelRef.current = channel;
      
      channel.postMessage({ type: 'stream-ready', code });
      
      onStream?.(stream);
      
      return { stream, roomCode: code };
    } catch (err) {
      const errorMsg = 'Failed to access camera. Please allow camera permissions.';
      setError(errorMsg);
      onError?.(errorMsg);
      throw err;
    }
  }, [generateRoomCode, onStream, onError]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
    
    setIsStreaming(false);
    setRoomCode('');
  }, []);

  // Get local stream
  const getLocalStream = useCallback(() => localStreamRef.current, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isStreaming,
    connections,
    roomCode,
    error,
    startStreaming,
    stopStreaming,
    getLocalStream,
    generateRoomCode,
  };
}

// Hook for receiving stream (dashboard side)
export function useStreamReceiver() {
  const [connectedStream, setConnectedStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For simplicity, we'll use a shared page approach
  // The mobile opens a camera page, dashboard opens the same page in receiver mode
  
  return {
    connectedStream,
    isConnected,
    error,
    setConnectedStream,
    setIsConnected,
  };
}
