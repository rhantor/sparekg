/**
 * View models: the shape the UI components render.
 *
 * Firestore documents and presentation needs diverge — a card wants "25 Apr
 * 2025" and a city name, the database stores an ISO timestamp and an IATA code.
 * Adapting here keeps formatting out of components and lets the existing card
 * UI render live data unchanged.
 */

import type { Bid, Flight } from './types';
import { activeUrgencyLevel, isFeaturedNow } from './economy';
import { cityFor, tzFor, formatAirportTime } from './airports';

export type FlightStatus =
  | 'LIVE' | 'LOCKED' | 'IN_TRANSIT' | 'COMPLETED' | 'DRAFT' | 'CANCELLED' | 'EXPIRED';
export type BidStatus =
  | 'PENDING' | 'AGREED' | 'HANDED_OVER' | 'DELIVERED'
  | 'DECLINED' | 'EXPIRED' | 'DISPUTED' | 'RESOLVED';
export type AvatarColor = 'ocean' | 'teal' | 'navy';

export interface AppFlight {
  id: string;
  travelerName: string;
  travelerColor: AvatarColor;
  travelerRating: number;
  travelerTrips: number;
  verified: boolean;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  date: string;
  /** Departure in the origin airport's local time, e.g. "20 Sept, 14:30 · Kuala Lumpur time". */
  departureTime: string;
  /** Arrival in the destination airport's local time. */
  arrivalTime: string;
  airline: string;
  kgTotal: number;
  kgLeft: number;
  pricePerKg: number;
  categories: string[];
  status: FlightStatus;
  bids: number;
  mine?: boolean;
  /** Featured placement in force right now, expiry already checked. */
  featured: boolean;
}

export interface AppBid {
  id: string;
  flightId: string;
  counterpartyName: string;
  counterpartyColor: AvatarColor;
  route: string;
  date: string;
  kg: number;
  item: string;
  offeredTotal: number;
  status: BidStatus;
  role: 'sender' | 'traveler';
  /** Urgency tier in force right now — the stored level, re-checked against its
   *  expiry, because `expireBoosts` only sweeps hourly. */
  urgencyLevel: 0 | 1 | 2 | 3;
  urgencyExpiresAt: string | null;
}

export { cityFor };

export const AVATAR_COLORS: AvatarColor[] = ['ocean', 'teal', 'navy'];

/**
 * Stable colour per person: the same user is always the same colour, without
 * storing a colour on the document.
 */
export function colorFor(seed: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * The status the listing really has right now.
 *
 * `expireFlights` sweeps hourly, so a flight can sit departed-but-still-LIVE for
 * up to an hour. Browse never shows those (it ranges on `departureAt`), but the
 * traveler's own views read the status straight off the document and would keep
 * calling a flown listing live. Deriving it here is the same defensive re-check
 * `isFeaturedNow` makes against `featuredUntil`.
 *
 * Only the two open states are rewritten. LOCKED and IN_TRANSIT are journeys
 * under way, and the terminal states are already final.
 */
function effectiveFlightStatus(status: string, departureAt: string | null | undefined): FlightStatus {
  if (status !== 'LIVE' && status !== 'DRAFT') return status as FlightStatus;
  if (!departureAt) return status;
  const departure = Date.parse(departureAt);
  if (Number.isNaN(departure)) return status;
  return departure <= Date.now() ? 'EXPIRED' : status;
}

/**
 * A flight's date is the date at its origin airport, not in the viewer's zone —
 * otherwise a 00:30 departure reads as the previous day to someone further west.
 */
function formatDate(iso: string | null | undefined, airportCode?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    timeZone: airportCode ? tzFor(airportCode) : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}


export function toAppFlight(flight: Flight, currentUid?: string): AppFlight {
  return {
    id: flight.flightId,
    travelerName: flight.traveler?.displayName ?? 'Traveler',
    travelerColor: colorFor(flight.travelerId),
    travelerRating: flight.traveler?.averageRating ?? 0,
    travelerTrips: flight.traveler?.completedTripsAsTraveler ?? 0,
    verified: flight.traveler?.kycVerified ?? false,
    origin: cityFor(flight.originAirport),
    originCode: flight.originAirport,
    destination: cityFor(flight.destinationAirport),
    destinationCode: flight.destinationAirport,
    date: formatDate(flight.departureAt, flight.originAirport),
    departureTime: formatAirportTime(flight.departureAt, flight.originAirport),
    arrivalTime: formatAirportTime(flight.arrivalAt, flight.destinationAirport),
    airline: flight.airline,
    kgTotal: flight.totalKgAvailable,
    kgLeft: flight.kgRemaining,
    // Fixed-price listings have no per-kg rate; show the implied rate so the
    // card's price column stays meaningful.
    pricePerKg:
      flight.pricePerKg ??
      (flight.fixedTotalPrice && flight.totalKgAvailable
        ? Math.round(flight.fixedTotalPrice / flight.totalKgAvailable)
        : 0),
    featured: isFeaturedNow(flight.isFeatured, flight.featuredUntil),
    categories: flight.acceptedCategories ?? [],
    status: effectiveFlightStatus(flight.status, flight.departureAt),
    bids: flight.bidCount ?? 0,
    mine: currentUid ? flight.travelerId === currentUid : undefined,
  };
}

/**
 * `role` is the viewer's side of the deal, which decides whose name to show:
 * a sender sees the traveler, a traveler sees the sender.
 */
export function toAppBid(
  bid: Bid,
  role: 'sender' | 'traveler',
  flight?: Flight,
): AppBid {
  const counterpartyName =
    role === 'traveler'
      ? bid.sender?.displayName ?? 'Sender'
      : flight?.traveler?.displayName ?? 'Traveler';

  return {
    id: bid.bidId,
    flightId: bid.flightId,
    counterpartyName,
    counterpartyColor: colorFor(role === 'traveler' ? bid.senderId : bid.travelerId),
    route: flight
      ? `${flight.originAirport} → ${flight.destinationAirport}`
      : '—',
    date: flight ? formatDate(flight.departureAt, flight.originAirport) : formatDate(bid.createdAt),
    kg: bid.kgRequested,
    item: bid.itemDescription,
    offeredTotal: bid.offeredTotal,
    status: bid.status as BidStatus,
    role,
    urgencyLevel: activeUrgencyLevel(bid.urgencyLevel, bid.urgencyExpiresAt),
    urgencyExpiresAt: bid.urgencyExpiresAt ?? null,
  };
}
