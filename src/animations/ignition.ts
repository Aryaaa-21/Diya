import gsap from 'gsap';
import { setState } from '../state/store';
import { audio } from '../hooks/useAudio';
import { moveCamera } from './camera';
import { lampLevels, world } from './world';
import { launchFirework } from '../fireworks/queue';
import { Vector3 } from 'three';

/**
 * The ignition sequence, matching the brief's timeline:
 * 0.1 wick glows, 0.3 spark, 0.5 flame, 0.7 grows, 1.0 light, 1.2 floor glow,
 * 1.5 rangoli, 2.0 lamps, 2.5 particles, 3.0 camera pulls back, 3.4 world.
 * Then the flame draws upward, its light climbs into the night, and at 5.0 the
 * wish is written in its wake; the quieter lines follow it.
 */
export function playIgnition(): gsap.core.Timeline {
  // Done here rather than as a callback at position 0: a timeline that is
  // seeked or restarted would skip a callback sitting exactly on the playhead.
  setState({ phase: 'igniting' });
  audio.ignite();

  const tl = gsap.timeline();
  tl.to(world, { wick: 1, duration: 0.35, ease: 'power2.out' }, 0.1)
    .to(world, { spark: 1, duration: 0.08, ease: 'power4.out' }, 0.3)
    .to(world, { spark: 0, duration: 0.5, ease: 'power2.in' }, 0.4)
    .to(world, { flame: 0.45, duration: 0.25, ease: 'power2.out' }, 0.5)
    .to(world, { flame: 1, duration: 0.9, ease: 'elastic.out(1, 0.55)' }, 0.7)
    .to(world, { wick: 0.35, duration: 1.2, ease: 'sine.inOut' }, 0.8)
    .to(world, { light: 1, duration: 1.4, ease: 'power2.inOut' }, 1.0)
    .to(world, { floorGlow: 1, duration: 2.6, ease: 'power2.out' }, 1.2)
    .to(world, { rangoli: 1, duration: 3.4, ease: 'power1.inOut' }, 1.5)
    .to(world, { particles: 1, duration: 2.5, ease: 'sine.inOut' }, 2.5)
    .add(moveCamera('world', 4.6, 'power2.inOut'), 3.0)
    // The flame stretches up and its light lifts off, climbing out of frame.
    .to(world, { lift: 1, duration: 0.7, ease: 'power2.out' }, 3.0)
    .to(world, { ascend: 1, duration: 2.6, ease: 'power2.in' }, 3.3)
    .to(world, { lift: 0, duration: 1.6, ease: 'power2.inOut' }, 3.9)
    .to(world, { environment: 1, duration: 3, ease: 'sine.inOut' }, 3.4)
    // The light leaves the wish behind it, written out in its own hand.
    .add(() => setState({ phase: 'revealed', wishVisible: true }), 5.0)
    .add(() => setState({ mainGreeting: true }), 8.0)
    .add(() => launchFirework(new Vector3(-4.2, 2.4, -13), 0.7, true), 8.4)
    .add(() => setState({ navVisible: true }), 9.1);

  // Background lamps ignite one after another: the light spreads.
  lampLevels.forEach((lamp, i) => {
    const at = 2.0 + i * 0.32 + (i % 2) * 0.08;
    tl.to(lamp, { value: 1.2, duration: 0.25, ease: 'power3.out' }, at).to(lamp, { value: 1, duration: 0.6, ease: 'sine.out' }, at + 0.25);
  });
  return tl;
}

/** Diya mode toggle: background lamps go out (in reverse) or relight in sequence. */
export function setLamps(lit: boolean): void {
  const order = lit ? lampLevels : [...lampLevels].reverse();
  order.forEach((lamp, i) => {
    gsap.killTweensOf(lamp);
    gsap.to(lamp, { value: lit ? 1 : 0, duration: lit ? 0.5 : 0.7, delay: i * 0.18, ease: lit ? 'power2.out' : 'power2.in' });
  });
}
