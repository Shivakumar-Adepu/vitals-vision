import { Camera, Shield, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AlertType } from '@/hooks/useMockAI';

interface CameraFeedProps {
  currentStatus: AlertType;
  roomNumber?: string;
}

function SkeletonFigure({ animate = false }: { animate?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 200"
      className={cn(
        'w-32 h-64 mx-auto',
        animate && 'animate-skeleton-breathe'
      )}
      style={{ filter: 'drop-shadow(0 0 8px hsl(142 76% 55% / 0.5))' }}
    >
      {/* Head */}
      <circle cx="50" cy="25" r="15" fill="none" stroke="hsl(142 76% 55%)" strokeWidth="3" />
      
      {/* Neck */}
      <line x1="50" y1="40" x2="50" y2="55" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Spine */}
      <line x1="50" y1="55" x2="50" y2="110" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Left arm */}
      <line x1="50" y1="65" x2="25" y2="55" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="25" y1="55" x2="15" y2="80" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Right arm */}
      <line x1="50" y1="65" x2="75" y2="55" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="55" x2="85" y2="80" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Left leg */}
      <line x1="50" y1="110" x2="35" y2="150" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="35" y1="150" x2="30" y2="190" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Right leg */}
      <line x1="50" y1="110" x2="65" y2="150" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="150" x2="70" y2="190" stroke="hsl(142 76% 55%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Joint circles */}
      <circle cx="50" cy="65" r="4" fill="hsl(142 76% 55%)" />
      <circle cx="25" cy="55" r="3" fill="hsl(142 76% 55%)" />
      <circle cx="75" cy="55" r="3" fill="hsl(142 76% 55%)" />
      <circle cx="50" cy="110" r="4" fill="hsl(142 76% 55%)" />
      <circle cx="35" cy="150" r="3" fill="hsl(142 76% 55%)" />
      <circle cx="65" cy="150" r="3" fill="hsl(142 76% 55%)" />
    </svg>
  );
}

function FallenSkeletonFigure() {
  return (
    <svg
      viewBox="0 0 200 100"
      className="w-64 h-32 mx-auto animate-pulse"
      style={{ filter: 'drop-shadow(0 0 12px hsl(0 84% 60% / 0.7))' }}
    >
      {/* Head */}
      <circle cx="30" cy="50" r="12" fill="none" stroke="hsl(0 84% 60%)" strokeWidth="3" />
      
      {/* Neck */}
      <line x1="42" y1="50" x2="55" y2="50" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Spine (horizontal - fallen) */}
      <line x1="55" y1="50" x2="110" y2="50" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Left arm (up) */}
      <line x1="65" y1="50" x2="55" y2="25" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="55" y1="25" x2="45" y2="15" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Right arm (down) */}
      <line x1="85" y1="50" x2="95" y2="70" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="95" y1="70" x2="105" y2="80" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Left leg */}
      <line x1="110" y1="50" x2="140" y2="40" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="140" y1="40" x2="170" y2="35" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Right leg */}
      <line x1="110" y1="50" x2="145" y2="60" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      <line x1="145" y1="60" x2="175" y2="65" stroke="hsl(0 84% 60%)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Joint circles */}
      <circle cx="65" cy="50" r="3" fill="hsl(0 84% 60%)" />
      <circle cx="85" cy="50" r="3" fill="hsl(0 84% 60%)" />
      <circle cx="110" cy="50" r="3" fill="hsl(0 84% 60%)" />
      <circle cx="140" cy="40" r="2" fill="hsl(0 84% 60%)" />
      <circle cx="145" cy="60" r="2" fill="hsl(0 84% 60%)" />
    </svg>
  );
}

export function CameraFeed({ currentStatus, roomNumber = 'ICU-101' }: CameraFeedProps) {
  const isFallDetected = currentStatus === 'fall';

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300',
      isFallDetected && 'ring-2 ring-destructive animate-pulse-alert'
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-formal">
            <Camera className="h-5 w-5 text-primary" />
            Live Camera Feed - {roomNumber}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Privacy Mode
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Wifi className="h-3 w-3 text-success" />
              Connected
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={cn(
          'relative aspect-video bg-camera-bg flex items-center justify-center overflow-hidden',
          isFallDetected && 'bg-destructive/20'
        )}>
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-10">
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(hsl(142 76% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(142 76% 55% / 0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }} />
          </div>

          {/* Skeleton figure */}
          <div className="relative z-10">
            {isFallDetected ? <FallenSkeletonFigure /> : <SkeletonFigure animate />}
          </div>

          {/* Status overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
                isFallDetected 
                  ? 'bg-destructive text-destructive-foreground' 
                  : 'bg-success/80 text-success-foreground'
              )}>
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  isFallDetected ? 'bg-destructive-foreground animate-ping' : 'bg-success-foreground'
                )} />
                {isFallDetected ? 'FALL DETECTED' : 'Normal'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground/70 bg-background/30 px-2 py-1 rounded">
              {new Date().toLocaleTimeString()}
            </div>
          </div>

          {/* AI Processing indicator */}
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-success animate-status-pulse" />
              <span className="text-xs text-muted-foreground">CNN-LSTM Active</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
