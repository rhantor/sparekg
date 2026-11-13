'use client';
import { useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, KeyRound, Plane, Ticket } from 'lucide-react';
import { SkyBackdrop } from '@/components/sky/SkyBackdrop';
import { Magnetic, SplitWords } from '@/components/ui/Interactive';

// WebGL only runs in the browser; the hero renders fine before it arrives.
const Globe = dynamic(() => import('@/components/sky/Globe'), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;
const fade = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay, ease: EASE },
});

/** A glass chip that floats near the globe and drifts with the pointer. */
function Chip({ icon, label, className, depth }: { icon: React.ReactNode; label: string; className: string; depth: number }) {
  return (
    <div
      className={`absolute pointer-events-none transition-transform duration-500 ease-out ${className}`}
      style={{ transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth * 0.7}px), 0)` }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 1.1 + depth / 100, ease: EASE }}
        className="flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-3.5 py-2 text-xs font-medium text-white shadow-[0_10px_30px_rgba(4,16,38,0.35)]"
      >
        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">{icon}</span>
        {label}
      </motion.div>
    </div>
  );
}

/**
 * The view from a window seat, with the corridor on a globe that follows the
 * pointer. Real flights are on the board below — nothing here is a fake listing.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);

  return (
    <section
      ref={section}
      className="relative overflow-hidden text-white"
      onPointerMove={(e) => {
        const el = section.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        el.style.setProperty('--px', `${((e.clientX - r.left) / r.width) * 2 - 1}`);
        el.style.setProperty('--py', `${((e.clientY - r.top) / r.height) * 2 - 1}`);
      }}
    >
      <SkyBackdrop parallax />

      {/* A soft light that follows the cursor across the sky. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden md:block"
        style={{
          background:
            'radial-gradient(520px circle at var(--mx, 70%) var(--my, 30%), rgba(160, 200, 255, 0.16), transparent 60%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 md:px-6 pt-32 sm:pt-40 pb-56 sm:pb-72 grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-4 items-center">
        <div className="relative z-10">
          <motion.span
            {...fade(0)}
            className="inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur px-4 py-1.5 text-sm"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-75 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-gold" />
            </span>
            Now boarding · Malaysia → Bangladesh
          </motion.span>

          <h1 className="font-display text-[3.4rem] sm:text-7xl lg:text-[5.6rem] leading-[0.95] mt-7 text-white!">
            <SplitWords text="Send it with someone" delay={0.15} />
            <SplitWords
              text="already flying."
              delay={0.45}
              className="block"
              wordClassName="italic bg-gradient-to-r from-[#ffe2b8] via-[#ffc27a] to-[#ff9f6b] bg-clip-text text-transparent"
            />
          </h1>

          <motion.p {...fade(0.7)} className="text-lg text-white/75 mt-6 max-w-md leading-relaxed">
            SpareKG matches your parcel with a verified traveler who has spare baggage allowance.
            Cheaper than a courier, and it lands when they do.
          </motion.p>

          <motion.div {...fade(0.85)} className="flex flex-wrap gap-3 mt-9">
            <Magnetic>
              <Link
                href="/#feeds"
                className="group relative inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-navy font-semibold shadow-float overflow-hidden"
              >
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-[#ffe2b8]/70 to-transparent" />
                <span className="relative">Find a flight</span>
                <ArrowRight className="relative w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/35 font-semibold hover:bg-white/10 transition-colors"
              >
                <Plane className="w-4 h-4 transition-transform duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:-rotate-12" />
                {"I'm travelling"}
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div {...fade(1)} className="flex flex-wrap gap-x-7 gap-y-2 mt-9 text-sm text-white/70">
            <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> ID-verified travelers</span>
            <span className="inline-flex items-center gap-2"><Ticket className="w-4 h-4" /> Tickets checked by our team</span>
            <span className="inline-flex items-center gap-2"><KeyRound className="w-4 h-4" /> Code-confirmed delivery</span>
          </motion.div>
        </div>

        {/* The corridor on a globe — drag it, or just move the mouse. */}
        <motion.div
          className="relative h-[340px] sm:h-[440px] lg:h-[580px] lg:-mr-16 -mt-4 lg:mt-0"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.3, ease: EASE }}
        >
          <Globe className="absolute inset-0" />
          <Chip className="left-[4%] top-[18%] hidden sm:block" depth={-26} icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Traveler ID checked" />
          <Chip className="right-[6%] top-[8%] hidden sm:block" depth={34} icon={<Ticket className="w-3.5 h-3.5" />} label="Ticket verified" />
          <Chip className="right-[10%] bottom-[14%] hidden sm:block" depth={-40} icon={<KeyRound className="w-3.5 h-3.5" />} label="Delivered by code" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-1 text-[0.65rem] font-code uppercase tracking-[0.25em] text-white/45 hidden lg:block">
            Drag to spin · KUL → DAC
          </div>
        </motion.div>
      </div>
    </section>
  );
}
