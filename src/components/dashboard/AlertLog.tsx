import { AlertTriangle, Activity, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Alert, AlertType } from '@/hooks/useMockAI';

interface AlertLogProps {
  alerts: Alert[];
}

const getAlertConfig = (type: AlertType) => {
  switch (type) {
    case 'fall':
      return {
        icon: AlertTriangle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-l-destructive',
        label: 'FALL ALERT',
        labelBg: 'bg-destructive',
      };
    case 'movement':
      return {
        icon: Activity,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-l-warning',
        label: 'Movement',
        labelBg: 'bg-warning',
      };
    default:
      return {
        icon: User,
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-l-success',
        label: 'Normal',
        labelBg: 'bg-success',
      };
  }
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 120) return '1 min ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 7200) return '1 hour ago';
  return `${Math.floor(seconds / 3600)} hours ago`;
}

export function AlertLog({ alerts }: AlertLogProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between font-formal">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Real-Time Alert Log
          </span>
          <Badge variant="secondary" className="text-xs">
            {alerts.length} events
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-4 pb-4">
          <div className="space-y-2">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No alerts yet</p>
              </div>
            ) : (
              alerts.map((alert, index) => {
                const config = getAlertConfig(alert.type);
                const Icon = config.icon;
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'relative p-3 rounded-lg border-l-4 transition-all duration-300',
                      config.bgColor,
                      config.borderColor,
                      index === 0 && 'animate-fade-in',
                      alert.type === 'fall' && 'animate-pulse-alert'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-1.5 rounded-full', config.bgColor)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              config.labelBg,
                              'text-white border-0'
                            )}
                          >
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {alert.roomNumber}
                          </span>
                        </div>
                        <p className={cn(
                          'text-sm font-medium truncate',
                          alert.type === 'fall' && 'text-destructive font-bold'
                        )}>
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {alert.patientId}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(alert.timestamp)}
                          </span>
                          {alert.type === 'fall' && alert.confidence !== undefined && (
                            <span className="text-destructive font-medium">
                              {(alert.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {alert.type === 'fall' && (
                      <div className="absolute top-2 right-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
