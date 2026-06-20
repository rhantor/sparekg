import Link from 'next/link';
import { ArrowRight, Star, Plane, Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from './StatusBadge';
import type { AppFlight } from '@/lib/app-samples';

export function FlightCard({ flight }: { flight: AppFlight }) {
  const pct = Math.round(((flight.kgTotal - flight.kgLeft) / flight.kgTotal) * 100);

  return (
    <Link
      href={`/flights/${flight.id}`}
      className="group block bg-white rounded-2xl border border-line shadow-soft p-5 hover:shadow-float hover:-translate-y-1 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Avatar name={flight.travelerName} color={flight.travelerColor} verified={flight.verified} size={40} />
          <div>
            <div className="font-semibold text-navy text-[0.95rem]">{flight.travelerName}</div>
            <div className="flex items-center gap-1 text-[0.78rem] text-ash mt-0.5">
              <Star className="w-3 h-3 fill-gold text-gold" />
              <span className="font-medium text-navy">{flight.travelerRating.toFixed(1)}</span>
              <span>· {flight.travelerTrips} trips</span>
            </div>
          </div>
        </div>
        <StatusBadge status={flight.status} />
      </div>

      {/* route */}
      <div className="flex items-center justify-between bg-sand rounded-xl px-4 py-3 mb-4">
        <div>
          <div className="font-display text-lg font-semibold text-navy">{flight.originCode}</div>
          <div className="text-[0.7rem] text-ash">{flight.origin}</div>
        </div>
        <div className="flex-1 mx-3 flex items-center justify-center text-ash">
          <span className="flex-1 h-px bg-line" />
          <Plane className="w-4 h-4 mx-1 text-teal" />
          <span className="flex-1 h-px bg-line" />
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-semibold text-navy">{flight.destinationCode}</div>
          <div className="text-[0.7rem] text-ash">{flight.destination}</div>
        </div>
      </div>

      {/* meta */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        <div>
          <div className="text-[0.68rem] text-ash">Date</div>
          <div className="text-sm font-medium text-navy">{flight.date}</div>
        </div>
        <div>
          <div className="text-[0.68rem] text-ash">Available</div>
          <div className="text-sm font-medium text-navy">{flight.kgLeft} KG</div>
        </div>
        <div>
          <div className="text-[0.68rem] text-ash">Price</div>
          <div className="text-sm font-semibold text-teal-700">RM {flight.pricePerKg}<span className="text-ash font-normal text-xs">/kg</span></div>
        </div>
      </div>

      {/* capacity bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[0.7rem] text-ash mb-1">
          <span>{flight.kgTotal - flight.kgLeft} / {flight.kgTotal} KG booked</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-line overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1 text-xs text-ash">
          <Users className="w-3.5 h-3.5" /> {flight.bids} {flight.bids === 1 ? 'bid' : 'bids'}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-navy group-hover:text-teal transition-colors">
          {flight.mine ? 'Manage' : 'View & bid'} <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
