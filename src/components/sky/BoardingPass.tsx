import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Plane, Star, Users } from 'lucide-react';
import { StatusBadge } from '@/components/app/StatusBadge';
import './sky.css';

/** What a pass needs to draw a flight — the shape view models already provide. */
export interface PassFlight {
  id: string;
  traveler: string;
  rating: number;
  trips: number;
  from: string;
  fromCity: string;
  to: string;
  toCity: string;
  date: string;
  departs: string;
  arrives: string;
  airline: string;
  flightNo: string;
  kgLeft: number;
  kgTotal: number;
  pricePerKg: number;
  ticketVerified: boolean;
}

const initials = (name: string) =>
  name.split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** Traveler line: avatar, name with the verified tick, rating. */
export function PassTraveler({ flight, size = 40 }: { flight: PassFlight; size?: number }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span
        className="shrink-0 rounded-full flex items-center justify-center text-white font-semibold"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          background: 'linear-gradient(135deg, var(--color-azure) 0%, var(--color-night-800) 100%)',
        }}
      >
        {initials(flight.traveler)}
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-night flex items-center gap-1.5 truncate">
          {flight.traveler}
          <BadgeCheck className="w-4 h-4 text-azure shrink-0" aria-label="Identity verified" />
        </div>
        <div className="text-xs text-ash flex items-center gap-1 mt-0.5">
          {flight.trips > 0 ? (
            <>
              <Star className="w-3 h-3 fill-horizon text-horizon" />
              <span className="font-medium text-ink">{flight.rating.toFixed(1)}</span> · {flight.trips} trips
            </>
          ) : (
            'New traveler'
          )}
        </div>
      </div>
    </div>
  );
}

/** Origin and destination codes with a dashed path between; the plane nudges forward on hover. */
export function PassRoute({ flight, large = false }: { flight: PassFlight; large?: boolean }) {
  const code = large ? 'text-5xl sm:text-6xl' : 'text-[2rem]';
  return (
    <div className="flex items-end gap-3">
      <div>
        <div className={`font-code font-semibold tracking-tight text-night leading-none ${code}`}>{flight.from}</div>
        <div className="text-xs text-ash mt-1.5">{flight.fromCity}</div>
      </div>
      <div className="flex-1 flex items-center gap-2 pb-[1.35rem] min-w-[3rem]">
        <span className="flex-1 border-t-2 border-dashed border-haze" />
        <Plane className="w-4 h-4 text-azure rotate-45 transition-transform duration-500 group-hover:translate-x-1.5" />
        <span className="flex-1 border-t-2 border-dashed border-haze" />
      </div>
      <div className="text-right">
        <div className={`font-code font-semibold tracking-tight text-night leading-none ${code}`}>{flight.to}</div>
        <div className="text-xs text-ash mt-1.5">{flight.toCity}</div>
      </div>
    </div>
  );
}

/** A labelled value in boarding-pass style: small caps label, mono value. */
export function PassField({ label, value, align = 'left' }: { label: string; value: ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ash">{label}</div>
      <div className="font-code text-sm font-medium text-night mt-1 whitespace-nowrap">{value}</div>
    </div>
  );
}

/** How much of the listed allowance is still free. */
export function SpaceMeter({ flight }: { flight: PassFlight }) {
  const used = Math.round(((flight.kgTotal - flight.kgLeft) / flight.kgTotal) * 100);
  return (
    <div>
      <div className="h-1.5 rounded-full bg-haze overflow-hidden">
        <div className="h-full rounded-full bg-azure" style={{ width: `${100 - used}%` }} />
      </div>
      <div className="text-xs text-ash mt-1.5">
        <span className="font-semibold text-night">{flight.kgLeft} kg</span> of {flight.kgTotal} free
      </div>
    </div>
  );
}

interface BoardingPassProps {
  flight: PassFlight;
  href: string;
  /** Shown as a chip when the listing is not simply open (your own flights). */
  status?: string;
  /** Number of bids received, for the traveler's own listings. */
  bids?: number;
  cta?: string;
}

/**
 * A flight listing as a boarding pass: the trip on the main part, price and
 * space on a tear-off stub. The whole pass is one link.
 */
export function BoardingPass({ flight, href, status, bids, cta = 'Place a bid' }: BoardingPassProps) {
  const showStatus = status && status !== 'LIVE';
  return (
    <Link href={href} className="sky-pass-shadow sky-pass-hover group block">
      <article className="sky-pass">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            <PassTraveler flight={flight} />
            {showStatus ? (
              <StatusBadge status={status} />
            ) : flight.ticketVerified ? (
              <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-azure-50 text-azure-600">
                Ticket verified
              </span>
            ) : null}
          </div>
          <PassRoute flight={flight} />
          <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-haze">
            <PassField label="Date" value={flight.date} />
            <PassField label="Departs" value={flight.departs} />
            <PassField label="Flight" value={flight.flightNo || '—'} align="right" />
          </div>
        </div>

        <div className="sky-pass-stub p-5 @md:p-6 flex @md:flex-col justify-between gap-4 bg-gradient-to-b from-white to-azure-50/60">
          <div>
            <div className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-ash">Per kg</div>
            <div className="font-flight text-4xl text-night leading-none mt-1">
              <span className="text-xl align-top mr-0.5">RM</span>{flight.pricePerKg}
            </div>
            {bids !== undefined && (
              <div className="inline-flex items-center gap-1 text-xs text-ash mt-2">
                <Users className="w-3.5 h-3.5" /> {bids} {bids === 1 ? 'bid' : 'bids'}
              </div>
            )}
          </div>
          <div className="flex-1 @md:flex-none max-w-[9rem] @md:max-w-none self-end @md:self-auto w-full">
            <SpaceMeter flight={flight} />
            <div className="hidden @md:flex items-center gap-1.5 text-sm font-semibold text-azure mt-4">
              {cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
