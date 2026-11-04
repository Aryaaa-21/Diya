import { useEffect, useState } from 'react';

/**
 * True once the user has been still for `delay` ms. Used to let the firework
 * controls recede while someone is simply watching the celebration, and bring
 * them back the moment they reach for anything.
 */
export function useIdle(delay: number, enabled: boolean): boolean {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      return;
    }
    let timer = window.setTimeout(() => setIdle(true), delay);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), delay);
    };
    const events: (keyof WindowEventMap)[] = ['pointermove', 'pointerdown', 'keydown', 'wheel'];
    for (const event of events) window.addEventListener(event, wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, wake);
    };
  }, [delay, enabled]);

  return idle;
}
