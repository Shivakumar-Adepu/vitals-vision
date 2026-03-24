import { Header } from '@/components/dashboard/Header';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Patient } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Plus, Search, Pencil, Trash2, Heart, BedDouble, Phone,
  AlertCircle, CheckCircle2, Activity, UserX, ChevronDown, ChevronUp,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  Stable: { label: 'Stable', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  Critical: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  Monitoring: { label: 'Monitoring', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Activity },
  Discharged: { label: 'Discharged', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: UserX },
};

const EMPTY_FORM = {
  patientCode: '',
  name: '',
  age: '',
  gender: '',
  roomNumber: '',
  bedNumber: '',
  condition: '',
  doctor: '',
  status: 'Stable',
  notes: '',
  bloodType: '',
  allergies: '',
  emergencyContact: '',
  emergencyPhone: '',
};

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (opts?.method === 'DELETE') return null;
  return res.json();
}

export default function PatientsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: patients = [], isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const res = await fetch('/api/patients');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiFetch('/api/patients', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setDialogOpen(false);
      toast({ title: 'Patient added successfully' });
    },
    onError: () => toast({ title: 'Failed to add patient', variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/api/patients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setDialogOpen(false);
      setEditPatient(null);
      toast({ title: 'Patient updated successfully' });
    },
    onError: () => toast({ title: 'Failed to update patient', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/patients/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/patients'] });
      setDeleteConfirm(null);
      toast({ title: 'Patient removed' });
    },
    onError: () => toast({ title: 'Failed to remove patient', variant: 'destructive' }),
  });

  const openAdd = () => {
    setEditPatient(null);
    const nextNum = String(patients.length + 1).padStart(4, '0');
    setForm({ ...EMPTY_FORM, patientCode: `P-${nextNum}` });
    setDialogOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditPatient(p);
    setForm({
      patientCode: p.patientCode || '',
      name: p.name || '',
      age: p.age !== null && p.age !== undefined ? String(p.age) : '',
      gender: p.gender || '',
      roomNumber: p.roomNumber || '',
      bedNumber: p.bedNumber || '',
      condition: p.condition || '',
      doctor: p.doctor || '',
      status: p.status || 'Stable',
      notes: p.notes || '',
      bloodType: p.bloodType || '',
      allergies: p.allergies || '',
      emergencyContact: p.emergencyContact || '',
      emergencyPhone: p.emergencyPhone || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.patientCode.trim()) {
      toast({ title: 'Name and Patient Code are required', variant: 'destructive' });
      return;
    }
    const payload = { ...form, age: form.age ? parseInt(form.age) : null };
    if (editPatient) {
      updateMutation.mutate({ id: editPatient.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = patients.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.patientCode.toLowerCase().includes(search.toLowerCase()) ||
      (p.roomNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.doctor || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statCounts = {
    total: patients.length,
    critical: patients.filter(p => p.status === 'Critical').length,
    stable: patients.filter(p => p.status === 'Stable').length,
    monitoring: patients.filter(p => p.status === 'Monitoring').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Patient Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">ICU patient roster and medical profiles</p>
          </div>
          <Button onClick={openAdd} className="flex items-center gap-2" data-testid="button-add-patient">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Patients', value: statCounts.total, color: 'text-primary' },
            { label: 'Critical', value: statCounts.critical, color: 'text-red-600 dark:text-red-400' },
            { label: 'Monitoring', value: statCounts.monitoring, color: 'text-yellow-600 dark:text-yellow-400' },
            { label: 'Stable', value: statCounts.stable, color: 'text-green-600 dark:text-green-400' },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, room, doctor…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-patient-search"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading patients…</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground font-medium">No patients found</p>
                <p className="text-xs text-muted-foreground mt-1">Add a patient to get started</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map(p => {
                  const sc = statusConfig[p.status] || statusConfig.Stable;
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedId === p.id;
                  return (
                    <div key={p.id} data-testid={`card-patient-${p.id}`}>
                      <div
                        className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                          {p.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{p.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">{p.patientCode}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {p.roomNumber && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3 w-3" />
                                Room {p.roomNumber}{p.bedNumber ? ` / Bed ${p.bedNumber}` : ''}
                              </span>
                            )}
                            {p.doctor && <span>Dr. {p.doctor}</span>}
                            {p.age && <span>{p.age}y {p.gender ? `• ${p.gender}` : ''}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sc.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={e => { e.stopPropagation(); openEdit(p); }}
                            data-testid={`button-edit-patient-${p.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); setDeleteConfirm(p.id); }}
                            data-testid={`button-delete-patient-${p.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-muted/20">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {p.condition && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Condition</p>
                                <p>{p.condition}</p>
                              </div>
                            )}
                            {p.bloodType && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-0.5 flex items-center gap-1">
                                  <Heart className="h-3 w-3 text-red-500" /> Blood Type
                                </p>
                                <p className="font-semibold">{p.bloodType}</p>
                              </div>
                            )}
                            {p.allergies && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Allergies</p>
                                <p className="text-red-600 dark:text-red-400">{p.allergies}</p>
                              </div>
                            )}
                            {p.emergencyContact && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-0.5 flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> Emergency Contact
                                </p>
                                <p>{p.emergencyContact}</p>
                                {p.emergencyPhone && <p className="text-muted-foreground text-xs">{p.emergencyPhone}</p>}
                              </div>
                            )}
                            {p.admissionDate && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Admitted</p>
                                <p>{new Date(p.admissionDate).toLocaleDateString()}</p>
                              </div>
                            )}
                            {p.notes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-xs text-muted-foreground font-medium mb-0.5">Clinical Notes</p>
                                <p className="text-sm bg-background rounded p-2 border">{p.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editPatient ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="patientCode">Patient Code *</Label>
              <Input id="patientCode" value={form.patientCode} onChange={e => setForm(f => ({ ...f, patientCode: e.target.value }))} data-testid="input-patient-code" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} data-testid="input-patient-name" />
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} data-testid="input-patient-age" />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger data-testid="select-patient-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Room Number</Label>
              <Input value={form.roomNumber} onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))} placeholder="e.g. ICU-101" data-testid="input-room-number" />
            </div>
            <div className="space-y-1">
              <Label>Bed Number</Label>
              <Input value={form.bedNumber} onChange={e => setForm(f => ({ ...f, bedNumber: e.target.value }))} placeholder="e.g. B-2" data-testid="input-bed-number" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-patient-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stable">Stable</SelectItem>
                  <SelectItem value="Monitoring">Monitoring</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Attending Doctor</Label>
              <Input value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} placeholder="Dr. Last Name" data-testid="input-doctor" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Condition / Diagnosis</Label>
              <Input value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} placeholder="Primary diagnosis" data-testid="input-condition" />
            </div>
            <div className="space-y-1">
              <Label>Blood Type</Label>
              <Select value={form.bloodType} onValueChange={v => setForm(f => ({ ...f, bloodType: v }))}>
                <SelectTrigger data-testid="select-blood-type"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Allergies</Label>
              <Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Penicillin, Latex…" data-testid="input-allergies" />
            </div>
            <div className="space-y-1">
              <Label>Emergency Contact Name</Label>
              <Input value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} data-testid="input-emergency-contact" />
            </div>
            <div className="space-y-1">
              <Label>Emergency Phone</Label>
              <Input value={form.emergencyPhone} onChange={e => setForm(f => ({ ...f, emergencyPhone: e.target.value }))} data-testid="input-emergency-phone" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Clinical Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional clinical observations or care instructions…"
                rows={3}
                data-testid="textarea-patient-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-submit-patient"
            >
              {editPatient ? 'Save Changes' : 'Add Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Patient?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the patient record. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm !== null && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Remove Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
