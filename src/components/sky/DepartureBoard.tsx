'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { PassFlight } from './BoardingPass';
import './sky.css';

/**
 * Open flights as an airport departure board. Rows flip in one after another,
 * the way a split-flap board settles.
 */
export function DepartureBoard({ flights, title = 'Departures' }: { flights: PassFlight[]; title?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      className="sky-board rounded-3xl overflow-hidden text-white shadow-lift"
      style={{ background: 'linear-gradient(180deg, #0c2a55 0%, #071a36 100%)' }}
    >
      <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-horizon/60 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-horizon" />
          </span>
          <span className="font-code text-sm font-semibold uppercase tracking-[0.2em]">{title}</span>
        </div>
        <span className="font-code text-xs text-white/50 uppercase tracking-[0.16em]">Malaysia → Bangladesh</span>
      </div>

      <div className="hidden sm:grid grid-cols-[5.5rem_5.5rem_1fr_1fr_5rem_5.5rem_2rem] gap-4 px-7 py-3 font-code text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
        <span>Date</span><span>Flight</span><span>Route</span><span>Traveler</span>
        <span className="text-right">Space</span><span className="text-right">Per kg</span><span />
      </div>

      <ul>
        {flights.map((f, i) => (
          <motion.li
            key={f.id}
            initial={reduce ? false : { rotateX: -80, opacity: 0 }}
            whileInView={{ rotateX: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: 'top' }}
            className="border-t border-white/[0.07]"
          >
            <a
              href="#"
              className="group grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[5.5rem_5.5rem_1fr_1fr_5rem_5.5rem_2rem] gap-4 items-center px-5 sm:px-7 py-4 font-code text-sm hover:bg-white/[0.05] transition-colors"
            >
              <span className="text-horizon">{f.date}</span>
              <span className="hidden sm:block text-white/70">{f.flightNo}</span>
              <span className="font-semibold tracking-wide">
                {f.from} <span className="text-white/40">→</span> {f.to}
                <span className="sm:hidden block text-xs font-normal text-white/50 mt-0.5">
                  {f.kgLeft} kg · RM {f.pricePerKg}/kg
                </span>
              </span>
              <span className="hidden sm:block text-white/70 truncate font-sans">{f.traveler}</span>
              <span className="hidden sm:block text-right">{f.kgLeft} kg</span>
              <span className="hidden sm:block text-right">RM {f.pricePerKg}</span>
              <ArrowRight className="w-4 h-4 text-white/40 justify-self-end group-hover:text-white group-hover:translate-x-1 transition-all" />
            </a>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
