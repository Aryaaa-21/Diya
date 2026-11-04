/**
 * Organic flame flicker: a few incommensurate sines plus a slow "gust" that
 * occasionally dips the flame. Returns ~1, ranging roughly 0.8..1.15.
 */
export function flicker(t: number, phase = 0, motion = 1): number {
  const fast = Math.sin(t * 7.3 + phase) * 0.045 + Math.sin(t * 13.7 + phase * 2.1) * 0.03 + Math.sin(t * 23.1 + phase * 0.7) * 0.018;
  const gust = Math.max(0, Math.sin(t * 0.61 + phase * 1.3) * Math.sin(t * 1.37 + phase)) * -0.12;
  return 1 + (fast + gust) * motion;
}

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Frame-rate independent exponential smoothing factor. */
export const damp = (lambda: number, dt: number): number => 1 - Math.exp(-lambda * dt);
