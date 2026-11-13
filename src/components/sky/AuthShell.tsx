'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { SkyBackdrop } from './SkyBackdrop';
import { FlightArc } from './FlightArc';
import { SplitWords } from '@/components/ui/Interactive';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Sign-in, sign-up and password reset: a single white card held above the
 * clouds. `footer` sits inside the card so it stays readable over any part of
 * the sky. The clouds drift with the pointer and a route loops behind the card.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="site relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
      <SkyBackdrop parallax />

      {/* A flight path looping across the sky, behind everything. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-[14%] w-[min(1100px,140vw)] -translate-x-1/2 opacity-40 pointer-events-none transition-transform duration-700 ease-out"
        style={{ transform: 'translate3d(calc(-50% + var(--px, 0) * 18px), calc(var(--py, 0) * 10px), 0)' }}
      >
        <FlightArc loop tone="dark" className="w-full" />
      </div>

      <div className="relative w-full max-w-[410px]">
        <div className="text-center mb-7">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <Link
              href="/"
              className="group inline-flex items-center gap-2 text-white font-semibold text-lg"
              aria-label="SpareKG home"
            >
              <span className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110">
                <Plane className="w-5 h-5" />
              </span>
              <span>Spare<span className="text-gold">KG</span></span>
            </Link>
          </motion.div>
          <h1 className="font-display text-4xl mt-6 text-white!">
            <SplitWords text={title} delay={0.1} />
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-sm text-white/75 mt-2"
          >
            {subtitle}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
          style={{ transformPerspective: 1200 }}
          className="bg-white rounded-3xl shadow-[0_40px_90px_rgba(4,16,38,0.35)] p-6 sm:p-7"
        >
          {children}
          {footer && <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ash">{footer}</div>}
        </motion.div>
      </div>
    </div>
  );
}
