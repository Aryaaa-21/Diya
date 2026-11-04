import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { getState, setState, type Quality } from '../state/store';

const WINDOW_S = 1.2;
const LOW_FPS = 48;
/** Consecutive slow windows before stepping down a tier. */
const STRIKES = 2;
const DOWNGRADE: Record<Quality, Quality | null> = { high: 'medium', medium: 'low', low: null };

/**
 * Device pixel ratio caps. This is the single biggest lever on fill rate: the
 * scene is soft and dark, so 1.5x reads as sharp as 2x while costing 44% fewer
 * fragments, and the rangoli's and glows' fragment shaders dominate the frame.
 */
export const DPR_BY_QUALITY: Record<Quality, [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: [0.7, 1],
};

/**
 * Measures real frame times and steps quality down (never up, to avoid
 * oscillating) when the device can't hold ~60fps. Hidden tabs and the first
 * seconds of shader compilation are ignored.
 */
export function usePerformance(): void {
  const setDpr = useThree((s) => s.setDpr);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const strikes = useRef(0);
  const warmup = useRef(3);
  const statsAt = useRef(0);

  useEffect(() => {
    const reset = () => {
      frames.current = 0;
      elapsed.current = 0;
      warmup.current = 1;
    };
    document.addEventListener('visibilitychange', reset);
    return () => document.removeEventListener('visibilitychange', reset);
  }, []);

  const gl = useThree((s) => s.gl);

  useFrame(({ clock }, dt) => {
    // Development read-out, four times a second: allocating this every frame
    // would be its own source of GC pauses.
    if (import.meta.env.DEV && clock.elapsedTime - statsAt.current > 0.25) {
      statsAt.current = clock.elapsedTime;
      const { render, memory, programs } = gl.info;
      (window as Window & { __stats?: object }).__stats = {
        calls: render.calls,
        triangles: render.triangles,
        points: render.points,
        geometries: memory.geometries,
        textures: memory.textures,
        programs: programs?.length,
        quality: getState().quality,
        dpr: gl.getPixelRatio(),
        fps: Math.round(1 / Math.max(dt, 1e-3)),
      };
    }
    // Ignore long stalls (tab switch, GC): they say nothing about steady-state cost.
    if (dt > 0.25) return;
    if (warmup.current > 0) {
      warmup.current -= dt;
      return;
    }
    frames.current += 1;
    elapsed.current += dt;
    if (elapsed.current < WINDOW_S) return;

    const fps = frames.current / elapsed.current;
    frames.current = 0;
    elapsed.current = 0;
    strikes.current = fps < LOW_FPS ? strikes.current + 1 : 0;
    if (strikes.current < STRIKES) return;

    strikes.current = 0;
    const next = DOWNGRADE[getState().quality];
    if (!next) return;
    setState({ quality: next });
    const [min, max] = DPR_BY_QUALITY[next];
    setDpr(Math.min(max, Math.max(min, window.devicePixelRatio)));
    warmup.current = 2;
  });
}
