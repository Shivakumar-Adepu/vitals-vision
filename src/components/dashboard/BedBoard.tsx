import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BedDouble, AlertCircle, CheckCircle2, Activity, UserX } from 'lucide-react';
import type { Patient } from '@shared/schema';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const statusStyles: Record<string, { border: string; bg: string; text: string; icon: any; dot: string }> = {
  Critical: {
    border: 'border-red-400 dark:border-red-600',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-400',
    icon: AlertCircle,
    dot: 'bg-red-500 animate-pulse',
  },
  Monitoring: {
    border: 'border-yellow-400 dark:border-yellow-600',
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: Activity,
    dot: 'bg-yellow-500',
  },
  Stable: {
    border: 'border-green-400 dark:border-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-400',
    icon: CheckCircle2,
    dot: 'bg-green-500',
  },
  Discharged: {
    border: 'border-gray-300 dark:border-gray-600',
    bg: 'bg-gray-50 dark:bg-gray-900/20',
    text: 'text-gray-500',
    icon: UserX,
    dot: 'bg-gray-400',
  },
};

const emptyStyle = {
  border: 'border-dashed border-border',
  bg: 'bg-muted/20',
  text: 'text-muted-foreground',
  dot: 'bg-muted-foreground/30',
};

export function BedBoard() {
  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    queryFn: async () => { const res = await fetch('/api/patients'); return res.json(); },
    refetchInterval: 30000,
  });

  const occupied = patients.filter(p => p.status !== 'Discharged');
  const total = Math.max(occupied.length, 8);
  const emptySlots = Math.max(0, total - occupied.length);

  const critical = patients.filter(p => p.status === 'Critical').length;
  const monitoring = patients.filter(p => p.status === 'Monitoring').length;
  const stable = patients.filter(p => p.status === 'Stable').length;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" />
            ICU Bed Board
          </CardTitle>
          <div className="flex items-center gap-2">
            {critical > 0 && (
              <Badge variant="destructive" className="text-[10px] px-2">{critical} Critical</Badge>
            )}
            {monitoring > 0 && (
              <Badge className="text-[10px] px-2 bg-yellow-500 text-white">{monitoring} Monitoring</Badge>
            )}
            <Link to="/patients">
              <Button variant="ghost" size="sm" className="text-xs h-7">View All</Button>
            </Link>
          </div>
        </div>
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {occupied.length} beds occupied · {stable} stable · {emptySlots > 0 ? `${emptySlots} beds available` : 'All beds occupied'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {occupied.map(p => {
              const s = statusStyles[p.status] || statusStyles.Stable;
              const Icon = s.icon;
              return (
                <div
                  key={p.id}
                  className={`relative rounded-lg border-2 p-2 transition-all ${s.border} ${s.bg}`}
                  data-testid={`bed-patient-${p.id}`}
                >
                  <div className="absolute top-1.5 right-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                  </div>
                  <BedDouble className={`h-4 w-4 mb-1 ${s.text}`} />
                  <p className="text-[10px] font-semibold leading-tight truncate text-foreground">
                    {p.name.split(' ')[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{p.roomNumber || '—'}</p>
                  <p className={`text-[10px] font-medium mt-0.5 ${s.text}`}>{p.status}</p>
                </div>
              );
            })}

            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className={`rounded-lg border-2 p-2 flex flex-col items-center justify-center text-center ${emptyStyle.border} ${emptyStyle.bg}`}
              >
                <BedDouble className="h-4 w-4 text-muted-foreground/40 mb-1" />
                <p className="text-[10px] text-muted-foreground">Available</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
