import React from 'react';

export default function Logo({ size = 'md', showName = true }) {
  const iconSizes = { sm: 20, md: 28, lg: 42 };
  const fontSizes = { sm: 16, md: 22, lg: 32 };
  const px = iconSizes[size];
  const fs = fontSizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: px * 0.3 + 'px' }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 180 180"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <radialGradient id="lq-orb" cx="38%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#4DD9C0" />
            <stop offset="45%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0E5C66" />
          </radialGradient>
          <radialGradient id="lq-highlight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <clipPath id="lq-clip">
            <circle cx="90" cy="90" r="80" />
          </clipPath>
        </defs>
        <circle cx="90" cy="90" r="88" fill="#0B4A52" />
        <circle cx="90" cy="90" r="80" fill="url(#lq-orb)" />
        <path
          d="M 148 60 A 80 80 0 1 1 10 90 A 60 60 0 1 0 148 60 Z"
          fill="#0D5560"
          opacity="0.6"
          clipPath="url(#lq-clip)"
        />
        <ellipse
          cx="65"
          cy="55"
          rx="28"
          ry="20"
          fill="url(#lq-highlight)"
          transform="rotate(-25, 65, 55)"
          opacity="0.95"
        />
        <ellipse
          cx="58"
          cy="50"
          rx="10"
          ry="7"
          fill="white"
          opacity="0.6"
          transform="rotate(-25, 58, 50)"
        />
      </svg>

      {showName && (
        <span
          style={{
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: 700,
            fontSize: fs + 'px',
            color: 'var(--color-brand)',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          Lumiqo
        </span>
      )}
    </div>
  );
}
