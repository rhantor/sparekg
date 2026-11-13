'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BadgeCheck, Check, Clock, KeyRound, MessageCircle, Minus, Package, Phone, Plane,
  Plus, ShieldCheck, Ticket,
} from 'lucide-react';
import { SkyBackdrop } from '@/components/sky/SkyBackdrop';
import { FlightArc } from '@/components/sky/FlightArc';
import { DepartureBoard } from '@/components/sky/DepartureBoard';
import {
  BoardingPass, PassField, PassRoute, PassTraveler, SpaceMeter,
} from '@/components/sky/BoardingPass';
import { DEMO_FLIGHTS } from './demo-data';

type Screen = 'landing' | 'flights' | 'delivery';

const SCREENS: { key: Screen; label: string }[] = [
  { key: 'landing', label: 'Landing' },
  { key: 'flights', label: 'Flights' },
  { key: 'delivery', label: 'Delivery' },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export default function DesignPreviewPage() {
  const [screen, setScreen] = useState<Screen>('landing');

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {screen === 'landing' && <LandingScreen onBrowse={() => setScreen('flights')} />}
          {screen === 'flights' && <FlightsScreen />}
          {screen === 'delivery' && <DeliveryScreen />}
        </motion.div>
      </AnimatePresence>

      {/* Review control — not part of the design. */}
      <div className="fixed bottom-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-night/90 backdrop-blur-md p-1.5 shadow-lift text-sm">
          <span className="hidden sm:block px-3 font-code text-[0.65rem] uppercase tracking-[0.16em] text-white/50">
            Preview · sample data
          </span>
          {SCREENS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setScreen(s.key);
                window.scrollTo({ top: 0 });
              }}
              className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                screen === s.key ? 'bg-white text-night' : 'text-white/70 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- Shared chrome ----------------------------------------------------------------

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 text-xl font-semibold tracking-tight ${dark ? 'text-night' : 'text-white'}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? 'bg-night' : 'bg-white/15 backdrop-blur'}`}>
        <Plane className="w-4 h-4 text-white" />
      </span>
      Spare<span className={dark ? 'text-azure' : 'text-[#ffd9a8]'}>KG</span>
    </span>
  );
}

/** Signed-in header, sitting on a short strip of sky. */
function AppHeader({ active, title, subtitle }: { active: string; title: string; subtitle: string }) {
  return (
    <header className="relative overflow-hidden text-white">
      <SkyBackdrop compact />
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between py-5">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-md p-1 text-sm">
            {['Home', 'Flights', 'Post', 'Bids', 'Deliveries'].map((item) => (
              <span
                key={item}
                className={`px-4 py-2 rounded-full font-medium ${
                  item === active ? 'bg-white text-night' : 'text-white/80'
                }`}
              >
                {item}
              </span>
            ))}
          </nav>
          <span className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xs font-semibold">
            NS
          </span>
        </div>
        <div className="pt-8 pb-36 sm:pb-40">
          <h1 className="font-flight text-5xl sm:text-6xl leading-none">{title}</h1>
          <p className="text-white/75 mt-3 max-w-lg">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

// ---- Screen 1: landing ------------------------------------------------------------

const STEPS = [
  { n: '01', title: 'Check in', text: 'Find a traveler on your route and place a bid for the kilos you need. Bidding is free.' },
  { n: '02', title: 'Board', text: 'Meet, let the traveler inspect the parcel, and hand it over. Both of you confirm in the app.' },
  { n: '03', title: 'Land', text: 'Your recipient gives the traveler a 6-digit code on delivery. That closes the trip.' },
];

function LandingScreen({ onBrowse }: { onBrowse: () => void }) {
  const hero = DEMO_FLIGHTS[0];
  return (
    <>
      <section className="relative overflow-hidden text-white">
        <SkyBackdrop />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between py-6">
            <Logo />
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
              <span>How it works</span>
              <span>Open flights</span>
              <span>Safety</span>
              <span>Sign in</span>
              <span className="px-5 py-2.5 rounded-full bg-white text-night font-semibold">Join the beta</span>
            </nav>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center pt-10 sm:pt-16 pb-64 sm:pb-72">
            <div>
              <span className="inline-flex items-center gap-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur px-4 py-1.5 text-sm">
                <span className="w-2 h-2 rounded-full bg-horizon" />
                Now boarding · Malaysia → Bangladesh
              </span>
              <h1 className="font-flight text-[3.6rem] sm:text-7xl lg:text-[5.6rem] leading-[0.95] mt-7">
                Send it with someone <em className="block text-[#ffd9a8]">already flying.</em>
              </h1>
              <p className="text-lg text-white/75 mt-6 max-w-md leading-relaxed">
                SpareKG matches your parcel with a verified traveler who has spare baggage allowance.
                Cheaper than a courier, and it lands when they do.
              </p>
              <div className="flex flex-wrap gap-3 mt-9">
                <button
                  onClick={onBrowse}
                  className="group inline-flex items-center gap-2 px-7 py-4 rounded-full bg-white text-night font-semibold shadow-lift hover:-translate-y-0.5 transition-transform"
                >
                  Find a flight
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/35 font-semibold hover:bg-white/10 transition-colors">
                  <Plane className="w-4 h-4" />
                  {"I'm travelling"}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-2 mt-9 text-sm text-white/70">
                <span className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> ID-verified travelers</span>
                <span className="inline-flex items-center gap-2"><Ticket className="w-4 h-4" /> Tickets checked by our team</span>
                <span className="inline-flex items-center gap-2"><KeyRound className="w-4 h-4" /> Code-confirmed delivery</span>
              </div>
            </div>

            {/* A pass held at altitude. */}
            <div className="hidden lg:block">
              <div className="sky-float ml-auto max-w-[25rem] rounded-[28px] bg-white text-night p-7 shadow-[0_40px_90px_rgba(4,16,38,0.45)]">
                <div className="flex items-center justify-between font-code text-[0.65rem] uppercase tracking-[0.2em] text-ash">
                  <span>Boarding pass</span>
                  <span>{hero.flightNo}</span>
                </div>
                <FlightArc loop className="w-full mt-2" />
                <div className="flex items-end justify-between -mt-3">
                  <div>
                    <div className="font-code text-5xl font-semibold leading-none">{hero.from}</div>
                    <div className="text-xs text-ash mt-1.5">{hero.fromCity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-code text-5xl font-semibold leading-none">{hero.to}</div>
                    <div className="text-xs text-ash mt-1.5">{hero.toCity}</div>
                  </div>
                </div>
                <div className="grid grid-cols-[auto_1fr_auto] gap-6 mt-6 pt-5 border-t-2 border-dashed border-haze">
                  <PassField label="Departs" value={`${hero.date}, ${hero.departs}`} />
                  <PassField label="Space" value={`${hero.kgLeft} kg`} />
                  <PassField label="Per kg" value={`RM ${hero.pricePerKg}`} align="right" />
                </div>
                <div className="sky-barcode text-night/80 mt-6 rounded-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto px-5 sm:px-8 -mt-32 sm:-mt-36 pb-36">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="font-code text-xs uppercase tracking-[0.2em] text-azure">Open flights</p>
            <h2 className="font-flight text-4xl sm:text-5xl text-night mt-2">Leaving soon</h2>
          </div>
          <button onClick={onBrowse} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-azure">
            See all flights <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <DepartureBoard flights={DEMO_FLIGHTS} />

        <div className="mt-24">
          <p className="font-code text-xs uppercase tracking-[0.2em] text-azure">How it works</p>
          <h2 className="font-flight text-4xl sm:text-5xl text-night mt-2 max-w-xl">
            Three steps, the same as any flight.
          </h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                className="rounded-3xl bg-white p-7 shadow-lift"
              >
                <span className="font-code text-sm text-azure">{s.n}</span>
                <h3 className="font-flight text-3xl text-night mt-4">{s.title}</h3>
                <p className="text-ash mt-3 leading-relaxed">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ---- Screen 2: browse + flight detail -----------------------------------------------

function FlightsScreen() {
  const detail = DEMO_FLIGHTS[0];
  const [kg, setKg] = useState(3);

  return (
    <>
      <AppHeader
        active="Flights"
        title="Flights to Bangladesh"
        subtitle="Every traveler is ID-verified, and our team checks each ticket before a bid can be accepted."
      />

      <main className="relative max-w-6xl mx-auto px-5 sm:px-8 -mt-24 sm:-mt-28 pb-36">
        <div className="flex flex-wrap gap-2 mb-6">
          {['All routes', 'KUL → DAC', 'PEN → DAC', 'KUL → CGP'].map((chip, i) => (
            <span
              key={chip}
              className={`px-4 py-2 rounded-full text-sm font-medium font-code shadow-lift ${
                i === 0 ? 'bg-night text-white' : 'bg-white text-night'
              }`}
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {DEMO_FLIGHTS.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 + i * 0.08, ease: EASE }}
            >
              <BoardingPass flight={f} />
            </motion.div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-24 mb-8">
          <span className="font-code text-xs uppercase tracking-[0.2em] text-azure">Flight detail</span>
          <span className="flex-1 border-t border-haze" />
        </div>

        <div className="sky-pass-shadow">
          <article className="sky-pass" style={{ '--stub': '340px' } as React.CSSProperties}>
            <div className="p-6 sm:p-9">
              <div className="flex items-center justify-between gap-3 mb-9">
                <PassTraveler flight={detail} size={52} />
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-azure-50 text-azure-600">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ticket verified
                </span>
              </div>
              <div className="group">
                <PassRoute flight={detail} large />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-6 mt-9 pt-7 border-t border-haze">
                <PassField label="Date" value={detail.date} />
                <PassField label="Departs" value={detail.departs} />
                <PassField label="Arrives" value={detail.arrives} />
                <PassField label="Flight" value={detail.flightNo} />
                <PassField label="Airline" value={detail.airline} />
                <PassField label="Accepts" value="Documents · Clothing · Gifts" />
              </div>
              <div className="mt-8 max-w-xs">
                <SpaceMeter flight={detail} />
              </div>
            </div>

            <div className="sky-pass-stub p-6 sm:p-8 bg-gradient-to-b from-white to-azure-50/70">
              <div className="flex items-baseline justify-between">
                <h2 className="font-flight text-3xl text-night">Place a bid</h2>
                <span className="font-code text-sm text-ash">RM {detail.pricePerKg}/kg</span>
              </div>

              <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ash mt-6 mb-2">Weight</label>
              <div className="flex items-center justify-between rounded-2xl bg-white border border-haze p-1.5">
                <button
                  onClick={() => setKg((v) => Math.max(1, v - 1))}
                  aria-label="Less"
                  className="w-10 h-10 rounded-xl bg-cloud flex items-center justify-center text-night hover:bg-haze transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-code text-xl font-semibold text-night">{kg} kg</span>
                <button
                  onClick={() => setKg((v) => Math.min(detail.kgLeft, v + 1))}
                  aria-label="More"
                  className="w-10 h-10 rounded-xl bg-cloud flex items-center justify-center text-night hover:bg-haze transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <label className="block text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ash mt-5 mb-2">What are you sending?</label>
              <textarea
                rows={2}
                placeholder="e.g. Winter clothes and two books"
                className="w-full rounded-2xl bg-white border border-haze px-4 py-3 text-sm text-night outline-none focus:border-azure resize-none placeholder:text-ash/60"
              />

              <div className="flex items-end justify-between mt-6">
                <span className="text-sm text-ash">You pay the traveler</span>
                <span className="font-flight text-5xl text-night leading-none">
                  <span className="text-2xl align-top mr-1">RM</span>{kg * detail.pricePerKg}
                </span>
              </div>
              <button className="group w-full mt-5 py-4 rounded-full bg-night text-white font-semibold inline-flex items-center justify-center gap-2 hover:bg-night-800 transition-colors">
                Place bid <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <p className="text-xs text-ash text-center mt-3">Bidding is free. You pay only if they accept, at handover.</p>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

// ---- Screen 3: delivery -------------------------------------------------------------

type DealStatus = 'AGREED' | 'HANDED_OVER' | 'DELIVERED';

const STAGES: { key: DealStatus; label: string; hint: string; progress: number }[] = [
  { key: 'AGREED', label: 'At the gate', hint: 'Waiting for handover', progress: 0.04 },
  { key: 'HANDED_OVER', label: 'In the air', hint: 'With the traveler', progress: 0.55 },
  { key: 'DELIVERED', label: 'Landed', hint: 'Delivered with the code', progress: 1 },
];

function DeliveryScreen() {
  const flight = DEMO_FLIGHTS[0];
  const [status, setStatus] = useState<DealStatus>('HANDED_OVER');
  const stageIndex = STAGES.findIndex((s) => s.key === status);
  const stage = STAGES[stageIndex];

  const steps = [
    { title: 'Bid accepted', detail: 'Contact details shared with both of you.', time: '16 Nov · 09:12', done: true },
    { title: 'Parcel handed over', detail: 'You handed it over, and the traveler confirmed receiving it.', time: '18 Nov · 11:40', done: stageIndex >= 1 },
    { title: 'Delivered', detail: 'Confirmed with the recipient’s code.', time: '18 Nov · 19:05', done: stageIndex >= 2 },
    { title: 'Completed', detail: '72 hours after delivery, if no problem is reported.', time: '', done: false },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <>
      <header className="relative overflow-hidden text-white">
        <SkyBackdrop compact />
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between py-5">
            <Logo />
            <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-md p-1 text-sm">
              {['Home', 'Flights', 'Post', 'Bids', 'Deliveries'].map((item) => (
                <span key={item} className={`px-4 py-2 rounded-full font-medium ${item === 'Deliveries' ? 'bg-white text-night' : 'text-white/80'}`}>
                  {item}
                </span>
              ))}
            </nav>
            <span className="w-9 h-9 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-xs font-semibold">NS</span>
          </div>
          <div className="h-44 sm:h-48" />
        </div>
      </header>

      <main className="relative max-w-6xl mx-auto px-5 sm:px-8 -mt-44 sm:-mt-48 pb-36">
        {/* The delivery, told as a flight. */}
        <section
          className="rounded-[28px] text-white p-6 sm:p-10 shadow-[0_30px_80px_rgba(7,26,54,0.35)]"
          style={{ background: 'linear-gradient(155deg, #071a36 0%, #0d3877 55%, #2a78d4 100%)' }}
        >
          <div className="flex items-center justify-between">
            <span className="font-code text-xs uppercase tracking-[0.2em] text-white/60">Your parcel · {flight.flightNo}</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 border border-white/20 px-3.5 py-1.5 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-horizon" /> {stage.label}
            </span>
          </div>

          <FlightArc progress={stage.progress} tone="dark" className="w-full max-w-3xl mx-auto mt-4" />

          <div className="flex items-start justify-between max-w-3xl mx-auto -mt-2">
            <div>
              <div className="font-code text-4xl sm:text-6xl font-semibold leading-none">{flight.from}</div>
              <div className="text-sm text-white/60 mt-2">{flight.fromCity}</div>
              <div className="font-code text-xs text-white/50 mt-1">{flight.date} · {flight.departs}</div>
            </div>
            <div className="text-center pt-1 hidden sm:block">
              <div className="font-flight text-3xl">{stage.hint}</div>
              <div className="text-sm text-white/60 mt-1">3 kg · Winter clothes for my mother</div>
            </div>
            <div className="text-right">
              <div className="font-code text-4xl sm:text-6xl font-semibold leading-none">{flight.to}</div>
              <div className="text-sm text-white/60 mt-2">{flight.toCity}</div>
              <div className="font-code text-xs text-white/50 mt-1">{flight.date} · {flight.arrives}</div>
            </div>
          </div>

          <div className="mt-9 pt-6 border-t border-white/12 flex flex-wrap items-center justify-between gap-3">
            <span className="font-code text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
              Preview only — move the status to see the plane fly
            </span>
            <div className="flex gap-1 rounded-full bg-white/10 p-1 text-sm">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                    s.key === status ? 'bg-white text-night' : 'text-white/75 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 mt-6">
          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-7 sm:p-8 shadow-lift">
              <h2 className="font-flight text-3xl text-night">Flight log</h2>
              <ol className="mt-7">
                {steps.map((s, i) => (
                  <li key={s.title} className="relative pl-12 pb-7 last:pb-0">
                    {i < steps.length - 1 && (
                      <span className={`absolute left-[15px] top-8 bottom-0 w-0.5 ${s.done ? 'bg-azure' : 'bg-haze'}`} />
                    )}
                    <span
                      className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-500 ${
                        s.done
                          ? 'bg-azure text-white'
                          : i === current
                            ? 'bg-white border-2 border-azure text-azure'
                            : 'bg-cloud border-2 border-haze text-ash'
                      }`}
                    >
                      {s.done ? <Check className="w-4 h-4" /> : <span className="font-code text-xs font-semibold">{i + 1}</span>}
                    </span>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`font-semibold ${s.done || i === current ? 'text-night' : 'text-ash'}`}>{s.title}</span>
                      {s.done && s.time && <span className="font-code text-xs text-ash shrink-0">{s.time}</span>}
                    </div>
                    <p className="text-sm text-ash mt-1">{s.detail}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-3xl bg-white p-7 sm:p-8 shadow-lift">
              <h2 className="font-flight text-3xl text-night flex items-center gap-3">
                <Package className="w-5 h-5 text-azure" /> Parcel
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 mt-6">
                <PassField label="Contents" value="Winter clothes" />
                <PassField label="Weight" value="3 kg" />
                <PassField label="Declared" value="RM 120" />
                <PassField label="Agreed price" value="RM 75" />
              </div>
              <p className="text-sm text-ash mt-6 pt-5 border-t border-haze">
                Pay the traveler RM 75 directly at handover. SpareKG takes no payment during the beta.
              </p>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl bg-white p-7 shadow-lift">
              <PassTraveler flight={flight} size={48} />
              <div className="grid grid-cols-2 gap-2.5 mt-6">
                <button className="inline-flex items-center justify-center gap-2 py-3 rounded-full border border-haze text-night font-semibold text-sm hover:border-night/30 transition-colors">
                  <Phone className="w-4 h-4" /> Call
                </button>
                <button className="inline-flex items-center justify-center gap-2 py-3 rounded-full bg-azure text-white font-semibold text-sm hover:bg-azure-600 transition-colors">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </button>
              </div>
              <p className="font-code text-xs text-ash text-center mt-3">+60 11-1111 1111</p>
            </section>

            {/* The code, as the stub you keep. */}
            <section className="sky-pass-shadow">
              <div className="rounded-3xl bg-white overflow-hidden">
                <div className="p-7">
                  <div className="flex items-center gap-2 font-code text-[0.65rem] uppercase tracking-[0.2em] text-ash">
                    <KeyRound className="w-3.5 h-3.5 text-azure" /> Delivery code
                  </div>
                  <div className="font-code text-5xl font-semibold tracking-[0.18em] text-night mt-4">447 520</div>
                  <p className="text-sm text-ash mt-4 leading-relaxed">
                    Send this to the person collecting in Dhaka. The traveler asks them for it — never give it to the traveler yourself.
                  </p>
                </div>
                <div className="border-t-2 border-dashed border-haze px-7 py-5 bg-gradient-to-b from-white to-azure-50/70">
                  <div className="sky-barcode text-night/75 rounded-sm" />
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-7 shadow-lift flex items-start gap-4">
              <span className="w-10 h-10 rounded-full bg-azure-50 text-azure flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-semibold text-night">{stage.hint}</h3>
                <p className="text-sm text-ash mt-1">
                  {status === 'AGREED' && 'Meet the traveler, let them inspect the parcel, then confirm the handover here.'}
                  {status === 'HANDED_OVER' && 'Your parcel is with the traveler. They will ask your recipient for the code on delivery.'}
                  {status === 'DELIVERED' && 'Delivered. This trip completes in 72 hours if no problem is reported.'}
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
