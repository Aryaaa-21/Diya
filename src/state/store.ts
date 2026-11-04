import { useSyncExternalStore } from 'react';
// Type-only, so this never becomes a runtime import cycle with the engine.
import type { FireworkKind } from '../fireworks/types';

/** Narrative stage. Only advances forward. */
export type Phase = 'loading' | 'intro' | 'dark' | 'igniting' | 'revealed';
/** Where the user is once the world is revealed. */
export type Mode = 'world' | 'diya' | 'rangoli' | 'sky' | 'celebrate' | 'message' | 'personal' | 'ambient';
export type Quality = 'high' | 'medium' | 'low';

export type RangoliPattern = 0 | 1 | 2;
export type RangoliSymmetry = 8 | 12 | 16;
export type RangoliAccent = 'gold' | 'marigold' | 'sindoor' | 'ivory';
/** Aerial shell pattern. See fireworks/shells.ts for the specs. */
export type FireworkShape = 'bloom' | 'peony' | 'willow' | 'palm' | 'ring' | 'crackle' | 'heart';
/** What the sky panel is set to; 'random' lets each burst choose its own shell. */
export type FireworkChoice = FireworkShape | 'random';

export interface Greeting {
  name: string;
  message: string;
}

export interface ExperienceState {
  phase: Phase;
  mode: Mode;
  quality: Quality;
  sceneReady: boolean;
  soundOn: boolean;
  /** The handwritten "Wishing you a very happy Diwali" wish, written by the rising light. */
  wishVisible: boolean;
  /** The "May your light..." line after the reveal. */
  mainGreeting: boolean;
  navVisible: boolean;
  greeting: Greeting | null;
  lampsLit: boolean;
  glowLevel: number;
  rangoliPattern: RangoliPattern;
  rangoliSymmetry: RangoliSymmetry;
  rangoliAccent: RangoliAccent;
  fireworkShape: FireworkChoice;
  /** The piece the next tap will light, in Celebrate mode. */
  firework: FireworkKind;
  /** The choreographed show is running. */
  showRunning: boolean;
  /** Master volume, 0..1. */
  volume: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let state: ExperienceState = {
  phase: 'loading',
  mode: 'world',
  quality: 'high',
  sceneReady: false,
  soundOn: false,
  wishVisible: false,
  mainGreeting: false,
  navVisible: false,
  greeting: null,
  lampsLit: true,
  glowLevel: 2,
  rangoliPattern: 0,
  rangoliSymmetry: 12,
  rangoliAccent: 'sindoor',
  fireworkShape: 'random',
  firework: 'shell',
  showRunning: false,
  volume: 1,
};

export function getState(): ExperienceState {
  return state;
}

export function setState(patch: Partial<ExperienceState>): void {
  const next = { ...state, ...patch };
  const changed = (Object.keys(patch) as (keyof ExperienceState)[]).some(
    (key) => next[key] !== state[key],
  );
  if (!changed) return;
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to one slice; components re-render only when that slice changes. */
export function useExperience<T>(selector: (s: ExperienceState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}
