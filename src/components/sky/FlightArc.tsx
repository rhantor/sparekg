'use client';

import { useEffect, useId } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

/** lucide "plane", nose pointing up-right. Closed shape, so it fills solid. */
export const PLANE_PATH =
  'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z';

// One quadratic curve, origin to destination, in viewBox units.
const W = 600;
const H = 164;
const P0 = { x: 34, y: 138 };
const P1 = { x: 300, y: -26 };
const P2 = { x: 566, y: 138 };
const D = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`;

function pointAt(t: number) {
  const u = 1 - t;
  return {
    x: u * u * P0.x + 2 * u * t * P1.x + t * t * P2.x,
    y: u * u * P0.y + 2 * u * t * P1.y + t * t * P2.y,
  };
}

/** Direction of travel at t, in degrees. */
function headingAt(t: number) {
  const dx = 2 * (1 - t) * (P1.x - P0.x) + 2 * t * (P2.x - P1.x);
  const dy = 2 * (1 - t) * (P1.y - P0.y) + 2 * t * (P2.y - P1.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

interface FlightArcProps {
  /** How far along the route the plane is, 0 (origin) to 1 (destination). */
  progress?: number;
  /** Fly origin to destination on repeat — for decorative use, not status. */
  loop?: boolean;
  /** 'dark' = drawn for a dark panel (white plane); 'light' = for white cards. */
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * A route drawn as a flight path, with a plane on it. Moving `progress`
 * glides the plane to its new position and draws the travelled part of the
 * line behind it. Honours the reduced-motion setting by jumping straight there.
 */
export function FlightArc({ progress = 0, loop = false, tone = 'light', className }: FlightArcProps) {
  const reduce = useReducedMotion();
  const gradientId = useId();
  const t = useMotionValue(loop ? 0 : Math.min(progress, 0.02));

  useEffect(() => {
    if (reduce) {
      t.set(loop ? 0.5 : progress);
      return;
    }
    const controls = loop
      ? animate(t, [0, 1], { duration: 6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.4 })
      : animate(t, progress, { duration: 1.8, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [progress, loop, reduce, t]);

  // The plane is 24 units wide; framer rotates SVG elements about their own
  // centre, so offsetting by 12 puts that centre on the curve.
  const x = useTransform(t, (v) => pointAt(v).x - 12);
  const y = useTransform(t, (v) => pointAt(v).y - 12);
  const rotate = useTransform(t, (v) => headingAt(v) + 45);
  // On a loop the plane restarts at the origin; fade it at both ends so it
  // takes off and lands instead of teleporting.
  const opacity = useTransform(t, [0, 0.07, 0.93, 1], loop ? [0, 1, 1, 0] : [1, 1, 1, 1]);

  const dark = tone === 'dark';
  const dash = dark ? 'rgba(255,255,255,0.35)' : 'var(--color-haze)';
  const planeFill = dark ? '#ffffff' : 'var(--color-azure)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Flight route">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={dark ? '#ffd9a8' : '#1f6feb'} stopOpacity={dark ? 0.9 : 0.25} />
          <stop offset="1" stopColor={dark ? '#ffffff' : '#1f6feb'} />
        </linearGradient>
      </defs>

      <path d={D} fill="none" stroke={dash} strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      <motion.path
        d={D}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ pathLength: t }}
      />

      {/* Origin and destination markers. */}
      <circle cx={P0.x} cy={P0.y} r="5" fill={planeFill} />
      <circle cx={P2.x} cy={P2.y} r="5" fill="none" stroke={planeFill} strokeWidth="2.5" />

      <motion.g style={{ x, y, rotate, opacity }}>
        <path d={PLANE_PATH} fill={planeFill} />
      </motion.g>
    </svg>
  );
}
