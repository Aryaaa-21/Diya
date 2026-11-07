import { useId, useState, type FormEvent } from 'react';
import { playPersonalGreeting } from '../../animations/greeting';
import { ModePanel } from '../navigation/ModePanel';

const NAME_MAX = 40;
const MESSAGE_MAX = 160;
const DEFAULT_MESSAGE = 'May your life always be filled with light, peace and beautiful beginnings.';

/** Text is rendered by React (never as HTML), so user input can't inject markup. */
function clean(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function MessageForm({ open }: { open: boolean }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const nameId = useId();
  const messageId = useId();
  const errorId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const n = clean(name, NAME_MAX);
    if (!n) {
      setError('Add a name so the light knows where to go.');
      return;
    }
    setError('');
    playPersonalGreeting({ name: n, message: clean(message, MESSAGE_MAX) || DEFAULT_MESSAGE });
  };

  return (
    <ModePanel open={open} label="04 / Message" title="Light someone's world" side="right">
      <form className="flex flex-col gap-6" onSubmit={submit} noValidate>
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="mono-label">
            Name
          </label>
          <input
            id={nameId}
            className="ember-field"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            placeholder="Who is this light for?"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor={messageId} className="mono-label">
              Message
            </label>
            <span className="mono-label text-[0.6rem]" aria-hidden="true">
              {message.length}/{MESSAGE_MAX}
            </span>
          </div>
          <textarea
            id={messageId}
            className="ember-field min-h-[5.5rem] resize-none"
            value={message}
            maxLength={MESSAGE_MAX}
            rows={3}
            placeholder={DEFAULT_MESSAGE}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <p id={errorId} role="alert" className="min-h-[1.2em] font-display text-step-0 italic text-gold-warm">
          {error}
        </p>
        <button type="submit" className="ember-button self-start">
          Create greeting
        </button>
      </form>
    </ModePanel>
  );
}
