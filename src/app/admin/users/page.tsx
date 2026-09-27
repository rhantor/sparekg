import Link from 'next/link';
import { Users, Search, Star, Coins, Ban } from 'lucide-react';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminPage, formatWhen, toIso } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

const KYC_BADGE: Record<string, string> = {
  PENDING: 'badge-warning', UNDER_REVIEW: 'badge-info', APPROVED: 'badge-success', REJECTED: 'badge-danger',
};

interface Row {
  uid: string;
  displayName: string;
  email: string;
  kycStatus: string;
  points: number;
  trips: number;
  rating: number;
  ratingCount: number;
  suspended: boolean;
  createdAt: string | null;
}

function toRow(doc: FirebaseFirestore.DocumentSnapshot): Row {
  const u = doc.data() ?? {};
  return {
    uid: doc.id,
    displayName: u.displayName || '—',
    email: u.email || '—',
    kycStatus: u.kycStatus || 'PENDING',
    points: (u.pointsBalance ?? 0) + (u.promoBalance ?? 0),
    trips: (u.completedTripsAsTraveler ?? 0) + (u.completedTripsAsSender ?? 0),
    rating: u.averageRating ?? 0,
    ratingCount: u.ratingCount ?? 0,
    suspended: u.suspended === true,
    createdAt: toIso(u.createdAt),
  };
}

/**
 * Firestore has no full-text search, so the box accepts the three things staff
 * actually have in hand: an email, a UID, or the start of a display name.
 */
async function search(q: string): Promise<Row[]> {
  const users = adminDb.collection('users');
  if (!q) {
    const snap = await users.orderBy('createdAt', 'desc').limit(50).get();
    return snap.docs.map(toRow);
  }
  if (q.includes('@')) {
    const snap = await users.where('email', '==', q.toLowerCase()).limit(10).get();
    return snap.docs.map(toRow);
  }
  const [byUid, byName] = await Promise.all([
    q.length >= 20 ? users.doc(q).get() : Promise.resolve(null),
    users.where('displayName', '>=', q).where('displayName', '<', `${q}`).limit(25).get(),
  ]);
  const rows = byName.docs.map(toRow);
  if (byUid?.exists && !rows.some((r) => r.uid === byUid.id)) rows.unshift(toRow(byUid));
  return rows;
}

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdminPage();
  const q = ((await searchParams).q ?? '').trim().slice(0, 120);

  let rows: Row[] = [];
  let failed = false;
  try {
    rows = await search(q);
  } catch (error) {
    console.error('[admin] user search failed:', error);
    failed = true;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-400" /> Users
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {q ? `Results for “${q}”` : 'Newest 50 accounts'} · search by email, UID or the start of a name.
        </p>
      </div>

      <form method="get" className="relative mb-6 max-w-md">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        {/* Inline padding: the admin .input rule sits outside the utility layer
            and would override pl-10, putting the text under the icon. */}
        <input
          name="q"
          defaultValue={q}
          placeholder="email@example.com, UID or name…"
          className="input"
          style={{ paddingLeft: '2.5rem' }}
        />
      </form>

      <div className="glass-card overflow-x-auto">
        {failed ? (
          <p className="p-6 text-sm text-red-400">Couldn&apos;t search users. Try again in a moment.</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No users found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>KYC</th><th>Points</th><th>Trips</th><th>Rating</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <Link href={`/admin/users/${u.uid}`} className="block hover:text-brand-400">
                      <span className="font-medium text-white flex items-center gap-2">
                        {u.displayName}
                        {u.suspended && <span className="badge badge-danger"><Ban className="w-3 h-3" /> Suspended</span>}
                      </span>
                      <span className="text-xs text-gray-500">{u.email}</span>
                    </Link>
                  </td>
                  <td><span className={`badge ${KYC_BADGE[u.kycStatus] ?? 'badge-neutral'}`}>{u.kycStatus.replace('_', ' ')}</span></td>
                  <td><span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-brand-400" /> {u.points}</span></td>
                  <td>{u.trips}</td>
                  <td>
                    {u.ratingCount > 0
                      ? <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" /> {u.rating.toFixed(1)} ({u.ratingCount})</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="text-xs text-gray-500">{formatWhen(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
