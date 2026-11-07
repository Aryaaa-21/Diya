import type { FireworkShape, Quality } from '../state/store';

/**
 * The six pieces you can light. Ground pieces (anar, chakri, phuljhadi) burn in
 * the courtyard at the diya's scale; the aerial pieces (rocket, shell, cake)
 * happen far out over the rooftops, so the two groups use different gravity and
 * particle sizes — see GROUND_GRAVITY / SKY_GRAVITY below.
 */
export type FireworkKind = 'anar' | 'rocket' | 'chakri' | 'phuljhadi' | 'shell' | 'cake';

export interface KindSpec {
  label: string;
  /** One line under the selector, and what a tap will do. */
  hint: string;
  /** Ground pieces are placed on the floor; aerial pieces fly from the far dark. */
  ground: boolean;
}

export const KINDS: Record<FireworkKind, KindSpec> = {
  anar: { label: 'Anar', hint: 'A fountain that swells, then settles', ground: true },
  chakri: { label: 'Chakri', hint: 'Spins up, throws sparks, winds down', ground: true },
  phuljhadi: { label: 'Phuljhadi', hint: 'A hand sparkler, close and bright', ground: true },
  rocket: { label: 'Rocket', hint: 'Fuse, launch, trail, burst', ground: false },
  shell: { label: 'Aerial shell', hint: 'A full cinematic sky burst', ground: false },
  cake: { label: 'Multi-shot', hint: 'Four bursts, then the big one', ground: false },
};

export const KIND_ORDER: readonly FireworkKind[] = ['anar', 'rocket', 'chakri', 'phuljhadi', 'shell', 'cake'];

/** One queued ignition. The scene drains these each frame. */
export interface FireworkRequest {
  kind: FireworkKind;
  /** Where it happens: the break point for aerials, the spot on the floor otherwise. */
  x: number;
  y: number;
  z: number;
  /** Aerial shells only: which pattern to break into. */
  shape?: FireworkShape;
  /** Multiplier on the burst size, for the cinematic timelines' smaller bursts. */
  scale?: number;
  /** Force a colour family; otherwise the shell picks from its own. */
  palette?: PaletteName;
  /** Skip the minimum gap between ignitions (scripted moments only). */
  force?: boolean;
}

/** Render modes understood by the particle shader. Keep in sync with the GLSL. */
export const MODE = {
  spark: 0,
  twinkle: 1,
  flash: 2,
  ember: 3,
  smoke: 4,
  head: 5,
} as const;

/**
 * Hard ceilings, per §13/§14 of the brief. The pool is allocated once at this
 * size and never grows; a spawn that doesn't fit wraps and overwrites the
 * oldest particles, which is also the "prioritise the newest effect" rule.
 */
export interface Budget {
  /** Pool size: the absolute maximum particles alive at once. */
  particles: number;
  /** Maximum pieces burning at once. */
  effects: number;
  /** Scales every emitter's particle count. */
  density: number;
  /** Trail chains behind burst sparks (0 disables the layer). */
  trail: number;
  /** Draw the faint smoke/glow layer. */
  smoke: boolean;
  /** Secondary crackle bursts inside a shell. */
  secondary: boolean;
  /** Concurrent synthesised sounds. */
  voices: number;
}

export const BUDGETS: Record<Quality, Budget> = {
  high: { particles: 16000, effects: 8, density: 1, trail: 3, smoke: true, secondary: true, voices: 8 },
  medium: { particles: 8000, effects: 6, density: 0.62, trail: 1, smoke: true, secondary: true, voices: 6 },
  low: { particles: 3600, effects: 4, density: 0.34, trail: 0, smoke: false, secondary: false, voices: 4 },
};

/**
 * Real gravity (½g, since the shader's fall term is g·t²) for the courtyard
 * pieces: their sparks live under a second, so a true 9.81 reads correctly and
 * keeps them inside the rangoli.
 */
export const GROUND_GRAVITY = 4.9;
/**
 * Aerial shells are 10-16 m out and burn for seconds. True gravity would drop
 * their sparks tens of metres, far below the frame, so the sky keeps the
 * stylised, slow falloff that reads as distance.
 */
export const SKY_GRAVITY = 0.34;

/** Gold, amber, white-gold, orange, deep red, with violet and blue as accents only. */
export const PALETTES = {
  gold: ['#ffd76a', '#f5b942', '#fff4b0'],
  amber: ['#ff8a1f', '#ffd45a', '#d99a2b'],
  ember: ['#c23a1e', '#ff8a1f', '#ffd76a'],
  cream: ['#fff4de', '#ffd76a', '#f5b942'],
  white: ['#fff8ec', '#ffe9c0', '#ffffff'],
  sindoor: ['#e04a2f', '#ff7a4a', '#ffd3a8'],
  marigold: ['#ffcf5a', '#ffa83a', '#fff0c0'],
  /** Used sparingly: one shell in a show, never a whole sequence. */
  violet: ['#b06ad9', '#e0a8ff', '#fff0c0'],
  indigo: ['#6a8adf', '#a8c6ff', '#fff4de'],
} as const;

export type PaletteName = keyof typeof PALETTES;

/** Warm names first: a weighted draw keeps gold dominant and accents rare. */
export const SKY_PALETTES: readonly PaletteName[] = [
  'gold', 'gold', 'gold', 'amber', 'amber', 'cream', 'cream', 'marigold', 'marigold',
  'ember', 'white', 'sindoor', 'violet', 'indigo',
];
export const GROUND_PALETTES: readonly PaletteName[] = ['gold', 'marigold', 'cream', 'white', 'amber'];
