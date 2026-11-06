import { useAudio } from '../../hooks/useAudio';

/** Small, always available after the loader. Audio never starts by itself. */
export function SoundToggle({ hidden }: { hidden: boolean }) {
  const { soundOn, toggle } = useAudio();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={soundOn}
      aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
      className="chrome-fade mono-label fixed right-5 top-5 z-30 flex items-center gap-3 px-2 py-2 transition-colors hover:text-ink-2 focus-visible:text-ink-2 md:right-8 md:top-7"
      data-hidden={hidden}
    >
      <span aria-hidden="true" className="flex h-3 items-end gap-[2px]">
        {[0.5, 1, 0.7, 0.9].map((h, i) => (
          <span
            key={i}
            className={`sound-bar w-px bg-gold ${soundOn ? 'is-on' : ''}`}
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span>{soundOn ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
