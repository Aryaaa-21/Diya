import { useEffect, useId, useRef, useState } from 'react';

const MEMBERS = ['Arya Bhagat', 'Nivriti Pandey'];

/**
 * Who made this. A quiet wordmark in the corner, balancing the sound toggle on
 * the other side, that opens a full-screen card.
 *
 * Deliberately not a sixth item in the navigation: the rail already carries
 * five labels and only just fits a 360px phone, and the credits are something
 * you read once rather than a place in the scene you travel to.
 */
export function About({ hidden }: { hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    // Move focus into the card, and put it back on the wordmark on the way out.
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      trigger.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="chrome-fade mono-label fixed left-5 top-5 z-30 px-2 py-2 transition-colors hover:text-ink-2 focus-visible:text-ink-2 md:left-8 md:top-7"
        data-hidden={hidden && !open}
      >
        <span className="text-gold/80">YaRiti</span>
        <span className="sr-only"> — about the makers</span>
      </button>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        inert={!open}
        data-open={open}
        className="about-card fixed inset-0 z-50 flex items-center justify-center px-6"
      >
        <button
          type="button"
          aria-label="Close"
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="absolute inset-0 cursor-default bg-night/88"
        />

        <div className="relative flex max-w-[34rem] flex-col items-center gap-7 text-center">
          <p className="mono-label text-gold/80">The makers</p>
          <h2 id={titleId} className="display text-step-5 leading-none text-ink">
            YaRiti
          </h2>
          <div className="hairline" aria-hidden="true" />
          <ul className="flex flex-col gap-2">
            {MEMBERS.map((name) => (
              <li key={name} className="display text-step-2 italic text-ink-2">
                {name}
              </li>
            ))}
          </ul>
          <p className="max-w-[32ch] text-step--1 leading-relaxed text-ink-muted">
            A diya lit in the dark, a sky to fill with light, and a wish to send on. Made for Diwali.
          </p>
          <button ref={close} type="button" className="ember-button ember-button--small" onClick={() => setOpen(false)}>
            Back to the light
          </button>
        </div>
      </section>
    </>
  );
}
