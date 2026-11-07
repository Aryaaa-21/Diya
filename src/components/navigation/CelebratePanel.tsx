import { useEffect } from 'react';
import { ignitePiece, requestFirework } from '../../fireworks/queue';
import { toggleShow } from '../../fireworks/show';
import { KINDS, KIND_ORDER, type FireworkKind } from '../../fireworks/types';
import { useAudio } from '../../hooks/useAudio';
import { useIdle } from '../../hooks/useIdle';
import { goToMode } from '../../animations/reveal';
import { GROUND_SPOTS } from '../../scene/layout';
import { setState, useExperience } from '../../state/store';
import { ModePanel } from './ModePanel';
import { Segmented } from './Segmented';

const PIECES = KIND_ORDER.map((value) => ({ value, label: KINDS[value].label }));

/** Walks the courtyard stands so repeated taps on "Light one" spread out. */
let nextSpot = 0;

function lightOne(kind: FireworkKind): void {
  if (KINDS[kind].ground) {
    const [x, z] = GROUND_SPOTS[nextSpot++ % GROUND_SPOTS.length];
    ignitePiece(kind, x, 0, z);
    return;
  }
  requestFirework({
    kind,
    x: (Math.random() - 0.5) * 11,
    y: 2.9 + Math.random() * 1.5,
    z: -13,
  });
}

/**
 * The only chrome in Celebrate mode: which piece is armed, one way to light it
 * without aiming, the show, and volume. It fades back while you watch and
 * returns on the first movement — the brief's "minimise while watching".
 */
export function CelebratePanel({ open }: { open: boolean }) {
  const kind = useExperience((s) => s.firework);
  const showRunning = useExperience((s) => s.showRunning);
  const { volume, setVolume, soundOn } = useAudio();
  const idle = useIdle(6000, open);

  // The desktop cursor reads as "armed" while a piece is waiting to be lit.
  useEffect(() => {
    document.documentElement.classList.toggle('is-celebrating', open);
    return () => document.documentElement.classList.remove('is-celebrating');
  }, [open]);

  return (
    <div className="celebrate-shell" data-idle={idle ? 'true' : 'false'}>
      <ModePanel open={open} label="04 / Celebrate" title="Light the night">
        <Segmented
          label="Firecracker"
          value={kind}
          options={PIECES}
          onChange={(value) => setState({ firework: value })}
        />
        <p className="text-step--1 italic leading-snug text-ink-2">{KINDS[kind].hint}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ember-button ember-button--small" onClick={() => lightOne(kind)}>
            Light one
          </button>
          <button
            type="button"
            className="ember-button ember-button--small"
            aria-pressed={showRunning}
            onClick={() => toggleShow(!showRunning)}
          >
            {showRunning ? 'Stop the show' : 'Play the show'}
          </button>
        </div>
        <label className="flex items-center gap-3">
          <span className="mono-label whitespace-nowrap">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volume}
            disabled={!soundOn}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="ember-range"
            aria-label="Volume"
          />
        </label>
        <button type="button" className="text-link self-start" onClick={() => goToMode('ambient')}>
          Enter ambient mode
        </button>
      </ModePanel>
    </div>
  );
}
