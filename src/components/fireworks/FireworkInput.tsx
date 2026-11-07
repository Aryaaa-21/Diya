import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { requestFirework } from '../../fireworks/queue';
import { KINDS } from '../../fireworks/types';
import { clampToCourtyard } from '../../scene/layout';
import { getState } from '../../state/store';

/**
 * Tap to light. In Celebrate mode the armed piece decides what a tap means: a
 * courtyard piece is set down where you touched the floor, an aerial piece
 * breaks where you touched the sky, and touching the sky with a ground piece
 * armed still sends up a small burst — the sky is never dead to the touch.
 *
 * Reads state through `getState` rather than a subscription, so changing the
 * armed piece never rebinds the listener.
 */

/** Aerial bursts all happen on this plane, 13 m out, as they did before. */
const SKY = new Plane(new Vector3(0, 0, 1), 13);
const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();

/** A drag longer than this is a gesture, not a tap. */
const TAP_SLOP = 12;

function skyPoint(out: Vector3): void {
  out.x = Math.max(-9, Math.min(9, out.x));
  // Low enough that a burst's own radius stays inside the frame, high enough
  // that a willow's tail still has room to droop before the horizon.
  out.y = Math.max(2.9, Math.min(4.6, out.y));
  out.z = -13;
}

export function FireworkInput() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const element = gl.domElement;
    let downX = 0;
    let downY = 0;

    const onDown = (event: PointerEvent) => {
      downX = event.clientX;
      downY = event.clientY;
    };

    const onUp = (event: PointerEvent) => {
      const { mode, firework, fireworkShape } = getState();
      if (mode !== 'celebrate' && mode !== 'sky') return;
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > TAP_SLOP) return;

      const rect = element.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const ray = raycaster.ray;

      // Sky mode keeps its old behaviour: one shell wherever you touch.
      if (mode === 'sky') {
        if (!ray.intersectPlane(SKY, hit)) return;
        skyPoint(hit);
        requestFirework({
          kind: 'shell',
          x: hit.x,
          y: hit.y,
          z: hit.z,
          shape: fireworkShape === 'random' ? undefined : fireworkShape,
          scale: 0.9,
        });
        return;
      }

      const ground = KINDS[firework].ground;
      // Did the tap land on the courtyard in front of the camera?
      const onFloor = ray.intersectPlane(FLOOR, hit) ? hit.clone() : null;
      const reachable = onFloor !== null && onFloor.z < 1.2 && onFloor.length() < 12;

      if (ground && reachable && onFloor) {
        const [x, z] = clampToCourtyard(onFloor.x, onFloor.z);
        requestFirework({ kind: firework, x, y: 0, z });
        return;
      }

      // Above the horizon (or an aerial piece): work out where in the sky.
      if (ray.intersectPlane(SKY, hit)) {
        skyPoint(hit);
      } else if (onFloor) {
        // Pointing down with an aerial armed: put the burst out over that spot.
        hit.set(Math.max(-9, Math.min(9, onFloor.x * 2.4)), 2.9 + Math.random() * 1.5, -13);
      } else {
        return;
      }

      // A ground piece pointed at the sky still gives you something: the small
      // random aerial burst the brief asks for.
      requestFirework({
        kind: ground ? 'rocket' : firework,
        x: hit.x,
        y: hit.y,
        z: hit.z,
        // A ground piece aimed at the sky gets the small answering burst; an
        // aerial piece keeps its own randomised size.
        scale: ground ? 0.8 : undefined,
      });
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointerup', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera]);

  return null;
}
