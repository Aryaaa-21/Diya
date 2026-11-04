import type { Quality } from '../state/store';

export const isCoarsePointer = (): boolean => window.matchMedia('(pointer: coarse)').matches;
export const isSmallScreen = (): boolean => window.innerWidth < 768;

/** Starting tier from cheap device signals; usePerformance refines it at runtime. */
export function initialQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 8;
  if (isSmallScreen() || cores <= 4 || memory <= 4) return isCoarsePointer() ? 'low' : 'medium';
  return 'high';
}
