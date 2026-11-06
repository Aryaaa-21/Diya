import gsap from 'gsap';
import { Vector3 } from 'three';
import { SHOTS, type ShotName } from '../scene/layout';
import { prefersReducedMotion } from '../hooks/useReducedMotion';

/** The camera follows this rig; CameraRig adds framing and parallax on top. */
export const rig = {
  position: new Vector3(...SHOTS.intro.position),
  target: new Vector3(...SHOTS.intro.target),
  /**
   * Firework response, written by the FireworkManager and read by CameraRig.
   * `shake` is a decaying offset in metres (tiny: a burst nudges the frame, it
   * does not rattle it) and `lift` raises where the camera is looking while
   * something climbs. Both are already scaled by world.motion, so reduced
   * motion leaves them at zero.
   */
  shake: new Vector3(),
  lift: 0,
};

function veil(): HTMLElement | null {
  return document.getElementById('veil');
}

export function cutTo(shot: ShotName): void {
  gsap.killTweensOf([rig.position, rig.target]);
  rig.position.set(...SHOTS[shot].position);
  rig.target.set(...SHOTS[shot].target);
}

/**
 * Glide to a shot. With reduced motion the camera never travels: a short fade
 * to black hides an instant cut instead.
 */
export function moveCamera(shot: ShotName, duration = 2.8, ease = 'power2.inOut'): gsap.core.Timeline {
  const { position, target } = SHOTS[shot];
  gsap.killTweensOf([rig.position, rig.target]);
  const tl = gsap.timeline();

  if (prefersReducedMotion()) {
    const el = veil();
    tl.to(el, { opacity: 1, duration: 0.3, ease: 'power1.in' })
      .add(() => cutTo(shot))
      .to(el, { opacity: 0, duration: 0.6, ease: 'power1.out' });
    return tl;
  }

  tl.to(rig.position, { x: position[0], y: position[1], z: position[2], duration, ease }, 0).to(
    rig.target,
    { x: target[0], y: target[1], z: target[2], duration, ease },
    0,
  );
  return tl;
}
