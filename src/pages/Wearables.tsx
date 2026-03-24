import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useBluetoothVitals, type WearableDevice } from '@/hooks/useBluetoothVitals';
import {
  Bluetooth, BluetoothConnected, BluetoothOff, Heart, Battery, Thermometer,
  Wifi, Activity, AlertTriangle, Plus, Trash2, RefreshCw, Zap, Shield,
  User, Hospital, CheckCircle2, XCircle, Info, Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function HeartRateGauge({ value, alertHigh, alertLow }: { value: number | null; alertHigh: number; alertLow: number }) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center justify-center h-24">
        <Heart className="h-8 w-8 text-muted-foreground/30 mb-1" />
        <p className="text-xs text-muted-foreground">Waiting...</p>
      </div>
    );
  }

  const isCritical = value > alertHigh || value < alertLow;
  const isWarning = value > alertHigh * 0.9 || value < alertLow * 1.1;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-24 rounded-xl transition-all",
      isCritical && "animate-pulse"
    )}>
      <Heart className={cn(
        "h-7 w-7 mb-1 transition-colors",
        isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-red-400"
      )} />
      <p className={cn(
        "text-3xl font-bold font-mono leading-none",
        isCritical ? "text-destructive" : isWarning ? "text-amber-500" : "text-foreground"
      )}>
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground mt-1">bpm</p>
      {isCritical && (
        <Badge variant="destructive" className="text-[9px] mt-1 animate-pulse">ALERT</Badge>
      )}
    </div>
  );
}

function BatteryIcon({ level }: { level: number | null }) {
  if (level === null) return <Battery className="h-4 w-4 text-muted-foreground/40" />;
  const color = level > 60 ? 'text-green-500' : level > 20 ? 'text-amber-500' : 'text-destructive';
  return (
    <span className={cn("flex items-center gap-1 text-xs font-mono", color)}>
      <Battery className="h-4 w-4" />
      {level}%
    </span>
  );
}

function DeviceCard({
  device,
  onDisconnect,
  onRemove,
  onReconnect,
  onUpdateMeta,
}: {
  device: WearableDevice;
  onDisconnect: (id: string) => void;
  onRemove: (id: string) => void;
  onReconnect: (id: string) => void;
  onUpdateMeta: (id: string, meta: { patientId?: string; roomNumber?: string; alertHigh?: number; alertLow?: number }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localPatient, setLocalPatient] = useState(device.patientId || '');
  const [localRoom, setLocalRoom] = useState(device.roomNumber || '');
  const [localHigh, setLocalHigh] = useState(String(device.alertHigh));
  const [localLow, setLocalLow] = useState(String(device.alertLow));

  const isCritical = device.heartRate !== null && (device.heartRate > device.alertHigh || device.heartRate < device.alertLow);

  const saveEdit = () => {
    onUpdateMeta(device.id, {
      patientId: localPatient || null!,
      roomNumber: localRoom || null!,
      alertHigh: parseInt(localHigh) || 120,
      alertLow: parseInt(localLow) || 50,
    });
    setEditing(false);
  };

  return (
    <Card className={cn(
      "border-border transition-all duration-300",
      isCritical && "border-destructive ring-1 ring-destructive",
      !device.connected && "opacity-70"
    )}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {device.connected
            ? <BluetoothConnected className="h-4 w-4 text-primary shrink-0" />
            : <BluetoothOff className="h-4 w-4 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{device.name}</p>
            {device.patientId && (
              <p className="text-[10px] text-muted-foreground">
                Patient: {device.patientId} {device.roomNumber && `· ${device.roomNumber}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <BatteryIcon level={device.battery} />
          <Badge
            variant={device.connected ? 'default' : 'secondary'}
            className="text-[9px]"
          >
            {device.connected ? 'Live' : 'Offline'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <HeartRateGauge value={device.heartRate} alertHigh={device.alertHigh} alertLow={device.alertLow} />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 px-2 py-2">
            <Droplets className="h-3.5 w-3.5 text-blue-500 mx-auto mb-1" />
            <p className="text-xs font-mono font-bold">{device.spo2 ? `${device.spo2}%` : '--'}</p>
            <p className="text-[9px] text-muted-foreground">SpO₂</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-2">
            <Thermometer className="h-3.5 w-3.5 text-orange-500 mx-auto mb-1" />
            <p className="text-xs font-mono font-bold">{device.temperature ? `${device.temperature}°C` : '--'}</p>
            <p className="text-[9px] text-muted-foreground">Temp</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-2 py-2">
            <Activity className="h-3.5 w-3.5 text-green-500 mx-auto mb-1" />
            <p className="text-xs font-mono font-bold">
              {device.heartRate ? (device.heartRate > 60 && device.heartRate < 100 ? 'Normal' : 'Abnormal') : '--'}
            </p>
            <p className="text-[9px] text-muted-foreground">Status</p>
          </div>
        </div>

        {device.lastSeen && (
          <p className="text-[9px] text-muted-foreground text-center">
            Last update: {device.lastSeen.toLocaleTimeString()}
          </p>
        )}

        {editing ? (
          <div className="space-y-2 pt-1">
            <Separator />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Patient ID</Label>
                <Input
                  value={localPatient}
                  onChange={e => setLocalPatient(e.target.value)}
                  placeholder="P-001"
                  className="h-7 text-xs"
                  data-testid="input-patient-id"
                />
              </div>
              <div>
                <Label className="text-[10px]">Room</Label>
                <Input
                  value={localRoom}
                  onChange={e => setLocalRoom(e.target.value)}
                  placeholder="ICU-101"
                  className="h-7 text-xs"
                  data-testid="input-room-number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Alert High (bpm)</Label>
                <Input
                  type="number"
                  value={localHigh}
                  onChange={e => setLocalHigh(e.target.value)}
                  className="h-7 text-xs"
                  data-testid="input-alert-high"
                />
              </div>
              <div>
                <Label className="text-[10px]">Alert Low (bpm)</Label>
                <Input
                  type="number"
                  value={localLow}
                  onChange={e => setLocalLow(e.target.value)}
                  className="h-7 text-xs"
                  data-testid="input-alert-low"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={saveEdit} data-testid="button-save-device-meta">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-1 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => setEditing(true)}
              data-testid={`button-edit-device-${device.id}`}
            >
              <User className="h-3 w-3 mr-1" /> Assign
            </Button>
            {device.connected ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onDisconnect(device.id)}
                data-testid={`button-disconnect-device-${device.id}`}
              >
                <BluetoothOff className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onReconnect(device.id)}
                data-testid={`button-reconnect-device-${device.id}`}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => onRemove(device.id)}
              data-testid={`button-remove-device-${device.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const supportedDevices = [
  { name: 'MI Band / Xiaomi Smart Band', icon: '⌚', compatible: true },
  { name: 'Polar H10 / H9', icon: '❤️', compatible: true },
  { name: 'Garmin HRM-Pro', icon: '🏃', compatible: true },
  { name: 'Apple Watch (via companion)', icon: '🍎', compatible: true },
  { name: 'Fitbit Sense / Versa', icon: '📊', compatible: true },
  { name: 'Samsung Galaxy Watch', icon: '💠', compatible: true },
  { name: 'Generic BLE Heart Rate Band', icon: '💓', compatible: true },
  { name: 'Withings ScanWatch', icon: '🔬', compatible: true },
];

const WearablesPage = () => {
  const {
    devices, isScanning, error, isSupported,
    connectDevice, disconnectDevice, removeDevice, updateDeviceMeta, reconnectDevice,
  } = useBluetoothVitals();

  const connectedCount = devices.filter(d => d.connected).length;
  const criticalCount = devices.filter(d =>
    d.heartRate !== null && (d.heartRate > d.alertHigh || d.heartRate < d.alertLow)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h2 className="text-2xl font-bold font-formal flex items-center gap-2">
              <Bluetooth className="h-6 w-6 text-primary" />
              Wearable Vitals Monitor
            </h2>
            {connectedCount > 0 && (
              <Badge variant="default" className="gap-1">
                <BluetoothConnected className="h-3 w-3" />
                {connectedCount} Connected
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {criticalCount} Critical
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Pair Bluetooth-enabled heart rate monitors, fitness bands, and wearable sensors to monitor
            patient vitals in real time. Supports all standard BLE heart rate devices (GATT 0x180D).
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Paired Devices ({devices.length})
              </h3>
              <Button
                onClick={connectDevice}
                disabled={isScanning || !isSupported}
                className="gap-2"
                data-testid="button-connect-wearable"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Pair Device
                  </>
                )}
              </Button>
            </div>

            {!isSupported && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                <CardContent className="p-4 flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Browser Not Supported</p>
                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                      Web Bluetooth requires Google Chrome or Microsoft Edge on desktop/Android.
                      Safari and Firefox do not currently support this API.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {devices.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
                  <div className="relative">
                    <Bluetooth className="h-14 w-14 text-muted-foreground/20" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary/20 animate-ping" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">No wearables paired yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Pair Device" to connect a Bluetooth heart rate monitor or fitness band
                    </p>
                  </div>
                  {isSupported && (
                    <Button
                      onClick={connectDevice}
                      disabled={isScanning}
                      variant="outline"
                      className="gap-2"
                      data-testid="button-pair-first-device"
                    >
                      <Bluetooth className="h-4 w-4" />
                      Connect First Device
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {devices.map(device => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onDisconnect={disconnectDevice}
                    onRemove={removeDevice}
                    onReconnect={reconnectDevice}
                    onUpdateMeta={updateDeviceMeta}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  How to Connect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: '1', text: 'Enable Bluetooth on your device', icon: Bluetooth },
                  { step: '2', text: 'Put the wearable in pairing mode', icon: BluetoothConnected },
                  { step: '3', text: 'Click "Pair Device" above', icon: Plus },
                  { step: '4', text: 'Select your device from the browser popup', icon: CheckCircle2 },
                  { step: '5', text: 'Assign a patient ID & room number', icon: Hospital },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                      {s.step}
                    </span>
                    <p className="text-xs text-muted-foreground">{s.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Normal Ranges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Heart Rate', range: '60–100 bpm', color: 'text-red-400', icon: Heart },
                    { label: 'SpO₂', range: '95–100%', color: 'text-blue-500', icon: Droplets },
                    { label: 'Temperature', range: '36.1–37.2°C', color: 'text-orange-500', icon: Thermometer },
                    { label: 'Tachycardia', range: '>100 bpm', color: 'text-amber-500', icon: AlertTriangle },
                    { label: 'Bradycardia', range: '<60 bpm', color: 'text-amber-500', icon: AlertTriangle },
                  ].map(v => (
                    <div key={v.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <v.icon className={cn("h-3.5 w-3.5", v.color)} />
                        <span className="text-xs">{v.label}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{v.range}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Compatible Devices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {supportedDevices.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="text-sm">{d.icon}</span>
                      <p className="text-xs text-muted-foreground flex-1">{d.name}</p>
                      {d.compatible && (
                        <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t">
                  Any device supporting BLE GATT Heart Rate Service (0x180D) is compatible.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Wifi className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold">Real-Time Alerts</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Heart rate readings outside your configured thresholds will automatically create
                      critical alerts in the Emergency Alert Log.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Hospital className="h-4 w-4 text-primary" />
            Band & Strap Compatibility Guide
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { type: 'Chest Strap', desc: 'Most accurate for HR monitoring', icon: '🫀', badge: 'Best Accuracy' },
              { type: 'Wrist Band', desc: 'Convenient, good for movement tracking', icon: '⌚', badge: 'Most Common' },
              { type: 'Finger Clip', desc: 'Ideal for SpO₂ monitoring', icon: '🖐️', badge: 'SpO₂ Ready' },
              { type: 'Patch Sensor', desc: 'Continuous ECG-quality data', icon: '📟', badge: 'Clinical Grade' },
            ].map(t => (
              <Card key={t.type} className="bg-card">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl mb-1">{t.icon}</p>
                  <p className="text-xs font-semibold">{t.type}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</p>
                  <Badge variant="secondary" className="text-[9px] mt-2">{t.badge}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WearablesPage;
