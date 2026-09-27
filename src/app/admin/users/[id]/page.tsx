import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Star, Coins, Plane, Send, Shield, Ban, Mail, Phone, Calendar, PackageCheck, History,
} from 'lucide-react';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdminPage, formatWhen, safely, toIso } from '@/lib/admin-data';
import { SuspendForm } from './SuspendForm';

export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  LIVE: 'badge-success', LOCKED: 'badge-warning', IN_TRANSIT: 'badge-info', COMPLETED: 'badge-neutral',
  CANCELLED: 'badge-danger', EXPIRED: 'badge-neutral', DRAFT: 'badge-neutral',
  PENDING: 'badge-warning', AGREED: 'badge-info', HANDED_OVER: 'badge-info', DELIVERED: 'badge-success',
  DECLINED: 'badge-danger', WITHDRAWN: 'badge-neutral', DISPUTED: 'badge-danger', RESOLVED: 'badge-purple',
  APPROVED: 'badge-success', REJECTED: 'badge-danger', UNDER_REVIEW: 'badge-info',
};

function Badge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_BADGE[status] ?? 'badge-neutral'}`}>{status.replaceAll('_', ' ')}</span>;
}

/** A document's fields plus its id, as rendered in the activity tables. */
type Doc = FirebaseFirestore.DocumentData & { id: string };

const docs = (q: FirebaseFirestore.Query): Promise<Doc[]> =>
  q.get().then((s) => s.docs.map((d) => ({ ...d.data(), id: d.id })));

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdminPage();
  const { id } = await params;

  const snap = await adminDb.collection('users').doc(id).get();
  if (!snap.exists) notFound();
  const u = snap.data()!;

  const [authUser, flights, bids, dealsAsTraveler, dealsAsSender, ledger] = await Promise.all([
    safely('auth user', () => adminAuth.getUser(id)),
    safely('flights', () => docs(adminDb.collection('flights').where('travelerId', '==', id).orderBy('departureAt', 'desc').limit(20))),
    safely('bids', () => docs(adminDb.collection('bids').where('senderId', '==', id).orderBy('createdAt', 'desc').limit(20))),
    safely('deals as traveler', () => docs(adminDb.collection('transactions').where('travelerId', '==', id).orderBy('createdAt', 'desc').limit(20))),
    safely('deals as sender', () => docs(adminDb.collection('transactions').where('senderId', '==', id).orderBy('createdAt', 'desc').limit(20))),
    safely('ledger', () => docs(adminDb.collection('points_ledger').where('userId', '==', id).orderBy('createdAt', 'desc').limit(25))),
  ]);

  const deals = dealsAsTraveler && dealsAsSender
    ? [...dealsAsTraveler, ...dealsAsSender].sort(
        (a, b) => Date.parse(toIso(b.createdAt) ?? '') - Date.parse(toIso(a.createdAt) ?? ''),
      )
    : null;

  const isStaff = authUser?.customClaims?.admin === true;
  const canSuspend = id !== me.uid && (!isStaff || me.superAdmin);
  const points = (u.pointsBalance ?? 0) + (u.promoBalance ?? 0);

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white mb-5">
        <ArrowLeft className="w-4 h-4" /> Back to users
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold text-white">{u.displayName || '—'}</h1>
                <p className="text-xs text-gray-500 font-mono mt-1 break-all">{id}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge status={u.kycStatus || 'PENDING'} />
                {isStaff && <span className="badge badge-purple"><Shield className="w-3 h-3" /> Staff</span>}
              </div>
            </div>
            <dl className="space-y-2.5 text-sm">
              <Info icon={Mail} label="Email" value={u.email || '—'} />
              <Info icon={Phone} label="Phone" value={u.phone || '—'} />
              <Info icon={Calendar} label="Joined" value={formatWhen(toIso(u.createdAt))} />
              <Info icon={Calendar} label="Last active" value={formatWhen(toIso(u.lastActivityAt) ?? toIso(u.lastActiveAt))} />
              <Info icon={Star} label="Rating" value={u.ratingCount ? `${Number(u.averageRating).toFixed(1)} (${u.ratingCount})` : '—'} />
              <Info icon={Plane} label="Trips" value={`${u.completedTripsAsTraveler ?? 0} carried · ${u.completedTripsAsSender ?? 0} sent`} />
            </dl>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-brand-400" /> Points
            </h2>
            <p className="text-3xl font-bold text-white">{points}</p>
            <p className="text-xs text-gray-500">{u.promoBalance ?? 0} bonus · {u.pointsBalance ?? 0} purchased</p>
            <p className="text-xs text-gray-600 mt-2">
              Earned {u.lifetimePointsEarned ?? 0} · spent {u.lifetimePointsSpent ?? 0} all-time
            </p>
          </div>

          <div className={`glass-card p-5 ${u.suspended ? 'border-red-500/40' : ''}`}>
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-400" /> Account status
            </h2>
            {u.suspended ? (
              <p className="text-sm text-red-400 mb-4">
                Suspended{u.suspensionReason ? `: ${u.suspensionReason}` : '.'}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mb-4">Active.</p>
            )}
            {canSuspend ? (
              <SuspendForm uid={id} suspended={u.suspended === true} />
            ) : (
              <p className="text-xs text-gray-500">
                {id === me.uid ? 'This is your own account.' : 'Only a super admin can suspend a staff account.'}
              </p>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-2 space-y-4">
          <Section icon={PackageCheck} title="Deliveries" rows={deals} empty="No deliveries.">
            {(d) => (
              <tr key={d.id}>
                <td className="text-white">{String(d.flight?.originAirport ?? '')} → {String(d.flight?.destinationAirport ?? '')}</td>
                <td>{d.travelerId === id ? 'Traveler' : 'Sender'}</td>
                <td>{String(d.kg)} KG · MYR {String(d.totalPrice)}</td>
                <td><Badge status={String(d.status)} /></td>
                <td className="text-xs text-gray-500">{formatWhen(toIso(d.createdAt))}</td>
              </tr>
            )}
          </Section>

          <Section icon={Plane} title="Flights posted" rows={flights} empty="No flights.">
            {(f) => (
              <tr key={f.id}>
                <td className="text-white">{String(f.originAirport)} → {String(f.destinationAirport)}</td>
                <td className="font-mono text-xs">{String(f.flightNumber ?? '')}</td>
                <td>{String(f.kgRemaining)}/{String(f.totalKgAvailable)} KG</td>
                <td><Badge status={String(f.status)} /></td>
                <td className="text-xs text-gray-500">{formatWhen(toIso(f.departureAt))}</td>
              </tr>
            )}
          </Section>

          <Section icon={Send} title="Bids placed" rows={bids} empty="No bids.">
            {(b) => (
              <tr key={b.id}>
                <td className="text-white truncate max-w-[16rem]">{String(b.itemDescription ?? '')}</td>
                <td>{String(b.kgRequested)} KG</td>
                <td>MYR {String(b.offeredTotal)}</td>
                <td><Badge status={String(b.status)} /></td>
                <td className="text-xs text-gray-500">{formatWhen(toIso(b.createdAt))}</td>
              </tr>
            )}
          </Section>

          <Section icon={History} title="Points history" rows={ledger} empty="No points activity.">
            {(e) => (
              <tr key={e.id}>
                <td className="text-white">{String(e.description ?? '')}</td>
                <td className="text-xs">{String(e.category)}</td>
                <td className={Number(e.delta) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {Number(e.delta) > 0 ? '+' : ''}{String(e.delta)}
                </td>
                <td>{String(e.balanceAfter)}</td>
                <td className="text-xs text-gray-500">{formatWhen(toIso(e.createdAt))}</td>
              </tr>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-gray-500 flex items-center gap-2"><Icon className="w-3.5 h-3.5" /> {label}</dt>
      <dd className="text-gray-200 text-right truncate">{value}</dd>
    </div>
  );
}


function Section({ icon: Icon, title, rows, empty, children }: {
  icon: React.ElementType;
  title: string;
  rows: Doc[] | null;
  empty: string;
  children: (row: Doc) => React.ReactNode;
}) {
  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-400" /> {title}
      </h2>
      {rows === null ? (
        <p className="text-sm text-red-400">Couldn&apos;t load this section.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table"><tbody>{rows.map(children)}</tbody></table>
        </div>
      )}
    </div>
  );
}
