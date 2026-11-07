import { goToMode } from '../../animations/reveal';
import { useExperience } from '../../state/store';
import { Handwriting } from './Handwriting';

/**
 * The payoff after the reveal: the rising light writes the wish in script,
 * then the quieter lines settle in underneath it.
 */
export function MainGreeting() {
  const visible = useExperience((s) => s.mainGreeting);
  return (
    <section
      aria-live="polite"
      data-open={visible}
      className="greeting pointer-events-none fixed inset-x-0 top-[8vh] z-10 flex flex-col items-center gap-[3vh] px-6 text-center md:top-[10vh]"
    >
      <Handwriting />
      {visible && (
        <h2 className="display text-step-1 text-ink-2 md:text-step-2">
          <span className="line" style={{ animationDelay: '0s' }}>May your light</span>
          <span className="line" style={{ animationDelay: '0.7s' }}>always find its way</span>
          <span className="line" style={{ animationDelay: '1.4s' }}>through the darkness.</span>
        </h2>
      )}
    </section>
  );
}

/** The personalised greeting, shown above the brightened diya. */
export function PersonalGreeting() {
  const greeting = useExperience((s) => s.greeting);
  const mode = useExperience((s) => s.mode);
  const visible = mode === 'personal' && greeting !== null;

  return (
    <section
      aria-live="polite"
      data-open={visible}
      className="greeting fixed inset-x-0 top-[9vh] z-10 flex flex-col items-center gap-5 px-6 text-center"
    >
      {visible && greeting && (
        <>
          <p className="line mono-label text-gold/80">A light for you</p>
          <h2 className="line display text-step-5 italic text-gold-bright" style={{ animationDelay: '0.4s' }}>
            For {greeting.name}
          </h2>
          <p className="line display max-w-[30ch] text-step-2 text-ink-2 md:text-step-3" style={{ animationDelay: '1.3s' }}>
            {greeting.message}
          </p>
          <p className="line script-line mt-1 text-gold-warm" style={{ animationDelay: '2.6s' }}>
            Happy Diwali
          </p>
          <button
            type="button"
            className="line text-link pointer-events-auto mt-2"
            style={{ animationDelay: '4s' }}
            onClick={() => goToMode('message')}
          >
            Write another
          </button>
        </>
      )}
    </section>
  );
}
