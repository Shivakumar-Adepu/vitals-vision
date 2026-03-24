import { Users, AlertTriangle, Activity, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusCardsProps {
  patientsMonitored: number;
  activeAlerts: number;
  systemHealth: number;
}

export function StatusCards({ patientsMonitored, activeAlerts, systemHealth }: StatusCardsProps) {
  const cards = [
    {
      title: 'Patients Monitored',
      value: patientsMonitored,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-secondary',
      description: 'Active monitoring sessions',
    },
    {
      title: 'Active Alerts',
      value: activeAlerts,
      icon: AlertTriangle,
      color: activeAlerts > 0 ? 'text-destructive' : 'text-success',
      bgColor: activeAlerts > 0 ? 'bg-destructive/10' : 'bg-success/10',
      description: activeAlerts > 0 ? 'Requires attention' : 'All clear',
      pulse: activeAlerts > 0,
    },
    {
      title: 'System Health',
      value: `${systemHealth.toFixed(1)}%`,
      icon: Activity,
      color: systemHealth > 95 ? 'text-success' : systemHealth > 85 ? 'text-warning' : 'text-destructive',
      bgColor: systemHealth > 95 ? 'bg-success/10' : systemHealth > 85 ? 'bg-warning/10' : 'bg-destructive/10',
      description: 'AI Processing Status',
    },
    {
      title: 'Privacy Shield',
      value: 'Active',
      icon: Shield,
      color: 'text-success',
      bgColor: 'bg-success/10',
      description: 'Skeleton-only processing',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={cn(
            'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
            card.pulse && 'animate-pulse-alert border-destructive'
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className={cn('text-3xl font-bold font-formal', card.color)}>
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className={cn('p-3 rounded-xl', card.bgColor)}>
                <card.icon className={cn('h-6 w-6', card.color)} />
              </div>
            </div>
            {card.pulse && (
              <div className="absolute top-2 right-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
