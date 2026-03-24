import { useState, useEffect, useCallback } from 'react';

export type AlertType = 'normal' | 'movement' | 'fall' | 'seizure' | 'stumble' | 'respiratory-distress' | 'agitation' | 'elopement' | 'staff-absence';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  timestamp: Date;
  patientId: string;
  roomNumber: string;
  confidence?: number;
  bodyPosition?: string;
  detectionSource?: string;
}

export interface VitalData {
  timestamp: Date;
  respiratoryRate: number;
}

export interface MockAIState {
  alerts: Alert[];
  vitals: VitalData[];
  patientsMonitored: number;
  activeAlerts: number;
  systemHealth: number;
  currentStatus: AlertType;
  lastFallDetected: Date | null;
}

const ROOMS = ['ICU-101', 'ICU-102', 'Ward-A3', 'Ward-B7', 'ER-05'];
const PATIENT_IDS = ['P-2341', 'P-1872', 'P-3921', 'P-4102', 'P-0892'];

const generateAlertMessage = (type: AlertType, room: string): string => {
  switch (type) {
    case 'normal':
      return `Normal monitoring in ${room}`;
    case 'movement':
      return `Movement detected in ${room}`;
    case 'fall':
      return `FALL DETECTED in ${room}! Immediate response required.`;
    case 'seizure':
      return `SEIZURE DETECTED in ${room}! Medical attention needed.`;
    case 'stumble':
      return `STUMBLE DETECTED in ${room}! Patient may need assistance.`;
    case 'respiratory-distress':
      return `RESPIRATORY DISTRESS in ${room}! Abnormal breathing pattern.`;
    case 'agitation':
      return `Patient agitation detected in ${room}. Assessment needed.`;
    case 'elopement':
      return `ELOPEMENT RISK in ${room}! Patient leaving safe zone.`;
    case 'staff-absence':
      return `No caregiver detected in ${room}. Staff check required.`;
    default:
      return `Status update from ${room}`;
  }
};

export function useMockAI() {
  const [state, setState] = useState<MockAIState>({
    alerts: [],
    vitals: [],
    patientsMonitored: 12,
    activeAlerts: 0,
    systemHealth: 98,
    currentStatus: 'normal',
    lastFallDetected: null,
  });

  useEffect(() => {
    const initialVitals: VitalData[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      initialVitals.push({
        timestamp: new Date(now.getTime() - i * 2000),
        respiratoryRate: 14 + Math.random() * 4,
      });
    }
    setState(prev => ({ ...prev, vitals: initialVitals }));
  }, []);

  const addAlert = useCallback((type: AlertType, extra?: { confidence?: number; bodyPosition?: string; detectionSource?: string }) => {
    const room = ROOMS[Math.floor(Math.random() * ROOMS.length)];
    const patientId = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
    
    const newAlert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: generateAlertMessage(type, room),
      timestamp: new Date(),
      patientId,
      roomNumber: room,
      confidence: extra?.confidence,
      bodyPosition: extra?.bodyPosition,
      detectionSource: extra?.detectionSource,
    };

    const alertTypeMap: Record<string, string> = {
      fall: 'Fall',
      seizure: 'Seizure',
      stumble: 'Stumble',
      movement: 'Respiratory',
      'respiratory-distress': 'Respiratory Distress',
      agitation: 'Patient Agitation',
      elopement: 'Elopement Risk',
      'staff-absence': 'Staff Absence',
    };

    if (type !== 'normal') {
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: alertTypeMap[type] || 'Fall',
          confidenceScore: extra?.confidence || 0.85,
          isHighPriority: (extra?.confidence || 0.85) >= 0.9,
          patientId,
          roomNumber: room,
          bodyPosition: extra?.bodyPosition || 'unknown',
          detectionSource: extra?.detectionSource || 'mediapipe',
        }),
      }).catch(() => {});
    }

    setState(prev => ({
      ...prev,
      alerts: [newAlert, ...prev.alerts].slice(0, 50),
      activeAlerts: ['fall', 'seizure', 'stumble'].includes(type) ? prev.activeAlerts + 1 : prev.activeAlerts,
      currentStatus: type,
      lastFallDetected: type === 'fall' ? new Date() : prev.lastFallDetected,
    }));

    return newAlert;
  }, []);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ),
      activeAlerts: Math.max(0, prev.activeAlerts - 1),
    }));
  }, []);

  const clearFallStatus = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStatus: 'normal',
      activeAlerts: Math.max(0, prev.activeAlerts - 1),
    }));
  }, []);

  useEffect(() => {
    const vitalsInterval = setInterval(() => {
      setState(prev => {
        const newVital: VitalData = {
          timestamp: new Date(),
          respiratoryRate: 14 + Math.random() * 4 + (prev.currentStatus === 'fall' ? 6 : 0),
        };
        return {
          ...prev,
          vitals: [...prev.vitals.slice(-29), newVital],
        };
      });
    }, 2000);

    return () => clearInterval(vitalsInterval);
  }, []);

  useEffect(() => {
    const healthInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        systemHealth: Math.min(100, Math.max(90, prev.systemHealth + (Math.random() - 0.5) * 2)),
      }));
    }, 5000);

    return () => clearInterval(healthInterval);
  }, []);

  return {
    ...state,
    addAlert,
    acknowledgeAlert,
    clearFallStatus,
  };
}
