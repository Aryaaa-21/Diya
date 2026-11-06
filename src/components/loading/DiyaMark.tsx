interface DiyaMarkProps {
  size?: number;
  lit?: boolean;
  className?: string;
}

/** The small diya glyph used by the loader and fallback. Decorative. */
export function DiyaMark({ size = 40, lit = true, className = '' }: DiyaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="mark-glow" cx="50%" cy="38%" r="50%">
          <stop offset="0" stopColor="#ff8a1f" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mark-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fff4b0" />
          <stop offset="0.45" stopColor="#ffd45a" />
          <stop offset="1" stopColor="#ff8a1f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {lit && <circle cx="24" cy="20" r="18" fill="url(#mark-glow)" />}
      {lit && (
        <path
          className="mark-flame"
          d="M24 9 C27 15 28 19 24 26 C20 19 21 15 24 9 Z"
          fill="url(#mark-flame)"
        />
      )}
      <path
        d="M6 28 C10 36 17 39 24 39 C31 39 38 36 42 28 C36 31 30 32 24 32 C18 32 12 31 6 28 Z"
        fill="none"
        stroke="#d99a2b"
        strokeWidth="1"
      />
    </svg>
  );
}
