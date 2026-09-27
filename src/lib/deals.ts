/**
 * Presentation helpers for agreed deals (`transactions`).
 *
 * The server owns every rule; these only decide what to show. Each helper
 * mirrors a check the callable makes, so the UI offers an action only when the
 * server would accept it.
 */

import type { Transaction } from './types';
import { cityFor, formatAirportTime } from './airports';

/** Mirrors DISPUTE_WINDOW_HOURS in functions/src/index.ts. */
export const DISPUTE_WINDOW_HOURS = 72;
/** Mirrors MAX_CODE_ATTEMPTS in functions/src/index.ts. */
export const MAX_CODE_ATTEMPTS = 5;

export type DealRole = 'sender' | 'traveler';

export function dealRole(deal: Transaction, uid: string): DealRole | null {
  if (deal.senderId === uid) return 'sender';
  if (deal.travelerId === uid) return 'traveler';
  return null;
}

/** Still needs someone to act — shown under "Active". */
export function isActiveDeal(deal: Transaction): boolean {
  return deal.status === 'AGREED' || deal.status === 'HANDED_OVER' || deal.status === 'DISPUTED';
}

export function money(amount: number, currency = 'MYR'): string {
  const symbol = currency === 'MYR' ? 'RM' : currency;
  return `${symbol} ${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export function routeLabel(deal: Transaction): string {
  return `${deal.flight.originAirport} → ${deal.flight.destinationAirport}`;
}

export function routeCities(deal: Transaction): string {
  return `${cityFor(deal.flight.originAirport)} to ${cityFor(deal.flight.destinationAirport)}`;
}

export function departureLabel(deal: Transaction): string {
  return formatAirportTime(deal.flight.departureAt, deal.flight.originAirport);
}

export function hasDeparted(deal: Transaction, now = Date.now()): boolean {
  const t = Date.parse(deal.flight.departureAt);
  return Number.isFinite(t) && t <= now;
}

/** The other side of the deal, as the viewer sees them. */
export function counterpart(deal: Transaction, role: DealRole) {
  return role === 'sender' ? deal.parties.traveler : deal.parties.sender;
}

/** The viewer's own rating of the other party, if they have left one. */
export function myRating(deal: Transaction, role: DealRole): number | null {
  return role === 'sender' ? deal.ratingBySenderOfTraveler : deal.ratingByTravelerOfSender;
}

/** Whether a problem can still be reported — mirrors openDispute's checks. */
export function canDispute(deal: Transaction, now = Date.now()): boolean {
  if (deal.payoutStatus !== 'PENDING') return false;
  if (deal.status === 'AGREED' || deal.status === 'HANDED_OVER') return true;
  if (deal.status !== 'DELIVERED' || !deal.deliveredAt) return false;
  return now - Date.parse(deal.deliveredAt) <= DISPUTE_WINDOW_HOURS * 3600_000;
}

/**
 * One line telling the viewer what happens next, from their side. This is what
 * the deal list shows, so it has to answer "do I need to do anything?".
 */
export function nextStep(deal: Transaction, role: DealRole): { text: string; yourMove: boolean } {
  switch (deal.status) {
    case 'AGREED': {
      const mine = role === 'sender' ? deal.handoffConfirmedAt : deal.pickupConfirmedAt;
      if (!mine) {
        return {
          text: role === 'sender' ? 'Hand over your parcel and confirm' : 'Collect the parcel and confirm',
          yourMove: true,
        };
      }
      return {
        text: role === 'sender' ? 'Waiting for the traveler to confirm receipt' : 'Waiting for the sender to confirm',
        yourMove: false,
      };
    }
    case 'HANDED_OVER':
      return role === 'traveler'
        ? { text: 'Deliver and enter the recipient’s code', yourMove: true }
        : { text: 'In the traveler’s care', yourMove: false };
    case 'DELIVERED':
      return myRatingPending(deal, role)
        ? { text: 'Delivered — rate your experience', yourMove: true }
        : { text: deal.payoutStatus === 'RELEASED' ? 'Completed' : 'Delivered', yourMove: false };
    case 'DISPUTED':
      return { text: 'Under review by our team', yourMove: false };
    case 'RESOLVED':
      return { text: 'Resolved by our team', yourMove: false };
    default:
      return { text: deal.status, yourMove: false };
  }
}

function myRatingPending(deal: Transaction, role: DealRole): boolean {
  return myRating(deal, role) === null;
}

/** Digits only, as wa.me wants them: "+60 12-345 6789" → "60123456789". */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}
