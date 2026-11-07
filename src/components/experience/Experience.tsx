import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { playIntro } from '../../animations/intro';
import { world } from '../../animations/world';
import { DPR_BY_QUALITY } from '../../hooks/usePerformance';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DiyaScene } from '../../scene/DiyaScene';
import { setState, useExperience } from '../../state/store';
import { initialQuality } from '../../utils/device';
import { runDemo } from '../../utils/demo';
import { About } from '../about/About';
import { SoundToggle } from '../audio/SoundToggle';
import { Cursor } from '../cursor/Cursor';
import { MainGreeting, PersonalGreeting } from '../greeting/Greetings';
import { ModePanels } from '../navigation/ModePanels';
import { Navigation } from '../navigation/Navigation';
import { AmbientExit } from './AmbientExit';
import { IntroOverlay } from './IntroOverlay';

export default function Experience() {
  // Decided once: the Canvas's antialias setting can't change after creation.
  const [startQuality] = useState(initialQuality);
  const reducedMotion = useReducedMotion();
  const sceneReady = useExperience((s) => s.sceneReady);
  const navVisible = useExperience((s) => s.navVisible);
  const mode = useExperience((s) => s.mode);
  const ambient = mode === 'ambient';

  useEffect(() => {
    setState({ quality: startQuality });
  }, [startQuality]);

  useEffect(() => {
    world.motion = reducedMotion ? 0.25 : 1;
  }, [reducedMotion]);

  const onReady = useCallback(() => {
    setState({ sceneReady: true });
    playIntro();
    runDemo();
  }, []);

  return (
    <>
      <Canvas
        className="!fixed inset-0"
        dpr={DPR_BY_QUALITY[startQuality]}
        /**
         * No shadow maps. The one real light is a point light, so a shadow would
         * mean re-rendering the scene into six cube faces every frame — by far
         * the most expensive thing here, for a shadow the contact-glow quads
         * under each lamp already stand in for convincingly.
         */
        shadows={false}
        gl={{
          antialias: startQuality !== 'low',
          powerPreference: 'high-performance',
          // Nothing in the scene stencils; skipping the buffer saves bandwidth.
          stencil: false,
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          outputColorSpace: SRGBColorSpace,
        }}
        camera={{ fov: 34, near: 0.02, far: 200, position: [0, 0.16, 0.66] }}
        onCreated={({ gl }) => gl.setClearColor('#050204')}
        aria-label="A clay diya on a dark floor, surrounded by a rangoli and smaller lamps"
        role="img"
      >
        <DiyaScene onReady={onReady} />
      </Canvas>

      {/* Vignette and a veil used to hide cuts when motion is reduced. */}
      <div className="vignette pointer-events-none fixed inset-0 z-[1]" aria-hidden="true" />
      <div id="veil" className="pointer-events-none fixed inset-0 z-40 bg-night opacity-0" aria-hidden="true" />

      {sceneReady && (
        <>
          <IntroOverlay />
          <MainGreeting />
          <PersonalGreeting />
          <ModePanels />
          <Navigation hidden={!navVisible || ambient} />
          <SoundToggle hidden={ambient} />
          <About hidden={!navVisible || ambient} />
          <AmbientExit />
          <Cursor />
        </>
      )}
    </>
  );
}
