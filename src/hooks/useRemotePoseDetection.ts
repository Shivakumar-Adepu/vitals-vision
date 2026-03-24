import { useEffect, useRef, useState, useCallback } from 'react';
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import type { PoseLandmark } from '@/hooks/usePoseDetection';

interface RemotePoseState {
  isPersonDetected: boolean;
  bodyPosition: 'standing' | 'sitting' | 'lying' | 'unknown';
  confidence: number;
  torsoAngle: number;
  isFallDetected: boolean;
  landmarks: PoseLandmark[] | null;
}

export function useRemotePoseDetection(enabled: boolean) {
  const poseRef = useRef<Pose | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenImgRef = useRef<HTMLImageElement | null>(null);
  const processingRef = useRef(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const consecutiveFallFramesRef = useRef(0);
  const consecutiveStandFramesRef = useRef(0);
  const metricsHistoryRef = useRef<{ torsoAngle: number; shoulderY: number; hipY: number }[]>([]);

  const [poseState, setPoseState] = useState<RemotePoseState>({
    isPersonDetected: false,
    bodyPosition: 'unknown',
    confidence: 0,
    torsoAngle: 0,
    isFallDetected: false,
    landmarks: null,
  });

  const drawSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmark[],
    isFall: boolean
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, width, height);

    const skeletonColor = isFall ? '#ef4444' : '#22c55e';
    const jointColor = isFall ? '#dc2626' : '#16a34a';

    ctx.strokeStyle = skeletonColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = skeletonColor;
    ctx.shadowBlur = 12;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if ((start.visibility || 0) > 0.5 && (end.visibility || 0) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(start.x * width, start.y * height);
        ctx.lineTo(end.x * width, end.y * height);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 15;
    landmarks.forEach((lm, idx) => {
      if ((lm.visibility || 0) > 0.5) {
        ctx.beginPath();
        const radius = [0, 11, 12, 23, 24, 13, 14, 25, 26].includes(idx) ? 7 : 4;
        ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
        ctx.fillStyle = jointColor;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('33 Key Points • MediaPipe Pose', 8, height - 8);
  }, []);

  const analyzePose = useCallback((landmarks: PoseLandmark[]) => {
    if (landmarks.length < 33) return { isFall: false, position: 'unknown' as const, torsoAngle: 0 };

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    const midShoulder = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const midHip = { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2 };

    const dx = midShoulder.x - midHip.x;
    const dy = midShoulder.y - midHip.y;
    const torsoAngle = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));

    metricsHistoryRef.current.push({ torsoAngle, shoulderY: midShoulder.y, hipY: midHip.y });
    if (metricsHistoryRef.current.length > 15) metricsHistoryRef.current.shift();

    const isTorsoHorizontal = torsoAngle > 45;
    const isShouldersLow = midShoulder.y > 0.5;
    const isHipsAndShouldersClose = Math.abs(midHip.y - midShoulder.y) < 0.12;

    let fallScore = 0;
    if (isTorsoHorizontal) fallScore += 3;
    if (torsoAngle > 60) fallScore += 2;
    if (torsoAngle > 75) fallScore += 2;
    if (isShouldersLow) fallScore += 2;
    if (isHipsAndShouldersClose) fallScore += 2;

    const isFallFrame = fallScore >= 6;

    if (isFallFrame) {
      consecutiveFallFramesRef.current++;
      consecutiveStandFramesRef.current = 0;
    } else {
      consecutiveStandFramesRef.current++;
      if (consecutiveStandFramesRef.current > 5) consecutiveFallFramesRef.current = 0;
    }

    let position: 'standing' | 'sitting' | 'lying' | 'unknown' = 'unknown';
    if (torsoAngle < 25 && midShoulder.y < 0.5) position = 'standing';
    else if (torsoAngle > 60 || (isHipsAndShouldersClose && isShouldersLow)) position = 'lying';
    else if (torsoAngle < 40 && midShoulder.y > 0.4) position = 'sitting';

    return {
      isFall: consecutiveFallFramesRef.current >= 3,
      position,
      torsoAngle,
    };
  }, []);

  const initializePose = useCallback(async () => {
    if (poseRef.current || isLoading) return;
    setIsLoading(true);

    try {
      const pose = new Pose({
        locateFile: (file) => `/mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (results.poseLandmarks && results.poseLandmarks.length > 0) {
          const landmarks = results.poseLandmarks as PoseLandmark[];
          const confidence = landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;
          const analysis = analyzePose(landmarks);

          drawSkeleton(ctx, landmarks, analysis.isFall);

          setPoseState({
            isPersonDetected: true,
            bodyPosition: analysis.position,
            confidence,
            torsoAngle: analysis.torsoAngle,
            isFallDetected: analysis.isFall,
            landmarks,
          });
        } else {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('No person detected in frame', ctx.canvas.width / 2, ctx.canvas.height / 2);

          setPoseState({
            isPersonDetected: false,
            bodyPosition: 'unknown',
            confidence: 0,
            torsoAngle: 0,
            isFallDetected: false,
            landmarks: null,
          });
        }
        processingRef.current = false;
      });

      await Promise.race([
        pose.initialize(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000)),
      ]);

      poseRef.current = pose;
      setIsModelLoaded(true);
    } catch (err) {
      console.error('[RemotePose] Failed to initialize:', err);
    } finally {
      setIsLoading(false);
    }
  }, [analyzePose, drawSkeleton, isLoading]);

  useEffect(() => {
    if (!poseRef.current && !isLoading) {
      initializePose();
    }
  }, [initializePose, isLoading]);

  const processFrame = useCallback((frameDataUrl: string) => {
    if (!poseRef.current || processingRef.current || !isModelLoaded) return;

    processingRef.current = true;

    if (!hiddenImgRef.current) {
      hiddenImgRef.current = new Image();
      hiddenImgRef.current.crossOrigin = 'anonymous';
    }

    const img = hiddenImgRef.current;
    img.onload = async () => {
      try {
        if (poseRef.current) {
          await poseRef.current.send({ image: img });
        }
      } catch {
        processingRef.current = false;
      }
    };
    img.onerror = () => {
      processingRef.current = false;
    };
    img.src = frameDataUrl;
  }, [isModelLoaded]);

  const setCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    canvasRef.current = canvas;
  }, []);

  useEffect(() => {
    return () => {
      if (poseRef.current) {
        poseRef.current.close();
        poseRef.current = null;
      }
      if (hiddenImgRef.current) {
        hiddenImgRef.current.onload = null;
        hiddenImgRef.current.onerror = null;
        hiddenImgRef.current.src = '';
        hiddenImgRef.current = null;
      }
      processingRef.current = false;
    };
  }, []);

  return {
    processFrame,
    setCanvas,
    isModelLoaded,
    isLoading,
    poseState,
  };
}
