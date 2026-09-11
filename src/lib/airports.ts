/**
 * Airports on the launch corridors, and the time zone each one's clock runs on.
 *
 * Flight times are typed and shown in the airport's own local time — the time
 * printed on the ticket — never the browser's. A browser in Malaysia (UTC+8)
 * reading a Dhaka arrival (UTC+6) as its own local time would store it two
 * hours wrong.
 */

interface AirportInfo {
  city: string;
  /** IANA zone name, as Intl expects it. */
  timeZone: string;
}

export const AIRPORTS: Record<string, AirportInfo> = {
  KUL: { city: 'Kuala Lumpur', timeZone: 'Asia/Kuala_Lumpur' },
  PEN: { city: 'Penang', timeZone: 'Asia/Kuala_Lumpur' },
  JHB: { city: 'Johor Bahru', timeZone: 'Asia/Kuala_Lumpur' },
  DAC: { city: 'Dhaka', timeZone: 'Asia/Dhaka' },
  CGP: { city: 'Chittagong', timeZone: 'Asia/Dhaka' },
  ZYL: { city: 'Sylhet', timeZone: 'Asia/Dhaka' },
};

/** Unknown codes fall back to the code itself. */
export function cityFor(code: string): string {
  return AIRPORTS[code]?.city ?? code;
}

/** Unknown codes fall back to UTC, so a time still renders rather than throwing. */
export function tzFor(code: string): string {
  return AIRPORTS[code]?.timeZone ?? 'UTC';
}

/** Date and clock time at the airport, labelled with whose clock it is. */
export function formatAirportTime(iso: string | null | undefined, airportCode: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const when = d.toLocaleString('en-GB', {
    timeZone: tzFor(airportCode),
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${when} · ${cityFor(airportCode)} time`;
}

/** Wall-clock fields of an instant as seen in `timeZone`. */
function wallClock(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(new Date(ms));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

/** How far `timeZone` is ahead of UTC at a given instant, in ms. */
function offsetMs(ms: number, timeZone: string): number {
  const w = wallClock(ms, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  return asUtc - Math.floor(ms / 60_000) * 60_000;
}

/**
 * Reads a datetime-local value ("YYYY-MM-DDTHH:mm") as wall-clock time at
 * `timeZone` and returns the instant it names. NaN when the value is unparseable.
 */
export function zonedInputToUtcMs(local: string, timeZone: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return NaN;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // The offset depends on the instant itself, so apply it once more in case the
  // first guess landed on the other side of a daylight-saving change.
  const firstGuess = naive - offsetMs(naive, timeZone);
  return naive - offsetMs(firstGuess, timeZone);
}

/** The datetime-local value ("YYYY-MM-DDTHH:mm") an instant shows as in `timeZone`. */
export function utcMsToZonedInput(ms: number, timeZone: string): string {
  const w = wallClock(ms, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}
