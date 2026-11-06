import { DiyaMark } from '../loading/DiyaMark';

/** Shown when the browser can't create a WebGL context. Same story, in 2D. */
export function WebGLFallback() {
  return (
    <main className="fallback relative flex h-full w-full flex-col items-center justify-center gap-10 overflow-hidden bg-night px-6 text-center">
      <div className="fallback-pool" aria-hidden="true" />
      <DiyaMark size={160} className="relative" />
      <div className="relative flex max-w-[34ch] flex-col gap-6">
        <p className="display text-step-4 text-ink">
          May your light always find its way through the darkness.
        </p>
        <p className="display text-step-2 italic text-gold-warm">Happy Diwali</p>
      </div>
      <p className="relative max-w-[46ch] text-step--1 text-ink-muted">
        This browser can't show the 3D diya. Turn on hardware acceleration, or open the
        page in a recent version of Chrome, Edge, Firefox or Safari.
      </p>
    </main>
  );
}
