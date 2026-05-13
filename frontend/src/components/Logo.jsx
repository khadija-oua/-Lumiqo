// Lumiqo wordmark. The "o" is replaced with a brand-coloured ring containing
// a glowing accent dot (lumière metaphor). Uses CSS variables so it adapts
// to the active theme without prop changes.

const SIZES = {
  sm: { h: 20, fs: 18 },
  md: { h: 28, fs: 24 },
  lg: { h: 40, fs: 34 },
};

export default function Logo({ size = 'md', showName = true }) {
  const { h, fs } = SIZES[size] || SIZES.md;
  const ringR = h * 0.45;
  const dotR = h * 0.13;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: showName ? 8 : 0,
        color: 'var(--color-brand)',
        userSelect: 'none',
      }}
    >
      <svg
        width={h}
        height={h}
        viewBox="0 0 40 40"
        aria-hidden={showName}
        role={showName ? 'presentation' : 'img'}
        aria-label={showName ? undefined : 'Lumiqo'}
      >
        <circle
          cx="20"
          cy="20"
          r={(ringR / h) * 40}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={((dotR + 4) / h) * 40}
          fill="var(--color-accent)"
          opacity="0.25"
        />
        <circle cx="20" cy="20" r={(dotR / h) * 40} fill="var(--color-accent)" />
      </svg>
      {showName && (
        <span
          style={{
            fontFamily: 'var(--font-family-sans)',
            fontWeight: 700,
            fontSize: fs,
            letterSpacing: '-0.01em',
            color: 'var(--text-primary)',
          }}
        >
          Lumiqo
        </span>
      )}
    </span>
  );
}
