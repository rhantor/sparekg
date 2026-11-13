'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, PackageCheck, Plane, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/lib/auth-context';
import {
  useMyBidsQuery,
  useIncomingBidsQuery,
  useAcceptBidMutation,
  useDeclineBidMutation,
  useWithdrawBidMutation,
  useGetFlightQuery,
} from '@/lib/store/api';
import { toAppBid, type AppBid } from '@/lib/view-models';
import type { Bid } from '@/lib/types';

/** Bid states that came out of an agreement — they have a delivery page. */
const DEAL_STATUSES = new Set(['AGREED', 'HANDED_OVER', 'DELIVERED', 'DISPUTED', 'RESOLVED']);

/**
 * Bids carry no copy of their flight, so each row reads it (RTK Query caches
 * and shares these) for the route, date and — for a sender — the traveler.
 */
function BidRowWithFlight({ raw, tab, ...rest }: { raw: Bid; tab: 'sender' | 'traveler' } & Omit<RowProps, 'bid' | 'asTraveler'>) {
  const { data: flight } = useGetFlightQuery(raw.flightId);
  return <BidRow bid={toAppBid(raw, tab, flight)} asTraveler={tab === 'traveler'} {...rest} />;
}

interface RowProps {
  bid: AppBid;
  asTraveler: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
  busy: boolean;
}

function BidRow({
  bid,
  asTraveler,
  onAccept,
  onDecline,
  onWithdraw,
  busy,
}: RowProps) {
  const pending = bid.status === 'PENDING';
  const isDeal = DEAL_STATUSES.has(bid.status);

  const secondary =
    'px-3 py-2 rounded-lg border border-line text-ash text-xs font-semibold hover:border-navy/25 transition-colors disabled:opacity-60';

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-4">
      <div className="flex items-center gap-4">
        <Avatar name={bid.counterpartyName} color={bid.counterpartyColor} size={42} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-navy">{bid.counterpartyName}</div>
          <div className="text-xs text-ash truncate">{bid.route} · {bid.date} · {bid.kg} KG · {bid.item}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-navy">RM {bid.offeredTotal}</div>
          <div className="mt-1"><StatusBadge status={bid.status} /></div>
        </div>
        {!pending && !isDeal && (
          <Link href={`/flights/${bid.flightId}`} aria-label="View flight" className="text-ash hover:text-teal transition-colors">
            <ArrowRight className="w-5 h-5" />
          </Link>
        )}
      </div>

      {/* Actions sit on their own line so they stay reachable on a phone. */}
      {(pending || isDeal) && (
        <div className="flex flex-wrap justify-end gap-2 mt-3 pt-3 border-t border-line">
          {asTraveler && pending && (
            <>
              <button onClick={onDecline} disabled={busy} className={secondary}>Decline</button>
              <button
                onClick={onAccept}
                disabled={busy}
                className="px-3 py-2 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                {busy && <Loader2 className="w-3 h-3 animate-spin" />} Accept
              </button>
            </>
          )}
          {!asTraveler && pending && (
            <>
              <button onClick={onWithdraw} disabled={busy} className={secondary}>Withdraw</button>
              <Link href={`/flights/${bid.flightId}`} className={secondary}>View flight</Link>
            </>
          )}
          {isDeal && (
            <Link
              href={`/deliveries/${bid.id}`}
              className="px-3 py-2 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy-700 transition-colors inline-flex items-center gap-1.5"
            >
              <PackageCheck className="w-3.5 h-3.5" /> View delivery
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function BidsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [tab, setTab] = useState<'sender' | 'traveler'>('sender');
  const [error, setError] = useState<string | null>(null);

  // `skip` keeps RTK Query from firing a query with an empty uid, which the
  // security rules would reject anyway.
  const asSender = useMyBidsQuery(uid, { skip: !uid });
  const asTraveler = useIncomingBidsQuery(uid, { skip: !uid });

  const [acceptBid, { isLoading: accepting }] = useAcceptBidMutation();
  const [declineBid, { isLoading: declining }] = useDeclineBidMutation();
  const [withdrawBid, { isLoading: withdrawing }] = useWithdrawBidMutation();
  const busy = accepting || declining || withdrawing;
  const router = useRouter();


  const active = tab === 'sender' ? asSender : asTraveler;
  const list = (active.data ?? []) as Bid[];

  async function respond(action: 'accept' | 'decline' | 'withdraw', bid: Bid) {
    setError(null);
    try {
      const args = { bidId: bid.bidId, flightId: bid.flightId };
      if (action === 'accept') {
        const { transactionId } = await acceptBid(args).unwrap();
        // The deal page is where the next steps (contact, handover) live.
        router.push(`/deliveries/${transactionId}`);
      } else if (action === 'decline') {
        await declineBid(args).unwrap();
      } else {
        await withdrawBid(args).unwrap();
      }
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not update that bid.');
    }
  }

  return (
    <div>
      <PageHeader title="Your bids" subtitle="Track the offers you've made and the bids on your flights." />

      <div className="inline-flex bg-white border border-line rounded-xl p-1 shadow-soft mb-6">
        <button
          onClick={() => setTab('sender')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'sender' ? 'bg-navy text-white' : 'text-ash hover:text-navy'
          }`}
        >
          <Package className="w-4 h-4" /> As sender
        </button>
        <button
          onClick={() => setTab('traveler')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'traveler' ? 'bg-navy text-white' : 'text-ash hover:text-navy'
          }`}
        >
          <Plane className="w-4 h-4" /> As traveler
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {active.isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 rounded-2xl border border-line bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : active.isError ? (
        <div className="bg-white rounded-2xl border border-line p-10 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-3" />
          <p className="text-navy font-medium mb-1">Couldn&apos;t load your bids</p>
          <p className="text-sm text-ash">{active.error?.message ?? 'Please try again in a moment.'}</p>
        </div>
      ) : list.length > 0 ? (
        <div className="space-y-3">
          {list.map((b) => (
            <BidRowWithFlight
              key={b.bidId}
              raw={b}
              tab={tab}
              busy={busy}
              onAccept={() => respond('accept', b)}
              onDecline={() => respond('decline', b)}
              onWithdraw={() => respond('withdraw', b)}
            />
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
