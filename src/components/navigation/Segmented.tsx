import { useId, type ReactNode } from 'react';

interface Option<T> {
  value: T;
  label: string;
  swatch?: string;
}

interface SegmentedProps<T> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** Renders options as colour dots rather than words. */
  swatches?: boolean;
}

/** A radio group drawn as hairline gold segments. Native radios keep keyboard behaviour. */
export function Segmented<T extends string | number>({ label, value, options, onChange, swatches }: SegmentedProps<T>): ReactNode {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mono-label mb-2.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          const checked = option.value === value;
          return (
            <label key={id} htmlFor={id} className={swatches ? 'swatch' : 'segment'} data-checked={checked}>
              <input
                id={id}
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {swatches ? (
                <>
                  <span className="swatch-dot" style={{ background: option.swatch }} aria-hidden="true" />
                  <span className="sr-only md:not-sr-only md:text-[0.65rem]">{option.label}</span>
                </>
              ) : (
                option.label
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
