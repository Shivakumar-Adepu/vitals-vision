import { useCallback, useRef } from 'react';

export function useFallAlert() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);

  const playAlertSound = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;

      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(880, now, 0.15);
      playTone(660, now + 0.18, 0.15);
      playTone(880, now + 0.36, 0.15);
      playTone(660, now + 0.54, 0.15);
      playTone(880, now + 0.72, 0.25);

      setTimeout(() => {
        isPlayingRef.current = false;
      }, 1200);
    } catch (e) {
      console.warn('Could not play alert sound:', e);
      isPlayingRef.current = false;
    }
  }, []);

  const vibrateDevice = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  }, []);

  const triggerFallAlert = useCallback(() => {
    playAlertSound();
    vibrateDevice();
  }, [playAlertSound, vibrateDevice]);

  return { triggerFallAlert, playAlertSound, vibrateDevice };
}
