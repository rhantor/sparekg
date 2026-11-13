import './sky.css';

/** One bumpy cloud edge; starts and ends at the same height so copies tile. */
const CLOUD =
  'M0 110 C 70 62 170 58 240 98 C 300 42 420 40 482 94 C 545 58 650 56 706 102 C 782 34 918 36 982 98 C 1045 64 1140 62 1202 104 C 1262 58 1372 62 1440 110 L 1440 240 L 0 240 Z';

function CloudBand({
  bottom, height, duration, opacity, fill,
}: { bottom: number; height: number; duration: number; opacity: number; fill: string }) {
  return (
    <div className="sky-cloud" style={{ bottom, opacity, animationDuration: `${duration}s` }}>
      {[0, 1].map((i) => (
        <svg key={i} viewBox="0 0 1440 240" preserveAspectRatio="none" style={{ height }}>
          <path d={CLOUD} fill={fill} />
        </svg>
      ))}
    </div>
  );
}

/**
 * The view from a window seat: night sky at altitude, daylight below it, a
 * warm horizon, and three cloud layers drifting at different speeds. The
 * nearest layer is the page background colour, so content below the hero
 * appears to rise out of the clouds.
 *
 * Purely decorative and positioned absolutely — the parent sets the size.
 */
export function SkyBackdrop({ compact = false }: { compact?: boolean }) {
  const scale = compact ? 0.55 : 1;
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #061630 0%, #0b2a5c 26%, #1c5eb3 54%, #62a8e8 74%, #b9d9f5 86%, #fde2c1 95%, #fff3e4 100%)',
        }}
      />
      {/* A few faint stars, only in the dark upper sky. */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1px 1px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 27% 42%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 44% 12%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 63% 30%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 81% 16%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 92% 44%, #fff 50%, transparent 51%)',
        }}
      />
      {/* Sun just below the cloud line. */}
      <div
        className="absolute rounded-full"
        style={{
          right: '6%',
          bottom: compact ? -120 : -60,
          width: 560 * scale + 200,
          height: 560 * scale + 200,
          background:
            'radial-gradient(circle, rgba(255,214,165,0.85) 0%, rgba(255,190,125,0.35) 32%, rgba(255,190,125,0) 66%)',
        }}
      />
      <CloudBand bottom={86 * scale} height={170 * scale} duration={150} opacity={0.35} fill="#ffffff" />
      <CloudBand bottom={40 * scale} height={190 * scale} duration={95} opacity={0.65} fill="#ffffff" />
      <CloudBand bottom={-2} height={200 * scale} duration={60} opacity={1} fill="#f4f7fb" />
    </div>
  );
}
