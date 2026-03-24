import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Smartphone, Wifi, WifiOff, Copy, Check, Video, VideoOff, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useFallAlert } from '@/hooks/useFallAlert';

export function MobileCameraStreamer() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fallCount, setFallCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const deviceIdRef = useRef(`mobile-${Date.now().toString(36)}`);

  const { triggerFallAlert } = useFallAlert();

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    function connectWs() {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWs, 3000);
        };
        ws.onerror = () => setWsConnected(false);
      } catch {
        setTimeout(connectWs, 3000);
      }
    }
    connectWs();
    return () => { wsRef.current?.close(); };
  }, []);

  const startFrameStreaming = useCallback(() => {
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
      captureCanvasRef.current.width = 320;
      captureCanvasRef.current.height = 240;
    }
    
    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const ctx = captureCanvasRef.current!.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      const frame = captureCanvasRef.current!.toDataURL('image/jpeg', 0.5);
      wsRef.current.send(JSON.stringify({
        type: 'camera_frame',
        frame,
        deviceId: deviceIdRef.current,
        timestamp: Date.now(),
      }));
    }, 200);
  }, []);

  const stopFrameStreaming = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'camera_status',
        status: 'stopped',
        deviceId: deviceIdRef.current,
      }));
    }
  }, []);

  const {
    isLoading,
    isRunning,
    error: poseError,
    currentPose,
    startCamera,
    stopCamera,
  } = usePoseDetection({
    onFallDetected: () => {
      triggerFallAlert();
      setFallCount(prev => prev + 1);
    },
    fallThreshold: 45,
  });

  const handleStartCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      setError(null);
      
      // Get camera stream and assign to video element
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      // Wait for video to be ready before starting pose detection
      await new Promise<void>((resolve) => {
        if (videoRef.current!.readyState >= 2) {
          resolve();
        } else {
          videoRef.current!.onloadeddata = () => resolve();
        }
      });
      
      await startCamera(videoRef.current, canvasRef.current);
      setIsStreaming(true);
      startFrameStreaming();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'camera_status',
          status: 'streaming',
          deviceId: deviceIdRef.current,
        }));
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Failed to access camera. Please allow camera permissions.');
    }
  }, [facingMode, startCamera, startFrameStreaming]);

  const handleStopCamera = useCallback(() => {
    stopFrameStreaming();
    stopCamera();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, [stopCamera, stopFrameStreaming]);

  const handleSwitchCamera = useCallback(async () => {
    handleStopCamera();
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    
    setTimeout(() => {
      handleStartCamera();
    }, 300);
  }, [facingMode, handleStopCamera, handleStartCamera]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, [handleStopCamera]);

  const isFallDetected = currentPose.isFallDetected;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Smartphone className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold font-formal text-primary">Mobile Camera</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Vitals-Vision AI - Real-time Fall Detection
          </p>
          <Badge variant={wsConnected ? 'default' : 'destructive'} className="text-[10px] gap-1 mt-2">
            {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsConnected ? 'Streaming to Dashboard' : 'Dashboard Disconnected'}
          </Badge>
        </div>

        {/* Camera Feed */}
        <Card className={cn(
          'overflow-hidden transition-all duration-300 mb-4',
          isFallDetected && 'ring-4 ring-destructive animate-pulse-alert'
        )}>
          <CardContent className="p-0">
            <div className="relative aspect-[3/4] bg-camera-bg">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-30"
                autoPlay
                playsInline
                muted
              />
              
              <canvas
                ref={canvasRef}
                width={480}
                height={640}
                className={cn(
                  'absolute inset-0 w-full h-full object-cover',
                  !isRunning && 'hidden'
                )}
              />

              {!isStreaming && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <Camera className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-center mb-6">
                    Start the camera to begin AI-powered pose detection
                  </p>
                  <Button onClick={handleStartCamera} size="lg" className="w-full max-w-xs">
                    <Video className="h-5 w-5 mr-2" />
                    Start Camera
                  </Button>
                  {(error || poseError) && (
                    <p className="text-sm text-destructive mt-4 text-center">{error || poseError}</p>
                  )}
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-camera-bg/80">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading AI Model...</p>
                  </div>
                </div>
              )}

              {/* Status overlay */}
              {isStreaming && (
                <>
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <Badge 
                      variant={isFallDetected ? 'destructive' : 'default'}
                      className={cn(
                        'text-sm py-1',
                        !isFallDetected && 'bg-success'
                      )}
                    >
                      {isFallDetected ? 'FALL DETECTED!' : currentPose.isPersonDetected ? 'Person Detected' : 'Scanning...'}
                    </Badge>
                    <Badge variant="secondary">
                      {(currentPose.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleStopCamera}
                        className="flex-1"
                      >
                        <VideoOff className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleSwitchCamera}
                        className="flex-1"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Flip Camera
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <div className="flex items-center justify-center gap-1">
                {isStreaming ? (
                  <>
                    <Wifi className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Offline</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">AI Model</p>
              <p className="text-sm font-medium">MediaPipe Pose</p>
            </CardContent>
          </Card>
        </div>

        {/* Share Link */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Share This Camera</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Open this link on another device to use this camera as a monitoring source
            </p>
            <div className="flex gap-2">
              <Input 
                value={window.location.origin + '/camera'} 
                readOnly 
                className="text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6 font-formal">
          DRK College of Engineering • Vitals-Vision AI
        </p>
      </div>
    </div>
  );
}
