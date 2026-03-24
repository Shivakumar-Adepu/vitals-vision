import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCheck, Phone, Stethoscope, Sun, Moon, Sunset } from 'lucide-react';
import type { Staff } from '@shared/schema';
import { Link } from 'react-router-dom';

const shiftIcon: Record<string, any> = { Morning: Sun, Evening: Sunset, Night: Moon };

const roleColors: Record<string, string> = {
  Doctor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Nurse: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Nursing Assistant': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Technician: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Supervisor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
};

export function OnDutyPanel() {
  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    queryFn: async () => { const res = await fetch('/api/staff'); return res.json(); },
    refetchInterval: 60000,
  });

  const onDuty = staffList.filter(s => s.isOnDuty);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Staff On Duty
            {onDuty.length > 0 && (
              <Badge className="ml-1 text-[10px] bg-green-500 text-white">{onDuty.length}</Badge>
            )}
          </CardTitle>
          <Link to="/staff">
            <Button variant="ghost" size="sm" className="text-xs h-7">Manage</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : onDuty.length === 0 ? (
          <div className="text-center py-4">
            <UserCheck className="h-7 w-7 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-xs text-muted-foreground">No staff currently on duty</p>
            <Link to="/staff">
              <Button variant="outline" size="sm" className="mt-2 text-xs h-7">Add Staff</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {onDuty.slice(0, 6).map(s => {
              const ShiftIcon = shiftIcon[s.shift] || Sun;
              const rc = roleColors[s.role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
              return (
                <div key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {s.avatarInitials || s.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-flex text-[9px] font-medium px-1 py-0 rounded ${rc}`}>{s.role}</span>
                      <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                        <ShiftIcon className="h-2.5 w-2.5" />{s.shift}
                      </span>
                    </div>
                  </div>
                  {s.contact && (
                    <a href={`tel:${s.contact}`} className="text-muted-foreground hover:text-primary transition-colors">
                      <Phone className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
            {onDuty.length > 6 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{onDuty.length - 6} more on duty
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
