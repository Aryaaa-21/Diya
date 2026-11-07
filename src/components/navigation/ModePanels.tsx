import { useState } from 'react';
import { Vector3 } from 'three';
import { setLamps } from '../../animations/ignition';
import { goToMode, setGlow, toggleFlameView } from '../../animations/reveal';
import { launchFirework } from '../../fireworks/queue';
import { SHAPE_ORDER, SHAPES } from '../../fireworks/shells';
import { ACCENTS } from '../rangoli/rangoliMaterial';
import { KINDS } from '../../fireworks/types';
import { setState, useExperience, type FireworkChoice, type RangoliAccent, type RangoliPattern, type RangoliSymmetry } from '../../state/store';
import { MessageForm } from '../greeting/MessageForm';
import { CelebratePanel } from './CelebratePanel';
import { ModePanel } from './ModePanel';
import { Segmented } from './Segmented';

const PATTERNS: { value: RangoliPattern; label: string }[] = [
  { value: 0, label: 'Lotus' },
  { value: 1, label: 'Chakra' },
  { value: 2, label: 'Mandala' },
];
const SYMMETRIES: { value: RangoliSymmetry; label: string }[] = [
  { value: 8, label: '8' },
  { value: 12, label: '12' },
  { value: 16, label: '16' },
];
const ACCENT_OPTIONS = (Object.keys(ACCENTS) as RangoliAccent[]).map((key) => ({
  value: key,
  label: ACCENTS[key].label,
  swatch: ACCENTS[key].color,
}));
const SHELLS: { value: FireworkChoice; label: string }[] = [
  ...SHAPE_ORDER.map((value) => ({ value, label: SHAPES[value].label })),
  { value: 'random', label: 'Mix' },
];
const GLOW = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Warm' },
  { value: 3, label: 'Bright' },
];

function DiyaPanel({ open }: { open: boolean }) {
  const lampsLit = useExperience((s) => s.lampsLit);
  const glowLevel = useExperience((s) => s.glowLevel);
  const [close, setClose] = useState(false);

  return (
    <ModePanel open={open} label="01 / The Diya" title="Tend the flame">
      <Segmented label="Glow" value={glowLevel} options={GLOW} onChange={setGlow} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ember-button ember-button--small"
          aria-pressed={lampsLit}
          onClick={() => {
            setState({ lampsLit: !lampsLit });
            setLamps(!lampsLit);
          }}
        >
          {lampsLit ? 'Rest the lamps' : 'Light the lamps'}
        </button>
        <button
          type="button"
          className="ember-button ember-button--small"
          aria-pressed={close}
          onClick={() => {
            setClose(!close);
            toggleFlameView(!close);
          }}
        >
          {close ? 'Step back' : 'Watch the flame'}
        </button>
      </div>
      <button type="button" className="text-link self-start" onClick={() => goToMode('ambient')}>
        Enter ambient mode
      </button>
    </ModePanel>
  );
}

function RangoliPanel({ open }: { open: boolean }) {
  const pattern = useExperience((s) => s.rangoliPattern);
  const symmetry = useExperience((s) => s.rangoliSymmetry);
  const accent = useExperience((s) => s.rangoliAccent);
  return (
    <ModePanel open={open} label="02 / Rangoli" title="Create your rangoli">
      <Segmented label="Pattern" value={pattern} options={PATTERNS} onChange={(v) => setState({ rangoliPattern: v })} />
      <Segmented label="Symmetry" value={symmetry} options={SYMMETRIES} onChange={(v) => setState({ rangoliSymmetry: v })} />
      <Segmented label="Accent" value={accent} options={ACCENT_OPTIONS} onChange={(v) => setState({ rangoliAccent: v })} swatches />
    </ModePanel>
  );
}

function SkyHint({ open }: { open: boolean }) {
  return (
    <section
      aria-label="Sky"
      inert={!open}
      data-open={open}
      className="mode-panel pointer-events-none fixed inset-x-0 top-[16vh] z-20 flex flex-col items-center gap-2 px-6 text-center"
    >
      <p className="mono-label text-gold/80">03 / The sky</p>
      <p className="display text-step-2 italic text-ink-2">Touch the sky to send up a light.</p>
    </section>
  );
}

/** A random point in the upper sky, matching the range a click can reach. */
function skyPoint() {
  return new Vector3((Math.random() - 0.5) * 14, 3.6 + Math.random() * 4.2, -13);
}

function SkyPanel({ open }: { open: boolean }) {
  const shape = useExperience((s) => s.fireworkShape);
  return (
    <ModePanel open={open} label="Shell type" title="Choose a shell">
      <Segmented label="Shape" value={shape} options={SHELLS} onChange={(v) => setState({ fireworkShape: v })} />
      <button type="button" className="ember-button ember-button--small self-start" onClick={() => launchFirework(skyPoint(), 0.95)}>
        Send one up
      </button>
    </ModePanel>
  );
}

/** Celebrate's one line of instruction, centred above the courtyard. */
function CelebrateHint({ open }: { open: boolean }) {
  const kind = useExperience((s) => s.firework);
  return (
    <section
      aria-label="How to light a firecracker"
      inert={!open}
      data-open={open}
      className="mode-panel pointer-events-none fixed inset-x-0 top-[11vh] z-20 flex flex-col items-center gap-2 px-6 text-center"
    >
      <p className="display text-step-2 italic text-ink-2">
        {KINDS[kind].ground ? 'Touch the courtyard to set it down.' : 'Touch the sky to send it up.'}
      </p>
    </section>
  );
}

export function ModePanels() {
  const mode = useExperience((s) => s.mode);
  return (
    <>
      <DiyaPanel open={mode === 'diya'} />
      <RangoliPanel open={mode === 'rangoli'} />
      <SkyHint open={mode === 'sky'} />
      <SkyPanel open={mode === 'sky'} />
      <CelebratePanel open={mode === 'celebrate'} />
      <CelebrateHint open={mode === 'celebrate'} />
      <MessageForm open={mode === 'message'} />
    </>
  );
}
