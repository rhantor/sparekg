import Link from 'next/link';
import { Plane, Star, BadgeCheck, ArrowRight, PlusCircle } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';
import { getOpenFlights, type PublicFlight } from '@/lib/public-flights';

/**
 * Real open listings, read on the server. Replaces a showcase of invented
 * travelers: what a visitor sees here is what they can actually bid on.
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
    <section id="feeds" className="bg-sand py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Open Flights"
            title="Travelers with space right now"
            desc="Every listing is from an ID-verified traveler. Sign in to see the full details and place a bid."
          />
        </Reveal>

        {flights.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {flights.map((f, i) => (
              <Reveal key={f.id} delay={i * 0.07}>
                <FlightTile flight={f} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-12 max-w-lg mx-auto bg-white rounded-2xl border border-line shadow-soft p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-4">
                <Plane className="w-6 h-6 text-teal" />
              </div>
              <h3 className="font-display text-xl text-navy mb-2">No open flights right now</h3>
              <p className="text-sm text-ash mb-6">
                Flying from Malaysia to Bangladesh soon? List your spare luggage space and be the first travelers senders see.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> Post your flight
              </Link>
            </div>
          </Reveal>
        )}

        {flights.length > 0 && (
          <div className="text-center mt-10">
            <Link href="/flights" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-teal-700">
              See all open flights <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

function FlightTile({ flight: f }: { flight: PublicFlight }) {
  const symbol = f.currency === 'MYR' ? 'RM' : f.currency;
  return (
    <Link
      href={`/flights/${f.id}`}
      className="group block bg-white rounded-2xl border border-line shadow-soft p-6 hover:shadow-float hover:-translate-y-1 transition-all h-full"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="font-medium text-navy flex items-center gap-1.5">
            {f.travelerName}
            <BadgeCheck className="w-4 h-4 text-teal" aria-label="Identity verified" />
          </div>
          <div className="text-xs text-ash flex items-center gap-1 mt-0.5">
            {f.trips > 0 ? (
              <><Star className="w-3 h-3 fill-gold text-gold" /> {f.rating.toFixed(1)} · {f.trips} trips</>
            ) : (
              'New traveler'
            )}
          </div>
        </div>
        {f.ticketVerified && (
          <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-teal/10 text-teal-700">
            Ticket verified
          </span>
        )}
      </div>

      <div className="flex items-center justify-between bg-sand rounded-xl px-4 py-3 mb-5">
        <div>
          <div className="font-display text-xl font-semibold text-navy">{f.originCode}</div>
          <div className="text-xs text-ash">{f.origin}</div>
        </div>
        <Plane className="w-4 h-4 text-teal" />
        <div className="text-right">
          <div className="font-display text-xl font-semibold text-navy">{f.destinationCode}</div>
          <div className="text-xs text-ash">{f.destination}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Departs" value={f.date} />
        <Stat label="Space" value={`${f.kgLeft} kg`} />
        <Stat label="Price" value={f.pricePerKg === null ? '—' : `${symbol} ${f.pricePerKg}/kg`} />
      </div>

      <div className="mt-5 pt-4 border-t border-line text-sm font-semibold text-teal flex items-center justify-center gap-1.5 group-hover:gap-2.5 transition-all">
        Bid on this flight <ArrowRight className="w-4 h-4" />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[0.7rem] uppercase tracking-wide text-ash">{label}</div>
      <div className="text-sm font-semibold text-navy mt-0.5">{value}</div>
    </div>
  );
}
