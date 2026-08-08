'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, PlusCircle, AlertCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { useAuth } from '@/lib/auth-context';
import { usePostFlightMutation } from '@/lib/store/api';

const ORIGINS = ['KUL · Kuala Lumpur', 'PEN · Penang', 'JHB · Johor Bahru'];
const DESTS = ['DAC · Dhaka', 'CGP · Chittagong', 'ZYL · Sylhet'];
const CATEGORIES = ['Clothes', 'Documents', 'Electronics', 'Food', 'Cosmetics', 'Books', 'Gifts', 'Medicine'];

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
  const [error, setError] = useState<string | null>(null);
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
    if (new Date(arrivalAt) <= new Date(departureAt)) return setError('Arrival must be after departure.');
    if (new Date(departureAt) <= new Date()) return setError('Departure must be in the future.');
    if (!airline.trim()) return setError('Enter the airline.');
    if (!flightNumber.trim()) return setError('Enter the flight number.');
    if (!kg || Number(kg) <= 0) return setError('Enter the spare weight you can carry.');
    if (!price || Number(price) <= 0) return setError('Enter your price per kg.');

    try {
      await postFlight({
        originAirport: from,
        destinationAirport: to,
        departureAt: new Date(departureAt).toISOString(),
        arrivalAt: new Date(arrivalAt).toISOString(),
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
          Your {posted.from} → {posted.to} flight is now live. Senders can start bidding.
        </p>
        <div className="flex justify-center gap-3">
          <button onClick={() => router.push('/home')} className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">Go to dashboard</button>
          <button onClick={() => setPosted(null)} className="px-5 py-2.5 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Post another</button>
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
            <label className={labelCls}>Departure</label>
            <input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Arrival</label>
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
            <input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} className={inputCls} placeholder="e.g. MH196" />
          </div>
        </div>

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
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {isLoading ? 'Posting…' : 'Post flight'}
        </button>
      </form>
    </div>
  );
}
