'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, KeyRound, Plane, Ticket } from 'lucide-react';
import { SkyBackdrop } from '@/components/sky/SkyBackdrop';
import { FlightArc } from '@/components/sky/FlightArc';
import { PassField } from '@/components/sky/BoardingPass';

const EASE = [0.22, 1, 0.36, 1] as const;
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

/**
 * The view from a window seat. The pass on the right describes how SpareKG
 * works rather than a made-up listing — real flights are on the board below.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden text-white">
      <SkyBackdrop />

      <div className="relative max-w-6xl mx-auto px-5 md:px-6 pt-36 sm:pt-40 pb-64 sm:pb-72 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.span
            variants={item}
            className="inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur px-4 py-1.5 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-gold" />
            Now boarding · Malaysia → Bangladesh
          </motion.span>

          <motion.h1
            variants={item}
            className="font-display text-[3.6rem] sm:text-7xl lg:text-[5.6rem] leading-[0.95] mt-7 text-white!"
          >
            Send it with someone <em className="block text-[#ffd9a8]">already flying.</em>
          </motion.h1>

          <motion.p variants={item} className="text-lg text-white/75 mt-6 max-w-md leading-relaxed">
            SpareKG matches your parcel with a verified traveler who has spare baggage allowance.
            Cheaper than a courier, and it lands when they do.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap gap-3 mt-9">
            <Link
              href="/#feeds"
              className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-navy font-semibold shadow-float hover:-translate-y-0.5 transition-transform"
            >
              Find a flight
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/35 font-semibold hover:bg-white/10 transition-colors"
            >
              <Plane className="w-4 h-4" />
              {"I'm travelling"}
            </Link>
          </motion.div>

          <motion.div variants={item} className="flex flex-wrap gap-x-7 gap-y-2 mt-9 text-sm text-white/70">
            <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> ID-verified travelers</span>
            <span className="inline-flex items-center gap-2"><Ticket className="w-4 h-4" /> Tickets checked by our team</span>
            <span className="inline-flex items-center gap-2"><KeyRound className="w-4 h-4" /> Code-confirmed delivery</span>
          </motion.div>
        </motion.div>

        {/* A pass held at altitude. */}
        <motion.div
          className="hidden lg:block"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: EASE }}
        >
          <div className="sky-float ml-auto max-w-[25rem] rounded-[28px] bg-white text-navy p-7 shadow-[0_40px_90px_rgba(4,16,38,0.45)]">
            <div className="flex items-center justify-between font-code text-[0.65rem] uppercase tracking-[0.2em] text-ash">
              <span>Boarding pass</span>
              <span>SpareKG</span>
            </div>
            <FlightArc loop className="w-full mt-2" />
            <div className="flex items-end justify-between -mt-3">
              <div>
                <div className="font-code text-5xl font-semibold leading-none">KUL</div>
                <div className="text-xs text-ash mt-1.5">Kuala Lumpur</div>
              </div>
              <div className="text-right">
                <div className="font-code text-5xl font-semibold leading-none">DAC</div>
                <div className="text-xs text-ash mt-1.5">Dhaka</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t-2 border-dashed border-line">
              <PassField label="Traveler" value="ID checked" />
              <PassField label="Ticket" value="Verified" />
              <PassField label="Delivery" value="By code" align="right" />
            </div>
            <div className="sky-barcode text-navy/80 mt-6 rounded-sm" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
