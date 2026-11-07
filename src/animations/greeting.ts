import gsap from 'gsap';
import { Vector3 } from 'three';
import { launchFirework } from '../fireworks/queue';
import { audio } from '../hooks/useAudio';
import { setState, type Greeting } from '../state/store';
import { moveCamera } from './camera';
import { world } from './world';

/** Personal greeting: camera returns to the diya, it brightens, message appears, one firework. */
export function playPersonalGreeting(greeting: Greeting): gsap.core.Timeline {
  const tl = gsap.timeline();
  tl.add(() => setState({ mode: 'personal', mainGreeting: false, wishVisible: false, greeting: null }), 0)
    .add(moveCamera('personal', 3.2, 'power2.inOut'), 0)
    .to(world, { boost: 1, duration: 2.4, ease: 'power2.inOut' }, 0.6)
    .add(() => audio.bell(), 1.2)
    .add(() => setState({ greeting }), 2.2)
    .add(() => launchFirework(new Vector3(3.4, 2.6, -12), 0.75, true), 5.2);
  return tl;
}

export function endPersonalGreeting(): void {
  gsap.to(world, { boost: 0, duration: 2, ease: 'power2.inOut' });
}
