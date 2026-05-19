import { useCallback } from 'react';
import confetti from 'canvas-confetti';

export function useConfetti() {
  return useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#147A4F', '#47AF87', '#75C3A5', '#FFC107'], // brand-500/400/300, amber-400
    });
  }, []);
}
