'use client';
import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

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
