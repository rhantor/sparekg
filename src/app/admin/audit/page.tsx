import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdminPage, formatWhen, toIso } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

const ACTION_BADGE: Record<string, string> = {
  KYC_APPROVED: 'badge-success', KYC_REJECTED: 'badge-danger', KYC_ESCALATED: 'badge-warning',
  USER_SUSPENDED: 'badge-danger', USER_UNSUSPENDED: 'badge-success', USER_DELETED: 'badge-danger',
  POINTS_ADJUSTED: 'badge-info', ROLE_GRANTED: 'badge-purple', ROLE_REVOKED: 'badge-warning',
  DISPUTE_RESOLVED: 'badge-success', CONFIG_CHANGED: 'badge-warning',
  FLIGHT_TICKET_VERIFIED: 'badge-success', FLIGHT_TICKET_REJECTED: 'badge-danger',
};

/** Where a target's own admin page lives, when it has one. */
function targetHref(type: string, id: string): string | null {
  const t = type.toLowerCase();
  if (t === 'user') return `/admin/users/${id}`;
  if (t === 'dispute') return '/admin/disputes';
  return null;
}

interface Entry {
  id: string;
  action: string;
  actorUid: string;
  actorName: string | null;
  targetType: string;
  targetId: string;
  reason: string;
  at: string | null;
}

export default async function AuditLogPage() {
  await requireAdminPage();

  let entries: Entry[] = [];
  let failed = false;
  try {
    const snap = await adminDb.collection('audit_log').orderBy('timestamp', 'desc').limit(100).get();
    entries = snap.docs.map((doc) => {
      const e = doc.data();
      return {
        id: doc.id,
        action: String(e.action ?? '—'),
        actorUid: String(e.actorUid ?? ''),
        actorName: e.actorName ?? null,
        targetType: String(e.targetType ?? ''),
        targetId: String(e.targetId ?? ''),
        reason: String(e.reason ?? ''),
        at: toIso(e.timestamp),
      };
    });

    // Rows written by Cloud Functions carry only the actor's uid. Resolve the
    // missing names in one batched read rather than showing raw ids.
    const unnamed = [...new Set(entries.filter((e) => !e.actorName && e.actorUid).map((e) => e.actorUid))];
    if (unnamed.length > 0) {
      const users = await adminDb.getAll(...unnamed.map((uid) => adminDb.collection('users').doc(uid)));
      const names = new Map(users.map((u) => [u.id, u.get('email') || u.get('displayName') || null]));
      entries = entries.map((e) => (e.actorName ? e : { ...e, actorName: names.get(e.actorUid) ?? null }));
    }
  } catch (error) {
    console.error('[admin] audit log failed:', error);
    failed = true;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-brand-400" /> Audit Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          The latest 100 staff actions. Append-only — no one, including super admins, can edit a row.
        </p>
      </div>

      <div className="glass-card overflow-x-auto">
        {failed ? (
          <p className="p-6 text-sm text-red-400">Couldn&apos;t load the audit log.</p>
        ) : entries.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No staff actions recorded yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Action</th><th>By</th><th>Target</th><th>Reason</th></tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const href = targetHref(e.targetType, e.targetId);
                return (
                  <tr key={e.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">{formatWhen(e.at)}</td>
                    <td><span className={`badge ${ACTION_BADGE[e.action] ?? 'badge-neutral'}`}>{e.action.replaceAll('_', ' ')}</span></td>
                    <td className="text-sm text-gray-300">{e.actorName ?? <span className="font-mono text-xs">{e.actorUid.slice(0, 10)}…</span>}</td>
                    <td className="text-xs">
                      <span className="text-gray-500">{e.targetType.toLowerCase()}</span>{' '}
                      {href
                        ? <Link href={href} className="font-mono text-brand-400 hover:underline">{e.targetId.slice(0, 10)}…</Link>
                        : <span className="font-mono text-gray-400">{e.targetId.slice(0, 10)}…</span>}
                    </td>
                    <td className="text-sm text-gray-400 max-w-md">{e.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
