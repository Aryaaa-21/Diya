import { useEffect, useRef, useState } from 'react';
import { goToMode } from '../../animations/reveal';
import { launchFirework } from '../../fireworks/queue';
import { useExperience } from '../../state/store';

const FIREWORK_GAP_MS = 22000;
const HINT_MS = 3500;

/**
 * Ambient mode removes the interface. A quiet "leave" hint appears on any
 * movement or key and fades again; Escape also exits. Occasional fireworks.
 */
export function AmbientExit() {
  const mode = useExperience((s) => s.mode);
  const active = mode === 'ambient';
  const [hint, setHint] = useState(true);
  const timer = useRef(0);

  useEffect(() => {
    if (!active) return;
    const wake = () => {
      setHint(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setHint(false), HINT_MS);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') goToMode('diya');
      else wake();
    };
    wake();
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('keydown', onKey);
    const fireworks = window.setInterval(() => launchFirework(undefined, 0.8), FIREWORK_GAP_MS);
    return () => {
      window.clearTimeout(timer.current);
      window.clearInterval(fireworks);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  return (
    <div className="chrome-fade fixed inset-x-0 top-6 z-30 flex justify-center" data-hidden={!active || !hint} inert={!active}>
      <button type="button" className="text-link" onClick={() => goToMode('diya')}>
        Leave ambient mode
      </button>
    </div>
  );
}
