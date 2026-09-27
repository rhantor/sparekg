import Link from 'next/link';
import { Scale, Clock } from 'lucide-react';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminPage, formatWhen, hoursSince, toIso } from '@/lib/admin-data';
import { ResolveDisputeForm } from './ResolveDisputeForm';

export const dynamic = 'force-dynamic';

const OUTCOME_TEXT: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'badge-danger' },
  RESOLVED_FOR_SENDER: { label: 'For sender', cls: 'badge-success' },
  RESOLVED_FOR_TRAVELER: { label: 'For traveler', cls: 'badge-success' },
  SPLIT: { label: 'Split', cls: 'badge-warning' },
  CLOSED_INVALID: { label: 'Closed invalid', cls: 'badge-neutral' },
};

interface Row {
  id: string;
  status: string;
  claimText: string;
  openedByRole: string;
  statusWhenOpened: string | null;
  travelerName: string;
  senderName: string;
  travelerId: string;
  senderId: string;
  adminNotes: string | null;
  createdAt: string | null;
  resolvedAt: string | null;
  deal: {
    route: string;
    kg: number;
    totalPrice: number;
    item: string;
    handedOver: string | null;
    received: string | null;
    delivered: string | null;
    phones: { traveler: string | null; sender: string | null };
  } | null;
}

async function load(): Promise<Row[]> {
  const snap = await adminDb.collection('disputes').orderBy('createdAt', 'desc').limit(100).get();
  const dealSnaps = snap.empty
    ? []
    : await adminDb.getAll(...snap.docs.map((d) => adminDb.collection('transactions').doc(d.id)));
  const deals = new Map(dealSnaps.map((s) => [s.id, s.data()]));

  const rows = snap.docs.map((doc): Row => {
    const d = doc.data();
    const t = deals.get(doc.id);
    return {
      id: doc.id,
      status: d.status,
      claimText: d.claimText ?? '',
      openedByRole: d.openedByRole ?? '—',
      statusWhenOpened: d.statusWhenOpened ?? null,
      travelerName: d.travelerName ?? 'Traveler',
      senderName: d.senderName ?? 'Sender',
      travelerId: d.travelerId,
      senderId: d.senderId,
      adminNotes: d.adminNotes ?? null,
      createdAt: toIso(d.createdAt),
      resolvedAt: toIso(d.resolvedAt),
      deal: t ? {
        route: `${t.flight?.originAirport ?? '?'} → ${t.flight?.destinationAirport ?? '?'}`,
        kg: t.kg,
        totalPrice: t.totalPrice,
        item: t.item?.description ?? '',
        handedOver: toIso(t.handoffConfirmedAt),
        received: toIso(t.pickupConfirmedAt),
        delivered: toIso(t.deliveredAt),
        phones: { traveler: t.parties?.traveler?.phone ?? null, sender: t.parties?.sender?.phone ?? null },
      } : null,
    };
  });
  // Open first, oldest first among them: that is the order staff should work.
  return rows.sort((a, b) => {
    if ((a.status === 'OPEN') !== (b.status === 'OPEN')) return a.status === 'OPEN' ? -1 : 1;
    return a.status === 'OPEN'
      ? Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '')
      : Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '');
  });
}

export default async function DisputesPage() {
  await requireAdminPage();

  let rows: Row[] = [];
  let failed = false;
  try {
    rows = await load();
  } catch (error) {
    console.error('[admin] disputes failed:', error);
    failed = true;
  }
  const open = rows.filter((r) => r.status === 'OPEN').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Scale className="w-6 h-6 text-brand-400" /> Disputes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {open} open · Completion of a disputed delivery is paused until you decide. Every decision is audited.
        </p>
      </div>

      {failed ? (
        <div className="glass-card p-6 text-sm text-red-400">Couldn&apos;t load disputes.</div>
      ) : rows.length === 0 ? (
        <div className="glass-card p-10 text-center text-gray-500">No disputes have been raised.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const badge = OUTCOME_TEXT[r.status] ?? { label: r.status, cls: 'badge-neutral' };
            const age = hoursSince(r.createdAt);
            return (
              <div key={r.id} className="glass-card p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-gray-500">
                      Raised by the {r.openedByRole} · {formatWhen(r.createdAt)}
                    </span>
                    {r.status === 'OPEN' && age !== null && (
                      <span className={`text-xs flex items-center gap-1 ${age > 24 ? 'text-red-400' : 'text-gray-500'}`}>
                        <Clock className="w-3 h-3" /> {age}h waiting
                      </span>
                    )}
                  </div>
                  <p className="text-gray-200 whitespace-pre-wrap">{r.claimText}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Party role="Sender" name={r.senderName} uid={r.senderId} phone={r.deal?.phones.sender ?? null} />
                    <Party role="Traveler" name={r.travelerName} uid={r.travelerId} phone={r.deal?.phones.traveler ?? null} />
                  </div>

                  {r.deal ? (
                    <div className="rounded-lg bg-surface-100 p-3 text-sm text-gray-300 space-y-1">
                      <p><span className="text-gray-500">Deal:</span> {r.deal.route} · {r.deal.kg} KG · MYR {r.deal.totalPrice} · {r.deal.item}</p>
                      <p><span className="text-gray-500">Stage when raised:</span> {r.statusWhenOpened?.replaceAll('_', ' ') ?? '—'}</p>
                      <p>
                        <span className="text-gray-500">Handed over:</span> {formatWhen(r.deal.handedOver)} ·{' '}
                        <span className="text-gray-500">received:</span> {formatWhen(r.deal.received)} ·{' '}
                        <span className="text-gray-500">delivered:</span> {formatWhen(r.deal.delivered)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-400">The deal record behind this dispute is missing.</p>
                  )}
                </div>

                <div>
                  {r.status === 'OPEN' ? (
                    <ResolveDisputeForm bidId={r.id} />
                  ) : (
                    <div className="text-sm space-y-1">
                      <p className="text-gray-500">Resolved {formatWhen(r.resolvedAt)}</p>
                      <p className="text-gray-300 whitespace-pre-wrap">{r.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Party({ role, name, uid, phone }: { role: string; name: string; uid: string; phone: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{role}</p>
      <Link href={`/admin/users/${uid}`} className="text-white font-medium hover:text-brand-400">{name}</Link>
      <p className="text-xs text-gray-400">{phone ?? 'No phone'}</p>
    </div>
  );
}
