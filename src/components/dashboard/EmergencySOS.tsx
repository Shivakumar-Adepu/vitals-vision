import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import type { Staff } from '@shared/schema';
import { Siren, AlertTriangle } from 'lucide-react';

interface EmergencySOSProps {
  onSOS?: () => void;
}

export function EmergencySOS({ onSOS }: EmergencySOSProps) {
  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState('');
  const [triggeredBy, setTriggeredBy] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    queryFn: async () => { const res = await fetch('/api/staff'); return res.json(); },
  });

  const onDutyStaff = staffList.filter(s => s.isOnDuty);

  const handleSend = async () => {
    setSending(true);
    try {
      await fetch('/api/alerts/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNumber: room || 'All Rooms', triggeredBy }),
      });
      setSent(true);
      onSOS?.();
      setTimeout(() => {
        setOpen(false);
        setSent(false);
        setRoom('');
        setTriggeredBy('');
      }, 2000);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg animate-pulse hover:animate-none"
        data-testid="button-sos"
      >
        <Siren className="h-4 w-4" />
        Emergency SOS
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!sending) setOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Emergency SOS Alert
            </DialogTitle>
          </DialogHeader>

          {sent ? (
            <div className="py-6 text-center space-y-2">
              <Siren className="h-10 w-10 text-red-600 mx-auto animate-bounce" />
              <p className="text-lg font-bold text-red-600">SOS Sent!</p>
              <p className="text-sm text-muted-foreground">All available staff have been alerted</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-700 dark:text-red-400">
                This will immediately broadcast a critical emergency alert to all connected staff.
              </div>

              <div className="space-y-1">
                <Label>Room / Location (optional)</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger data-testid="select-sos-room">
                    <SelectValue placeholder="All rooms / General" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Rooms">All Rooms</SelectItem>
                    <SelectItem value="ICU-101">ICU-101</SelectItem>
                    <SelectItem value="ICU-102">ICU-102</SelectItem>
                    <SelectItem value="ICU-103">ICU-103</SelectItem>
                    <SelectItem value="ICU-104">ICU-104</SelectItem>
                    <SelectItem value="ICU-105">ICU-105</SelectItem>
                    <SelectItem value="Emergency Bay">Emergency Bay</SelectItem>
                    <SelectItem value="Corridor">Corridor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {onDutyStaff.length > 0 && (
                <div className="space-y-1">
                  <Label>Triggered By (optional)</Label>
                  <Select value={triggeredBy} onValueChange={setTriggeredBy}>
                    <SelectTrigger data-testid="select-sos-staff">
                      <SelectValue placeholder="Select your name" />
                    </SelectTrigger>
                    <SelectContent>
                      {onDutyStaff.map(s => (
                        <SelectItem key={s.id} value={s.name}>{s.name} ({s.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                {onDutyStaff.length > 0
                  ? `${onDutyStaff.length} staff member${onDutyStaff.length !== 1 ? 's' : ''} currently on duty will be notified`
                  : 'Alert will be broadcast to all registered staff'}
              </div>
            </div>
          )}

          {!sent && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleSend}
                disabled={sending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-sos"
              >
                {sending ? 'Sending…' : '🚨 Send SOS Now'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
