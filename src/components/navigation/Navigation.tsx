import { goToMode } from '../../animations/reveal';
import { useExperience, type Mode } from '../../state/store';

const ITEMS: { mode: Mode; label: string; index: string }[] = [
  { mode: 'diya', label: 'Diya', index: '01' },
  { mode: 'rangoli', label: 'Rangoli', index: '02' },
  { mode: 'sky', label: 'Sky', index: '03' },
  { mode: 'celebrate', label: 'Celebrate', index: '04' },
  { mode: 'message', label: 'Message', index: '05' },
];

/** A thin cinematic control strip, not a navbar. Bottom on mobile, left rail on desktop. */
export function Navigation({ hidden }: { hidden: boolean }) {
  const mode = useExperience((s) => s.mode);
  const current = mode === 'personal' ? 'message' : mode;

  return (
    <nav
      aria-label="Explore the scene"
      className="chrome-fade fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-auto md:left-8 md:top-1/2 md:-translate-y-1/2 md:pb-0"
      data-hidden={hidden}
    >
      <ul className="flex gap-1 md:flex-col md:gap-2">
        {ITEMS.map((item) => {
          const active = current === item.mode;
          return (
            <li key={item.mode}>
              <button
                type="button"
                className="nav-item group"
                aria-current={active ? 'true' : undefined}
                onClick={() => goToMode(active ? 'world' : item.mode)}
              >
                <span className="nav-index">{item.index}</span>
                <span className="nav-line" aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
