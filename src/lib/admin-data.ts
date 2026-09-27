import 'server-only';
import { redirect } from 'next/navigation';
import { getServerUser, type ServerUser } from './auth-server';

/**
 * Shared plumbing for the admin console's server-rendered pages.
 *
 * Each page reads Firestore with the Admin SDK, so it must authorize on the
 * server — the client layout's gate only hides the shell.
 */

/** Verified staff member for this request, or a redirect to sign-in. */
export async function requireAdminPage(): Promise<ServerUser> {
  const me = await getServerUser();
  if (!me?.admin) redirect('/login');
  return me;
}

/** Firestore Timestamp (or anything with toDate) → ISO string, else null. */
export function toIso(value: unknown): string | null {
  const ts = value as { toDate?: () => Date } | null | undefined;
  return ts?.toDate ? ts.toDate().toISOString() : null;
}

/** "28 Sept 2026, 14:05" in Malaysia time — staff work the KL corridor. */
export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Hours since an ISO time, for queue ages. */
export function hoursSince(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.max(0, Math.round((now - t) / 3600_000));
}

/**
 * Runs one dashboard read, returning null instead of throwing.
 *
 * A single failing query — an index still building after a deploy, say — must
 * cost one tile, not the whole console. The failure is logged for the server.
 */
export async function safely<T>(label: string, read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    console.error(`[admin] ${label} failed:`, error);
    return null;
  }
}
