import gsap from 'gsap';
import { playIgnition } from '../animations/ignition';
import { playPersonalGreeting } from '../animations/greeting';
import { goToMode } from '../animations/reveal';
import { setState, type FireworkShape, type Mode } from '../state/store';
import { launchFirework, requestFirework } from '../fireworks/queue';
import { SHAPE_ORDER } from '../fireworks/shells';
import { KINDS, KIND_ORDER, type FireworkKind } from '../fireworks/types';
import { GROUND_SPOTS } from '../scene/layout';
import { startShow } from '../fireworks/show';

/**
 * Development only: `?demo=world|diya|rangoli|sky|celebrate|message|personal|fw`
 * lights the diya automatically and moves to a mode, so states can be inspected
 * headlessly. `&at=<seconds>` freezes the ignition timeline on one moment.
 *
 * With `demo=fw`, `&shape=<bloom|peony|willow|palm|ring|crackle|heart>` fires one
 * shell type on repeat; without it the shells cycle in order.
 *
 * With `demo=celebrate`, `&piece=<anar|rocket|chakri|phuljhadi|shell|cake>`
 * lights that piece on repeat, `&piece=all` walks through every piece in turn,
 * and `&show=1` plays the choreographed show instead.
 */
export function runDemo(): void {
  if (!import.meta.env.DEV) return;
  const params = new URLSearchParams(window.location.search);
  const target = params.get('demo');
  if (!target) return;
  const at = Number(params.get('at'));
  // Headless capture advances time in large jumps; GSAP's lag smoothing would
  // otherwise stretch the timeline out across them.
  gsap.ticker.lagSmoothing(0);
  const hold = Number.isFinite(at) && at > 0;
  window.setTimeout(() => {
    const ignition = playIgnition();
    // Hold one moment of the sequence still so it can be inspected or captured.
    if (hold) ignition.seek(at, false).pause();
    window.setTimeout(() => {
      if (target === 'personal') playPersonalGreeting({ name: 'Arya', message: 'May your life always be filled with light, peace and beautiful beginnings.' });
      else if (target === 'fw') {
        const requested = params.get('shape') as FireworkShape | null;
        const only = requested && SHAPE_ORDER.includes(requested) ? requested : null;
        let n = 0;
        window.setInterval(() => launchFirework(undefined, 1, true, only ?? SHAPE_ORDER[n++ % SHAPE_ORDER.length]), 1500);
      } else if (target === 'celebrate') {
        goToMode('celebrate');
        const piece = params.get('piece');
        if (params.get('show')) {
          window.setTimeout(startShow, 2500);
        } else if (piece) {
          const one = KIND_ORDER.includes(piece as FireworkKind) ? (piece as FireworkKind) : null;
          let n = 0;
          let spot = 0;
          window.setInterval(() => {
            const kind = one ?? KIND_ORDER[n++ % KIND_ORDER.length];
            setState({ firework: kind });
            if (KINDS[kind].ground) {
              const [x, z] = GROUND_SPOTS[spot++ % GROUND_SPOTS.length];
              requestFirework({ kind, x, y: 0, z, force: true });
            } else {
              requestFirework({ kind, x: (Math.random() - 0.5) * 10, y: 4 + Math.random() * 2.5, z: -13, force: true });
            }
          }, 3000);
        }
      }
      else if (target !== 'world' && target !== 'ignite') goToMode(target as Mode);
    }, 11000);
  }, hold ? 0 : 3000);
}
