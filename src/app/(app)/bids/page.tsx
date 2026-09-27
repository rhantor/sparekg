'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, PackageCheck, Plane, ArrowRight, AlertCircle, Loader2, Zap } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { BoostBidDialog } from '@/components/app/BoostBidDialog';
import { useAuth } from '@/lib/auth-context';
import {
  useMyBidsQuery,
  useIncomingBidsQuery,
  useAcceptBidMutation,
  useDeclineBidMutation,
  useWithdrawBidMutation,
  useGetUserQuery,
  useAppConfigQuery,
} from '@/lib/store/api';
import { toAppBid, type AppBid } from '@/lib/view-models';
import { URGENCY_TIERS, featureFlagsFrom } from '@/lib/economy';
import type { Bid } from '@/lib/types';

/** Bid states that came out of an agreement — they have a delivery page. */
const DEAL_STATUSES = new Set(['AGREED', 'HANDED_OVER', 'DELIVERED', 'DISPUTED', 'RESOLVED']);

function BidRow({
  bid,
  asTraveler,
  onAccept,
  onDecline,
  onWithdraw,
  onBoost,
  canBoost,
  busy,
}: {
  bid: AppBid;
  asTraveler: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onWithdraw: () => void;
  onBoost: () => void;
  canBoost: boolean;
  busy: boolean;
}) {
  const tier = URGENCY_TIERS.find((t) => t.level === bid.urgencyLevel);
  const pending = bid.status === 'PENDING';
  const isDeal = DEAL_STATUSES.has(bid.status);

  const secondary =
    'px-3 py-2 rounded-lg border border-line text-ash text-xs font-semibold hover:border-navy/25 transition-colors disabled:opacity-60';

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-4">
      <div className="flex items-center gap-4">
        <Avatar name={bid.counterpartyName} color={bid.counterpartyColor} size={42} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-navy flex items-center gap-2">
            {bid.counterpartyName}
            {tier && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/15 bg-amber-500/[0.08] text-amber-600 text-[0.68rem] font-semibold">
                <Zap className="w-3 h-3" />
                {tier.label}
              </span>
            )}
          </div>
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
              {canBoost && (
                <button
                  onClick={onBoost}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/25 text-amber-600 text-xs font-semibold hover:bg-amber-500/[0.06] transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {bid.urgencyLevel > 0 ? 'Extend' : 'Boost'}
                </button>
              )}
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

  // Balance is read here rather than inside the dialog so the dialog stays a
  // pure presentation of a decision the page already has the data for.
  const { data: profile } = useGetUserQuery(uid, { skip: !uid });
  const balance = (profile?.pointsBalance ?? 0) + (profile?.promoBalance ?? 0);
  const [boosting, setBoosting] = useState<AppBid | null>(null);

  // Urgency boosts ship dark. The callable rejects a boost while the flag is
  // off, so the button is hidden rather than left to fail on click.
  const { data: appConfig } = useAppConfigQuery();
  const boostsEnabled = Boolean(featureFlagsFrom(appConfig).enableUrgencyBoosts);

  const active = tab === 'sender' ? asSender : asTraveler;
  const list: AppBid[] = ((active.data ?? []) as Bid[]).map((b) => toAppBid(b, tab));

  async function respond(action: 'accept' | 'decline' | 'withdraw', bid: AppBid) {
    setError(null);
    try {
      const args = { bidId: bid.id, flightId: bid.flightId };
      if (action === 'accept') {
        const { transactionId } = await acceptBid(args).unwrap();
        // The deal page is where the next steps (contact, handover) live.
        router.push(`/deliveries/${transactionId}`);
      } else if (action === 'decline') {
        await declineBid(args).unwrap();
      } else {
        await withdrawBid({ ...args, uid }).unwrap();
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
            <BidRow
              key={b.id}
              bid={b}
              asTraveler={tab === 'traveler'}
              busy={busy}
              onAccept={() => respond('accept', b)}
              onDecline={() => respond('decline', b)}
              onWithdraw={() => respond('withdraw', b)}
              onBoost={() => setBoosting(b)}
              canBoost={boostsEnabled}
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

      {boosting && boostsEnabled && (
        <BoostBidDialog
          open
          onClose={() => setBoosting(null)}
          bidId={boosting.id}
          flightId={boosting.flightId}
          uid={uid}
          activeLevel={boosting.urgencyLevel}
          balance={balance}
        />
      )}
    </div>
  );
}
