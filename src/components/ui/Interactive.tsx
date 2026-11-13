'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

/** A number that counts up to its value; anything non-numeric is shown as is. */
export function CountUp({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const m = /^(\d+(?:\.\d+)?)$/.exec(value);
    const el = ref.current;
    if (!m || reduce || !el) return;
    const decimals = (m[1].split('.')[1] ?? '').length;
    const controls = animate(0, parseFloat(m[1]), {
      duration: 1.3,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { el.textContent = v.toFixed(decimals); },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span ref={ref} className={className}>{value}</span>;
}

const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Pulls its child towards the cursor while the cursor is near, and springs back
 * when it leaves — for primary calls to action.
 */
export function Magnetic({ children, strength = 0.35, className = '' }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.6 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.6 });

  return (
    <motion.div
      ref={ref}
      className={`inline-block ${className}`}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || !finePointer() || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Tilts its child in 3D towards the cursor and sweeps a soft highlight across
 * it, like turning a card in the light.
 */
export function Tilt({ children, max = 8, className = '', radius = '1.5rem' }: { children: ReactNode; max?: number; className?: string; radius?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 180, damping: 18 });
  const ry = useSpring(0, { stiffness: 180, damping: 18 });

  return (
    <div className={`[perspective:1100px] ${className}`}>
      <motion.div
        ref={ref}
        className="relative [transform-style:preserve-3d] group/tilt"
        style={{ rotateX: rx, rotateY: ry }}
        onPointerMove={(e) => {
          if (reduce || !finePointer() || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry.set((px - 0.5) * max * 2);
          rx.set(-(py - 0.5) * max * 2);
          ref.current.style.setProperty('--shine-x', `${px * 100}%`);
          ref.current.style.setProperty('--shine-y', `${py * 100}%`);
        }}
        onPointerLeave={() => { rx.set(0); ry.set(0); }}
      >
        {children}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover/tilt:opacity-100 transition-opacity duration-300 mix-blend-soft-light"
          style={{ borderRadius: radius, background: 'radial-gradient(420px circle at var(--shine-x,50%) var(--shine-y,50%), rgba(255,255,255,0.55), transparent 45%)' }}
        />
      </motion.div>
    </div>
  );
}

/**
 * A celebration for a finished step: a burst of light from the icon and a
 * small plane taking off across it. Place inside a `relative` container.
 */
export function Takeoff({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const COLORS = ['#ffc27a', '#1f6feb', '#9cc3ff', '#12805c', '#ff9f6b'];
  return (
    <div className="relative inline-flex items-center justify-center">
      {!reduce &&
        Array.from({ length: 18 }, (_, i) => {
          const a = (i / 18) * Math.PI * 2;
          const d = 70 + (i % 3) * 22;
          return (
            <motion.span
              key={i}
              aria-hidden
              className="absolute w-2 h-2 rounded-full"
              style={{ background: COLORS[i % COLORS.length] }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: [0, 1.2, 0.4], opacity: [1, 1, 0] }}
              transition={{ duration: 1.1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      <motion.div
        initial={reduce ? false : { scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      >
        {children}
      </motion.div>
      {!reduce && (
        <motion.svg
          aria-hidden
          viewBox="0 0 24 24"
          className="absolute w-6 h-6 text-navy"
          initial={{ x: -120, y: 50, opacity: 0, rotate: -20 }}
          animate={{ x: 160, y: -90, opacity: [0, 1, 1, 0], rotate: -28 }}
          transition={{ duration: 1.6, delay: 0.4, ease: 'easeIn' }}
        >
          <path
            fill="currentColor"
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            transform="rotate(90 12 12)"
          />
        </motion.svg>
      )}
    </div>
  );
}

/** Words rise into place one after another. */
export function SplitWords({ text, className = '', delay = 0, wordClassName = '' }: { text: string; className?: string; delay?: number; wordClassName?: string }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={`inline-block ${wordClassName}`}
            initial={{ y: '110%', rotate: 4 }}
            animate={{ y: '0%', rotate: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
