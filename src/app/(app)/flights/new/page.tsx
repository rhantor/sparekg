'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ref, uploadBytes } from 'firebase/storage';
import { ArrowLeft, CheckCircle2, PlusCircle, AlertCircle, ShieldAlert, Loader2, Ticket, FileText, Search } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { useAuth } from '@/lib/auth-context';
import { auth, storage } from '@/lib/firebase';
import { cityFor, tzFor, zonedInputToUtcMs, utcMsToZonedInput } from '@/lib/airports';
import { compressImage } from '@/lib/image-compress';
import { useLookupFlightMutation, usePostFlightMutation } from '@/lib/store/api';

const ORIGINS = ['KUL · Kuala Lumpur', 'PEN · Penang', 'JHB · Johor Bahru'];
const DESTS = ['DAC · Dhaka', 'CGP · Chittagong', 'ZYL · Sylhet'];
const CATEGORIES = ['Clothes', 'Documents', 'Electronics', 'Food', 'Cosmetics', 'Books', 'Gifts', 'Medicine'];

/** Mirrors MIN_DEPARTURE_LEAD_HOURS in functions/src/validation.ts — the server enforces it. */
const MIN_LEAD_HOURS = 12;
/** Mirrors MAX_DEPARTURE_LEAD_DAYS and MAX_FLIGHT_HOURS in functions/src/validation.ts. */
const MAX_LEAD_DAYS = 60;
const MAX_FLIGHT_HOURS = 24;
/** Mirrors the tickets/ limits in storage.rules. */
const MAX_TICKET_BYTES = 5 * 1024 * 1024;
const TICKET_TYPE_RE = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/;
const TICKET_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';
/** Formats every browser can draw in an <img>; HEIC mostly cannot outside Safari. */
const PREVIEWABLE_RE = /^image\/(jpeg|png|webp)$/;

const codeOf = (option: string) => option.split(' · ')[0];

export default function NewFlightPage() {
  const router = useRouter();
  const { kycApproved } = useAuth();
  const [postFlight, { isLoading }] = usePostFlightMutation();

  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [dest, setDest] = useState(DESTS[0]);
  const [cats, setCats] = useState<string[]>(['Clothes', 'Documents']);
  const [departureAt, setDepartureAt] = useState('');
  const [arrivalAt, setArrivalAt] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [kg, setKg] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [ticket, setTicket] = useState<File | null>(null);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openedAt] = useState(() => Date.now());
  // A hint for the picker, in the origin airport's clock. The server is the real check.
  const minDeparture = utcMsToZonedInput(openedAt + MIN_LEAD_HOURS * 3600_000, tzFor(codeOf(origin)));
  const maxDeparture = utcMsToZonedInput(openedAt + MAX_LEAD_DAYS * 86_400_000, tzFor(codeOf(origin)));
  const [error, setError] = useState<string | null>(null);

  // Revokes each preview URL once it is replaced, and the last one on unmount.
  useEffect(() => {
    return () => {
      if (ticketPreview) URL.revokeObjectURL(ticketPreview);
    };
  }, [ticketPreview]);

  function pickTicket(file: File | null) {
    setTicket(file);
    setTicketPreview(file && PREVIEWABLE_RE.test(file.type) ? URL.createObjectURL(file) : null);
  }

  const busy = uploading || isLoading;

  const [lookupFlight, { isLoading: lookingUp }] = useLookupFlightMutation();
  const [lookupNote, setLookupNote] = useState<string | null>(null);

  /** Pre-fills route, airline and times from the published schedule. */
  async function lookUp() {
    setError(null);
    setLookupNote(null);
    const number = flightNumber.trim().toUpperCase().replace(/\s+/g, '');
    if (!number) return setError('Enter the flight number first.');
    // The date part of the departure field is already the origin's local date,
    // which is what the provider matches on.
    const date = departureAt.slice(0, 10);
    if (!date) return setError('Pick the departure date first, then look the flight up.');

    try {
      const { flights } = await lookupFlight({ flightNumber: number, date }).unwrap();
      if (flights.length === 0) {
        return setLookupNote(`We couldn't find ${number} on ${date}. Check the number and date, or fill the details in yourself.`);
      }
      const match = flights.find((f) => f.served && f.originAirport === codeOf(origin))
        ?? flights.find((f) => f.served);
      const originOption = match && ORIGINS.find((o) => codeOf(o) === match.originAirport);
      const destOption = match && DESTS.find((o) => codeOf(o) === match.destinationAirport);
      if (!match || !originOption || !destOption) {
        const f = flights[0];
        return setError(`${number} flies ${f.originAirport} → ${f.destinationAirport}, a route this form doesn't list yet.`);
      }

      setOrigin(originOption);
      setDest(destOption);
      if (match.airline) setAirline(match.airline);
      setFlightNumber(match.flightNumber);
      setDepartureAt(utcMsToZonedInput(Date.parse(match.departureAt), tzFor(match.originAirport)));
      if (match.arrivalAt) {
        setArrivalAt(utcMsToZonedInput(Date.parse(match.arrivalAt), tzFor(match.destinationAirport)));
      }
      setLookupNote(`Filled in from the published schedule for ${match.flightNumber}. Check it against your ticket.`);
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not look the flight up. Enter the details yourself.');
    }
  }
  const [posted, setPosted] = useState<{ from: string; to: string } | null>(null);

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';
  const labelCls = 'block text-sm font-medium text-navy mb-1.5';

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const from = codeOf(origin);
    const to = codeOf(dest);

    // Cheap client-side checks for immediate feedback. The server re-validates
    // all of this — these exist for the user, not for safety.
    if (!departureAt || !arrivalAt) return setError('Enter both departure and arrival times.');
    // Each time is typed on its own airport's clock, not the browser's.
    const departureMs = zonedInputToUtcMs(departureAt, tzFor(from));
    const arrivalMs = zonedInputToUtcMs(arrivalAt, tzFor(to));
    if (Number.isNaN(departureMs) || Number.isNaN(arrivalMs)) return setError('Enter valid departure and arrival times.');
    if (arrivalMs <= departureMs) return setError('Arrival must be after departure.');
    if (departureMs < Date.now() + MIN_LEAD_HOURS * 3600_000) {
      return setError(`Departure must be at least ${MIN_LEAD_HOURS} hours from now.`);
    }
    if (departureMs > Date.now() + MAX_LEAD_DAYS * 86_400_000) {
      return setError(`Departure must be within ${MAX_LEAD_DAYS} days.`);
    }
    if (arrivalMs - departureMs > MAX_FLIGHT_HOURS * 3600_000) {
      return setError(`Arrival must be within ${MAX_FLIGHT_HOURS} hours of departure — check the dates.`);
    }
    if (!airline.trim()) return setError('Enter the airline.');
    if (!flightNumber.trim()) return setError('Enter the flight number.');
    if (!kg || Number(kg) <= 0) return setError('Enter the spare weight you can carry.');
    if (!price || Number(price) <= 0) return setError('Enter your price per kg.');
    if (!ticket) return setError('Upload your ticket.');
    if (!TICKET_TYPE_RE.test(ticket.type)) {
      return setError('The ticket must be a photo (JPG, PNG, WebP, HEIC) or a PDF.');
    }

    const uid = auth.currentUser?.uid;
    if (!uid) return setError('You must be signed in.');

    try {
      setUploading(true);
      // Size is checked after compressing: a 9 MB camera photo usually shrinks
      // well under the limit and should not be turned away.
      const upload = await compressImage(ticket);
      if (upload.size >= MAX_TICKET_BYTES) return setError('The ticket file must be under 5 MB.');

      const ticketPath = `tickets/${uid}/ticket_${Date.now()}`;
      await uploadBytes(ref(storage, ticketPath), upload, { contentType: upload.type });
      setUploading(false);

      await postFlight({
        ticketPath,
        originAirport: from,
        destinationAirport: to,
        departureAt: new Date(departureMs).toISOString(),
        arrivalAt: new Date(arrivalMs).toISOString(),
        airline: airline.trim(),
        flightNumber: flightNumber.trim().toUpperCase(),
        totalKgAvailable: Number(kg),
        pricePerKg: Number(price),
        acceptedCategories: cats,
        prohibitedItems: [],
        specialNotes: notes.trim() || null,
      }).unwrap();

      setPosted({ from, to });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not post your flight. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (!kycApproved) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-navy mb-2">Verify your identity first</h1>
        <p className="text-ash mb-7">
          Senders trust verified travelers with their belongings, so we check every carrier before their first listing.
        </p>
        <Link href="/profile/kyc" className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
          Start verification
        </Link>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-teal" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-navy mb-2">Flight posted</h1>
        <p className="text-ash mb-7">
          Your {posted.from} → {posted.to} flight is live and senders can start bidding.
          You can accept bids once our team has verified your ticket.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push('/home')} className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">Go to dashboard</button>
          <button onClick={() => { setPosted(null); pickTicket(null); }} className="px-5 py-2.5 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Post another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/home" className="inline-flex items-center gap-1.5 text-sm text-ash hover:text-navy mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <PageHeader title="Post a flight" subtitle="List your spare luggage capacity for senders on your route." />

      <form onSubmit={submit} className="bg-white rounded-2xl border border-line shadow-soft p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>From</label>
            <select className={inputCls} value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {ORIGINS.map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>To</label>
            <select className={inputCls} value={dest} onChange={(e) => setDest(e.target.value)}>
              {DESTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              Departure <span className="text-ash font-normal">({cityFor(codeOf(origin))} time)</span>
            </label>
            <input type="datetime-local" min={minDeparture} max={maxDeparture} value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} className={inputCls} />
            <p className="text-xs text-ash mt-1">Between {MIN_LEAD_HOURS} hours and {MAX_LEAD_DAYS} days from now.</p>
          </div>
          <div>
            <label className={labelCls}>
              Arrival <span className="text-ash font-normal">({cityFor(codeOf(dest))} time)</span>
            </label>
            <input type="datetime-local" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Airline</label>
            <input value={airline} onChange={(e) => setAirline(e.target.value)} className={inputCls} placeholder="e.g. Malaysia Airlines" />
          </div>
          <div>
            <label className={labelCls}>Flight number</label>
            <div className="flex gap-2">
              <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className={inputCls} placeholder="e.g. MH196" />
              <button
                type="button"
                onClick={lookUp}
                disabled={lookingUp || busy}
                title="Fill the route, airline and times from the published schedule"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg border border-line text-navy text-sm font-semibold hover:border-navy/25 transition-colors disabled:opacity-60"
              >
                {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Look up
              </button>
            </div>
          </div>
        </div>
        {lookupNote && <p className="text-xs text-teal-700 -mt-2">{lookupNote}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Spare weight (KG)</label>
            <input type="number" min={1} step="0.5" value={kg} onChange={(e) => setKg(e.target.value)} className={inputCls} placeholder="e.g. 10" />
          </div>
          <div>
            <label className={labelCls}>Price per KG (RM)</label>
            <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} placeholder="e.g. 25" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Accepted categories</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleCat(c)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  cats.includes(c) ? 'border-teal text-teal bg-teal/[0.07]' : 'border-line text-ash hover:border-ash/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Ticket</label>
          <div className="border border-line rounded-xl p-4 bg-sand">
            <p className="text-xs text-ash mb-2">
              A photo, screenshot or PDF of your ticket or booking confirmation showing your name, flight number and date.
              Only our team can see it — senders never do.
            </p>
            <input
              type="file"
              accept={TICKET_ACCEPT}
              onChange={(e) => pickTicket(e.target.files?.[0] ?? null)}
              className="text-sm text-ash"
            />
            {ticket && (
              <div className="mt-3 flex items-center gap-3">
                {ticketPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ticketPreview} alt="Ticket preview" className="w-24 h-16 object-cover rounded-md border border-line" />
                ) : (
                  <span className="w-24 h-16 rounded-md border border-line bg-white flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-ash" />
                  </span>
                )}
                <p className="text-teal text-sm flex items-center gap-1 min-w-0">
                  <Ticket className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{ticket.name}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} placeholder="e.g. No fragile items, handoff at KLIA before security." />
        </div>

        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {uploading ? 'Uploading ticket…' : isLoading ? 'Posting…' : 'Post flight'}
        </button>
      </form>
    </div>
  );
}
