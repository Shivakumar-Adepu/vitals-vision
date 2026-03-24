import { useState, useCallback, useRef } from 'react';

export interface DetectionEvent {
  category: string;
  event: string;
  confidence: number;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectionSource: string;
}

interface AdvancedDetectionState {
  respiratoryDistress: boolean;
  cyanosisRisk: boolean;
  agitation: boolean;
  elopementRisk: boolean;
  staffAbsent: boolean;
  respiratoryRate: number;
  lastStaffSeen: number | null;
  bedRegionOccupied: boolean;
}

const RESPIRATORY_DISTRESS_THRESHOLD = 25;
const AGITATION_THRESHOLD = 0.6;
const ELOPEMENT_COOLDOWN = 15000;
const STAFF_ABSENCE_THRESHOLD = 300000;

export function useAdvancedDetection(enabled = true) {
  const [state, setState] = useState<AdvancedDetectionState>({
    respiratoryDistress: false,
    cyanosisRisk: false,
    agitation: false,
    elopementRisk: false,
    staffAbsent: false,
    respiratoryRate: 16,
    lastStaffSeen: null,
    bedRegionOccupied: true,
  });

  const chestMovementBuffer = useRef<number[]>([]);
  const wristPositionBuffer = useRef<{ x: number; y: number; t: number }[]>([]);
  const headPositionBuffer = useRef<{ x: number; y: number; t: number }[]>([]);
  const lastElopementAlert = useRef(0);
  const lastStaffDetection = useRef<number>(Date.now());
  const personCountBuffer = useRef<number[]>([]);

  const analyzeRespiratoryPattern = useCallback((landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) => {
    if (!landmarks || landmarks.length < 33) return;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const chestMovement = Math.abs(leftShoulder.y - rightShoulder.y) +
      Math.abs(leftShoulder.z - rightShoulder.z) * 2;

    chestMovementBuffer.current.push(chestMovement);
    if (chestMovementBuffer.current.length > 90) {
      chestMovementBuffer.current.shift();
    }

    if (chestMovementBuffer.current.length < 30) return;

    const values = chestMovementBuffer.current;
    let crossings = 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    for (let i = 1; i < values.length; i++) {
      if ((values[i - 1] < mean && values[i] >= mean) ||
          (values[i - 1] >= mean && values[i] < mean)) {
        crossings++;
      }
    }

    const estimatedRate = Math.round((crossings / 2) * (60 / (values.length / 30)));
    const isDistressed = estimatedRate > RESPIRATORY_DISTRESS_THRESHOLD || estimatedRate < 8;

    setState(prev => ({
      ...prev,
      respiratoryRate: Math.max(6, Math.min(40, estimatedRate)),
      respiratoryDistress: isDistressed,
    }));

    return { rate: estimatedRate, isDistressed };
  }, []);

  const analyzeAgitation = useCallback((landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) => {
    if (!landmarks || landmarks.length < 33) return;

    const now = Date.now();
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const avgWrist = {
      x: (leftWrist.x + rightWrist.x) / 2,
      y: (leftWrist.y + rightWrist.y) / 2,
      t: now,
    };

    wristPositionBuffer.current.push(avgWrist);
    if (wristPositionBuffer.current.length > 60) {
      wristPositionBuffer.current.shift();
    }

    if (wristPositionBuffer.current.length < 20) return;

    let totalMovement = 0;
    let directionChanges = 0;
    const positions = wristPositionBuffer.current;

    for (let i = 1; i < positions.length; i++) {
      const dx = positions[i].x - positions[i - 1].x;
      const dy = positions[i].y - positions[i - 1].y;
      totalMovement += Math.sqrt(dx * dx + dy * dy);

      if (i >= 2) {
        const prevDx = positions[i - 1].x - positions[i - 2].x;
        const prevDy = positions[i - 1].y - positions[i - 2].y;
        if (dx * prevDx + dy * prevDy < 0) directionChanges++;
      }
    }

    const avgMovement = totalMovement / positions.length;
    const changeRate = directionChanges / positions.length;
    const agitationScore = Math.min(1, avgMovement * 5 + changeRate * 2);
    const isAgitated = agitationScore > AGITATION_THRESHOLD;

    setState(prev => ({ ...prev, agitation: isAgitated }));
    return { agitationScore, isAgitated };
  }, []);

  const analyzeElopementRisk = useCallback((landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) => {
    if (!landmarks || landmarks.length < 33) return;

    const now = Date.now();
    const nose = landmarks[0];

    headPositionBuffer.current.push({ x: nose.x, y: nose.y, t: now });
    if (headPositionBuffer.current.length > 30) {
      headPositionBuffer.current.shift();
    }

    const isNearEdge = nose.x < 0.1 || nose.x > 0.9 || nose.y < 0.1;
    const isMovingToEdge = headPositionBuffer.current.length > 10 && (() => {
      const recent = headPositionBuffer.current.slice(-5);
      const earlier = headPositionBuffer.current.slice(-10, -5);
      if (earlier.length === 0) return false;
      const recentAvgX = recent.reduce((s, p) => s + p.x, 0) / recent.length;
      const earlierAvgX = earlier.reduce((s, p) => s + p.x, 0) / earlier.length;
      return Math.abs(recentAvgX - earlierAvgX) > 0.15;
    })();

    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const hipY = (leftHip.y + rightHip.y) / 2;
    const isUpright = hipY < 0.6 && nose.y < 0.4;

    const elopementRisk = isNearEdge && isMovingToEdge && isUpright;

    if (elopementRisk && now - lastElopementAlert.current > ELOPEMENT_COOLDOWN) {
      lastElopementAlert.current = now;
      setState(prev => ({ ...prev, elopementRisk: true }));
    } else if (!elopementRisk) {
      setState(prev => ({ ...prev, elopementRisk: false }));
    }

    return { elopementRisk };
  }, []);

  const updatePersonCount = useCallback((count: number) => {
    const now = Date.now();
    personCountBuffer.current.push(count);
    if (personCountBuffer.current.length > 30) {
      personCountBuffer.current.shift();
    }

    if (count >= 2) {
      lastStaffDetection.current = now;
      setState(prev => ({ ...prev, staffAbsent: false, lastStaffSeen: now }));
    } else {
      const timeSinceStaff = now - lastStaffDetection.current;
      const isAbsent = timeSinceStaff > STAFF_ABSENCE_THRESHOLD;
      setState(prev => ({
        ...prev,
        staffAbsent: isAbsent,
        lastStaffSeen: lastStaffDetection.current,
      }));
    }
  }, []);

  const processFrame = useCallback((
    landmarks: Array<{ x: number; y: number; z: number; visibility?: number }> | null,
    personCount: number
  ) => {
    if (!enabled) return [];

    const events: DetectionEvent[] = [];

    if (landmarks && landmarks.length >= 33) {
      const respiratory = analyzeRespiratoryPattern(landmarks);
      if (respiratory?.isDistressed) {
        events.push({
          category: 'Respiratory',
          event: 'Respiratory Distress',
          confidence: 0.78,
          description: `Abnormal breathing rate: ${respiratory.rate}/min`,
          severity: 'high',
          detectionSource: 'chest-movement-analysis',
        });
      }

      const agitation = analyzeAgitation(landmarks);
      if (agitation?.isAgitated) {
        events.push({
          category: 'Behavioral',
          event: 'Patient Agitation',
          confidence: Math.round(agitation.agitationScore * 100) / 100,
          description: 'Repetitive thrashing or erratic limb movement detected',
          severity: 'medium',
          detectionSource: 'motion-pattern-analysis',
        });
      }

      const elopement = analyzeElopementRisk(landmarks);
      if (elopement?.elopementRisk) {
        events.push({
          category: 'Safety',
          event: 'Elopement Risk',
          confidence: 0.82,
          description: 'Patient moving toward exit or leaving bed area',
          severity: 'high',
          detectionSource: 'boundary-tracking',
        });
      }
    }

    updatePersonCount(personCount);

    if (state.staffAbsent && state.lastStaffSeen) {
      const minutes = Math.round((Date.now() - state.lastStaffSeen) / 60000);
      events.push({
        category: 'Presence',
        event: 'Staff Absence',
        confidence: 0.9,
        description: `No caregiver detected for ${minutes} minutes`,
        severity: 'medium',
        detectionSource: 'person-count-tracking',
      });
    }

    return events;
  }, [enabled, analyzeRespiratoryPattern, analyzeAgitation, analyzeElopementRisk, updatePersonCount, state.staffAbsent, state.lastStaffSeen]);

  const reset = useCallback(() => {
    chestMovementBuffer.current = [];
    wristPositionBuffer.current = [];
    headPositionBuffer.current = [];
    personCountBuffer.current = [];
    lastStaffDetection.current = Date.now();
    setState({
      respiratoryDistress: false,
      cyanosisRisk: false,
      agitation: false,
      elopementRisk: false,
      staffAbsent: false,
      respiratoryRate: 16,
      lastStaffSeen: null,
      bedRegionOccupied: true,
    });
  }, []);

  return {
    ...state,
    processFrame,
    reset,
  };
}
