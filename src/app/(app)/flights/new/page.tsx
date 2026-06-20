'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, PlusCircle } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';

const ORIGINS = ['KUL · Kuala Lumpur', 'PEN · Penang', 'JHB · Johor Bahru'];
const DESTS = ['DAC · Dhaka', 'CGP · Chittagong', 'ZYL · Sylhet'];
const CATEGORIES = ['Clothes', 'Documents', 'Electronics', 'Food', 'Cosmetics', 'Books', 'Gifts', 'Medicine'];

export default function NewFlightPage() {
  const [origin, setOrigin] = useState(ORIGINS[0]);
  const [dest, setDest] = useState(DESTS[0]);
  const [cats, setCats] = useState<string[]>(['Clothes', 'Documents']);
  const [kg, setKg] = useState('');
  const [price, setPrice] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';
  const labelCls = 'block text-sm font-medium text-navy mb-1.5';

  function toggleCat(c: string) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kg || !price) {
      alert('Please enter the available weight and price.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-teal" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-navy mb-2">Flight posted</h1>
        <p className="text-ash mb-7">
          Your {origin.split(' · ')[0]} → {dest.split(' · ')[0]} flight is now live. Senders can start bidding.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/home" className="px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">Go to dashboard</Link>
          <button onClick={() => setSubmitted(false)} className="px-5 py-2.5 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Post another</button>
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
            <label className={labelCls}>Departure date</label>
            <input type="date" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Airline & flight no.</label>
            <input className={inputCls} placeholder="e.g. MH196" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Spare weight (KG)</label>
            <input type="number" min={1} value={kg} onChange={(e) => setKg(e.target.value)} className={inputCls} placeholder="e.g. 10" />
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
          <textarea rows={3} className={`${inputCls} resize-none`} placeholder="e.g. No fragile items, handoff at KLIA before security." />
        </div>

        <button type="submit" className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
          <PlusCircle className="w-4 h-4" /> Post flight
        </button>
      </form>
    </div>
  );
}
