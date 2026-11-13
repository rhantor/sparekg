'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Handshake, KeyRound, PackageCheck, Ticket } from 'lucide-react';
import { Magnetic } from '@/components/ui/Interactive';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);

const STEPS = [
  {
    icon: Ticket,
    kicker: 'Before take-off',
    title: 'A traveler lists their spare kilos',
    body: 'Route, date and how much room is left. Our team checks the ticket before the flight goes on the board.',
  },
  {
    icon: Handshake,
    kicker: 'Booking',
    title: 'You book the space',
    body: 'Place a bid for your parcel. Once the traveler accepts, the price and weight are locked in for both of you.',
  },
  {
    icon: PackageCheck,
    kicker: 'Handover in Kuala Lumpur',
    title: 'The parcel is checked and handed over',
    body: 'The traveler sees what they are carrying before confirming the handover. Nothing sealed, nothing hidden.',
  },
  {
    icon: KeyRound,
    kicker: 'Landed in Dhaka',
    title: 'Delivered with a one-time code',
    body: 'Your recipient shares their code at pickup. The delivery only completes when the code matches.',
  },
];

// One curve from KUL (left, low) to DAC (right, high), in a 1000 × 460 box.
const PATH = 'M 90 370 C 260 380 330 210 470 200 S 700 250 760 170 S 860 95 910 95';

const CLOUDS = [
  { x: 120, y: 300, s: 1.1 }, { x: 380, y: 330, s: 0.8 }, { x: 600, y: 300, s: 1.3 },
  { x: 860, y: 320, s: 0.9 }, { x: 1080, y: 290, s: 1.2 }, { x: 1300, y: 330, s: 0.9 },
];

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
      <ellipse cx="0" cy="0" rx="60" ry="18" />
      <ellipse cx="-22" cy="-12" rx="26" ry="20" />
      <ellipse cx="16" cy="-16" rx="32" ry="24" />
    </g>
  );
}

/**
 * How a delivery works, told as one flight: scrolling flies the plane from
 * Kuala Lumpur to Dhaka, and each leg of the trip reveals the next step.
 */
export function Journey() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const path = root.current!.querySelector<SVGPathElement>('#journey-path')!;
      const trail = root.current!.querySelector<SVGPathElement>('#journey-trail')!;
      const plane = q('#journey-plane')[0];
      const len = path.getTotalLength();

      // Put the four waypoints at even distances along the curve.
      q('.journey-dot').forEach((dot, i) => {
        const p = path.getPointAtLength((len * i) / (STEPS.length - 1));
        dot.setAttribute('transform', `translate(${p.x} ${p.y})`);
      });

      const mm = gsap.matchMedia();
      mm.add(
        { motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' },
        (ctx) => {
          if (ctx.conditions?.reduce) {
            gsap.set(trail, { strokeDasharray: len, strokeDashoffset: 0 });
            gsap.set(plane, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, end: 1 } });
            gsap.set(q('.journey-dot'), { attr: { 'data-on': 'true' } });
            return;
          }

          gsap.set(trail, { strokeDasharray: len, strokeDashoffset: len });
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=2600',
              scrub: 0.9,
              pin: q('.journey-stage')[0],
              anticipatePin: 1,
              onUpdate: (self) => {
                // A step is current from halfway along the previous leg, so the
                // card changes as the plane approaches each waypoint.
                const idx = Math.round(self.progress * (STEPS.length - 1));
                setActive((prev) => (prev === idx ? prev : idx));
                q('.journey-dot').forEach((dot, i) => {
                  dot.setAttribute('data-on', String(self.progress >= i / (STEPS.length - 1) - 0.01));
                });
              },
            },
          });
          tl.to(trail, { strokeDashoffset: 0, duration: 1 }, 0)
            .to(plane, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 1 }, 0)
            .to(q('.journey-clouds'), { x: -420, duration: 1 }, 0)
            .to(q('.journey-dawn'), { opacity: 1, duration: 1 }, 0)
            .to(q('.journey-stars'), { opacity: 0.1, duration: 1 }, 0);
        },
      );
    },
    { scope: root },
  );

  const step = STEPS[active];
  const Icon = step.icon;

  return (
    <section id="how" ref={root} className="relative bg-navy text-white scroll-mt-0">
      <div className="journey-stage relative h-screen min-h-[620px] overflow-hidden">
        {/* Night sky that warms to dawn as the flight goes on. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[#041127] via-[#0b2a5c] to-[#1c5eb3]" />
        <div
          aria-hidden
          className="journey-dawn absolute inset-0 opacity-0"
          style={{ background: 'linear-gradient(180deg, #0b2a5c 0%, #3d6fb8 45%, #f2b98a 85%, #ffd9a8 100%)' }}
        />
        <div
          aria-hidden
          className="journey-stars absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(1px 1px at 8% 12%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 22% 30%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 37% 8%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 55% 22%, #fff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 71% 10%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 88% 26%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 95% 6%, #fff 50%, transparent 51%)',
          }}
        />

        <div className="relative h-full max-w-6xl mx-auto px-5 md:px-6 pt-24 pb-10 flex flex-col">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-code text-xs uppercase tracking-[0.25em] text-[#9cc3ff]">How it works</p>
              <h2 className="font-display text-4xl sm:text-6xl text-white! mt-3 leading-[1]">One parcel, one flight.</h2>
            </div>
            <div className="font-code text-right shrink-0">
              <div className="text-5xl sm:text-7xl leading-none text-white/90">
                0{active + 1}
                <span className="text-white/30 text-2xl sm:text-3xl">/0{STEPS.length}</span>
              </div>
            </div>
          </div>

          {/* The flight. */}
          <div className="relative flex-1 min-h-0 mt-4">
            <svg viewBox="0 0 1000 460" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
              <g className="journey-clouds" opacity="0.18">
                {CLOUDS.map((c, i) => <Cloud key={i} {...c} />)}
              </g>
              <path id="journey-path" d={PATH} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
              <path id="journey-trail" d={PATH} fill="none" stroke="url(#journey-grad)" strokeWidth="3.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="journey-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#9cc3ff" />
                  <stop offset="100%" stopColor="#ffc27a" />
                </linearGradient>
                <filter id="journey-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {STEPS.map((_, i) => (
                <g key={i} className="journey-dot group/dot" data-on={i === 0 ? 'true' : 'false'}>
                  <circle r="16" className="fill-white/0 stroke-white/30 transition-all duration-500 group-data-[on=true]/dot:stroke-[#ffc27a] group-data-[on=true]/dot:fill-[#ffc27a]/15" strokeWidth="1.5" />
                  <circle r="5" className="fill-white/40 transition-all duration-500 group-data-[on=true]/dot:fill-[#ffc27a]" />
                </g>
              ))}

              <text x="90" y="420" textAnchor="middle" className="fill-white font-code" fontSize="26" fontWeight="600">KUL</text>
              <text x="910" y="60" textAnchor="middle" className="fill-white font-code" fontSize="26" fontWeight="600">DAC</text>

              {/* The plane, nose pointing along +x so autoRotate follows the path. */}
              <g id="journey-plane" filter="url(#journey-glow)">
                <path
                  d="M -22 0 L 6 -3 L 14 -18 L 20 -18 L 15 -3 L 26 -2.5 Q 32 0 26 2.5 L 15 3 L 20 18 L 14 18 L 6 3 L -22 0 Z M -22 0 L -26 -9 L -21 -9 L -15 -1.5 Z M -22 0 L -26 9 L -21 9 L -15 1.5 Z"
                  fill="#ffffff"
                />
              </g>
            </svg>
          </div>

          {/* The step for the current leg. */}
          <div className="relative min-h-[11rem] sm:min-h-[9.5rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl rounded-3xl bg-navy/70 border border-white/15 backdrop-blur-xl p-6 shadow-[0_30px_60px_rgba(4,16,38,0.35)]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#ffc27a]/20 text-[#ffd9a8] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-code text-[0.7rem] uppercase tracking-[0.2em] text-white/60">{step.kicker}</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl text-white! mt-3">{step.title}</h3>
                <p className="text-white/70 mt-1.5 leading-relaxed">{step.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* After landing: the two ways in. */}
      <div className="relative bg-cloud text-navy px-5 md:px-6 py-20">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-5">
          {[
            { href: '/flights', title: 'Sending something home?', body: 'Find a verified traveler on your route and book their spare kilos.', cta: 'Find a flight' },
            { href: '/signup', title: 'Flying with room to spare?', body: 'List your allowance, choose what you carry, and earn on the way.', cta: 'Post your flight' },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group rounded-3xl bg-white p-7 shadow-soft border border-line hover:-translate-y-1 hover:shadow-float transition-all duration-300">
              <h3 className="font-display text-2xl text-navy">{c.title}</h3>
              <p className="text-ash mt-2">{c.body}</p>
              <Magnetic strength={0.2} className="mt-5">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
                  {c.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Magnetic>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
