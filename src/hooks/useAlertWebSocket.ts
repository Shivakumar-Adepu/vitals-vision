import { useState, useEffect, useCallback, useRef } from 'react';

export type EmergencyAlertType = 'Fall' | 'Seizure' | 'Respiratory' | 'Stumble';
export type AlertStatus = 'Pending' | 'Resolved';

export interface EmergencyAlert {
  id: string | number;
  timestamp: Date;
  alertType: EmergencyAlertType;
  confidenceScore: number;
  status: AlertStatus;
  isHighPriority: boolean;
  patientId?: string;
  roomNumber?: string;
  bodyPosition?: string;
  detectionSource?: string;
}

export function useAlertWebSocket() {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveAlert = useCallback(async (alertId: string | number, nurseNotes?: string, respondedBy?: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nurseNotes, respondedBy }),
      });
    } catch {
      // ignore
    }
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: 'Resolved' as AlertStatus } : a))
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/alerts?limit=50')
      .then(res => res.json())
      .then(data => {
        if (!isMounted || !Array.isArray(data)) return;
        const mapped: EmergencyAlert[] = data.map((a: any) => ({
          id: a.id,
          timestamp: new Date(a.timestamp),
          alertType: a.alertType || 'Fall',
          confidenceScore: a.confidenceScore || 0.85,
          status: a.status || 'Pending',
          isHighPriority: a.isHighPriority || false,
          patientId: a.patientId,
          roomNumber: a.roomNumber,
          bodyPosition: a.bodyPosition,
          detectionSource: a.detectionSource,
        }));
        setAlerts(mapped);
      })
      .catch(() => {});

    function connectWs() {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isMounted) {
            setConnected(true);
            console.log('[WS] Connected to server');
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'new_alert' && data.alert) {
              const alert: EmergencyAlert = {
                id: data.alert.id,
                timestamp: new Date(data.alert.timestamp),
                alertType: data.alert.alertType || 'Fall',
                confidenceScore: data.alert.confidenceScore || 0.85,
                status: 'Pending',
                isHighPriority: data.alert.isHighPriority || false,
                patientId: data.alert.patientId,
                roomNumber: data.alert.roomNumber,
                bodyPosition: data.alert.bodyPosition,
                detectionSource: data.alert.detectionSource,
              };
              setAlerts(prev => [alert, ...prev].slice(0, 100));
            }

            if (data.type === 'alert_resolved' && data.alertId) {
              setAlerts(prev =>
                prev.map(a => (a.id === data.alertId ? { ...a, status: 'Resolved' as AlertStatus } : a))
              );
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          if (isMounted) setConnected(false);
        };

        ws.onclose = () => {
          if (isMounted) {
            setConnected(false);
            reconnectTimerRef.current = setTimeout(connectWs, 3000);
          }
        };
      } catch {
        if (isMounted) {
          reconnectTimerRef.current = setTimeout(connectWs, 3000);
        }
      }
    }

    connectWs();

    return () => {
      isMounted = false;
      wsRef.current?.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  return { alerts, connected, resolveAlert };
}
