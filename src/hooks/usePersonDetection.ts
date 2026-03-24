import { useState, useEffect, useRef, useCallback } from 'react';

interface DetectedPerson {
  bbox: [number, number, number, number];
  score: number;
  class: string;
}

interface PersonDetectionState {
  isModelLoaded: boolean;
  isLoading: boolean;
  detectedPersons: DetectedPerson[];
  personCount: number;
  error: string | null;
}

let cocoSsdModel: any = null;
let modelLoadPromise: Promise<any> | null = null;

async function loadCocoSsdModel() {
  if (cocoSsdModel) return cocoSsdModel;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();

      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      cocoSsdModel = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });
      console.log('[COCO-SSD] Model loaded successfully (YOLO-equivalent person detection)');
      return cocoSsdModel;
    } catch (error) {
      console.error('[COCO-SSD] Failed to load model:', error);
      modelLoadPromise = null;
      throw error;
    }
  })();

  return modelLoadPromise;
}

export function usePersonDetection(videoRef: React.RefObject<HTMLVideoElement | null>, enabled = true) {
  const [state, setState] = useState<PersonDetectionState>({
    isModelLoaded: false,
    isLoading: false,
    detectedPersons: [],
    personCount: 0,
    error: null,
  });

  const animFrameRef = useRef<number>(0);
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    setState(prev => ({ ...prev, isLoading: true }));

    loadCocoSsdModel()
      .then((model) => {
        if (cancelled) return;
        modelRef.current = model;
        setState(prev => ({ ...prev, isModelLoaded: true, isLoading: false }));
      })
      .catch((err) => {
        if (cancelled) return;
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Failed to load COCO-SSD model: ${err.message}`,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const detectPersons = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;

    if (!video || !model || video.readyState < 2) return;

    try {
      const predictions = await model.detect(video);

      const persons: DetectedPerson[] = predictions
        .filter((p: any) => p.class === 'person')
        .map((p: any) => ({
          bbox: p.bbox as [number, number, number, number],
          score: p.score,
          class: p.class,
        }));

      setState(prev => ({
        ...prev,
        detectedPersons: persons,
        personCount: persons.length,
      }));
    } catch {
      // ignore detection frame errors
    }
  }, [videoRef]);

  const drawDetections = useCallback(
    (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      state.detectedPersons.forEach((person) => {
        const [x, y, width, height] = person.bbox;

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        const label = `Person ${Math.round(person.score * 100)}%`;
        const textWidth = ctx.measureText(label).width;
        ctx.fillRect(x, y - 20, textWidth + 8, 20);
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 4, y - 5);
      });
    },
    [state.detectedPersons]
  );

  useEffect(() => {
    if (!state.isModelLoaded || !enabled) return;

    let running = true;

    const loop = async () => {
      if (!running) return;
      await detectPersons();
      animFrameRef.current = window.setTimeout(() => {
        if (running) loop();
      }, 500);
    };

    loop();

    return () => {
      running = false;
      clearTimeout(animFrameRef.current);
    };
  }, [state.isModelLoaded, enabled, detectPersons]);

  return {
    ...state,
    detectPersons,
    drawDetections,
  };
}
