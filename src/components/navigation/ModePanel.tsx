import type { ReactNode } from 'react';

interface ModePanelProps {
  open: boolean;
  label: string;
  title: string;
  children: ReactNode;
  /** Desktop placement; mobile always sits above the nav. */
  side?: 'right' | 'left';
}

/**
 * Mode controls float in the dark with no card behind them: just a hairline
 * and type. `inert` keeps hidden panels out of the tab order.
 */
export function ModePanel({ open, label, title, children, side = 'right' }: ModePanelProps) {
  return (
    <section
      aria-label={title}
      inert={!open}
      data-open={open}
      className={`mode-panel fixed inset-x-0 bottom-[5.5rem] z-20 px-6 md:bottom-auto md:top-1/2 md:w-[21rem] md:-translate-y-1/2 md:px-0 ${
        side === 'right' ? 'md:left-auto md:right-12' : 'md:left-44 md:right-auto'
      }`}
    >
      <div className="mx-auto flex max-w-sm flex-col gap-6 border-l border-gold/25 pl-5 md:max-w-none md:pl-7">
        <header className="flex flex-col gap-1.5">
          <p className="mono-label text-gold/80">{label}</p>
          <h2 className="display text-step-3 text-ink">{title}</h2>
        </header>
        {children}
      </div>
    </section>
  );
}
