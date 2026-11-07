import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import { goToMode } from '../animations/reveal';
import { pointer } from '../animations/world';
import { getState, type Mode } from '../state/store';
import { RANGOLI_RADIUS } from './layout';

/**
 * The scene itself is the navigation: touch the diya to tend it, the rangoli to
 * draw it, the sky to fill it. The rail along the edge stays for people who
 * want a map, but nobody should have to find it first.
 *
 * Hit testing is geometric rather than a mesh raycast — one plane intersection
 * instead of walking the scene graph — which also lets the diya have a target a
 * good deal larger than the diya, since it is only a few centimetres across.
 */

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();

/** Generous: the hero diya is about 10cm across, the target is 30cm. */
const DIYA_RADIUS = 0.3;
/**
 * Past this, and further into the scene than the rangoli, the floor is too dark
 * to read as ground — what you are looking at there is night. Measured from the
 * diya, not from the camera: the floor under your feet is never sky.
 */
const FLOOR_REACH = 1.6;
/** A drag is a gesture, not a tap. */
const TAP_SLOP = 12;

/** Modes where the canvas is free; in Sky and Celebrate a tap lights a firework. */
const NAVIGABLE: Mode[] = ['world', 'diya', 'rangoli'];

function targetFor(x: number, y: number, element: HTMLElement, camera: Camera): Mode | null {
  const rect = element.getBoundingClientRect();
  ndc.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(FLOOR, hit)) return 'sky';
  const r = Math.hypot(hit.x, hit.z);
  if (r < DIYA_RADIUS) return 'diya';
  if (r < RANGOLI_RADIUS) return 'rangoli';
  if (hit.z < -RANGOLI_RADIUS && r > FLOOR_REACH) return 'sky';
  return null;
}

export function Hotspots() {
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
      const { mode, phase } = getState();
      if (phase !== 'revealed' || !NAVIGABLE.includes(mode)) return;
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > TAP_SLOP) return;
      const target = targetFor(event.clientX, event.clientY, element, camera);
      if (target && target !== mode) goToMode(target);
    };

    element.addEventListener('pointerdown', onDown);
    element.addEventListener('pointerup', onUp);
    return () => {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointerup', onUp);
      pointer.hotspot = false;
    };
  }, [gl, camera]);

  // Tell the cursor when it is over something that can be opened. CameraRig
  // already raycasts the floor once a frame, so this costs two subtractions.
  useFrame(() => {
    const { mode, phase } = getState();
    if (phase !== 'revealed' || !NAVIGABLE.includes(mode)) {
      pointer.hotspot = false;
      return;
    }
    const r = Math.hypot(pointer.floor.x, pointer.floor.z);
    pointer.hotspot = (r < DIYA_RADIUS && mode !== 'diya') || (r >= DIYA_RADIUS && r < RANGOLI_RADIUS && mode !== 'rangoli');
  });

  return null;
}
