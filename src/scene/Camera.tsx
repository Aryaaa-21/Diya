import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Plane, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import { rig } from '../animations/camera';
import { pointer, world } from '../animations/world';
import { damp } from '../utils/flicker';

const FLOOR = new Plane(new Vector3(0, 1, 0), 0);
const raycaster = new Raycaster();
const ndc = new Vector2();
const hit = new Vector3();
const offset = new Vector3();
const look = new Vector3();
const smoothedPosition = new Vector3();
const smoothedTarget = new Vector3();
const aim = new Vector3();
const UP = new Vector3(0, 1, 0);

/** Portrait screens see less width; pull back so the composition still fits. */
function aspectDolly(aspect: number): number {
  return aspect >= 1 ? 1 : Math.min(1.9, 1 / Math.pow(aspect, 0.85));
}

/**
 * Follows the GSAP-driven rig with a light smoothing, applies a tiny
 * pointer parallax (a few millimetres up close), and updates pointer data.
 *
 * Pointer events only record where the pointer is; the floor raycast happens
 * once per frame instead of once per event, so a fast mouse (which can fire
 * several hundred events a second) can't outpace the renderer.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    smoothedPosition.copy(rig.position);
    smoothedTarget.copy(rig.target);
    const element = gl.domElement;
    let lastX = 0;
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      pointer.moved = true;
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      if (Math.abs(dx) < 200) pointer.sway = Math.max(-1, Math.min(1, pointer.sway + dx * 0.004));
    };
    const onLeave = () => {
      pointer.floor.set(1e3, 0, 1e3);
      pointer.moved = false;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    element.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', onLeave);
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    const k = damp(6, dt);
    smoothedPosition.lerp(rig.position, k);
    smoothedTarget.lerp(rig.target, k);

    const dolly = aspectDolly(size.width / size.height);
    offset.copy(smoothedPosition).sub(smoothedTarget).multiplyScalar(dolly);
    const distance = offset.length();

    // Parallax scales with distance so it's equally subtle close up and far away.
    const amount = 0.035 * distance * world.motion;
    look.set(ndc.x * amount, ndc.y * amount * 0.5, 0);

    // A rocket lifts the gaze; a burst nudges the whole frame.
    aim.copy(smoothedTarget).addScaledVector(UP, rig.lift);
    camera.position.copy(aim).add(offset).add(look).add(rig.shake);
    camera.lookAt(aim);

    // After the camera is settled for this frame, so the ray matches what's drawn.
    if (pointer.moved) {
      pointer.moved = false;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(FLOOR, hit) && hit.length() < 20) pointer.floor.copy(hit);
    }
  });

  return null;
}
