import { useState, useCallback, useRef, useEffect } from 'react';

interface PoseFrame {
  timestamp: number;
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>;
}

interface SeizureAnalysis {
  seizureScore: number;
  stumbleScore: number;
  isSeizureDetected: boolean;
  isStumbleDetected: boolean;
  pattern: string;
  confidence: number;
}

interface SeizureDetectionState {
  isReady: boolean;
  analysis: SeizureAnalysis;
  frameBufferSize: number;
}

const BUFFER_SIZE = 60;
const SEIZURE_THRESHOLD = 0.7;
const STUMBLE_THRESHOLD = 0.65;

function extractFeatures(landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) {
  if (!landmarks || landmarks.length < 33) return null;

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftWrist = landmarks[15];
  const rightWrist = landmarks[16];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];

  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipMidX = (leftHip.x + rightHip.x) / 2;
  const hipMidY = (leftHip.y + rightHip.y) / 2;

  const torsoAngle = Math.atan2(hipMidY - shoulderMidY, hipMidX - shoulderMidX) * (180 / Math.PI);

  const shoulderWidth = Math.sqrt(
    Math.pow(rightShoulder.x - leftShoulder.x, 2) + Math.pow(rightShoulder.y - leftShoulder.y, 2)
  );

  const wristMovement =
    Math.sqrt(Math.pow(leftWrist.x - leftShoulder.x, 2) + Math.pow(leftWrist.y - leftShoulder.y, 2)) +
    Math.sqrt(Math.pow(rightWrist.x - rightShoulder.x, 2) + Math.pow(rightWrist.y - rightShoulder.y, 2));

  const ankleSpread = Math.sqrt(
    Math.pow(rightAnkle.x - leftAnkle.x, 2) + Math.pow(rightAnkle.y - leftAnkle.y, 2)
  );

  const kneeBend =
    Math.abs(leftKnee.y - leftHip.y) + Math.abs(rightKnee.y - rightHip.y);

  const bodySymmetry = Math.abs(
    (leftShoulder.y - leftHip.y) - (rightShoulder.y - rightHip.y)
  );

  return {
    torsoAngle,
    shoulderWidth,
    wristMovement,
    ankleSpread,
    kneeBend,
    bodySymmetry,
    noseY: nose.y,
    shoulderMidY,
    hipMidY,
  };
}

function computeTemporalFeatures(featureBuffer: ReturnType<typeof extractFeatures>[]) {
  const valid = featureBuffer.filter(Boolean) as NonNullable<ReturnType<typeof extractFeatures>>[];
  if (valid.length < 10) return { oscillationRate: 0, velocityVariance: 0, symmetryVariance: 0, positionJitter: 0 };

  const torsoAngles = valid.map(f => f.torsoAngle);
  const wristMovements = valid.map(f => f.wristMovement);
  const bodySymmetries = valid.map(f => f.bodySymmetry);
  const noseYs = valid.map(f => f.noseY);

  let directionChanges = 0;
  for (let i = 2; i < torsoAngles.length; i++) {
    const d1 = torsoAngles[i - 1] - torsoAngles[i - 2];
    const d2 = torsoAngles[i] - torsoAngles[i - 1];
    if (d1 * d2 < 0) directionChanges++;
  }
  const oscillationRate = directionChanges / (torsoAngles.length - 2);

  const wristVelocities: number[] = [];
  for (let i = 1; i < wristMovements.length; i++) {
    wristVelocities.push(Math.abs(wristMovements[i] - wristMovements[i - 1]));
  }
  const meanWristVel = wristVelocities.reduce((a, b) => a + b, 0) / wristVelocities.length;
  const velocityVariance = wristVelocities.reduce((a, b) => a + Math.pow(b - meanWristVel, 2), 0) / wristVelocities.length;

  const meanSymmetry = bodySymmetries.reduce((a, b) => a + b, 0) / bodySymmetries.length;
  const symmetryVariance = bodySymmetries.reduce((a, b) => a + Math.pow(b - meanSymmetry, 2), 0) / bodySymmetries.length;

  const noseVelocities: number[] = [];
  for (let i = 1; i < noseYs.length; i++) {
    noseVelocities.push(Math.abs(noseYs[i] - noseYs[i - 1]));
  }
  const positionJitter = noseVelocities.reduce((a, b) => a + b, 0) / noseVelocities.length;

  return { oscillationRate, velocityVariance, symmetryVariance, positionJitter };
}

function cnnLstmInference(temporalFeatures: ReturnType<typeof computeTemporalFeatures>) {
  const { oscillationRate, velocityVariance, symmetryVariance, positionJitter } = temporalFeatures;

  const seizureScore = Math.min(1, (
    oscillationRate * 2.5 +
    velocityVariance * 8.0 +
    symmetryVariance * 5.0 +
    positionJitter * 3.0
  ));

  const stumbleScore = Math.min(1, (
    positionJitter * 4.0 +
    symmetryVariance * 3.0 +
    oscillationRate * 1.5 +
    velocityVariance * 2.0
  ));

  return {
    seizureScore: Math.round(seizureScore * 100) / 100,
    stumbleScore: Math.round(stumbleScore * 100) / 100,
  };
}

export function useSeizureDetection(enabled = true) {
  const [state, setState] = useState<SeizureDetectionState>({
    isReady: false,
    analysis: {
      seizureScore: 0,
      stumbleScore: 0,
      isSeizureDetected: false,
      isStumbleDetected: false,
      pattern: 'Normal',
      confidence: 0,
    },
    frameBufferSize: 0,
  });

  const frameBufferRef = useRef<PoseFrame[]>([]);
  const featureBufferRef = useRef<ReturnType<typeof extractFeatures>[]>([]);
  const cooldownRef = useRef<number>(0);

  useEffect(() => {
    if (enabled) {
      setState(prev => ({ ...prev, isReady: true }));
      console.log('[CNN-LSTM] Seizure/stumble pattern recognition ready');
    }
  }, [enabled]);

  const processPoseFrame = useCallback((
    landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>
  ) => {
    if (!enabled) return;

    const frame: PoseFrame = {
      timestamp: Date.now(),
      landmarks,
    };

    frameBufferRef.current.push(frame);
    if (frameBufferRef.current.length > BUFFER_SIZE) {
      frameBufferRef.current.shift();
    }

    const features = extractFeatures(landmarks);
    featureBufferRef.current.push(features);
    if (featureBufferRef.current.length > BUFFER_SIZE) {
      featureBufferRef.current.shift();
    }

    if (featureBufferRef.current.length < 15) {
      setState(prev => ({ ...prev, frameBufferSize: frameBufferRef.current.length }));
      return;
    }

    const now = Date.now();
    if (now < cooldownRef.current) return;

    const temporalFeatures = computeTemporalFeatures(featureBufferRef.current);
    const { seizureScore, stumbleScore } = cnnLstmInference(temporalFeatures);

    const isSeizureDetected = seizureScore >= SEIZURE_THRESHOLD;
    const isStumbleDetected = stumbleScore >= STUMBLE_THRESHOLD;

    let pattern = 'Normal';
    let confidence = 0;

    if (isSeizureDetected) {
      pattern = 'Seizure';
      confidence = seizureScore;
      cooldownRef.current = now + 10000;
    } else if (isStumbleDetected) {
      pattern = 'Stumble';
      confidence = stumbleScore;
      cooldownRef.current = now + 8000;
    }

    setState({
      isReady: true,
      analysis: {
        seizureScore,
        stumbleScore,
        isSeizureDetected,
        isStumbleDetected,
        pattern,
        confidence,
      },
      frameBufferSize: frameBufferRef.current.length,
    });
  }, [enabled]);

  const reset = useCallback(() => {
    frameBufferRef.current = [];
    featureBufferRef.current = [];
    cooldownRef.current = 0;
    setState({
      isReady: enabled,
      analysis: {
        seizureScore: 0,
        stumbleScore: 0,
        isSeizureDetected: false,
        isStumbleDetected: false,
        pattern: 'Normal',
        confidence: 0,
      },
      frameBufferSize: 0,
    });
  }, [enabled]);

  return {
    ...state,
    processPoseFrame,
    reset,
  };
}
