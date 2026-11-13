import { BoardingPass, type PassFlight } from '@/components/sky/BoardingPass';
import type { AppFlight } from '@/lib/view-models';

/** The boarding-pass fields, from the app's flight view model. */
export function toPassFlight(flight: AppFlight): PassFlight {
  return {
    id: flight.id,
    traveler: flight.travelerName,
    rating: flight.travelerRating,
    trips: flight.travelerTrips,
    from: flight.originCode,
    fromCity: flight.origin,
    to: flight.destinationCode,
    toCity: flight.destination,
    date: flight.date,
    departs: flight.departClock,
    arrives: flight.arriveClock,
    airline: flight.airline,
    flightNo: flight.flightNumber,
    kgLeft: flight.kgLeft,
    kgTotal: flight.kgTotal,
    pricePerKg: flight.pricePerKg,
    ticketVerified: flight.ticketVerified,
  };
}

/** A flight listing as a boarding pass; the traveler's own listings show status and bids. */
export function FlightCard({ flight }: { flight: AppFlight }) {
  return (
    <BoardingPass
      flight={toPassFlight(flight)}
      href={`/flights/${flight.id}`}
      status={flight.mine ? flight.status : undefined}
      bids={flight.mine ? flight.bids : undefined}
      cta={flight.mine ? 'Manage' : 'Place a bid'}
    />
  );
}
