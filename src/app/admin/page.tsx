import Link from 'next/link';
import { AggregateField } from 'firebase-admin/firestore';
import {
  Users, Plane, Send, ArrowRightLeft, DollarSign, ShieldCheck, Scale, Ticket,
  CheckCircle2, AlertTriangle, Clock, PackageCheck, Ban,
} from 'lucide-react';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminPage, safely, toIso, hoursSince } from '@/lib/admin-data';
import { cityFor } from '@/lib/airports';

export const dynamic = 'force-dynamic';

/** Queue items older than this are past the blueprint's 12h SLA with margin. */
const SLA_ALARM_HOURS = 24;

const count = (q: FirebaseFirestore.Query) => q.count().get().then((s) => s.data().count);

interface RouteRow {
  routeKey: string;
  flights: number;
  kgOpen: number;
  avgPricePerKg: number | null;
}

async function liveRoutes(): Promise<RouteRow[]> {
  const snap = await adminDb.collection('flights').where('status', '==', 'LIVE').limit(500).get();
  const byRoute = new Map<string, { flights: number; kgOpen: number; prices: number[] }>();
  for (const doc of snap.docs) {
    const f = doc.data();
    const row = byRoute.get(f.routeKey) ?? { flights: 0, kgOpen: 0, prices: [] };
    row.flights++;
    row.kgOpen += Number(f.kgRemaining) || 0;
    if (typeof f.pricePerKg === 'number') row.prices.push(f.pricePerKg);
    byRoute.set(f.routeKey, row);
  }
  return [...byRoute.entries()]
    .map(([routeKey, r]) => ({
      routeKey,
      flights: r.flights,
      kgOpen: Math.round(r.kgOpen * 10) / 10,
      avgPricePerKg: r.prices.length
        ? Math.round((r.prices.reduce((a, b) => a + b, 0) / r.prices.length) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.flights - a.flights);
}

/** Depth plus the age of the oldest item — the number an SLA is judged on. */
async function queue(q: FirebaseFirestore.Query, timeField: string) {
  const snap = await q.limit(300).get();
  const times = snap.docs
    .map((d) => toIso(d.get(timeField)))
    .filter((t): t is string => Boolean(t))
    .sort();
  return { depth: snap.size, oldestHours: hoursSince(times[0]) };
}

export default async function AdminDashboard() {
  await requireAdminPage();

  const bids = adminDb.collection('bids');
  const deals = adminDb.collection('transactions');

  const [
    users, verified, suspended, liveFlights, bidsTotal, bidsAgreed,
    activeDeals, completedDeals, agreedValue, kyc, tickets, disputes,
    balances, ledgerTotal, routes,
  ] = await Promise.all([
    safely('users', () => count(adminDb.collection('users'))),
    safely('verified', () => count(adminDb.collection('users').where('kycStatus', '==', 'APPROVED'))),
    safely('suspended', () => count(adminDb.collection('users').where('suspended', '==', true))),
    safely('live flights', () => count(adminDb.collection('flights').where('status', '==', 'LIVE'))),
    safely('bids', () => count(bids)),
    safely('agreed bids', () => count(bids.where('status', 'in', ['AGREED', 'HANDED_OVER', 'DELIVERED', 'DISPUTED', 'RESOLVED']))),
    safely('active deals', () => count(deals.where('status', 'in', ['AGREED', 'HANDED_OVER']))),
    safely('completed deals', () => count(deals.where('payoutStatus', '==', 'RELEASED'))),
    safely('agreed value', () =>
      deals.aggregate({ total: AggregateField.sum('totalPrice') }).get().then((s) => s.data().total ?? 0)),
    safely('kyc queue', () =>
      queue(adminDb.collection('kyc_submissions').where('status', 'in', ['PENDING', 'UNDER_REVIEW']), 'submittedAt')),
    safely('ticket queue', () =>
      queue(adminDb.collection('flights').where('ticketStatus', '==', 'PENDING').where('status', 'in', ['LIVE', 'LOCKED']), 'createdAt')),
    safely('dispute queue', () => queue(adminDb.collection('disputes').where('status', '==', 'OPEN'), 'createdAt')),
    safely('balances', () =>
      adminDb.collection('users')
        .aggregate({ points: AggregateField.sum('pointsBalance'), promo: AggregateField.sum('promoBalance') })
        .get()
        .then((s) => (s.data().points ?? 0) + (s.data().promo ?? 0))),
    safely('ledger', () =>
      adminDb.collection('points_ledger').aggregate({ total: AggregateField.sum('delta') }).get()
        .then((s) => s.data().total ?? 0)),
    safely('routes', liveRoutes),
  ]);

  const matchRate = bidsTotal && bidsAgreed !== null ? bidsAgreed / bidsTotal : null;
  // The ledger is the source of truth; balances are a cache of it. Any gap
  // means a points move skipped the ledger — or the ledger was edited.
  const reconciled = balances !== null && ledgerTotal !== null ? balances === ledgerTotal : null;
  const n = (v: number | null) => (v === null ? '—' : v.toLocaleString());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Live figures, read fresh on every visit.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Users" value={n(users)} sub={`${n(verified)} verified · ${n(suspended)} suspended`} icon={<Users className="w-5 h-5" />} />
        <KpiCard label="Live flights" value={n(liveFlights)} icon={<Plane className="w-5 h-5" />} accent="bg-emerald-500/15 text-emerald-400" />
        <KpiCard label="Bids placed" value={n(bidsTotal)} sub={`${n(bidsAgreed)} accepted`} icon={<Send className="w-5 h-5" />} accent="bg-sky-500/15 text-sky-400" />
        <KpiCard
          label="Match rate"
          value={matchRate === null ? '—' : `${(matchRate * 100).toFixed(1)}%`}
          sub="accepted ÷ placed"
          icon={<ArrowRightLeft className="w-5 h-5" />}
          accent="bg-violet-500/15 text-violet-400"
        />
        <KpiCard label="Deliveries in progress" value={n(activeDeals)} icon={<PackageCheck className="w-5 h-5" />} accent="bg-teal-500/15 text-teal-400" />
        <KpiCard label="Deliveries completed" value={n(completedDeals)} sub="dispute window closed" icon={<CheckCircle2 className="w-5 h-5" />} accent="bg-emerald-500/15 text-emerald-400" />
        <KpiCard
          label="Agreed value (MYR)"
          value={n(agreedValue)}
          sub="settled directly between users"
          icon={<DollarSign className="w-5 h-5" />}
          accent="bg-amber-500/15 text-amber-400"
        />
        <KpiCard label="Suspended accounts" value={n(suspended)} icon={<Ban className="w-5 h-5" />} accent="bg-red-500/15 text-red-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <QueueCard label="KYC queue" href="/admin/kyc" icon={<ShieldCheck className="w-4 h-4" />} data={kyc} />
        <QueueCard label="Ticket reviews" href="/admin/flights" icon={<Ticket className="w-4 h-4" />} data={tickets} />
        <QueueCard label="Open disputes" href="/admin/disputes" icon={<Scale className="w-4 h-4" />} data={disputes} />

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Points economy</h3>
            {reconciled === null ? (
              <span className="badge badge-neutral">Unavailable</span>
            ) : reconciled ? (
              <span className="badge badge-success"><CheckCircle2 className="w-3 h-3" /> Reconciled</span>
            ) : (
              <span className="badge badge-danger"><AlertTriangle className="w-3 h-3" /> Drift</span>
            )}
          </div>
          <p className="text-3xl font-bold text-white">{n(balances)}</p>
          <p className="text-xs text-gray-500">points held by users</p>
          {reconciled === false && ledgerTotal !== null && balances !== null && (
            <p className="text-xs text-red-400 mt-2">
              Ledger totals {ledgerTotal.toLocaleString()} — off by {(balances - ledgerTotal).toLocaleString()}.
            </p>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Open capacity by route</h3>
        {routes === null ? (
          <p className="text-sm text-gray-500">Couldn&apos;t load routes.</p>
        ) : routes.length === 0 ? (
          <p className="text-sm text-gray-500">No live flights right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Route</th><th>Live flights</th><th>KG open</th><th>Avg price / kg</th></tr>
              </thead>
              <tbody>
                {routes.map((r) => {
                  const [from, to] = r.routeKey.split('-');
                  return (
                    <tr key={r.routeKey}>
                      <td className="font-medium text-white">{cityFor(from)} → {cityFor(to)} <span className="text-gray-500">({r.routeKey})</span></td>
                      <td>{r.flights}</td>
                      <td>{r.kgOpen}</td>
                      <td>{r.avgPricePerKg === null ? '—' : `MYR ${r.avgPricePerKg}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; accent?: string;
}) {
  return (
    <div className="kpi-card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent ?? 'bg-brand-500/15 text-brand-400'}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[0.625rem] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function QueueCard({ label, href, icon, data }: {
  label: string; href: string; icon: React.ReactNode; data: { depth: number; oldestHours: number | null } | null;
}) {
  const alarm = (data?.oldestHours ?? 0) > SLA_ALARM_HOURS;
  return (
    <Link href={href} className="glass-card p-5 block hover:border-brand-500/40 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">{icon} {label}</h3>
        {alarm && <span className="badge badge-danger"><AlertTriangle className="w-3 h-3" /> SLA risk</span>}
      </div>
      {data === null ? (
        <p className="text-sm text-gray-500">Unavailable</p>
      ) : (
        <div className="flex items-end gap-6">
          <div>
            <p className="text-3xl font-bold text-white">{data.depth}</p>
            <p className="text-xs text-gray-500">waiting</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <p className={`text-lg font-semibold ${alarm ? 'text-red-400' : 'text-white'}`}>
                {data.oldestHours === null ? '—' : `${data.oldestHours}h`}
              </p>
            </div>
            <p className="text-xs text-gray-500">oldest</p>
          </div>
        </div>
      )}
    </Link>
  );
}
