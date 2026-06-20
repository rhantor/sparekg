'use client';
import { motion } from 'framer-motion';
import { Plane, Package, ShieldCheck, Star, ArrowRight } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { HeroArt } from './HeroArt';

const EASE = [0.22, 1, 0.36, 1] as const;
const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

const STATS = [
  { num: '50%', label: 'Avg. weight unused per flight' },
  { num: '3×', label: 'Cheaper than couriers' },
  { num: '48h', label: 'Faster than parcel post' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sand to-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full bg-teal/10 blur-[120px]" />
        <div className="absolute top-40 -left-32 w-[30rem] h-[30rem] rounded-full bg-ocean/10 blur-[120px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-36 pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — content (staggered entrance) */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="inline-flex items-center gap-2 bg-white border border-line text-navy px-3.5 py-1.5 rounded-full text-xs font-medium shadow-soft mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            Now live · Malaysia → Bangladesh
          </motion.div>
          <motion.h1 variants={item} className="font-display text-[2.6rem] sm:text-5xl lg:text-[3.4rem] leading-[1.05] text-navy mb-6">
            Share the journey,<br />share the weight.
          </motion.h1>
          <motion.p variants={item} className="text-lg leading-relaxed text-ash max-w-lg mb-9">
            SpareKG connects travelers with unused luggage capacity to people sending items
            internationally — faster, cheaper, and through a verified community.
          </motion.p>
          <motion.div variants={item} className="flex flex-wrap gap-3">
            <a href="#beta" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors shadow-soft hover:-translate-y-0.5 transition-transform">
              <Plane className="w-4 h-4 text-teal-500" /> I&apos;m a Traveler
            </a>
            <a href="#beta" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-navy font-semibold border border-line hover:border-navy/25 transition-colors">
              <Package className="w-4 h-4 text-teal" /> I want to Send
            </a>
          </motion.div>

          <motion.div variants={item} className="flex gap-10 mt-12 pt-8 border-t border-line">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-[1.7rem] font-semibold text-navy">{s.num}</div>
                <div className="text-[0.8rem] text-ash mt-1 max-w-[120px]">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right — transparent flight illustration with floating cards */}
        <motion.div
          className="relative mx-auto w-full max-w-[480px]"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        >
          <HeroArt className="w-full h-auto" />

          {/* floating flight card (top-right) */}
          <motion.div
            className="absolute top-2 right-0 sm:-right-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.55 }}
          >
            <motion.div
              className="bg-white rounded-2xl border border-line shadow-float p-3.5 w-[13.5rem]"
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-navy">
                <span className="w-6 h-6 rounded-lg bg-ocean/10 flex items-center justify-center">
                  <Plane className="w-3.5 h-3.5 text-ocean" />
                </span>
                Kuala Lumpur → Dhaka
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                <div>
                  <div className="text-[0.65rem] text-ash">Spare weight</div>
                  <div className="text-sm font-semibold text-navy">7 KG</div>
                </div>
                <div className="text-right">
                  <div className="text-[0.65rem] text-ash">From</div>
                  <div className="text-sm font-semibold text-teal-700">RM 18<span className="text-ash font-normal">/kg</span></div>
                </div>
                <ArrowRight className="w-4 h-4 text-ash" />
              </div>
            </motion.div>
          </motion.div>

          {/* floating trust card (bottom-left) */}
          <motion.div
            className="absolute bottom-2 left-0 sm:-left-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.75 }}
          >
            <motion.div
              className="bg-white rounded-2xl border border-line shadow-float p-4 w-[15rem]"
              animate={{ y: [0, -11, 0] }}
              transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity, delay: 0.6 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  <Avatar name="Ahmad Musa" color="ocean" size={32} />
                  <Avatar name="Rahim Karim" color="teal" size={32} />
                  <Avatar name="Siti Nur" color="navy" size={32} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy">2,300+ members</div>
                  <div className="flex items-center gap-1 text-xs text-ash">
                    <ShieldCheck className="w-3 h-3 text-teal" /> identity verified
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-line text-xs text-ash">
                <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                <span className="font-semibold text-navy">4.9</span> avg rating · 1,200+ trips
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
