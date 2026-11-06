import { useEffect, useState } from 'react';
import { useExperience } from '../../state/store';
import { DiyaMark } from './DiyaMark';

const FADE_MS = 1400;
const TICK_MS = 120;

/**
 * Covers the canvas while the 3D chunk downloads and shaders compile.
 * The scene is procedural, so there are no byte counts to report: the bar eases
 * toward 90% and completes when the scene signals it has rendered a frame.
 */
export function Loader() {
  const sceneReady = useExperience((s) => s.sceneReady);
  const [progress, setProgress] = useState(6);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (sceneReady) return;
    const id = window.setInterval(() => setProgress((p) => p + (90 - p) * 0.08), TICK_MS);
    return () => window.clearInterval(id);
  }, [sceneReady]);

  useEffect(() => {
    if (!sceneReady) return;
    const id = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(id);
  }, [sceneReady]);

  if (gone) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-night"
      style={{
        opacity: sceneReady ? 0 : 1,
        transition: `opacity ${FADE_MS}ms var(--ease-cinema)`,
        pointerEvents: sceneReady ? 'none' : 'auto',
      }}
      role="status"
      aria-label="Preparing the light"
    >
      <DiyaMark size={44} />
      <div className="flex flex-col items-center gap-2">
        <p className="display text-step-1 tracking-[0.12em] text-ink-2">The Light Within</p>
        <p className="font-display text-step-0 italic text-ink-muted">Preparing the light</p>
      </div>
      <div className="h-px w-28 overflow-hidden bg-maroon" aria-hidden="true">
        <div
          className="h-full bg-gold"
          style={{
            width: `${sceneReady ? 100 : progress}%`,
            transition: 'width 600ms var(--ease-cinema)',
          }}
        />
      </div>
    </div>
  );
}
