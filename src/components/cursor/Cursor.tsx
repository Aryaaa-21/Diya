import { useEffect, useRef } from 'react';
import { pointer } from '../../animations/world';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { isCoarsePointer } from '../../utils/device';
import { damp } from '../../utils/flicker';
import { SparkleTrail } from './sparkles';

const WARM_RADIUS = 220;
/** Below this, in CSS pixels, the ring has arrived and the loop can rest. */
const SETTLED = 0.05;
/**
 * How quickly each layer catches up, per second. At a normal hand speed the
 * ring sits a few pixels behind the pointer — close enough to feel attached —
 * but because the easing is proportional to speed it still draws out behind a
 * fast flick, which is where the character lives. It also hides a dropped
 * frame, which a pinned ring cannot. The glow is slow on purpose: the warmth
 * blooming a beat behind is what gives the cursor depth.
 */
const RING_FOLLOW = 90;
const GLOW_FOLLOW = 14;

/**
 * Desktop only: a small gold ring that follows the pointer, a faint warm glow
 * that grows as it nears the flame, and a wake of sparks behind both. Writes
 * styles directly; no React renders. The loop parks itself once the ring has
 * caught up and the flame has stopped moving, so a still pointer costs nothing.
 *
 * The ring's easing is deliberate, not latency: it is what makes the cursor
 * feel like it is being drawn along rather than pinned to the mouse. The sparks
 * are spawned from the raw pointer position and own no part of that loop.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const enabled = typeof window !== 'undefined' && !isCoarsePointer();

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-cursor');
    // Sparks are decorative motion, so reduced motion simply goes without them.
    const trail = reducedMotion ? null : new SparkleTrail();
    const target = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    const glowPos = { x: -100, y: -100 };
    let frame = 0;
    let last = performance.now();
    let overDom = false;
    let interactive = false;
    let lastInteractive = false;
    let appliedScale = -1;
    let lastWarmth = -1;
    let lastFlameX = 0;

    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      const el = event.target as Element | null;
      overDom = Boolean(el?.closest('button, a, input, textarea, label'));
      trail?.move(event.clientX, event.clientY, event.timeStamp);
    };
    const onLeave = () => trail?.reset();
    const tick = (now: number) => {
      // Frame-rate independent, so the follow feels the same at 60Hz and 144Hz.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Buttons and scene hotspots both make the ring open up.
      interactive = overDom || pointer.hotspot;
      const dx = target.x - ringPos.x;
      const dy = target.y - ringPos.y;
      const flameX = pointer.flameScreen.x;
      const still =
        Math.abs(dx) < SETTLED &&
        Math.abs(dy) < SETTLED &&
        Math.abs(target.x - glowPos.x) < SETTLED &&
        Math.abs(target.y - glowPos.y) < SETTLED &&
        interactive === lastInteractive &&
        Math.abs(flameX - lastFlameX) < 0.5;

      if (!still) {
        const kRing = damp(RING_FOLLOW, dt);
        ringPos.x += dx * kRing;
        ringPos.y += dy * kRing;
        const kGlow = damp(GLOW_FOLLOW, dt);
        glowPos.x += (target.x - glowPos.x) * kGlow;
        glowPos.y += (target.y - glowPos.y) * kGlow;
        lastInteractive = interactive;
        lastFlameX = flameX;
        if (ring.current) {
          // Position and scale are separate properties so the stylesheet can
          // ease the hover pop without ever easing the position.
          ring.current.style.translate = `${ringPos.x}px ${ringPos.y}px`;
          const scale = interactive ? 1.8 : 1;
          if (scale !== appliedScale) {
            ring.current.style.scale = String(scale);
            appliedScale = scale;
          }
        }
        const d = Math.hypot(glowPos.x - flameX, glowPos.y - pointer.flameScreen.y);
        const warmth = Math.max(0, 1 - d / WARM_RADIUS);
        const opacity = warmth * warmth * 0.9;
        if (glow.current) {
          glow.current.style.transform = `translate3d(${glowPos.x}px, ${glowPos.y}px, 0)`;
          // Only touch opacity when it actually changes: it is the expensive one.
          if (Math.abs(opacity - lastWarmth) > 0.004) {
            glow.current.style.opacity = String(opacity);
            lastWarmth = opacity;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
      trail?.destroy();
    };
  }, [enabled, reducedMotion]);

  if (!enabled) return null;
  return (
    <>
      <div ref={glow} className="cursor-glow" aria-hidden="true" />
      <div ref={ring} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
