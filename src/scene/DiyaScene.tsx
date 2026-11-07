import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { BackgroundLamps } from '../components/diya/BackgroundLamps';
import { HeroDiya } from '../components/diya/HeroDiya';
import { RisingLight } from '../components/diya/RisingLight';
import { FireworkInput } from '../components/fireworks/FireworkInput';
import { FireworkStage } from '../components/fireworks/FireworkStage';
import { Rangoli } from '../components/rangoli/Rangoli';
import { usePerformance } from '../hooks/usePerformance';
import { useExperience } from '../state/store';
import { CameraRig } from './Camera';
import { Environment } from './Environment';
import { Hotspots } from './Hotspots';
import { Lighting } from './Lighting';
import { Particles } from './Particles';

interface DiyaSceneProps {
  onReady: () => void;
}

export function DiyaScene({ onReady }: DiyaSceneProps) {
  const quality = useExperience((s) => s.quality);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  usePerformance();

  useEffect(() => {
    // Compile every program up front so ignition never hitches on a shader compile.
    let frame = 0;
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .finally(() => {
        frame = requestAnimationFrame(() => requestAnimationFrame(onReady));
      });
    return () => cancelAnimationFrame(frame);
  }, [gl, scene, camera, onReady]);

  return (
    <>
      <fog attach="fog" args={['#070205', 6, 28]} />
      <CameraRig />
      <Lighting />
      <Environment quality={quality} />
      <Rangoli />
      <HeroDiya quality={quality} />
      <RisingLight quality={quality} />
      <BackgroundLamps quality={quality} />
      <Particles quality={quality} />
      <FireworkStage quality={quality} />
      <FireworkInput />
      <Hotspots />
    </>
  );
}
