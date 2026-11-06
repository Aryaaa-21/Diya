import gsap from 'gsap';
import { toggleShow } from '../fireworks/show';
import { getState, setState, type Mode } from '../state/store';
import { moveCamera } from './camera';
import { endPersonalGreeting } from './greeting';
import { world } from './world';
import type { ShotName } from '../scene/layout';

const SHOT_FOR_MODE: Record<Mode, ShotName> = {
  world: 'world',
  diya: 'diya',
  rangoli: 'rangoli',
  sky: 'sky',
  celebrate: 'celebrate',
  message: 'message',
  personal: 'personal',
  ambient: 'world',
};

/** Move between the revealed world's modes. One place owns camera choreography. */
export function goToMode(mode: Mode): void {
  const previous = getState().mode;
  if (previous === mode) return;
  if (previous === 'personal') endPersonalGreeting();
  if (previous === 'celebrate') toggleShow(false);
  setState({
    mode,
    mainGreeting: false,
    wishVisible: false,
    greeting: mode === 'personal' ? getState().greeting : null,
  });
  moveCamera(SHOT_FOR_MODE[mode], mode === 'ambient' ? 4.5 : 2.8);
}

/** Diya mode's "watch the flame" moves in close; tapping again backs out. */
export function toggleFlameView(close: boolean): void {
  moveCamera(close ? 'flame' : 'diya', 2.4);
}

/** Glow levels 1..3 map to a multiplier on every warm light in the scene. */
export function setGlow(level: number): void {
  setState({ glowLevel: level });
  gsap.to(world, { glow: [0.65, 1, 1.4][level - 1], duration: 1.2, ease: 'power2.inOut' });
}
