/** Transparent flight-route illustration for the hero (no background). */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 440" fill="none" className={className} aria-hidden role="img">
      <defs>
        <linearGradient id="ha-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14304f" />
          <stop offset="1" stopColor="#0b1d33" />
        </linearGradient>
        <linearGradient id="ha-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0d9488" />
        </linearGradient>
        <filter id="ha-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="20" floodColor="#0b1d33" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* soft depth blobs (transparent tints) */}
      <circle cx="360" cy="120" r="120" fill="#0d9488" opacity="0.08" />
      <circle cx="120" cy="320" r="110" fill="#2563eb" opacity="0.08" />

      {/* dashed flight arc — dashes flow toward the destination */}
      <path className="flight-arc" d="M88 330 Q230 110 404 150" stroke="#94a3b8" strokeWidth="2.5"
        strokeDasharray="2 12" strokeLinecap="round" opacity="0.7" />

      {/* origin pin */}
      <g>
        <circle className="ha-ping" cx="88" cy="330" r="9" fill="#14b8a6" />
        <circle cx="88" cy="330" r="16" fill="#fff" filter="url(#ha-shadow)" />
        <circle cx="88" cy="330" r="7" fill="url(#ha-teal)" />
        <text x="88" y="366" textAnchor="middle" fill="#0b1d33" fontSize="13" fontWeight="700"
          fontFamily="inherit">KUL</text>
      </g>
      {/* destination pin */}
      <g>
        <circle className="ha-ping" cx="404" cy="150" r="9" fill="#2563eb" />
        <circle cx="404" cy="150" r="16" fill="#fff" filter="url(#ha-shadow)" />
        <circle cx="404" cy="150" r="7" fill="#2563eb" />
        <text x="404" y="124" textAnchor="middle" fill="#0b1d33" fontSize="13" fontWeight="700"
          fontFamily="inherit">DAC</text>
      </g>

      {/* plane badge mid-arc */}
      <g transform="translate(232 188) rotate(-26)">
        <circle r="34" fill="url(#ha-navy)" filter="url(#ha-shadow)" />
        <g transform="translate(-13 -13) scale(1.08)" fill="none" stroke="#5eead4" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </g>
      </g>
    </svg>
  );
}
