import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';
import { useExperience } from '../../state/store';

const WISH = 'Wishing you a very happy Diwali';
const WRITE_S = 3.1;
/** Breathing room either side of the line, in CSS pixels. */
const GUTTER = 20;
/** Matches the .handwriting opacity transition in index.css. */
const FADE_MS = 1100;

/**
 * The wish the rising light leaves behind, written out in script as if by hand:
 * a soft mask edge travels along the line while an ember rides the nib. The
 * mask position lives in a CSS custom property, so one GSAP tween drives it
 * with no React renders.
 */
export function Handwriting() {
  const visible = useExperience((s) => s.wishVisible);
  const box = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const nib = useRef<HTMLSpanElement>(null);

  /**
   * One unbroken line of cursive is the whole point, so rather than wrap it we
   * measure it and, if it still doesn't fit (a very narrow window, a fallback
   * face with wider metrics, a large default text size), scale it down.
   * offsetWidth is the untransformed layout width, so this stays correct once
   * the scale has been applied.
   */
  useEffect(() => {
    const fit = () => {
      const el = line.current;
      const wrap = box.current;
      if (!el || !wrap) return;
      const width = el.offsetWidth;
      if (!width) return;
      const available = Math.max(200, window.innerWidth - GUTTER * 2);
      wrap.style.setProperty('--fit', String(Math.min(1, available / width)));
    };
    fit();
    // Remeasure once the script face has actually loaded; fallback metrics differ.
    void document.fonts?.ready.then(fit).catch(() => undefined);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    const el = line.current;
    const pen = nib.current;
    if (!el || !pen) return;

    if (!visible) {
      // Rewind only once the line has faded out, so leaving doesn't blank it
      // mid-fade. FADE_MS matches the .handwriting opacity transition.
      const id = window.setTimeout(() => {
        el.classList.remove('is-written');
        el.style.setProperty('--write', '-7%');
        gsap.set(pen, { opacity: 1 });
      }, FADE_MS);
      return () => window.clearTimeout(id);
    }

    if (prefersReducedMotion()) {
      el.style.setProperty('--write', '107%');
      el.classList.add('is-written');
      gsap.set(pen, { opacity: 0 });
      return;
    }

    const width = el.offsetWidth;
    const progress = { value: 0 };
    const tl = gsap.timeline();
    tl.to(progress, {
      value: 1,
      duration: WRITE_S,
      ease: 'power1.inOut',
      onUpdate: () => {
        const v = progress.value;
        // The mask's soft edge is 7% wide, so it has to start just off the left
        // of the line and finish just past the right: otherwise the first and
        // last few characters are left half-written.
        const edge = v * 1.14 - 0.07;
        el.style.setProperty('--write', `${edge * 100}%`);
        // A small bob so the nib reads as riding the cursive rather than a ruler.
        const x = Math.min(1, Math.max(0, edge)) * width;
        pen.style.transform = `translate3d(${x}px, ${Math.sin(v * Math.PI * 6.5) * 5}px, 0)`;
      },
    })
      .add(() => el.classList.add('is-written'))
      .to(pen, { opacity: 0, duration: 0.9, ease: 'power2.out' }, '-=0.35');

    return () => {
      tl.kill();
    };
  }, [visible]);

  return (
    <>
      {/* The script line is a drawing; screen readers get the plain wish instead. */}
      {visible && <p className="sr-only">{WISH}</p>}
      <div ref={box} className="handwriting" data-open={visible} aria-hidden="true">
        <p ref={line} className="handwriting-line">
          {WISH}
        </p>
        <span ref={nib} className="handwriting-nib" />
      </div>
    </>
  );
}
