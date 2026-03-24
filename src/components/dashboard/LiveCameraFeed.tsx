import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Shield, Wifi, Video, VideoOff, RotateCcw, Smartphone, Monitor, AlertTriangle, Brain, Eye, HeartPulse, ShieldAlert, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useFallAlert } from '@/hooks/useFallAlert';
import { usePersonDetection } from '@/hooks/usePersonDetection';
import { useSeizureDetection } from '@/hooks/useSeizureDetection';
import { useAdvancedDetection, type DetectionEvent } from '@/hooks/useAdvancedDetection';
import type { AlertType } from '@/hooks/useMockAI';

interface LiveCameraFeedProps {
  currentStatus: AlertType;
  roomNumber?: string;
  onFallDetected?: (confidence: number, bodyPosition: string) => void;
  onStatusChange?: (status: AlertType) => void;
  onSeizureDetected?: (confidence: number) => void;
  onStumbleDetected?: (confidence: number) => void;
  onAdvancedEvent?: (event: DetectionEvent) => void;
}

type CameraMode = 'off' | 'local' | 'mobile';

export function LiveCameraFeed({ 
  currentStatus, 
  roomNumber = 'ICU-101',
  onFallDetected,
  onStatusChange,
  onSeizureDetected,
  onStumbleDetected,
  onAdvancedEvent,
}: LiveCameraFeedProps) {
  const [cameraMode, setCameraMode] = useState<CameraMode>('off');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [showVideo, setShowVideo] = useState(true);
  const [fallCount, setFallCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestPoseRef = useRef<{ confidence: number; bodyPosition: string }>({ confidence: 0, bodyPosition: 'unknown' });

  const { triggerFallAlert } = useFallAlert();

  const { isModelLoaded: isCocoLoaded, personCount, isLoading: cocoLoading } = usePersonDetection(videoRef, cameraMode !== 'off');

  const { analysis: seizureAnalysis, processPoseFrame, isReady: seizureReady } = useSeizureDetection(cameraMode !== 'off');

  const advancedDetection = useAdvancedDetection(cameraMode !== 'off');

  const {
    isLoading,
    isRunning,
    error,
    currentPose,
    startCamera,
    stopCamera,
  } = usePoseDetection({
    onFallDetected: () => {
      triggerFallAlert();
      setFallCount(prev => prev + 1);
      onFallDetected?.(latestPoseRef.current.confidence, latestPoseRef.current.bodyPosition);
      onStatusChange?.('fall');
    },
    onPoseUpdate: (result) => {
      latestPoseRef.current = { confidence: result.confidence, bodyPosition: result.bodyPosition };
      if (result.landmarks) {
        processPoseFrame(result.landmarks);
        const events = advancedDetection.processFrame(result.landmarks, personCount);
        events.forEach(event => onAdvancedEvent?.(event));
      }
    },
    fallThreshold: 45,
  });

  useEffect(() => {
    if (seizureAnalysis.isSeizureDetected) {
      triggerFallAlert();
      onSeizureDetected?.(seizureAnalysis.confidence);
      onStatusChange?.('seizure');
    }
    if (seizureAnalysis.isStumbleDetected && !seizureAnalysis.isSeizureDetected) {
      onStumbleDetected?.(seizureAnalysis.confidence);
      onStatusChange?.('stumble');
    }
  }, [seizureAnalysis.isSeizureDetected, seizureAnalysis.isStumbleDetected]);

  useEffect(() => {
    if (cameraMode === 'off') return;
    const interval = setInterval(() => {
      const events = advancedDetection.processFrame(null, personCount);
      events.forEach(event => onAdvancedEvent?.(event));
    }, 5000);
    return () => clearInterval(interval);
  }, [cameraMode, personCount, advancedDetection, onAdvancedEvent]);

  const handleStartCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    try {
      await startCamera(videoRef.current, canvasRef.current);
      setCameraMode('local');
    } catch (err) {
      console.error('Failed to start camera:', err);
    }
  }, [startCamera]);

  const handleStopCamera = useCallback(() => {
    stopCamera();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraMode('off');
  }, [stopCamera]);

  const handleSwitchCamera = useCallback(async () => {
    handleStopCamera();
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    
    setTimeout(() => {
      if (videoRef.current && canvasRef.current) {
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing, width: 640, height: 480 },
          audio: false,
        }).then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
            startCamera(videoRef.current, canvasRef.current!);
            setCameraMode('local');
          }
        });
      }
    }, 100);
  }, [facingMode, handleStopCamera, startCamera]);

  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, [handleStopCamera]);

  const isFallDetected = currentPose.isFallDetected || currentStatus === 'fall';

  const getPositionLabel = (pos: string) => {
    switch (pos) {
      case 'standing': return 'Standing';
      case 'sitting': return 'Sitting';
      case 'lying': return 'Lying Down';
      default: return 'Analyzing...';
    }
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300',
      isFallDetected && 'ring-2 ring-destructive animate-pulse-alert'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 font-formal" data-testid="text-camera-title">
            <Camera className="h-5 w-5 text-primary" />
            Live Camera Feed - {roomNumber}
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Privacy Mode
            </Badge>
            <Badge 
              variant={isRunning ? 'default' : 'secondary'} 
              className={cn(
                'flex items-center gap-1',
                isRunning && 'bg-success'
              )}
              data-testid="status-camera"
            >
              <Wifi className="h-3 w-3" />
              {isRunning ? 'Live' : 'Offline'}
            </Badge>
            {fallCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1" data-testid="text-fall-count">
                <AlertTriangle className="h-3 w-3" />
                {fallCount} Fall{fallCount > 1 ? 's' : ''} Detected
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn(
          'relative aspect-video bg-camera-bg flex items-center justify-center overflow-hidden',
          isFallDetected && 'bg-destructive/20'
        )}>
          <video
            ref={videoRef}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              showVideo ? 'opacity-30' : 'opacity-0'
            )}
            autoPlay
            playsInline
            muted
          />
          
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              !isRunning && 'hidden'
            )}
          />

          {cameraMode === 'off' && (
            <div className="relative z-10 flex flex-col items-center gap-4 p-8">
              <div className="text-center mb-4">
                <h3 className="text-lg font-formal font-semibold text-muted-foreground mb-2">
                  Start Camera Monitoring
                </h3>
                <p className="text-sm text-muted-foreground/70 max-w-md">
                  Enable your camera to see real-time AI fall detection with privacy-preserving skeleton overlay
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleStartCamera}
                  size="lg"
                  className="flex items-center gap-2"
                  disabled={isLoading}
                  data-testid="button-start-camera"
                >
                  <Video className="h-5 w-5" />
                  {isLoading ? 'Loading AI...' : 'Start Camera'}
                </Button>
              </div>

              {error && (
                <p className="text-sm text-destructive mt-2">{error}</p>
              )}
            </div>
          )}

          {isLoading && cameraMode !== 'off' && (
            <div className="absolute inset-0 flex items-center justify-center bg-camera-bg/80 z-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading MediaPipe AI...</p>
              </div>
            </div>
          )}

          {isRunning && (
            <>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                    isFallDetected 
                      ? 'bg-destructive text-destructive-foreground' 
                      : currentPose.isPersonDetected
                        ? 'bg-success/80 text-success-foreground'
                        : 'bg-muted text-muted-foreground'
                  )} data-testid="status-detection">
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      isFallDetected 
                        ? 'bg-destructive-foreground animate-ping' 
                        : 'bg-current'
                    )} />
                    {isFallDetected 
                      ? 'FALL DETECTED' 
                      : currentPose.isPersonDetected 
                        ? 'Person Detected' 
                        : 'Scanning...'}
                  </span>
                  {currentPose.isPersonDetected && (
                    <>
                      <Badge variant="secondary" className="text-xs" data-testid="text-confidence">
                        {(currentPose.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs" data-testid="text-body-position">
                        {getPositionLabel(currentPose.bodyPosition)}
                      </Badge>
                      <Badge variant="outline" className="text-xs" data-testid="text-torso-angle">
                        Angle: {currentPose.torsoAngle.toFixed(0)}°
                      </Badge>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground/70 bg-background/30 px-2 py-1 rounded">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStopCamera}
                  className="flex items-center gap-1"
                  data-testid="button-stop-camera"
                >
                  <VideoOff className="h-4 w-4" />
                  Stop
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1"
                  data-testid="button-flip-camera"
                >
                  <RotateCcw className="h-4 w-4" />
                  Flip
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowVideo(!showVideo)}
                  className="flex items-center gap-1"
                  data-testid="button-toggle-video"
                >
                  {showVideo ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                  {showVideo ? 'Hide Video' : 'Show Video'}
                </Button>
              </div>

              <div className="absolute top-4 right-4 z-10 space-y-1">
                <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-success animate-status-pulse" />
                  <span className="text-xs text-muted-foreground">MediaPipe Pose Active</span>
                </div>
                <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <Eye className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    COCO-SSD {isCocoLoaded ? `(${personCount} person${personCount !== 1 ? 's' : ''})` : cocoLoading ? 'Loading...' : 'Ready'}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <Brain className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    CNN-LSTM {seizureReady ? `(${seizureAnalysis.pattern})` : 'Loading...'}
                  </span>
                </div>
                {advancedDetection.respiratoryDistress && (
                  <div className="flex items-center gap-2 bg-red-500/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <HeartPulse className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-red-200">Resp. Distress ({advancedDetection.respiratoryRate}/min)</span>
                  </div>
                )}
                {advancedDetection.agitation && (
                  <div className="flex items-center gap-2 bg-amber-500/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span className="text-xs text-amber-200">Agitation Detected</span>
                  </div>
                )}
                {advancedDetection.elopementRisk && (
                  <div className="flex items-center gap-2 bg-red-500/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                    <ShieldAlert className="h-3 w-3 text-red-400" />
                    <span className="text-xs text-red-200">Elopement Risk</span>
                  </div>
                )}
              </div>

              {isFallDetected && (
                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="bg-destructive/90 text-destructive-foreground px-8 py-4 rounded-xl animate-pulse-alert">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8" />
                      <div>
                        <p className="text-xl font-bold font-formal">FALL DETECTED!</p>
                        <p className="text-sm opacity-90">Immediate response required</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(hsl(142 76% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(142 76% 55% / 0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
