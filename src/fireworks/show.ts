import gsap from 'gsap';
import { requestFirework } from './queue';
import { GROUND_SPOTS } from '../scene/layout';
import { setState } from '../state/store';

/**
 * The choreographed show: a written sequence, not a random spray. The gaps are
 * the composition — a sparkler to open on something small and human, two shells
 * answering each other across the sky, the courtyard pieces underneath, the
 * cake to build, and three gold shells together as the climax.
 *
 * Driven by one GSAP timeline, which also means stopping it is just a kill.
 */

let timeline: gsap.core.Timeline | null = null;

const spot = (i: number): [number, number] => GROUND_SPOTS[i % GROUND_SPOTS.length];

export function startShow(): void {
  stopShow();
  const tl = gsap.timeline({
    onComplete: () => {
      timeline = null;
      setState({ showRunning: false });
    },
  });

  // Open small: one sparkler in the courtyard, close to the diya.
  tl.add(() => {
    const [x, z] = spot(4);
    requestFirework({ kind: 'phuljhadi', x, y: 0, z, force: true });
  }, 0);

  // First thing in the sky, deliberately modest.
  tl.add(() => requestFirework({ kind: 'rocket', x: -3.4, y: 3.2, z: -13, force: true }), 1.5);

  // Two shells calling across the sky.
  tl.add(() => requestFirework({ kind: 'shell', x: 2.9, y: 3.3, z: -13, shape: 'peony', force: true }), 3);
  tl.add(() => requestFirework({ kind: 'shell', x: -1.6, y: 3.8, z: -13, shape: 'willow', force: true }), 4.5);

  // Bring the eye back down to the courtyard.
  tl.add(() => {
    const [x, z] = spot(3);
    requestFirework({ kind: 'chakri', x, y: 0, z, force: true });
  }, 6);
  tl.add(() => {
    const [x, z] = spot(0);
    requestFirework({ kind: 'anar', x, y: 0, z, force: true });
  }, 7.1);

  // The cake builds the pace back up on its own.
  tl.add(() => requestFirework({ kind: 'cake', x: 1.6, y: 0, z: -9, force: true }), 8);

  // The climax: three gold shells, a beat apart, filling the middle of the sky.
  tl.add(() => requestFirework({ kind: 'shell', x: 0, y: 4, z: -13, shape: 'bloom', scale: 1.35, palette: 'gold', force: true }), 12.6);
  tl.add(() => requestFirework({ kind: 'shell', x: -3.6, y: 3.3, z: -13, shape: 'peony', scale: 1.05, palette: 'marigold', force: true }), 12.9);
  tl.add(() => requestFirework({ kind: 'shell', x: 3.7, y: 3.4, z: -13, shape: 'palm', scale: 1.05, palette: 'cream', force: true }), 13.2);

  // Hold on the last embers before handing control back.
  tl.to({}, { duration: 1, delay: 18 - 13.2 });
  timeline = tl;
  setState({ showRunning: true });
}

export function stopShow(): void {
  timeline?.kill();
  timeline = null;
}

export function toggleShow(running: boolean): void {
  if (running) startShow();
  else {
    stopShow();
    setState({ showRunning: false });
  }
}
