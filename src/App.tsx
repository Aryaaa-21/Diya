import { lazy, Suspense, useState } from 'react';
import { Loader } from './components/loading/Loader';
import { WebGLFallback } from './components/fallback/WebGLFallback';
import { hasWebGL } from './utils/webgl';

// The 3D experience (three, r3f, gsap) is a separate chunk so the loader paints first.
const Experience = lazy(() => import('./components/experience/Experience'));

export function App() {
  const [webgl] = useState(hasWebGL);

  if (!webgl) return <WebGLFallback />;

  return (
    <main className="relative h-full w-full bg-night">
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
      <Loader />
    </main>
  );
}
