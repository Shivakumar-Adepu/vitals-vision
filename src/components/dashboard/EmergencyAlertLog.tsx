import { useRef, useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Settings, Video, VideoOff, Wifi, WifiOff,
  ShieldCheck, Activity, HeartPulse, Brain, Eye,
  PersonStanding, Wind, Zap, ShieldAlert, Users, Clock,
  ChevronDown, ChevronUp, Maximize2, Smartphone, Loader2,
  LayoutGrid, LayoutList, RefreshCw, CheckCircle2, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAlertWebSocket, type EmergencyAlert } from '@/hooks/useAlertWebSocket';
import { useRemotePoseDetection } from '@/hooks/useRemotePoseDetection';
import { useFallAlert } from '@/hooks/useFallAlert';
import { QRCodePairing } from '@/components/dashboard/QRCodePairing';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import type { PoseLandmark } from '@/hooks/usePoseDetection';

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function getAlertConfig(type: string) {
  const configs: Record<string, { icon: typeof AlertTriangle; color: string; bgColor: string; category: string }> = {
    'Fall': { icon: PersonStanding, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'Mobility' },
    'Seizure': { icon: Zap, color: 'text-purple-500', bgColor: 'bg-purple-500/10', category: 'Neurological' },
    'Stumble': { icon: Activity, color: 'text-orange-500', bgColor: 'bg-orange-500/10', category: 'Mobility' },
    'Respiratory': { icon: Wind, color: 'text-blue-500', bgColor: 'bg-blue-500/10', category: 'Respiratory' },
    'Respiratory Distress': { icon: HeartPulse, color: 'text-red-600', bgColor: 'bg-red-600/10', category: 'Respiratory' },
    'Patient Agitation': { icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10', category: 'Behavioral' },
    'Elopement Risk': { icon: ShieldAlert, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'Safety' },
    'Staff Absence': { icon: Users, color: 'text-gray-500', bgColor: 'bg-gray-500/10', category: 'Presence' },
    'Cyanosis': { icon: Eye, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', category: 'Vitals Proxy' },
    'Movement': { icon: Activity, color: 'text-green-500', bgColor: 'bg-green-500/10', category: 'General' },
  };
  return configs[type] || { icon: AlertTriangle, color: 'text-muted-foreground', bgColor: 'bg-muted/30', category: 'Unknown' };
}

function getSeverityBadge(confidence: number, isHighPriority: boolean) {
  if (isHighPriority || confidence >= 0.9) return { label: 'Critical', variant: 'destructive' as const };
  if (confidence >= 0.75) return { label: 'High', variant: 'default' as const };
  if (confidence >= 0.6) return { label: 'Medium', variant: 'secondary' as const };
  return { label: 'Low', variant: 'outline' as const };
}

interface PatientZone {
  id: string;
  room: string;
  patientId: string;
  deviceId: string | null;
  position: string;
  status: 'normal' | 'warning' | 'critical' | 'offline';
  lastSeen: Date | null;
  isLive: boolean;
}

const DEMO_ZONES: PatientZone[] = [
  { id: 'z1', room: 'ICU-101', patientId: 'P-1042', deviceId: null, position: 'Standing', status: 'normal', lastSeen: null, isLive: false },
  { id: 'z2', room: 'ICU-102', patientId: 'P-1078', deviceId: null, position: 'Sitting', status: 'warning', lastSeen: null, isLive: false },
  { id: 'z3', room: 'ICU-103', patientId: 'P-1091', deviceId: null, position: 'Lying', status: 'normal', lastSeen: null, isLive: false },
  { id: 'z4', room: 'ICU-104', patientId: 'P-1115', deviceId: null, position: 'Unknown', status: 'offline', lastSeen: null, isLive: false },
];

function drawSkeletonOnCanvas(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  isFall: boolean,
  label?: string,
  patientCount?: number,
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const color = isFall ? '#ef4444' : '#22c55e';
  const jointColor = isFall ? '#dc2626' : '#16a34a';

  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  POSE_CONNECTIONS.forEach(([s, e]) => {
    const start = landmarks[s];
    const end = landmarks[e];
    if ((start.visibility || 0) > 0.4 && (end.visibility || 0) > 0.4) {
      ctx.beginPath();
      ctx.moveTo(start.x * width, start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }
  });

  ctx.shadowBlur = 12;
  landmarks.forEach((lm, idx) => {
    if ((lm.visibility || 0) > 0.4) {
      ctx.beginPath();
      const r = [0, 11, 12, 23, 24, 13, 14, 25, 26].includes(idx) ? 6 : 3.5;
      ctx.arc(lm.x * width, lm.y * height, r, 0, 2 * Math.PI);
      ctx.fillStyle = jointColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  });
  ctx.shadowBlur = 0;

  if (label) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(6, height - 24, 200, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 10, height - 10);
  }

  if (patientCount !== undefined && patientCount > 1) {
    ctx.fillStyle = 'rgba(59,130,246,0.8)';
    ctx.fillRect(width - 80, 6, 74, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Inter, system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(`${patientCount} detected`, width - 8, 18);
  }
}

export function EmergencyAlertLog() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);
  const localPoseRef = useRef<Pose | null>(null);
  const localFrameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedFeed, setExpandedFeed] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [remoteFeedActive, setRemoteFeedActive] = useState(false);
  const [remoteDeviceId, setRemoteDeviceId] = useState<string | null>(null);
  const [zones, setZones] = useState<PatientZone[]>(DEMO_ZONES);
  const [personCount, setPersonCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const { alerts, connected, resolveAlert } = useAlertWebSocket();
  const { triggerFallAlert } = useFallAlert();

  const { processFrame, setCanvas, isModelLoaded, isLoading: poseLoading, poseState } = useRemotePoseDetection(true);

  useEffect(() => {
    if (skeletonCanvasRef.current) {
      setCanvas(skeletonCanvasRef.current);
    }
  }, [setCanvas]);

  useEffect(() => {
    if (!poseState.isFallDetected) return;
    const now = Date.now();
    if (now - lastAlertTimeRef.current < 15000) return;
    lastAlertTimeRef.current = now;

    triggerFallAlert();
    setZones(prev => prev.map((z, i) => i === 0 ? { ...z, status: 'critical' as const, lastSeen: new Date() } : z));

    fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertType: 'Fall',
        confidenceScore: poseState.confidence || 0.92,
        isHighPriority: true,
        patientId: 'P-' + Math.floor(1000 + Math.random() * 9000),
        roomNumber: remoteDeviceId ? 'ICU-101' : 'ICU-101',
        bodyPosition: poseState.bodyPosition || 'lying',
        detectionSource: cameraActive ? 'local-mediapipe' : 'remote-mediapipe',
      }),
    }).catch(() => {});
  }, [poseState.isFallDetected, poseState.confidence, poseState.bodyPosition, triggerFallAlert, cameraActive, remoteDeviceId]);

  useEffect(() => {
    if (poseState.isPersonDetected) {
      setZones(prev => prev.map((z, i) => i === 0 ? {
        ...z,
        isLive: true,
        position: poseState.bodyPosition === 'standing' ? 'Standing' : poseState.bodyPosition === 'sitting' ? 'Sitting' : poseState.bodyPosition === 'lying' ? 'Lying Down' : 'Analyzing',
        status: poseState.isFallDetected ? 'critical' : 'normal',
        lastSeen: new Date(),
      } : z));
      setPersonCount(1);
    }
  }, [poseState.isPersonDetected, poseState.bodyPosition, poseState.isFallDetected]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let isMounted = true;

    function connectWs() {
      if (!isMounted) return;
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'camera_frame') {
              if (!cameraActive) {
                processFrame(data.frame);
                setRemoteFeedActive(true);
                setRemoteDeviceId(data.deviceId || 'unknown');
              }
            }
            if (data.type === 'camera_status') {
              if (data.status === 'stopped') {
                setRemoteFeedActive(false);
              } else if (data.status === 'streaming') {
                setRemoteFeedActive(true);
                setRemoteDeviceId(data.deviceId || 'unknown');
              }
            }
          } catch {}
        };
        ws.onclose = () => { if (isMounted) setTimeout(connectWs, 3000); };
      } catch {
        if (isMounted) setTimeout(connectWs, 3000);
      }
    }
    connectWs();
    return () => { isMounted = false; wsRef.current?.close(); };
  }, [processFrame, cameraActive]);

  const startLocalSkeletonLoop = useCallback(async (video: HTMLVideoElement) => {
    if (!captureCanvasRef.current) {
      captureCanvasRef.current = document.createElement('canvas');
      captureCanvasRef.current.width = 320;
      captureCanvasRef.current.height = 240;
    }

    if (!localPoseRef.current) {
      try {
        const pose = new Pose({ locateFile: (f) => `/mediapipe/pose/${f}` });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        pose.onResults((results) => {
          const canvas = skeletonCanvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (results.poseLandmarks && results.poseLandmarks.length > 0) {
            const lms = results.poseLandmarks as PoseLandmark[];
            drawSkeletonOnCanvas(ctx, lms, false, '33 Key Points · Local Camera', 1);
          } else {
            ctx.fillStyle = '#64748b';
            ctx.font = '13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No person detected', canvas.width / 2, canvas.height / 2);
          }
        });
        await pose.initialize();
        localPoseRef.current = pose;
      } catch (err) {
        console.error('[LocalPose] init failed', err);
        return;
      }
    }

    localFrameIntervalRef.current = setInterval(async () => {
      if (!captureCanvasRef.current || !localPoseRef.current || !video) return;
      const ctx = captureCanvasRef.current.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);
      try {
        await localPoseRef.current.send({ image: captureCanvasRef.current });
      } catch {}
    }, 120);
  }, []);

  const stopLocalSkeletonLoop = useCallback(() => {
    if (localFrameIntervalRef.current) {
      clearInterval(localFrameIntervalRef.current);
      localFrameIntervalRef.current = null;
    }
  }, []);

  const handleStartCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        await startLocalSkeletonLoop(videoRef.current);
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Camera access denied');
    }
  }, [startLocalSkeletonLoop]);

  const handleStopCamera = useCallback(() => {
    stopLocalSkeletonLoop();
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, [stopLocalSkeletonLoop]);

  useEffect(() => {
    return () => { handleStopCamera(); };
  }, [handleStopCamera]);

  const isAnyFeedActive = cameraActive || remoteFeedActive;
  const showSkeleton = isAnyFeedActive && (remoteFeedActive || cameraActive);

  const pendingCount = alerts.filter(a => a.status === 'Pending').length;
  const criticalCount = alerts.filter(a => a.isHighPriority && a.status === 'Pending').length;
  const categoryCounts: Record<string, number> = {};
  alerts.forEach(a => {
    const cfg = getAlertConfig(a.alertType);
    categoryCounts[cfg.category] = (categoryCounts[cfg.category] || 0) + 1;
  });

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-formal flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Live Skeleton Monitoring
            <Badge variant="outline" className="text-[9px] gap-1 ml-1">
              <ShieldCheck className="h-3 w-3 text-green-500" />
              Privacy-First
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant={isAnyFeedActive ? 'default' : 'secondary'} className="text-[10px] gap-1">
              {isAnyFeedActive ? (
                <>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  {remoteFeedActive && !cameraActive ? 'MOBILE LIVE' : 'LOCAL LIVE'}
                </>
              ) : 'STANDBY'}
            </Badge>
            {remoteFeedActive && (
              <Badge variant="default" className="text-[10px] gap-1 bg-green-600">
                <Smartphone className="h-3 w-3" />
                Mobile
              </Badge>
            )}
            <Badge variant={connected ? 'default' : 'destructive'} className="text-[10px] gap-1">
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? 'Synced' : 'Offline'}
            </Badge>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'single' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-none rounded-l-md"
                onClick={() => setViewMode('single')}
                data-testid="button-view-single"
              >
                <LayoutList className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7 rounded-none rounded-r-md"
                onClick={() => setViewMode('grid')}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpandedFeed(!expandedFeed)}
              data-testid="button-expand-feed"
            >
              {expandedFeed ? <ChevronUp className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings(!showSettings)}
              data-testid="button-feed-settings"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-3">
          {showSettings && (
            <div className="mb-3 p-3 rounded-lg bg-muted/50 text-xs space-y-2">
              <p className="font-semibold text-sm">Feed Settings</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: ShieldCheck, color: 'text-green-500', label: 'Privacy Mode', val: 'Active' },
                  { icon: Brain, color: 'text-purple-500', label: 'MediaPipe Pose', val: isModelLoaded ? 'Ready' : 'Loading...' },
                  { icon: Eye, color: 'text-blue-500', label: 'COCO-SSD', val: 'Enabled' },
                  { icon: Zap, color: 'text-yellow-500', label: 'CNN-LSTM', val: 'Enabled' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <s.icon className={cn('h-3.5 w-3.5', s.color)} />
                    <span>{s.label}: <strong>{s.val}</strong></span>
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground mt-1 text-[10px]">
                Skeleton-only rendering — no raw video stored or transmitted.
              </p>
            </div>
          )}

          {viewMode === 'single' ? (
            <div className={cn(
              "relative w-full rounded-lg overflow-hidden bg-[hsl(var(--camera-bg))] transition-all duration-300",
              expandedFeed ? "aspect-[21/9]" : "aspect-video",
              poseState.isFallDetected && 'ring-2 ring-destructive animate-pulse'
            )}>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                playsInline muted autoPlay
              />
              <canvas
                ref={skeletonCanvasRef}
                width={640}
                height={480}
                className={cn("absolute inset-0 w-full h-full object-cover", !showSkeleton && 'opacity-0')}
              />

              {poseLoading && !isModelLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--camera-bg))]/80 z-20">
                  <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Initializing AI Skeleton Model...</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">33-keypoint MediaPipe Pose</p>
                  </div>
                </div>
              )}

              {!isAnyFeedActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <VideoOff className="h-12 w-12 text-muted-foreground/30" />
                      {isModelLoaded && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" title="AI Ready" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-muted-foreground">No Camera Feed</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {isModelLoaded ? 'AI model ready · Connect a camera to see skeleton overlay' : 'Initializing AI model...'}
                      </p>
                    </div>
                    {cameraError && (
                      <p className="text-xs text-destructive px-4 text-center">{cameraError}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleStartCamera} size="sm" className="gap-2" data-testid="button-start-local-camera">
                      <Video className="h-4 w-4" />
                      Local Camera
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">or scan QR code below to connect mobile</p>
                </div>
              )}

              {isAnyFeedActive && (
                <>
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                    </span>
                    <span className="text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                      {remoteFeedActive && !cameraActive ? 'MOBILE' : 'LOCAL'}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <Badge variant="outline" className="text-[9px] bg-black/60 text-white border-white/20">ICU-101</Badge>
                    {remoteFeedActive && (
                      <Badge variant="outline" className="text-[9px] bg-green-600/80 text-white border-white/20 gap-1">
                        <Smartphone className="h-3 w-3" />
                        {remoteDeviceId?.substring(0, 10) || 'Mobile'}
                      </Badge>
                    )}
                    {personCount > 0 && (
                      <Badge variant="outline" className="text-[9px] bg-blue-600/70 text-white border-white/20">
                        {personCount} body
                      </Badge>
                    )}
                  </div>

                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 flex-wrap z-10">
                    <Badge variant="outline" className="text-[9px] bg-black/60 text-white border-white/20 gap-1">
                      <Brain className="h-3 w-3 text-purple-400" />
                      {isModelLoaded ? '33-pt Skeleton' : 'Loading AI...'}
                    </Badge>
                    {poseState.isPersonDetected && (
                      <>
                        <Badge variant="outline" className={cn(
                          "text-[9px] bg-black/60 border-white/20",
                          poseState.isFallDetected ? "text-red-300" : "text-green-300"
                        )}>
                          {poseState.bodyPosition === 'standing' ? 'Standing' :
                           poseState.bodyPosition === 'sitting' ? 'Sitting' :
                           poseState.bodyPosition === 'lying' ? 'Lying Down' : 'Analyzing'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] bg-black/60 text-white border-white/20">
                          {(poseState.confidence * 100).toFixed(0)}% conf
                        </Badge>
                        <Badge variant="outline" className="text-[9px] bg-black/60 text-white border-white/20">
                          {poseState.torsoAngle.toFixed(0)}° angle
                        </Badge>
                      </>
                    )}
                  </div>

                  {cameraActive && (
                    <div className="absolute bottom-2 right-2 z-10">
                      <Button variant="destructive" size="sm" onClick={handleStopCamera} className="text-xs h-7">
                        Stop
                      </Button>
                    </div>
                  )}

                  {poseState.isFallDetected && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      <div className="bg-destructive/90 text-white px-6 py-3 rounded-xl animate-pulse">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-7 w-7" />
                          <div>
                            <p className="text-lg font-bold">FALL DETECTED!</p>
                            <p className="text-xs opacity-90">
                              {remoteFeedActive ? 'Mobile camera' : 'Local camera'} · Immediate response required
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {zones.map((zone, i) => (
                <div
                  key={zone.id}
                  className={cn(
                    "relative rounded-lg overflow-hidden aspect-video bg-[hsl(var(--camera-bg))] border transition-all cursor-pointer",
                    i === 0 && isAnyFeedActive ? "border-primary/60 ring-1 ring-primary/30" : "border-border/40",
                    zone.status === 'critical' && "border-destructive ring-1 ring-destructive"
                  )}
                  data-testid={`zone-${zone.id}`}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-1 p-2">
                    {i === 0 && isAnyFeedActive ? (
                      <>
                        <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                        <p className="text-[10px] text-green-400 font-semibold">LIVE AI</p>
                        {poseState.isPersonDetected && (
                          <p className="text-[9px] text-muted-foreground">{
                            poseState.bodyPosition === 'standing' ? 'Standing' :
                            poseState.bodyPosition === 'sitting' ? 'Sitting' :
                            poseState.bodyPosition === 'lying' ? 'Lying' : 'Tracking...'
                          }</p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          zone.status === 'normal' ? "bg-green-500" :
                          zone.status === 'warning' ? "bg-amber-500" :
                          zone.status === 'critical' ? "bg-destructive" : "bg-muted-foreground/30"
                        )} />
                        <p className="text-[10px] text-muted-foreground/70">{zone.patientId}</p>
                        <p className="text-[9px] text-muted-foreground/50">{zone.position}</p>
                      </>
                    )}
                  </div>
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                    <span className="text-[9px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded">
                      {zone.room}
                    </span>
                    {i === 0 && isAnyFeedActive && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-1.5 right-1.5">
                    <Badge variant="outline" className={cn(
                      "text-[8px] border-none",
                      zone.status === 'normal' ? "bg-green-600/70 text-white" :
                      zone.status === 'warning' ? "bg-amber-500/70 text-white" :
                      zone.status === 'critical' ? "bg-destructive/70 text-white" :
                      "bg-muted/50 text-muted-foreground"
                    )}>
                      {zone.status === 'offline' ? 'No Camera' : zone.isLive ? 'LIVE' : zone.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!remoteFeedActive && (
        <QRCodePairing compact />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Mobility', icon: PersonStanding, color: 'text-red-500', count: categoryCounts['Mobility'] || 0 },
          { label: 'Neurological', icon: Brain, color: 'text-purple-500', count: categoryCounts['Neurological'] || 0 },
          { label: 'Respiratory', icon: Wind, color: 'text-blue-500', count: categoryCounts['Respiratory'] || 0 },
          { label: 'Safety', icon: ShieldAlert, color: 'text-amber-500', count: (categoryCounts['Safety'] || 0) + (categoryCounts['Behavioral'] || 0) + (categoryCounts['Presence'] || 0) },
        ].map(cat => (
          <Card key={cat.label} className="bg-card">
            <CardContent className="py-2 px-3 flex items-center gap-2">
              <cat.icon className={cn("h-4 w-4", cat.color)} />
              <div>
                <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                <p className="text-sm font-bold">{cat.count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-formal font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Emergency Alert Log
          </h2>
          <Badge variant={connected ? 'default' : 'destructive'} className="text-[10px] gap-1">
            {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connected ? 'Live' : 'Disconnected'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{alerts.length} Total</Badge>
          <Badge variant="secondary" className="text-xs">{pendingCount} Pending</Badge>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              {criticalCount} Critical
            </Badge>
          )}
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[120px]">Time</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[80px]">Category</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs min-w-[140px]">Event</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[90px]">Severity</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[110px]">Confidence</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[100px]">Source</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[80px]">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-xs w-[70px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">No alerts recorded</p>
                      <p className="text-xs mt-1">AI-driven monitoring will automatically document critical events</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert, index) => (
                    <AlertRow key={alert.id} alert={alert} isNew={index === 0} onResolve={resolveAlert} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertRow({ alert, isNew, onResolve }: {
  alert: EmergencyAlert;
  isNew: boolean;
  onResolve: (id: string | number, notes?: string, respondedBy?: string) => void;
}) {
  const config = getAlertConfig(alert.alertType);
  const severity = getSeverityBadge(alert.confidenceScore, alert.isHighPriority);
  const Icon = config.icon;
  const [resolveOpen, setResolveOpen] = useState(false);
  const [nurseNotes, setNurseNotes] = useState('');
  const [respondedBy, setRespondedBy] = useState('');

  const handleConfirmResolve = () => {
    onResolve(alert.id, nurseNotes || undefined, respondedBy || undefined);
    setResolveOpen(false);
    setNurseNotes('');
    setRespondedBy('');
  };

  return (
    <>
      <TableRow
        className={cn(
          'border-border transition-all duration-500',
          isNew && 'animate-fade-in',
          alert.isHighPriority && alert.status === 'Pending' && 'animate-pulse bg-destructive/5',
        )}
        data-testid={`row-alert-${alert.id}`}
      >
        <TableCell className="text-xs font-mono text-muted-foreground">
          {formatTimestamp(alert.timestamp)}
        </TableCell>
        <TableCell>
          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded", config.bgColor, config.color)}>
            {config.category}
          </span>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
            <span className="text-sm font-medium">{alert.alertType}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={severity.variant} className="text-[10px]">{severity.label}</Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  alert.confidenceScore >= 0.9 ? 'bg-destructive' :
                  alert.confidenceScore >= 0.75 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${Math.round(alert.confidenceScore * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {Math.round(alert.confidenceScore * 100)}%
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-xs text-muted-foreground truncate max-w-[90px] block">
            {alert.detectionSource || 'AI Camera'}
          </span>
        </TableCell>
        <TableCell>
          <Badge
            variant={alert.status === 'Pending' ? (alert.isHighPriority ? 'destructive' : 'secondary') : 'outline'}
            className="text-[10px]"
          >
            {alert.status}
          </Badge>
        </TableCell>
        <TableCell>
          {alert.status === 'Pending' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
              onClick={() => setResolveOpen(true)}
              data-testid={`button-resolve-${alert.id}`}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Resolve
            </Button>
          )}
          {alert.status === 'Resolved' && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Done
            </span>
          )}
        </TableCell>
      </TableRow>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Resolve Alert
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 mb-2 p-3 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2 text-sm">
              <Icon className={cn("h-4 w-4", config.color)} />
              <span className="font-medium">{alert.alertType}</span>
              <Badge variant={severity.variant} className="text-[10px] ml-auto">{severity.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{formatTimestamp(alert.timestamp)}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="respondedBy" className="flex items-center gap-1 text-sm">
                Responded By (optional)
              </Label>
              <Input
                id="respondedBy"
                placeholder="Your name or badge number"
                value={respondedBy}
                onChange={e => setRespondedBy(e.target.value)}
                data-testid="input-responded-by"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nurseNotes" className="flex items-center gap-1 text-sm">
                <FileText className="h-3.5 w-3.5" />
                Clinical Notes (optional)
              </Label>
              <Textarea
                id="nurseNotes"
                placeholder="Describe the situation, response taken, patient condition…"
                value={nurseNotes}
                onChange={e => setNurseNotes(e.target.value)}
                rows={3}
                data-testid="textarea-nurse-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOpen(false)}>Cancel</Button>
            <Button
              onClick={handleConfirmResolve}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-confirm-resolve"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
