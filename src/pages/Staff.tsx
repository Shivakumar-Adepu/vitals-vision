import { Header } from '@/components/dashboard/Header';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Staff } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Plus, Phone, Pencil, Trash2, Sun, Moon, Sunset, Building2, Stethoscope } from 'lucide-react';

const shiftIcon: Record<string, any> = {
  Morning: Sun,
  Evening: Sunset,
  Night: Moon,
};

const roleColor: Record<string, string> = {
  Doctor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Nurse: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Nursing Assistant': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  Technician: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  Supervisor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  Other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const EMPTY_FORM = {
  name: '',
  role: 'Nurse',
  contact: '',
  shift: 'Morning',
  department: '',
  isOnDuty: false,
  avatarInitials: '',
  specialization: '',
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (opts?.method === 'DELETE') return null;
  return res.json();
}

export default function StaffPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [shiftFilter, setShiftFilter] = useState('All');

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ['/api/staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch('/api/staff', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      setDialogOpen(false);
      toast({ title: 'Staff member added' });
    },
    onError: () => toast({ title: 'Failed to add staff', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/api/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      setDialogOpen(false);
      setEditStaff(null);
      toast({ title: 'Staff member updated' });
    },
    onError: () => toast({ title: 'Failed to update staff', variant: 'destructive' }),
  });

  const dutyMutation = useMutation({
    mutationFn: ({ id, isOnDuty }: { id: number; isOnDuty: boolean }) =>
      apiFetch(`/api/staff/${id}/duty`, { method: 'PATCH', body: JSON.stringify({ isOnDuty }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/staff'] }),
    onError: () => toast({ title: 'Failed to update duty status', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      setDeleteConfirm(null);
      toast({ title: 'Staff member removed' });
    },
    onError: () => toast({ title: 'Failed to remove staff', variant: 'destructive' }),
  });

  const openAdd = () => {
    setEditStaff(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Staff) => {
    setEditStaff(s);
    setForm({
      name: s.name || '',
      role: s.role || 'Nurse',
      contact: s.contact || '',
      shift: s.shift || 'Morning',
      department: s.department || '',
      isOnDuty: s.isOnDuty || false,
      avatarInitials: s.avatarInitials || '',
      specialization: s.specialization || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    const initials = form.avatarInitials || form.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    const payload = { ...form, avatarInitials: initials };
    if (editStaff) {
      updateMutation.mutate({ id: editStaff.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = staffList.filter(s => shiftFilter === 'All' || s.shift === shiftFilter);
  const onDutyCount = staffList.filter(s => s.isOnDuty).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-primary" />
              Staff Directory
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage nursing and medical staff on duty</p>
          </div>
          <Button onClick={openAdd} className="flex items-center gap-2" data-testid="button-add-staff">
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Staff', value: staffList.length, color: 'text-primary' },
            { label: 'On Duty', value: onDutyCount, color: 'text-green-600 dark:text-green-400' },
            { label: 'Off Duty', value: staffList.length - onDutyCount, color: 'text-muted-foreground' },
            { label: 'Doctors', value: staffList.filter(s => s.role === 'Doctor').length, color: 'text-blue-600 dark:text-blue-400' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {['All', 'Morning', 'Evening', 'Night'].map(sh => (
            <Button
              key={sh}
              variant={shiftFilter === sh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShiftFilter(sh)}
              data-testid={`button-filter-${sh.toLowerCase()}`}
            >
              {sh !== 'All' && (() => { const Icon = shiftIcon[sh]; return <Icon className="h-3.5 w-3.5 mr-1" />; })()}
              {sh} Shift
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground font-medium">No staff found</p>
            <p className="text-xs text-muted-foreground mt-1">Add staff members to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(s => {
              const ShiftIcon = shiftIcon[s.shift] || Sun;
              const rc = roleColor[s.role] || roleColor.Other;
              return (
                <Card
                  key={s.id}
                  className={`border-0 shadow-sm transition-all ${s.isOnDuty ? 'ring-2 ring-green-400/50' : 'opacity-80'}`}
                  data-testid={`card-staff-${s.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                        {s.avatarInitials || s.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openEdit(s)}
                          data-testid={`button-edit-staff-${s.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirm(s.id)}
                          data-testid={`button-delete-staff-${s.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold text-sm leading-tight">{s.name}</p>
                      <span className={`inline-flex text-xs font-medium px-1.5 py-0.5 rounded mt-1 ${rc}`}>
                        {s.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {s.specialization && (
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="h-3 w-3 flex-shrink-0" />
                          <span>{s.specialization}</span>
                        </div>
                      )}
                      {s.department && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span>{s.department}</span>
                        </div>
                      )}
                      {s.contact && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{s.contact}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <ShiftIcon className="h-3 w-3 flex-shrink-0" />
                        <span>{s.shift} Shift</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className={`text-xs font-medium ${s.isOnDuty ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {s.isOnDuty ? '● On Duty' : '○ Off Duty'}
                      </span>
                      <Switch
                        checked={s.isOnDuty}
                        onCheckedChange={checked => dutyMutation.mutate({ id: s.id, isOnDuty: checked })}
                        data-testid={`switch-duty-${s.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1 col-span-2">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. / Nurse full name" data-testid="input-staff-name" />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger data-testid="select-staff-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Doctor', 'Nurse', 'Nursing Assistant', 'Technician', 'Supervisor', 'Other'].map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Shift</Label>
              <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                <SelectTrigger data-testid="select-staff-shift"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning</SelectItem>
                  <SelectItem value="Evening">Evening</SelectItem>
                  <SelectItem value="Night">Night</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. ICU, Neurology" data-testid="input-staff-department" />
            </div>
            <div className="space-y-1">
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Critical Care" data-testid="input-staff-specialization" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Contact Number</Label>
              <Input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="+91 98765 43210" data-testid="input-staff-contact" />
            </div>
            <div className="space-y-1 col-span-2 flex items-center justify-between border rounded-md p-3">
              <div>
                <p className="text-sm font-medium">Currently On Duty</p>
                <p className="text-xs text-muted-foreground">Toggle duty status for this staff member</p>
              </div>
              <Switch
                checked={form.isOnDuty}
                onCheckedChange={checked => setForm(f => ({ ...f, isOnDuty: checked }))}
                data-testid="switch-staff-duty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-staff"
            >
              {editStaff ? 'Save Changes' : 'Add Staff Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Staff Member?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove this staff record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete-staff"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
