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
}

export function validatePostFlight(data: unknown): PostFlightInput {
  const d = asRecord(data);

  const originAirport = airport(d.originAirport, 'originAirport');
  const destinationAirport = airport(d.destinationAirport, 'destinationAirport');
  if (originAirport === destinationAirport) {
    fail('Origin and destination must be different airports.');
  }

  const departureAt = isoDate(d.departureAt, 'departureAt');
  const arrivalAt = isoDate(d.arrivalAt, 'arrivalAt');
  if (arrivalAt <= departureAt) fail('Arrival must be after departure.');
  if (departureAt.getTime() < Date.now()) fail('Departure must be in the future.');

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
