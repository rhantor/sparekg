import 'server-only';
import { adminDb } from './firebaseAdmin';
import { cityFor, tzFor } from './airports';

/**
 * Open listings for the public landing page.
 *
 * Signed-out visitors cannot read `flights` (the rules require sign-in), so the
 * page reads through the Admin SDK on the server and hands the browser only
 * what a stranger may see: route, date, capacity and price, and the traveler
 * as a first name and initial. Bidding still requires an account.
 */

export interface PublicFlight {
  id: string;
  originCode: string;
  destinationCode: string;
  origin: string;
  destination: string;
  /** Departure date at the origin airport, e.g. "3 Oct". */
  date: string;
  kgLeft: number;
  pricePerKg: number | null;
  currency: string;
  /** "Rahim K." — never a full name on a public page. */
  travelerName: string;
  rating: number;
  trips: number;
  ticketVerified: boolean;
}

function shortName(displayName: unknown): string {
  const parts = String(displayName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Traveler';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export async function getOpenFlights(max = 6): Promise<PublicFlight[]> {
  const snap = await adminDb
    .collection('flights')
    .where('status', '==', 'LIVE')
    .where('departureAt', '>=', new Date())
    .orderBy('departureAt', 'asc')
    .limit(max * 2)
    .get();

  return snap.docs
    .map((doc) => {
      const f = doc.data();
      const departure: Date | null = f.departureAt?.toDate?.() ?? null;
      const implied = f.fixedTotalPrice && f.totalKgAvailable
        ? Math.round(f.fixedTotalPrice / f.totalKgAvailable)
        : null;
      return {
        id: doc.id,
        originCode: f.originAirport,
        destinationCode: f.destinationAirport,
        origin: cityFor(f.originAirport),
        destination: cityFor(f.destinationAirport),
        date: departure
          ? departure.toLocaleDateString('en-GB', { timeZone: tzFor(f.originAirport), day: 'numeric', month: 'short' })
          : '—',
        kgLeft: Number(f.kgRemaining) || 0,
        pricePerKg: typeof f.pricePerKg === 'number' ? f.pricePerKg : implied,
        currency: f.currency ?? 'MYR',
        travelerName: shortName(f.traveler?.displayName),
        rating: f.traveler?.averageRating ?? 0,
        trips: f.traveler?.completedTripsAsTraveler ?? 0,
        ticketVerified: f.ticketStatus === 'VERIFIED',
      };
    })
    .filter((f) => f.kgLeft > 0)
    .slice(0, max);
}
