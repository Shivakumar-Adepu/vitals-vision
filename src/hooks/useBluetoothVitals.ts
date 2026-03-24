import { useState, useCallback, useRef } from 'react';

export interface WearableDevice {
  id: string;
  name: string;
  heartRate: number | null;
  spo2: number | null;
  battery: number | null;
  temperature: number | null;
  connected: boolean;
  lastSeen: Date | null;
  patientId: string | null;
  roomNumber: string | null;
  alertHigh: number;
  alertLow: number;
}

function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const is16Bit = flags & 0x1;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
}

export function useBluetoothVitals() {
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const gattServersRef = useRef<Map<string, BluetoothRemoteGATTServer>>(new Map());

  const connectDevice = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser. Please use Chrome or Edge on Android/desktop.');
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'heart_rate',
          'battery_service',
          'health_thermometer',
          '0000180d-0000-1000-8000-00805f9b34fb',
          '0000180f-0000-1000-8000-00805f9b34fb',
        ],
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      gattServersRef.current.set(device.id, server);

      const newDevice: WearableDevice = {
        id: device.id,
        name: device.name || 'Unknown Wearable',
        heartRate: null,
        spo2: null,
        battery: null,
        temperature: null,
        connected: true,
        lastSeen: new Date(),
        patientId: null,
        roomNumber: null,
        alertHigh: 120,
        alertLow: 50,
      };

      setDevices(prev => {
        const filtered = prev.filter(d => d.id !== device.id);
        return [...filtered, newDevice];
      });

      try {
        const hrService = await server.getPrimaryService('heart_rate');
        const hrChar = await hrService.getCharacteristic('heart_rate_measurement');
        await hrChar.startNotifications();
        hrChar.addEventListener('characteristicvaluechanged', (e: any) => {
          const hr = parseHeartRate(e.target.value);
          setDevices(prev =>
            prev.map(d =>
              d.id === device.id ? { ...d, heartRate: hr, lastSeen: new Date() } : d
            )
          );
        });
      } catch {
        // Device may not expose heart_rate service
      }

      try {
        const battService = await server.getPrimaryService('battery_service');
        const battChar = await battService.getCharacteristic('battery_level');
        const battVal = await battChar.readValue();
        const battery = battVal.getUint8(0);
        setDevices(prev => prev.map(d => (d.id === device.id ? { ...d, battery } : d)));

        battChar.startNotifications().then(() => {
          battChar.addEventListener('characteristicvaluechanged', (e: any) => {
            setDevices(prev =>
              prev.map(d =>
                d.id === device.id ? { ...d, battery: e.target.value.getUint8(0) } : d
              )
            );
          });
        }).catch(() => {});
      } catch {
        // Device may not expose battery service
      }

      device.addEventListener('gattserverdisconnected', () => {
        setDevices(prev =>
          prev.map(d => (d.id === device.id ? { ...d, connected: false } : d))
        );
        gattServersRef.current.delete(device.id);
      });
    } catch (err: any) {
      if (err?.name !== 'NotFoundError' && err?.name !== 'SecurityError') {
        setError(err?.message || 'Failed to connect to device');
      }
    } finally {
      setIsScanning(false);
    }
  }, [isSupported]);

  const disconnectDevice = useCallback((deviceId: string) => {
    const server = gattServersRef.current.get(deviceId);
    if (server?.connected) {
      server.disconnect();
    }
    gattServersRef.current.delete(deviceId);
    setDevices(prev => prev.map(d => (d.id === deviceId ? { ...d, connected: false } : d)));
  }, []);

  const removeDevice = useCallback((deviceId: string) => {
    disconnectDevice(deviceId);
    setDevices(prev => prev.filter(d => d.id !== deviceId));
  }, [disconnectDevice]);

  const updateDeviceMeta = useCallback((
    deviceId: string,
    meta: { patientId?: string; roomNumber?: string; alertHigh?: number; alertLow?: number }
  ) => {
    setDevices(prev => prev.map(d => (d.id === deviceId ? { ...d, ...meta } : d)));
  }, []);

  const reconnectDevice = useCallback(async (deviceId: string) => {
    const server = gattServersRef.current.get(deviceId);
    if (!server) return;
    try {
      await server.connect();
      setDevices(prev => prev.map(d => (d.id === deviceId ? { ...d, connected: true, lastSeen: new Date() } : d)));
    } catch {}
  }, []);

  return {
    devices,
    isScanning,
    error,
    isSupported,
    connectDevice,
    disconnectDevice,
    removeDevice,
    updateDeviceMeta,
    reconnectDevice,
  };
}
