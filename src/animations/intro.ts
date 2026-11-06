import gsap from 'gsap';
import { getState, setState } from '../state/store';
import { moveCamera } from './camera';
import { world } from './world';

/** Darkness -> ember -> diya: the unlit lamp slowly emerges, camera drifts closer. */
export function playIntro(): gsap.core.Timeline {
  setState({ phase: 'intro' });

  const tl = gsap.timeline();
  tl.to(world, { intro: 1, duration: 4.2, ease: 'power1.inOut' }, 0.2)
    // An ember on the wick before anything else is visible: the first light.
    .to(world, { wick: 0.18, duration: 2.2, ease: 'sine.inOut' }, 0.6)
    .add(moveCamera('close', 6.5, 'sine.inOut'), 0)
    // Only if the story hasn't already moved on: the phase never goes backwards.
    .add(() => {
      if (getState().phase === 'intro') setState({ phase: 'dark' });
    }, 2.4);
  return tl;
}
