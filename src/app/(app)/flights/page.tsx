'use client';
import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { FlightCard } from '@/components/app/FlightCard';
import { browseFlights } from '@/lib/app-samples';

const DESTINATIONS = ['All destinations', 'Dhaka', 'Chittagong', 'Sylhet'];
const SORTS = [
  { key: 'price', label: 'Lowest price' },
  { key: 'capacity', label: 'Most capacity' },
  { key: 'bids', label: 'Fewest bids' },
];

export default function FlightsPage() {
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState(DESTINATIONS[0]);
  const [sort, setSort] = useState('price');

  const flights = useMemo(() => {
    let list = browseFlights.filter((f) => {
      const q = query.trim().toLowerCase();
      const matchQ =
        !q ||
        f.travelerName.toLowerCase().includes(q) ||
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q) ||
        f.originCode.toLowerCase().includes(q) ||
        f.destinationCode.toLowerCase().includes(q);
      const matchDest = dest === DESTINATIONS[0] || f.destination === dest;
      return matchQ && matchDest;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'price') return a.pricePerKg - b.pricePerKg;
      if (sort === 'capacity') return b.kgLeft - a.kgLeft;
      return a.bids - b.bids;
    });
    return list;
  }, [query, dest, sort]);

  const selectCls =
    'px-3 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal';

  return (
    <div>
      <PageHeader title="Find flights" subtitle="Browse verified travelers with spare luggage capacity." />

      {/* filter bar */}
      <div className="bg-white rounded-2xl border border-line shadow-soft p-3 mb-7 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city, code, or traveler…"
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60"
          />
        </div>
        <select className={selectCls} value={dest} onChange={(e) => setDest(e.target.value)}>
          {DESTINATIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm text-ash mb-4">
        <SlidersHorizontal className="w-4 h-4" />
        {flights.length} {flights.length === 1 ? 'flight' : 'flights'} found
      </div>

      {flights.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {flights.map((f) => (
            <FlightCard key={f.id} flight={f} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line p-10 text-center text-ash">
          No flights match your filters. Try widening your search.
        </div>
      )}
    </div>
  );
}
