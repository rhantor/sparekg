'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Package, Plane, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { myBids, incomingBids, type AppBid } from '@/lib/app-samples';

function BidRow({ bid, asTraveler }: { bid: AppBid; asTraveler: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-4 flex items-center gap-4">
      <Avatar name={bid.counterpartyName} color={bid.counterpartyColor} size={42} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-navy">{bid.counterpartyName}</div>
        <div className="text-xs text-ash truncate">{bid.route} · {bid.date} · {bid.kg} KG · {bid.item}</div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-navy">RM {bid.offeredTotal}</div>
        <div className="mt-1"><StatusBadge status={bid.status} /></div>
      </div>
      {asTraveler && bid.status === 'PENDING' ? (
        <div className="hidden sm:flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-700 transition-colors">Accept</button>
          <button className="px-3 py-2 rounded-lg border border-line text-ash text-xs font-semibold hover:border-navy/25 transition-colors">Decline</button>
        </div>
      ) : (
        <Link href={`/flights/${bid.flightId}`} className="text-ash hover:text-teal transition-colors">
          <ArrowRight className="w-5 h-5" />
        </Link>
      )}
    </div>
  );
}

export default function BidsPage() {
  const [tab, setTab] = useState<'sender' | 'traveler'>('sender');
  const list = tab === 'sender' ? myBids : incomingBids;

  return (
    <div>
      <PageHeader title="Your bids" subtitle="Track the offers you've made and the bids on your flights." />

      <div className="inline-flex bg-white border border-line rounded-xl p-1 shadow-soft mb-6">
        <button
          onClick={() => setTab('sender')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'sender' ? 'bg-teal text-white' : 'text-ash hover:text-navy'
          }`}
        >
          <Package className="w-4 h-4" /> As sender
        </button>
        <button
          onClick={() => setTab('traveler')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'traveler' ? 'bg-ocean text-white' : 'text-ash hover:text-navy'
          }`}
        >
          <Plane className="w-4 h-4" /> As traveler
        </button>
      </div>

      {list.length > 0 ? (
        <div className="space-y-3">
          {list.map((b) => (
            <BidRow key={b.id} bid={b} asTraveler={tab === 'traveler'} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line p-10 text-center text-ash">
          {tab === 'sender' ? (
            <>You haven&apos;t placed any bids yet. <Link href="/flights" className="text-teal font-semibold">Find a flight</Link>.</>
          ) : (
            <>No bids on your flights yet. <Link href="/flights/new" className="text-teal font-semibold">Post a flight</Link>.</>
          )}
        </div>
      )}
    </div>
  );
}
