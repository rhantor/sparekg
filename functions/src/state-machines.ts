/**
 * Server-side state machines for flights and bids (blueprint §1.5).
 *
 * These tables are the single source of truth for what a status may become and
 * who is allowed to move it. Nothing in this file touches Firestore — it is pure
 * so it can be reasoned about and unit-tested in isolation. Callables consult it
 * *inside* their transaction, before writing.
 *
 * The client never sets a status. It names an intent; the server decides.
 */

export type FlightStatus =
  | 'DRAFT' | 'LIVE' | 'LOCKED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export type BidStatus =
  | 'PENDING' | 'AGREED' | 'DECLINED' | 'EXPIRED'
  | 'HANDED_OVER' | 'DELIVERED' | 'DISPUTED' | 'RESOLVED';

/** Who is attempting a transition, as resolved from the auth token — never from the payload. */
export type Actor = 'TRAVELER' | 'SENDER' | 'SYSTEM' | 'ADMIN';

interface Transition<S> {
  to: S;
  /** Roles permitted to make this move. ADMIN is granted everywhere explicitly, not implicitly. */
  by: Actor[];
}

// ---- Flight ----------------------------------------------------------------

const FLIGHT_TRANSITIONS: Record<FlightStatus, Transition<FlightStatus>[]> = {
  // Posted without enough points to go live (Phase 3 gates this; Phase 2 posts LIVE directly).
  DRAFT: [
    { to: 'LIVE', by: ['TRAVELER', 'SYSTEM'] },
    { to: 'CANCELLED', by: ['TRAVELER', 'ADMIN'] },
    // Never published, and the plane has gone. Nothing to cancel against.
    { to: 'EXPIRED', by: ['SYSTEM'] },
  ],
  LIVE: [
    // All listed kg consumed by AGREED bids. Only the server can observe this.
    { to: 'LOCKED', by: ['SYSTEM'] },
    { to: 'IN_TRANSIT', by: ['TRAVELER', 'ADMIN'] },
    { to: 'CANCELLED', by: ['TRAVELER', 'ADMIN'] },
    // Departure passed with the listing still open — see expireFlights. This is
    // distinct from CANCELLED: nobody withdrew it, the window simply closed.
    { to: 'EXPIRED', by: ['SYSTEM'] },
  ],
  // No EXPIRED edge: LOCKED means every kg is spoken for by an AGREED bid, so a
  // passed departure is a trip that flew, not a listing that lapsed. Sweeping it
  // would strand real agreements in a terminal state.
  LOCKED: [
    // Capacity freed again (an agreement fell through) — server-observed only.
    { to: 'LIVE', by: ['SYSTEM'] },
    { to: 'IN_TRANSIT', by: ['TRAVELER', 'ADMIN'] },
    { to: 'CANCELLED', by: ['TRAVELER', 'ADMIN'] },
  ],
  IN_TRANSIT: [
    { to: 'COMPLETED', by: ['SYSTEM', 'ADMIN'] },
    { to: 'CANCELLED', by: ['ADMIN'] },
  ],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

// ---- Bid -------------------------------------------------------------------

const BID_TRANSITIONS: Record<BidStatus, Transition<BidStatus>[]> = {
  PENDING: [
    { to: 'AGREED', by: ['TRAVELER'] },
    { to: 'DECLINED', by: ['TRAVELER', 'ADMIN'] },
    { to: 'EXPIRED', by: ['SYSTEM'] },
  ],
  AGREED: [
    { to: 'HANDED_OVER', by: ['SENDER'] },
    { to: 'DISPUTED', by: ['TRAVELER', 'SENDER'] },
  ],
  HANDED_OVER: [
    { to: 'DELIVERED', by: ['TRAVELER'] },
    { to: 'DISPUTED', by: ['TRAVELER', 'SENDER'] },
  ],
  DELIVERED: [
    // Dispute window; after it closes the payout timer settles the record.
    { to: 'DISPUTED', by: ['TRAVELER', 'SENDER'] },
  ],
  DISPUTED: [
    { to: 'RESOLVED', by: ['ADMIN'] },
  ],
  DECLINED: [],
  EXPIRED: [],
  RESOLVED: [],
};

// ---- Guards ----------------------------------------------------------------

export interface TransitionCheck {
  allowed: boolean;
  /** Human-readable cause, safe to surface to the client. */
  reason?: string;
}

function check<S extends string>(
  table: Record<S, Transition<S>[]>,
  kind: string,
  from: S,
  to: S,
  actor: Actor,
): TransitionCheck {
  const moves = table[from];
  if (!moves) return { allowed: false, reason: `Unknown ${kind} status "${from}".` };

  const move = moves.find((m) => m.to === to);
  if (!move) {
    return moves.length === 0
      ? { allowed: false, reason: `${kind} is ${from} and cannot change further.` }
      : { allowed: false, reason: `${kind} cannot go from ${from} to ${to}.` };
  }

  if (!move.by.includes(actor)) {
    return { allowed: false, reason: `Not permitted to move this ${kind.toLowerCase()} to ${to}.` };
  }

  return { allowed: true };
}

export function canTransitionFlight(
  from: FlightStatus, to: FlightStatus, actor: Actor,
): TransitionCheck {
  return check(FLIGHT_TRANSITIONS, 'Flight', from, to, actor);
}

export function canTransitionBid(
  from: BidStatus, to: BidStatus, actor: Actor,
): TransitionCheck {
  return check(BID_TRANSITIONS, 'Bid', from, to, actor);
}

/** Flights that accept new bids. Anything else rejects a bid outright. */
export function acceptsNewBids(status: FlightStatus): boolean {
  return status === 'LIVE';
}

/** Bid states that still hold flight capacity, i.e. count against kgRemaining. */
export function holdsCapacity(status: BidStatus): boolean {
  return status === 'AGREED' || status === 'HANDED_OVER' || status === 'DELIVERED';
}
