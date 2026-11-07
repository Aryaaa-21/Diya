import { useRef } from 'react';
import { playIgnition } from '../../animations/ignition';
import { useExperience } from '../../state/store';

/** The opening line and the single action. Disappears once ignition starts. */
export function IntroOverlay() {
  const phase = useExperience((s) => s.phase);
  const started = useRef(false);
  const visible = phase === 'dark';
  const present = phase === 'intro' || phase === 'dark';

  const light = () => {
    if (started.current) return;
    started.current = true;
    playIgnition();
  };

  return (
    <section
      aria-label="Introduction"
      aria-hidden={!present}
      className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-between px-6 py-[max(2rem,env(safe-area-inset-top))] text-center"
    >
      <header className="intro-brand flex flex-col items-center gap-2 pt-4" data-open={present}>
        <p className="mono-label tracking-[0.42em] text-ink-2">The Light Within</p>
        <p className="font-display text-step--1 italic text-ink-muted">A Digital Diwali Experience</p>
      </header>

      <div className="intro-cta flex flex-col items-center gap-8 pb-[9vh] md:pb-[11vh]" data-open={visible}>
        <h1 className="display max-w-[20ch] text-step-3 text-ink md:text-step-4">
          Every celebration begins with a single light.
        </h1>
        <button
          type="button"
          className="ember-button ember-button--breathe pointer-events-auto"
          disabled={!visible}
          tabIndex={visible ? 0 : -1}
          onClick={light}
        >
          Light the diya
        </button>
      </div>
    </section>
  );
}
