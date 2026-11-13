import Link from 'next/link';
import { ArrowRight, Plane, PlusCircle } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { DepartureBoard } from '@/components/sky/DepartureBoard';
import type { PassFlight } from '@/components/sky/BoardingPass';
import { getOpenFlights, type PublicFlight } from '@/lib/public-flights';

function toPass(f: PublicFlight): PassFlight {
  return {
    id: f.id,
    traveler: f.travelerName,
    rating: f.rating,
    trips: f.trips,
    from: f.originCode,
    fromCity: f.origin,
    to: f.destinationCode,
    toCity: f.destination,
    date: f.date,
    departs: '',
    arrives: '',
    airline: '',
    flightNo: f.flightNumber,
    kgLeft: f.kgLeft,
    kgTotal: f.kgTotal,
    pricePerKg: f.pricePerKg ?? 0,
    ticketVerified: f.ticketVerified,
  };
}

/**
 * Real open listings as a departure board, read on the server. It rises out of
 * the hero's clouds, so it pulls up over the bottom of the sky.
 */
export async function LiveFlights() {
  let flights: PublicFlight[] = [];
  try {
    flights = await getOpenFlights(6);
  } catch (error) {
    // The landing page must render even if the listing read fails.
    console.error('[landing] open flights failed:', error);
  }

  return (
    <section id="feeds" className="relative px-5 md:px-6 -mt-32 sm:-mt-40 pb-24 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="font-code text-xs uppercase tracking-[0.2em] text-teal">Open flights</p>
              <h2 className="font-display text-4xl sm:text-5xl text-navy mt-2">Leaving soon</h2>
            </div>
            {flights.length > 0 && (
              <Link href="/flights" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
                See all flights <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </Reveal>

        {flights.length > 0 ? (
          <DepartureBoard flights={flights.map(toPass)} />
        ) : (
          <Reveal>
            <div className="rounded-3xl bg-white shadow-float p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <Plane className="w-6 h-6 text-teal" />
              </div>
              <h3 className="font-display text-3xl text-navy mb-2">The board is clear</h3>
              <p className="text-ash mb-7 max-w-md mx-auto">
                Flying from Malaysia to Bangladesh soon? List your spare baggage allowance and be the first flight senders see.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Post your flight
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
