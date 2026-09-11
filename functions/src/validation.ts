/**
 * Payload validation for callable functions.
 *
 * Everything arriving from a client is untrusted, including fields the UI would
 * never send wrong. Each validator returns a narrow, fully-typed object built
 * from scratch — we never spread the caller's payload into a Firestore write,
 * so unknown keys cannot ride along into a document.
 */

import { HttpsError } from 'firebase-functions/v2/https';

// Bounds are deliberately generous; they exist to stop abuse and absurd values,
// not to encode business policy. Policy lives in app_config (Phase 3).
const MAX_KG = 50;
const MAX_PRICE_PER_KG = 1000;
const MAX_TOTAL_PRICE = 50000;
const MAX_DECLARED_VALUE = 100000;
const MAX_TEXT = 500;
const MAX_CATEGORIES = 20;
/** Longest featured run one purchase may buy, in 24-hour blocks. */
const MAX_FEATURED_BLOCKS = 7;
/**
 * Earliest a listing may depart, in hours from now. Anything sooner leaves
 * senders no realistic time to bid, get accepted and hand over a parcel.
 */
export const MIN_DEPARTURE_LEAD_HOURS = 12;
/** Furthest ahead a listing may depart. Plans further out change too often to bid on. */
export const MAX_DEPARTURE_LEAD_DAYS = 60;
/** Longest plausible journey, stops included. Anything longer is a mistyped date. */
export const MAX_FLIGHT_HOURS = 24;
/** Airports on the launch corridors, by country. Mirrors AIRPORTS in src/lib/airports.ts. */
const AIRPORT_COUNTRY: Record<string, 'MY' | 'BD'> = {
  KUL: 'MY', PEN: 'MY', JHB: 'MY',
  DAC: 'BD', CGP: 'BD', ZYL: 'BD',
};

/** Both airports are on a corridor we serve: one in each country. */
export function servedRoute(origin: string, destination: string): boolean {
  const a = AIRPORT_COUNTRY[origin];
  const b = AIRPORT_COUNTRY[destination];
  return !!a && !!b && a !== b;
}
/** Tickets live in the uploader's own folder; the uid is checked in postFlight. */
const TICKET_PATH_RE = /^tickets\/[A-Za-z0-9]{1,128}\/[A-Za-z0-9_.-]{1,100}$/;
const AIRPORT_RE = /^[A-Z]{3}$/;
const FLIGHT_NO_RE = /^[A-Z0-9]{2,8}$/;

function fail(message: string): never {
  throw new HttpsError('invalid-argument', message);
}

function asRecord(data: unknown): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    fail('Request body must be an object.');
  }
  return data as Record<string, unknown>;
}

function str(v: unknown, field: string, { max = MAX_TEXT, min = 1 } = {}): string {
  if (typeof v !== 'string') fail(`"${field}" must be a string.`);
  const trimmed = v.trim();
  if (trimmed.length < min) fail(`"${field}" is required.`);
  if (trimmed.length > max) fail(`"${field}" must be at most ${max} characters.`);
  return trimmed;
}

function optionalStr(v: unknown, field: string, max = MAX_TEXT): string | null {
  if (v === undefined || v === null || v === '') return null;
  return str(v, field, { max });
}

function num(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`"${field}" must be a number.`);
  if (v < min || v > max) fail(`"${field}" must be between ${min} and ${max}.`);
  return v;
}

/** Accepts an ISO-8601 string and returns a Date, rejecting anything unparseable. */
function isoDate(v: unknown, field: string): Date {
  const raw = str(v, field, { max: 40 });
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) fail(`"${field}" must be a valid ISO-8601 date.`);
  return d;
}

function airport(v: unknown, field: string): string {
  const code = str(v, field, { max: 3, min: 3 }).toUpperCase();
  if (!AIRPORT_RE.test(code)) fail(`"${field}" must be a 3-letter IATA airport code.`);
  return code;
}

function stringArray(v: unknown, field: string, maxItems = MAX_CATEGORIES): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) fail(`"${field}" must be an array.`);
  if (v.length > maxItems) fail(`"${field}" may contain at most ${maxItems} entries.`);
  return v.map((item, i) => str(item, `${field}[${i}]`, { max: 60 }));
}

export function routeKeyFor(origin: string, destination: string): string {
  return `${origin}-${destination}`;
}

// ---- postFlight ------------------------------------------------------------

export interface PostFlightInput {
  originAirport: string;
  destinationAirport: string;
  routeKey: string;
  departureAt: Date;
  arrivalAt: Date;
  airline: string;
  flightNumber: string;
  totalKgAvailable: number;
  pricePerKg: number | null;
  fixedTotalPrice: number | null;
  currency: string;
  acceptedCategories: string[];
  prohibitedItems: string[];
  specialNotes: string | null;
  /** Storage path of the uploaded ticket image. Ownership is checked by the caller. */
  ticketPath: string;
}

export function validatePostFlight(data: unknown): PostFlightInput {
  const d = asRecord(data);

  const originAirport = airport(d.originAirport, 'originAirport');
  const destinationAirport = airport(d.destinationAirport, 'destinationAirport');
  // Only corridors we serve: an unknown airport has no time zone in the app, and
  // a same-country pair is not a route the marketplace runs.
  const originCountry = AIRPORT_COUNTRY[originAirport];
  const destinationCountry = AIRPORT_COUNTRY[destinationAirport];
  if (!originCountry || !destinationCountry) fail('That route is not served yet.');
  if (originCountry === destinationCountry) {
    fail('Origin and destination must be in different countries.');
  }

  const departureAt = isoDate(d.departureAt, 'departureAt');
  const arrivalAt = isoDate(d.arrivalAt, 'arrivalAt');
  if (arrivalAt <= departureAt) fail('Arrival must be after departure.');
  if (departureAt.getTime() < Date.now() + MIN_DEPARTURE_LEAD_HOURS * 3600_000) {
    fail(`Departure must be at least ${MIN_DEPARTURE_LEAD_HOURS} hours from now.`);
  }
  if (departureAt.getTime() > Date.now() + MAX_DEPARTURE_LEAD_DAYS * 86_400_000) {
    fail(`Departure must be within ${MAX_DEPARTURE_LEAD_DAYS} days.`);
  }
  if (arrivalAt.getTime() - departureAt.getTime() > MAX_FLIGHT_HOURS * 3600_000) {
    fail(`Arrival must be within ${MAX_FLIGHT_HOURS} hours of departure.`);
  }

  // Checked before str() so a missing ticket reads as an instruction, not a type error.
  if (typeof d.ticketPath !== 'string' || !d.ticketPath.trim()) fail('Upload your ticket.');
  const ticketPath = str(d.ticketPath, 'ticketPath', { max: 250 });
  if (!TICKET_PATH_RE.test(ticketPath)) fail('Upload your ticket.');

  const flightNumber = str(d.flightNumber, 'flightNumber', { max: 8 }).toUpperCase();
  if (!FLIGHT_NO_RE.test(flightNumber)) {
    fail('"flightNumber" must be 2-8 letters or digits.');
  }

  // Exactly one pricing model — otherwise the bid total is ambiguous.
  const hasPerKg = d.pricePerKg !== undefined && d.pricePerKg !== null;
  const hasFixed = d.fixedTotalPrice !== undefined && d.fixedTotalPrice !== null;
  if (hasPerKg === hasFixed) {
    fail('Provide either a price per kg or a fixed total price, not both.');
  }

  return {
    originAirport,
    destinationAirport,
    routeKey: routeKeyFor(originAirport, destinationAirport),
    departureAt,
    arrivalAt,
    airline: str(d.airline, 'airline', { max: 80 }),
    flightNumber,
    totalKgAvailable: num(d.totalKgAvailable, 'totalKgAvailable', 0.5, MAX_KG),
    pricePerKg: hasPerKg ? num(d.pricePerKg, 'pricePerKg', 1, MAX_PRICE_PER_KG) : null,
    fixedTotalPrice: hasFixed ? num(d.fixedTotalPrice, 'fixedTotalPrice', 1, MAX_TOTAL_PRICE) : null,
    // Single-corridor launch; a currency the server doesn't know would break payouts.
    currency: 'MYR',
    acceptedCategories: stringArray(d.acceptedCategories, 'acceptedCategories'),
    prohibitedItems: stringArray(d.prohibitedItems, 'prohibitedItems'),
    specialNotes: optionalStr(d.specialNotes, 'specialNotes'),
    ticketPath,
  };
}

// ---- submitBid -------------------------------------------------------------

export interface SubmitBidInput {
  flightId: string;
  kgRequested: number;
  itemCategory: string;
  itemDescription: string;
  declaredValue: number;
  specialHandling: string | null;
  offeredPricePerKg: number | null;
}

export function validateSubmitBid(data: unknown): SubmitBidInput {
  const d = asRecord(data);
  return {
    flightId: str(d.flightId, 'flightId', { max: 128 }),
    kgRequested: num(d.kgRequested, 'kgRequested', 0.5, MAX_KG),
    itemCategory: str(d.itemCategory, 'itemCategory', { max: 60 }),
    itemDescription: str(d.itemDescription, 'itemDescription'),
    declaredValue: num(d.declaredValue, 'declaredValue', 0, MAX_DECLARED_VALUE),
    specialHandling: optionalStr(d.specialHandling, 'specialHandling'),
    // Null means "accept the traveler's asking price"; the server computes the total either way.
    offeredPricePerKg:
      d.offeredPricePerKg === undefined || d.offeredPricePerKg === null
        ? null
        : num(d.offeredPricePerKg, 'offeredPricePerKg', 1, MAX_PRICE_PER_KG),
  };
}

/** Shared by the accept / decline callables. */
export function validateBidId(data: unknown): string {
  const d = asRecord(data);
  return str(d.bidId, 'bidId', { max: 128 });
}

export interface FeatureFlightInput {
  flightId: string;
  /** Number of 24-hour blocks to buy, 1..7. */
  blocks: number;
}

export function validateFeatureFlight(data: unknown): FeatureFlightInput {
  const d = asRecord(data);
  const blocks = num(d.blocks, 'blocks', 1, MAX_FEATURED_BLOCKS);
  // A fractional block would be charged as a whole one and bought as a fraction,
  // so reject it rather than rounding a number the caller chose.
  if (!Number.isInteger(blocks)) fail('"blocks" must be a whole number.');
  return {
    flightId: str(d.flightId, 'flightId', { max: 128 }),
    blocks,
  };
}

export interface BoostBidInput {
  bidId: string;
  level: 1 | 2 | 3;
}

export function validateBoostBid(data: unknown): BoostBidInput {
  const d = asRecord(data);
  const level = num(d.level, 'level', 1, 3);
  if (!Number.isInteger(level)) fail('"level" must be 1, 2 or 3.');
  return {
    bidId: str(d.bidId, 'bidId', { max: 128 }),
    level: level as 1 | 2 | 3,
  };
}

// ---- lookupFlight ----------------------------------------------------------

export interface LookupFlightInput {
  flightNumber: string;
  /** Local departure date at the origin airport, YYYY-MM-DD. */
  date: string;
}

export function validateLookupFlight(data: unknown): LookupFlightInput {
  const d = asRecord(data);
  // "MH 196" is how it's printed on a boarding pass; the provider wants "MH196".
  const flightNumber = str(d.flightNumber, 'flightNumber', { max: 10 }).toUpperCase().replace(/\s+/g, '');
  if (!FLIGHT_NO_RE.test(flightNumber)) fail('"flightNumber" must be 2-8 letters or digits.');

  const date = str(d.date, 'date', { max: 10 });
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed)) fail('"date" must be YYYY-MM-DD.');
  // Every lookup is billed, so only dates a listing could actually use. A day of
  // slack either side covers the gap between UTC and the airport's local date.
  const day = 86_400_000;
  if (parsed < Date.now() - day || parsed > Date.now() + (MAX_DEPARTURE_LEAD_DAYS + 1) * day) {
    fail(`"date" must be within the next ${MAX_DEPARTURE_LEAD_DAYS} days.`);
  }
  return { flightNumber, date };
}

// ---- reviewFlightTicket ----------------------------------------------------

/** Why staff turned a ticket down. Mirrored by TICKET_REJECTION_REASONS in src/lib/ticket-review.ts. */
export const TICKET_REJECTION_REASONS = [
  'NAME_MISMATCH', 'FLIGHT_MISMATCH', 'UNREADABLE', 'NOT_A_TICKET', 'SUSPICIOUS', 'OTHER',
] as const;
export type TicketRejectionReason = (typeof TICKET_REJECTION_REASONS)[number];

export interface ReviewFlightTicketInput {
  flightId: string;
  decision: 'VERIFY' | 'REJECT';
  /** Required for REJECT, always null for VERIFY. */
  reason: TicketRejectionReason | null;
}

export function validateReviewFlightTicket(data: unknown): ReviewFlightTicketInput {
  const d = asRecord(data);
  const flightId = str(d.flightId, 'flightId', { max: 128 });
  if (d.decision === 'VERIFY') return { flightId, decision: 'VERIFY', reason: null };
  if (d.decision !== 'REJECT') fail('"decision" must be VERIFY or REJECT.');
  // The admin form's <select> constrains nothing; a callable is a public endpoint.
  if (!TICKET_REJECTION_REASONS.includes(d.reason as TicketRejectionReason)) {
    fail('Choose a rejection reason from the list.');
  }
  return { flightId, decision: 'REJECT', reason: d.reason as TicketRejectionReason };
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------

/**
 * Upper bound on any single economy figure.
 *
 * A ceiling matters here in a way it does not for a listing's price: signupBonus
 * and monthlyFree mint points into the ledger, so a typo with too many zeros
 * would be a real liability on the books rather than one bad flight.
 */
const MAX_ECONOMY_VALUE = 100000;

/** Every tunable in PointsEconomyConfig. Anything not on this list is dropped. */
const ECONOMY_KEYS = [
  'signupBonus', 'monthlyFree', 'monthlyFreeCap',
  'flightPostCost', 'bidSubmitCost',
  'featuredCostPer24h',
  'urgencyLevel1CostPer24h', 'urgencyLevel2CostPer48h', 'urgencyLevel3CostPer72h',
  'relistCost', 'tripRewardTraveler', 'deliveryRewardSender',
  'referralRewardReferrer', 'referralRewardInvitee',
] as const;

/** Every switch in FeatureFlags. */
const FLAG_KEYS = ['enableFeaturedListings', 'enableUrgencyBoosts'] as const;

export interface UpdateAppConfigInput {
  pointsEconomy: Record<string, number>;
  featureFlags: Record<string, boolean>;
}

/**
 * Narrows an admin's config payload to the known tunables.
 *
 * Both sections are partial on purpose: the caller sends only what it is
 * changing, and `getPointsEconomy` merges whatever is stored over the defaults.
 * Keys outside the two allowlists are dropped rather than rejected, so adding a
 * field to the admin form before the server knows about it cannot fail the save.
 */
export function validateUpdateAppConfig(data: unknown): UpdateAppConfigInput {
  const d = asRecord(data);

  const pointsEconomy: Record<string, number> = {};
  if (d.pointsEconomy !== undefined) {
    const raw = asRecord(d.pointsEconomy);
    for (const key of ECONOMY_KEYS) {
      if (raw[key] === undefined) continue;
      const value = num(raw[key], key, 0, MAX_ECONOMY_VALUE);
      // Points are whole units everywhere else in the ledger; a fractional cost
      // would round somewhere unpredictable rather than being charged as sent.
      if (!Number.isInteger(value)) fail(`"${key}" must be a whole number.`);
      pointsEconomy[key] = value;
    }
  }

  const featureFlags: Record<string, boolean> = {};
  if (d.featureFlags !== undefined) {
    const raw = asRecord(d.featureFlags);
    for (const key of FLAG_KEYS) {
      if (raw[key] === undefined) continue;
      if (typeof raw[key] !== 'boolean') fail(`"${key}" must be true or false.`);
      featureFlags[key] = raw[key] as boolean;
    }
  }

  if (!Object.keys(pointsEconomy).length && !Object.keys(featureFlags).length) {
    fail('Nothing to update.');
  }

  return { pointsEconomy, featureFlags };
}
