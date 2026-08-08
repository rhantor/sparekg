'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Star, Plane, Calendar, Package, Tag, Check, CheckCircle2, Users,
  AlertCircle, Loader2, ShieldAlert,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/app/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import {
  useGetFlightQuery,
  useBidsForFlightQuery,
  useSubmitBidMutation,
  useAcceptBidMutation,
  useDeclineBidMutation,
} from '@/lib/store/api';
import { toAppFlight, colorFor } from '@/lib/view-models';

const CATEGORY_FALLBACK = 'General';

export default function FlightDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, kycApproved } = useAuth();
  const uid = user?.uid ?? '';

  const { data: raw, isLoading, isError, error } = useGetFlightQuery(id);
  const flight = raw ? toAppFlight(raw, uid) : null;
  const isMine = !!raw && raw.travelerId === uid;

  // Only the traveler may list a flight's bids — the rules enforce it, so don't
  // even ask on behalf of a sender.
  const { data: bidsForMine = [] } = useBidsForFlightQuery(
    { flightId: id, travelerId: uid },
    { skip: !isMine || !uid },
  );

  const [submitBid, { isLoading: submitting }] = useSubmitBidMutation();
  const [acceptBid, { isLoading: accepting }] = useAcceptBidMutation();
  const [declineBid, { isLoading: declining }] = useDeclineBidMutation();
  const responding = accepting || declining;

  const [kg, setKg] = useState(2);
  const [item, setItem] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ kg: number; total: number } | null>(null);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="h-96 rounded-2xl border border-line bg-white/60 animate-pulse" />
        <div className="h-72 rounded-2xl border border-line bg-white/60 animate-pulse" />
      </div>
    );
  }

  if (isError || !flight || !raw) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-6 h-6 text-ash mx-auto mb-3" />
        <p className="text-ash">{error?.code === 'not-found' ? 'Flight not found.' : 'Couldn’t load this flight.'}</p>
        <Link href="/flights" className="inline-flex items-center gap-1.5 text-teal font-semibold mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to flights
        </Link>
      </div>
    );
  }

  const total = Math.round(kg * flight.pricePerKg * 100) / 100;
  const canBid = flight.kgLeft > 0 && raw.status === 'LIVE';

  async function placeBid() {
    setFormError(null);
    if (!item.trim()) return setFormError('Please describe what you are sending.');
    try {
      await submitBid({
        flightId: id,
        kgRequested: kg,
        itemCategory: raw!.acceptedCategories?.[0] ?? CATEGORY_FALLBACK,
        itemDescription: item.trim(),
        declaredValue: 0,
      }).unwrap();
      setPlaced({ kg, total });
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'Could not place your bid.');
    }
  }

  async function respond(action: 'accept' | 'decline', bidId: string) {
    setFormError(null);
    try {
      const args = { bidId, flightId: id };
      if (action === 'accept') await acceptBid(args).unwrap();
      else await declineBid(args).unwrap();
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'Could not update that bid.');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/flights" className="inline-flex items-center gap-1.5 text-sm text-ash hover:text-navy mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to flights
      </Link>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Left — flight info */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Avatar name={flight.travelerName} color={flight.travelerColor} verified={flight.verified} size={48} />
                <div>
                  <div className="font-semibold text-navy">{flight.travelerName}</div>
                  <div className="flex items-center gap-1 text-sm text-ash mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-gold text-gold" />
                    <span className="font-medium text-navy">{flight.travelerRating.toFixed(1)}</span>
                    <span>· {flight.travelerTrips} trips</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={flight.status} />
            </div>

            <div className="flex items-center justify-between bg-sand rounded-xl px-5 py-4">
              <div>
                <div className="font-display text-2xl font-semibold text-navy">{flight.originCode}</div>
                <div className="text-xs text-ash">{flight.origin}</div>
              </div>
              <div className="flex-1 mx-4 flex items-center text-ash">
                <span className="flex-1 h-px bg-line" />
                <Plane className="w-5 h-5 mx-1 text-teal" />
                <span className="flex-1 h-px bg-line" />
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-semibold text-navy">{flight.destinationCode}</div>
                <div className="text-xs text-ash">{flight.destination}</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-line shadow-soft p-6 space-y-4">
            <Row icon={Calendar} label="Travel date" value={flight.date} />
            <Row icon={Plane} label="Airline" value={`${flight.airline} · ${raw.flightNumber}`} />
            <Row icon={Package} label="Capacity" value={`${flight.kgLeft} KG available of ${flight.kgTotal} KG`} />
            <Row icon={Tag} label="Price" value={`RM ${flight.pricePerKg} / kg`} />
            {flight.categories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-sm text-ash mb-2">
                  <Check className="w-4 h-4" /> Accepted categories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {flight.categories.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-md bg-teal/[0.07] text-teal-700 text-xs font-medium border border-teal/15">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {raw.specialNotes && (
              <p className="text-sm text-ash border-t border-line pt-4">{raw.specialNotes}</p>
            )}
          </div>
        </div>

        {/* Right — bid panel or incoming bids */}
        <div className="lg:sticky lg:top-24 h-fit">
          {formError && (
            <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          {isMine ? (
            <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-navy mb-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal" /> Incoming bids
              </h2>
              <p className="text-sm text-ash mb-4">
                {bidsForMine.length} sender{bidsForMine.length === 1 ? '' : 's'} want to use your capacity.
              </p>
              <div className="space-y-3">
                {bidsForMine.map((b) => (
                  <div key={b.bidId} className="border border-line rounded-xl p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={b.sender?.displayName ?? 'Sender'} color={colorFor(b.senderId)} size={32} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-navy">{b.sender?.displayName ?? 'Sender'}</div>
                        <div className="text-xs text-ash">{b.kgRequested} KG · {b.itemDescription}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-navy">RM {b.offeredTotal}</span>
                      {b.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => respond('accept', b.bidId)}
                            disabled={responding}
                            className="px-3 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respond('decline', b.bidId)}
                            disabled={responding}
                            className="px-3 py-1.5 rounded-lg border border-line text-ash text-xs font-semibold hover:border-navy/25 transition-colors disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {bidsForMine.length === 0 && (
                  <p className="text-sm text-ash text-center py-4">No bids yet. Senders will appear here.</p>
                )}
              </div>
            </div>
          ) : placed ? (
            <div className="bg-white rounded-2xl border border-line shadow-soft p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-teal" />
              </div>
              <h2 className="font-display text-lg font-semibold text-navy mb-1">Bid submitted</h2>
              <p className="text-sm text-ash">
                {flight.travelerName} will review your offer of <strong className="text-navy">RM {placed.total}</strong> for {placed.kg} KG.
              </p>
            </div>
          ) : !kycApproved ? (
            <div className="bg-white rounded-2xl border border-line shadow-soft p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="font-display text-lg font-semibold text-navy mb-1">Verify to bid</h2>
              <p className="text-sm text-ash mb-4">Travelers only accept shipments from verified senders.</p>
              <Link href="/profile/kyc" className="inline-block px-4 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
                Start verification
              </Link>
            </div>
          ) : !canBid ? (
            <div className="bg-white rounded-2xl border border-line shadow-soft p-6 text-center text-ash text-sm">
              This flight is no longer accepting bids.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
              <h2 className="font-display text-lg font-semibold text-navy mb-4">Place a bid</h2>
              <label className="block text-sm font-medium text-navy mb-1.5">Weight (KG)</label>
              <input
                type="number" min={1} max={flight.kgLeft} value={kg}
                onChange={(e) => setKg(Math.max(1, Math.min(flight.kgLeft, Number(e.target.value) || 1)))}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-navy outline-none focus:border-teal mb-4"
              />
              <label className="block text-sm font-medium text-navy mb-1.5">What are you sending?</label>
              <textarea
                value={item} onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Documents and a small gift box"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-line text-navy text-sm outline-none focus:border-teal mb-4 resize-none"
              />
              <div className="flex items-center justify-between bg-sand rounded-xl px-4 py-3 mb-4">
                <span className="text-sm text-ash">Estimated total</span>
                <span className="font-display text-xl font-semibold text-navy">RM {total}</span>
              </div>
              <button
                onClick={placeBid}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting…' : 'Submit bid'}
              </button>
              <p className="text-xs text-ash text-center mt-2.5">Points are only held once the traveler agrees.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-navy/[0.04] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-ash" />
      </span>
      <div className="flex-1 flex items-center justify-between">
        <span className="text-sm text-ash">{label}</span>
        <span className="text-sm font-medium text-navy text-right">{value}</span>
      </div>
    </div>
  );
}
