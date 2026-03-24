import { useEffect, useRef, useState, useCallback } from 'react';
import { Pose, Results, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseDetectionResult {
  landmarks: PoseLandmark[] | null;
  isFallDetected: boolean;
  isPersonDetected: boolean;
  confidence: number;
  torsoAngle: number;
  bodyPosition: 'standing' | 'sitting' | 'lying' | 'unknown';
}

interface UsePoseDetectionOptions {
  onFallDetected?: () => void;
  onPoseUpdate?: (result: PoseDetectionResult) => void;
  fallThreshold?: number;
}

interface BodyMetrics {
  torsoAngle: number;
  shoulderY: number;
  hipY: number;
  noseY: number;
  bodyHeight: number;
  hipShoulderDist: number;
}

export function usePoseDetection(options: UsePoseDetectionOptions = {}) {
  const { onFallDetected, onPoseUpdate, fallThreshold = 45 } = options;
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPose, setCurrentPose] = useState<PoseDetectionResult>({
    landmarks: null,
    isFallDetected: false,
    isPersonDetected: false,
    confidence: 0,
    torsoAngle: 0,
    bodyPosition: 'unknown',
  });
  
  const fallDetectedRef = useRef(false);
  const lastFallTimeRef = useRef(0);
  const metricsHistoryRef = useRef<BodyMetrics[]>([]);
  const consecutiveFallFramesRef = useRef(0);
  const consecutiveStandFramesRef = useRef(0);

  const calculateBodyMetrics = useCallback((landmarks: PoseLandmark[]): BodyMetrics | null => {
    if (!landmarks || landmarks.length < 33) return null;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    const visibilityThreshold = 0.4;
    if (
      (leftShoulder.visibility || 0) < visibilityThreshold ||
      (rightShoulder.visibility || 0) < visibilityThreshold ||
      (leftHip.visibility || 0) < visibilityThreshold ||
      (rightHip.visibility || 0) < visibilityThreshold
    ) {
      return null;
    }

    const midShoulder = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
    };
    const midHip = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
    };

    const dx = midShoulder.x - midHip.x;
    const dy = midShoulder.y - midHip.y;
    const torsoAngle = Math.abs(Math.atan2(dx, -dy) * (180 / Math.PI));

    const hipShoulderDist = Math.sqrt(dx * dx + dy * dy);

    const ankleY = Math.max(
      (leftAnkle.visibility || 0) > 0.3 ? leftAnkle.y : 0,
      (rightAnkle.visibility || 0) > 0.3 ? rightAnkle.y : 0
    );
    const bodyHeight = ankleY > 0 ? Math.abs(ankleY - nose.y) : Math.abs(midHip.y - nose.y);

    return {
      torsoAngle,
      shoulderY: midShoulder.y,
      hipY: midHip.y,
      noseY: nose.y,
      bodyHeight,
      hipShoulderDist,
    };
  }, []);

  const detectFall = useCallback((landmarks: PoseLandmark[]): { isFall: boolean; position: 'standing' | 'sitting' | 'lying' | 'unknown' } => {
    const metrics = calculateBodyMetrics(landmarks);
    if (!metrics) return { isFall: false, position: 'unknown' };

    metricsHistoryRef.current.push(metrics);
    if (metricsHistoryRef.current.length > 15) {
      metricsHistoryRef.current.shift();
    }

    const { torsoAngle, shoulderY, hipY, noseY, bodyHeight, hipShoulderDist } = metrics;

    const isTorsoHorizontal = torsoAngle > fallThreshold;
    const isShouldersLow = shoulderY > 0.5;
    const isNoseLow = noseY > 0.55;
    const isHipsAndShouldersClose = Math.abs(hipY - shoulderY) < 0.12;
    const isSmallBodyHeight = bodyHeight < 0.25;
    const isHipShoulderCompressed = hipShoulderDist < 0.08;

    let fallScore = 0;

    if (isTorsoHorizontal) fallScore += 3;
    if (torsoAngle > 60) fallScore += 2;
    if (torsoAngle > 75) fallScore += 2;
    if (isShouldersLow) fallScore += 2;
    if (isNoseLow) fallScore += 1;
    if (isHipsAndShouldersClose) fallScore += 2;
    if (isSmallBodyHeight) fallScore += 1;
    if (isHipShoulderCompressed) fallScore += 1;

    if (metricsHistoryRef.current.length >= 5) {
      const recent = metricsHistoryRef.current.slice(-5);
      const older = metricsHistoryRef.current.slice(-10, -5);
      if (older.length > 0) {
        const recentAvgShoulderY = recent.reduce((s, m) => s + m.shoulderY, 0) / recent.length;
        const olderAvgShoulderY = older.reduce((s, m) => s + m.shoulderY, 0) / older.length;
        const yDrop = recentAvgShoulderY - olderAvgShoulderY;
        if (yDrop > 0.15) fallScore += 3;
        else if (yDrop > 0.08) fallScore += 1;
      }
    }

    const isFallFrame = fallScore >= 6;

    if (isFallFrame) {
      consecutiveFallFramesRef.current++;
      consecutiveStandFramesRef.current = 0;
    } else {
      consecutiveStandFramesRef.current++;
      if (consecutiveStandFramesRef.current > 5) {
        consecutiveFallFramesRef.current = 0;
      }
    }

    const confirmedFall = consecutiveFallFramesRef.current >= 3;

    let position: 'standing' | 'sitting' | 'lying' | 'unknown' = 'unknown';
    if (torsoAngle < 25 && shoulderY < 0.5) {
      position = 'standing';
    } else if (torsoAngle > 60 || (isHipsAndShouldersClose && isShouldersLow)) {
      position = 'lying';
    } else if (torsoAngle < 40 && shoulderY > 0.4) {
      position = 'sitting';
    }

    return { isFall: confirmedFall, position };
  }, [fallThreshold, calculateBodyMetrics]);

  const drawSkeleton = useCallback((
    ctx: CanvasRenderingContext2D,
    landmarks: PoseLandmark[],
    isFall: boolean
  ) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
    ctx.fillRect(0, 0, width, height);

    const pixelLandmarks = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height,
      z: lm.z,
      visibility: lm.visibility,
    }));

    const skeletonColor = isFall ? '#ef4444' : '#22c55e';
    const jointColor = isFall ? '#dc2626' : '#16a34a';

    ctx.strokeStyle = skeletonColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = skeletonColor;
    ctx.shadowBlur = 10;

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = pixelLandmarks[startIdx];
      const end = pixelLandmarks[endIdx];
      
      if (
        (start.visibility || 0) > 0.5 &&
        (end.visibility || 0) > 0.5
      ) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 15;
    pixelLandmarks.forEach((lm, idx) => {
      if ((lm.visibility || 0) > 0.5) {
        ctx.beginPath();
        const radius = [0, 11, 12, 23, 24, 13, 14, 25, 26].includes(idx) ? 8 : 5;
        ctx.arc(lm.x, lm.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = jointColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    ctx.shadowBlur = 0;
  }, []);

  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const isPersonDetected = results.poseLandmarks && results.poseLandmarks.length > 0;
    let isFallDetected = false;
    let confidence = 0;
    let torsoAngle = 0;
    let bodyPosition: 'standing' | 'sitting' | 'lying' | 'unknown' = 'unknown';

    if (isPersonDetected && results.poseLandmarks) {
      const landmarks = results.poseLandmarks as PoseLandmark[];
      
      confidence = landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length;
      
      const fallResult = detectFall(landmarks);
      isFallDetected = fallResult.isFall;
      bodyPosition = fallResult.position;

      const metrics = calculateBodyMetrics(landmarks);
      if (metrics) torsoAngle = metrics.torsoAngle;
      
      drawSkeleton(ctx, landmarks, isFallDetected);

      const result: PoseDetectionResult = {
        landmarks,
        isFallDetected,
        isPersonDetected: true,
        confidence,
        torsoAngle,
        bodyPosition,
      };
      
      setCurrentPose(result);
      onPoseUpdate?.(result);

      const now = Date.now();
      if (isFallDetected && !fallDetectedRef.current && now - lastFallTimeRef.current > 5000) {
        fallDetectedRef.current = true;
        lastFallTimeRef.current = now;
        onFallDetected?.();
        
        setTimeout(() => {
          fallDetectedRef.current = false;
        }, 3000);
      } else if (!isFallDetected) {
        fallDetectedRef.current = false;
      }
    } else {
      metricsHistoryRef.current = [];
      consecutiveFallFramesRef.current = 0;
      consecutiveStandFramesRef.current = 0;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No person detected', ctx.canvas.width / 2, ctx.canvas.height / 2);

      const result: PoseDetectionResult = {
        landmarks: null,
        isFallDetected: false,
        isPersonDetected: false,
        confidence: 0,
        torsoAngle: 0,
        bodyPosition: 'unknown',
      };
      
      setCurrentPose(result);
      onPoseUpdate?.(result);
    }
  }, [detectFall, drawSkeleton, onFallDetected, onPoseUpdate, calculateBodyMetrics]);

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const initializePose = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const pose = new Pose({
        locateFile: (file) => {
          return `/mediapipe/pose/${file}`;
        },
      });

      pose.setOptions({
        modelComplexity: isMobile ? 0 : 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults(onResults);

      await Promise.race([
        pose.initialize(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Model loading timed out. Please refresh and try again.')), 30000)
        ),
      ]);
      
      poseRef.current = pose;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize pose detection');
      setIsLoading(false);
    }
  }, [onResults, isMobile]);

  const startCamera = useCallback(async (videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => {
    videoRef.current = videoElement;
    canvasRef.current = canvasElement;

    metricsHistoryRef.current = [];
    consecutiveFallFramesRef.current = 0;
    consecutiveStandFramesRef.current = 0;

    if (!poseRef.current) {
      await initializePose();
    }

    if (!poseRef.current) {
      setError('Pose detection not initialized');
      return;
    }

    try {
      if (!videoElement.srcObject) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        videoElement.srcObject = stream;
      }

      await new Promise<void>((resolve) => {
        if (videoElement.readyState >= 2) {
          resolve();
        } else {
          videoElement.onloadeddata = () => resolve();
        }
      });

      let processing = false;
      const processFrame = async () => {
        if (poseRef.current && videoElement.readyState >= 2 && !processing) {
          processing = true;
          try {
            await poseRef.current.send({ image: videoElement });
          } catch (e) {
            console.warn('Frame processing error:', e);
          }
          processing = false;
        }
        rafRef.current = requestAnimationFrame(processFrame);
      };

      setIsRunning(true);
      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      console.error('Failed to start camera:', err);
      setError('Failed to access camera. Please allow camera permissions.');
    }
  }, [initializePose]);

  const startWithVideoSource = useCallback(async (
    videoElement: HTMLVideoElement,
    canvasElement: HTMLCanvasElement
  ) => {
    videoRef.current = videoElement;
    canvasRef.current = canvasElement;

    if (!poseRef.current) {
      await initializePose();
    }

    if (!poseRef.current) {
      setError('Pose detection not initialized');
      return;
    }

    const processFrame = async () => {
      if (poseRef.current && videoElement.readyState >= 2 && isRunning) {
        await poseRef.current.send({ image: videoElement });
      }
      if (isRunning) {
        requestAnimationFrame(processFrame);
      }
    };

    setIsRunning(true);
    processFrame();
  }, [initializePose, isRunning]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    metricsHistoryRef.current = [];
    consecutiveFallFramesRef.current = 0;
    consecutiveStandFramesRef.current = 0;
    setIsRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, [stopCamera]);

  return {
    isLoading,
    isRunning,
    error,
    currentPose,
    startCamera,
    startWithVideoSource,
    stopCamera,
    initializePose,
  };
}
