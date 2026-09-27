'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, AlertCircle, AlertTriangle, Check, CheckCircle2, Clock, KeyRound, Loader2,
  MessageCircle, Package, Phone, Plane, Scale, ShieldCheck, Star, Wallet,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/app/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import {
  useGetDealQuery,
  useDeliveryCodeQuery,
  useGetDisputeQuery,
  useConfirmHandoverMutation,
  useMarkDeliveredMutation,
  useOpenDisputeMutation,
  useSubmitRatingMutation,
} from '@/lib/store/api';
import { colorFor } from '@/lib/view-models';
import { cityFor } from '@/lib/airports';
import {
  DISPUTE_WINDOW_HOURS, MAX_CODE_ATTEMPTS, canDispute, counterpart, dealRole, departureLabel,
  hasDeparted, money, myRating, routeCities, routeLabel, whatsappLink, type DealRole,
} from '@/lib/deals';
import type { Dispute, Transaction } from '@/lib/types';

/** Readable server message, or a fallback — callables write theirs for end users. */
function messageOf(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message ?? fallback;
}

function when(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const { data: deal, isLoading, isError, error } = useGetDealQuery(id, { skip: !uid });
  const role = deal ? dealRole(deal, uid) : null;
  // The rules refuse this read to anyone but the sender, so don't ask otherwise.
  const { data: code } = useDeliveryCodeQuery(id, { skip: role !== 'sender' });
  const { data: dispute } = useGetDisputeQuery(id, { skip: !deal?.disputeId });
  // Judged once per visit: keeps render pure, and a page left open across the
  // departure time only needs a refresh to catch up.
  const [now] = useState(() => Date.now());

  if (isLoading || !uid) {
    return (
      <div className="max-w-4xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="h-96 rounded-2xl border border-line bg-white/60 animate-pulse" />
        <div className="h-72 rounded-2xl border border-line bg-white/60 animate-pulse" />
      </div>
    );
  }

  if (isError || !deal || !role) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-6 h-6 text-ash mx-auto mb-3" />
        <p className="text-ash">
          {error?.code === 'not-found' ? 'Delivery not found.' : 'You don’t have access to this delivery.'}
        </p>
        <Link href="/deliveries" className="inline-flex items-center gap-1.5 text-teal font-semibold mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to deliveries
        </Link>
      </div>
    );
  }

  const other = counterpart(deal, role);
  const rated = myRating(deal, role);
  const finished = deal.status === 'DELIVERED' || deal.status === 'RESOLVED';

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/deliveries" className="inline-flex items-center gap-1.5 text-sm text-ash hover:text-navy mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to deliveries
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-ash mb-1">
            {role === 'sender' ? 'Your parcel' : 'You are carrying'}
          </div>
          <h1 className="font-display text-2xl md:text-[1.7rem] font-semibold text-navy">
            {routeLabel(deal)}
          </h1>
          <p className="text-sm text-ash mt-1">
            {routeCities(deal)} · {deal.flight.airline} {deal.flight.flightNumber} · departs {departureLabel(deal)}
          </p>
        </div>
        <StatusBadge status={deal.status} />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Left — where things stand */}
        <div className="space-y-5">
          {(deal.status === 'DISPUTED' || deal.status === 'RESOLVED') && (
            <DisputeNotice deal={deal} dispute={dispute} />
          )}
          <Timeline deal={deal} />
          <ParcelCard deal={deal} role={role} />
        </div>

        {/* Right — what the viewer can do */}
        <div className="space-y-4 lg:sticky lg:top-24 h-fit">
          <ContactCard deal={deal} role={role} />

          {role === 'sender' && code && (deal.status === 'AGREED' || deal.status === 'HANDED_OVER') && (
            <CodeCard code={code.code} recipientCity={cityFor(deal.flight.destinationAirport)} />
          )}

          {deal.status === 'AGREED' && <HandoverCard deal={deal} role={role} />}

          {deal.status === 'HANDED_OVER' && role === 'traveler' && (
            <DeliverCard deal={deal} departed={hasDeparted(deal, now)} />
          )}

          {deal.status === 'HANDED_OVER' && role === 'sender' && (
            <InfoCard icon={Plane} title="In the traveler’s care">
              {other.displayName} confirmed receiving your parcel. They&apos;ll ask the recipient for your code on delivery.
            </InfoCard>
          )}

          {finished && (rated === null
            ? <RatingCard deal={deal} name={other.displayName} />
            : <InfoCard icon={Star} title="Thanks for rating">
                You gave {other.displayName} {rated} star{rated === 1 ? '' : 's'}.
              </InfoCard>
          )}

          {deal.status === 'DELIVERED' && deal.payoutStatus === 'PENDING' && (
            <InfoCard icon={Clock} title="Completing soon">
              This delivery completes {DISPUTE_WINDOW_HOURS} hours after it was confirmed, if no problem is reported.
            </InfoCard>
          )}

          {canDispute(deal, now) && <DisputeCard deal={deal} />}
        </div>
      </div>
    </div>
  );
}

// ---- Left column ---------------------------------------------------------------

function Timeline({ deal }: { deal: Transaction }) {
  const handedOver = Boolean(deal.handoffConfirmedAt && deal.pickupConfirmedAt);
  const completed = deal.payoutStatus === 'RELEASED' || deal.payoutStatus === 'REFUNDED';

  const steps = [
    { title: 'Bid accepted', done: true, at: deal.createdAt, detail: 'Contact details shared with both of you.' },
    {
      title: 'Parcel handed over',
      done: handedOver,
      at: handedOver ? later(deal.handoffConfirmedAt, deal.pickupConfirmedAt) : null,
      detail: (
        <span className="flex flex-col gap-0.5">
          <Confirmation label="Sender handed it over" at={deal.handoffConfirmedAt} />
          <Confirmation label="Traveler received it" at={deal.pickupConfirmedAt} />
        </span>
      ),
    },
    {
      title: 'Delivered',
      done: Boolean(deal.deliveredAt),
      at: deal.deliveredAt,
      detail: 'Confirmed with the recipient’s code.',
    },
    {
      title: 'Completed',
      done: completed,
      at: deal.closedAt,
      detail: `${DISPUTE_WINDOW_HOURS} hours after delivery, if no problem is reported.`,
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
      <h2 className="font-display text-lg font-semibold text-navy mb-5">Progress</h2>
      <ol className="relative">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li key={step.title} className="relative pl-10 pb-6 last:pb-0">
              {i < steps.length - 1 && (
                <span className={`absolute left-[13px] top-7 bottom-0 w-px ${step.done ? 'bg-teal' : 'bg-line'}`} />
              )}
              <span
                className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                  step.done
                    ? 'bg-teal border-teal text-white'
                    : isCurrent
                      ? 'bg-white border-teal text-teal'
                      : 'bg-white border-line text-ash'
                }`}
              >
                {step.done ? <Check className="w-3.5 h-3.5" /> : <span className="text-xs font-semibold">{i + 1}</span>}
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`font-medium ${step.done || isCurrent ? 'text-navy' : 'text-ash'}`}>{step.title}</span>
                {step.at && <span className="text-xs text-ash shrink-0">{when(step.at)}</span>}
              </div>
              <div className="text-sm text-ash mt-0.5">{step.detail}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function later(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  return Date.parse(a) > Date.parse(b) ? a : b;
}

function Confirmation({ label, at }: { label: string; at: string | null }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${at ? 'text-teal-700' : ''}`}>
      {at ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
      {label}{at ? ` · ${when(at)}` : ' — waiting'}
    </span>
  );
}

function ParcelCard({ deal, role }: { deal: Transaction; role: DealRole }) {
  const rows: [string, string][] = [
    ['What', deal.item.description || '—'],
    ['Weight', `${deal.kg} KG`],
  ];
  if (deal.item.category) rows.push(['Category', deal.item.category]);
  if (deal.item.declaredValue > 0) rows.push(['Declared value', money(deal.item.declaredValue, deal.currency)]);
  if (deal.item.specialHandling) rows.push(['Handling', deal.item.specialHandling]);

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
      <h2 className="font-display text-lg font-semibold text-navy mb-4 flex items-center gap-2">
        <Package className="w-4 h-4 text-teal" /> Parcel
      </h2>
      <dl className="space-y-2.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-ash">{k}</dt>
            <dd className="text-navy font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 pt-5 border-t border-line">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ash flex items-center gap-2"><Wallet className="w-4 h-4" /> Agreed price</span>
          <span className="font-display text-xl font-semibold text-navy">{money(deal.totalPrice, deal.currency)}</span>
        </div>
        {deal.platformFee > 0 && (
          <div className="flex justify-between text-sm mt-1.5">
            <span className="text-ash">Platform fee</span>
            <span className="text-navy">{money(deal.platformFee, deal.currency)}</span>
          </div>
        )}
        <p className="text-xs text-ash mt-3 leading-relaxed">
          {role === 'sender'
            ? 'Pay the traveler this amount directly when you hand over the parcel. SpareKG does not take payment during the beta.'
            : 'The sender pays you this amount directly at handover. SpareKG does not take payment during the beta.'}
        </p>
      </div>
    </div>
  );
}

function DisputeNotice({ deal, dispute }: { deal: Transaction; dispute?: Dispute }) {
  const resolved = deal.status === 'RESOLVED';
  return (
    <div className={`rounded-2xl border p-5 ${resolved ? 'border-line bg-white' : 'border-amber-500/25 bg-amber-500/[0.06]'}`}>
      <div className="flex items-start gap-3">
        <Scale className={`w-5 h-5 mt-0.5 shrink-0 ${resolved ? 'text-navy' : 'text-amber-600'}`} />
        <div className="text-sm">
          <div className="font-semibold text-navy">
            {resolved ? 'Resolved by our team' : 'A problem was reported — our team is reviewing'}
          </div>
          {dispute?.claimText && (
            <p className="text-ash mt-1"><span className="font-medium text-navy">Report:</span> {dispute.claimText}</p>
          )}
          {resolved && dispute?.adminNotes && (
            <p className="text-ash mt-1"><span className="font-medium text-navy">Decision:</span> {dispute.adminNotes}</p>
          )}
          {!resolved && (
            <p className="text-ash mt-1">
              Completion is paused until this is settled. We may contact you both on the numbers shared here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Right column ---------------------------------------------------------------

function ContactCard({ deal, role }: { deal: Transaction; role: DealRole }) {
  const other = counterpart(deal, role);
  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-5">
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          name={other.displayName}
          color={colorFor(role === 'sender' ? deal.travelerId : deal.senderId)}
          verified
          size={44}
        />
        <div>
          <div className="font-semibold text-navy">{other.displayName}</div>
          <div className="text-xs text-ash">{role === 'sender' ? 'Traveler' : 'Sender'} · identity verified</div>
        </div>
      </div>
      {other.phone ? (
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${other.phone}`}
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-line text-sm font-semibold text-navy hover:border-navy/25 transition-colors"
          >
            <Phone className="w-4 h-4" /> Call
          </a>
          <a
            href={whatsappLink(other.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-sm text-ash">No phone number on file.</p>
      )}
      {other.phone && <p className="text-xs text-ash text-center mt-2">{other.phone}</p>}
      <p className="text-xs text-ash mt-3 leading-relaxed flex gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal" />
        Keep every step confirmed here — a deal settled outside SpareKG loses dispute protection.
      </p>
    </div>
  );
}

function CodeCard({ code, recipientCity }: { code: string; recipientCity: string }) {
  return (
    <div className="bg-navy rounded-2xl p-5 text-white">
      <div className="flex items-center gap-2 text-sm font-semibold mb-3">
        <KeyRound className="w-4 h-4 text-teal-500" /> Delivery code
      </div>
      {/* text-white stated here: the .site base styles colour font-display navy. */}
      <div className="font-display text-3xl font-semibold tracking-[0.3em] text-center py-2 text-white">{code}</div>
      <p className="text-xs text-white/70 mt-3 leading-relaxed">
        Send this to the person collecting the parcel in {recipientCity}. The traveler asks them for it on
        delivery — don&apos;t give it to the traveler yourself.
      </p>
    </div>
  );
}

function HandoverCard({ deal, role }: { deal: Transaction; role: DealRole }) {
  const [confirm, { isLoading }] = useConfirmHandoverMutation();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mine = role === 'sender' ? deal.handoffConfirmedAt : deal.pickupConfirmedAt;
  const theirsName = counterpart(deal, role).displayName;

  if (mine) {
    return (
      <InfoCard icon={Clock} title="Waiting on the other side">
        You confirmed at {when(mine)}. Once {theirsName} confirms too, the parcel is officially in transit.
      </InfoCard>
    );
  }

  async function submit() {
    setError(null);
    try {
      await confirm({ bidId: deal.bidId, note: note.trim() || undefined }).unwrap();
    } catch (err) {
      setError(messageOf(err, 'Could not confirm the handover.'));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-5">
      <h2 className="font-display text-lg font-semibold text-navy mb-1">
        {role === 'sender' ? 'Hand over your parcel' : 'Collect the parcel'}
      </h2>
      <p className="text-sm text-ash mb-4">
        {role === 'sender'
          ? `Meet ${theirsName}, hand over the packed parcel and pay the agreed price. Then confirm here.`
          : 'Check the contents match the description before you accept it. Never carry a sealed parcel you haven’t inspected.'}
      </p>
      <label className="block text-sm font-medium text-navy mb-1.5">Note (optional)</label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={280}
        placeholder={role === 'sender' ? 'e.g. Handed over at KLIA, 2 boxes' : 'e.g. Contents checked, 2 boxes'}
        className="w-full px-4 py-2.5 rounded-lg border border-line text-navy text-sm outline-none focus:border-teal mb-3"
      />
      {error && <ErrorLine message={error} />}
      <button
        onClick={submit}
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {role === 'sender' ? 'I’ve handed it over' : 'I’ve received the parcel'}
      </button>
    </div>
  );
}

function DeliverCard({ deal, departed }: { deal: Transaction; departed: boolean }) {
  const [markDelivered, { isLoading }] = useMarkDeliveredMutation();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const attemptsLeft = Math.max(0, MAX_CODE_ATTEMPTS - (deal.codeAttempts ?? 0));

  async function submit() {
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from the recipient.');
    try {
      await markDelivered({ bidId: deal.bidId, code }).unwrap();
    } catch (err) {
      setError(messageOf(err, 'Could not confirm the delivery.'));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-5">
      <h2 className="font-display text-lg font-semibold text-navy mb-1">Confirm delivery</h2>
      <p className="text-sm text-ash mb-4">
        Ask the recipient for the sender&apos;s 6-digit code when you hand the parcel over.
      </p>
      {!departed ? (
        <p className="text-sm text-amber-700 bg-amber-500/[0.07] rounded-lg px-3 py-2.5">
          You can confirm delivery once your flight has departed.
        </p>
      ) : attemptsLeft === 0 ? (
        <p className="text-sm text-rose-700 bg-rose-500/[0.07] rounded-lg px-3 py-2.5">
          Too many incorrect codes. Report a problem below and our team will confirm the delivery with you.
        </p>
      ) : (
        <>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            aria-label="Delivery code"
            className="w-full px-4 py-3 rounded-lg border border-line text-navy text-center font-display text-2xl tracking-[0.4em] outline-none focus:border-teal mb-2"
          />
          <p className="text-xs text-ash mb-3">
            {attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left.
          </p>
          {error && <ErrorLine message={error} />}
          <button
            onClick={submit}
            disabled={isLoading || code.length !== 6}
            className="w-full py-3 rounded-xl bg-teal text-white font-semibold hover:bg-teal-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Mark as delivered
          </button>
        </>
      )}
    </div>
  );
}

function RatingCard({ deal, name }: { deal: Transaction; name: string }) {
  const [submitRating, { isLoading }] = useSubmitRatingMutation();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (stars < 1) return setError('Choose a star rating.');
    try {
      await submitRating({ bidId: deal.bidId, stars, comment: comment.trim() || undefined }).unwrap();
    } catch (err) {
      setError(messageOf(err, 'Could not save your rating.'));
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-5">
      <h2 className="font-display text-lg font-semibold text-navy mb-1">Rate {name}</h2>
      <p className="text-sm text-ash mb-3">Ratings help everyone choose who to trust.</p>
      <div className="flex gap-1 mb-3" role="radiogroup" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            onClick={() => setStars(n)}
            className="p-1"
          >
            <Star className={`w-7 h-7 transition-colors ${n <= stars ? 'fill-gold text-gold' : 'text-line'}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={280}
        rows={2}
        placeholder="Anything others should know? (optional)"
        className="w-full px-4 py-2.5 rounded-lg border border-line text-navy text-sm outline-none focus:border-teal mb-3 resize-none"
      />
      {error && <ErrorLine message={error} />}
      <button
        onClick={submit}
        disabled={isLoading}
        className="w-full py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Submit rating
      </button>
    </div>
  );
}

function DisputeCard({ deal }: { deal: Transaction }) {
  const [openDispute, { isLoading }] = useOpenDisputeMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (reason.trim().length < 20) return setError('Please describe the problem in at least 20 characters.');
    try {
      await openDispute({ bidId: deal.bidId, reason: reason.trim() }).unwrap();
      setOpen(false);
    } catch (err) {
      setError(messageOf(err, 'Could not report the problem.'));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-ash hover:text-rose-600 transition-colors"
      >
        <AlertTriangle className="w-4 h-4" /> Report a problem
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-rose-500/20 shadow-soft p-5">
      <h2 className="font-display text-lg font-semibold text-navy mb-1">Report a problem</h2>
      <p className="text-sm text-ash mb-3">
        Our team reviews every report and may contact you both. Completion pauses until it&apos;s settled.
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
        rows={4}
        placeholder="What happened? Include times, places and anything the other person said."
        className="w-full px-4 py-2.5 rounded-lg border border-line text-navy text-sm outline-none focus:border-teal mb-3 resize-none"
      />
      {error && <ErrorLine message={error} />}
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 rounded-xl border border-line text-sm font-semibold text-ash hover:border-navy/25 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={isLoading}
          className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />} Submit report
        </button>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-line shadow-soft p-5 flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="text-sm">
        <div className="font-semibold text-navy">{title}</div>
        <p className="text-ash mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function ErrorLine({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 mb-3 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
