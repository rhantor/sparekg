import 'server-only';
import { headers } from 'next/headers';
import * as admin from 'firebase-admin';
import { adminDb } from './firebaseAdmin';
import type { AuditAction } from './types';

/**
 * The staff audit trail.
 *
 * Cloud Functions have their own `writeAudit` (functions/src/index.ts) for the
 * decisions they own. This is the equivalent for Next.js server actions, which
 * run with Admin SDK credentials and so bypass the `allow write: if false` on
 * `audit_log` — meaning nothing else records that a staff member acted.
 *
 * Rows are staged into the caller's transaction rather than written separately,
 * so a decision and its audit row land together or not at all. An audit trail
 * that can disagree with the state it describes is worse than none.
 */

export interface AuditContext {
  ipAddress: string;
  userAgent: string;
}

/**
 * Request metadata for an audit row.
 *
 * Read once by the caller *before* opening a transaction: transaction bodies are
 * retried on contention, and re-reading request headers on each attempt is both
 * wasted work and a way to get inconsistent rows.
 */
export async function auditContext(): Promise<AuditContext> {
  try {
    const h = await headers();
    // x-forwarded-for is a client-to-proxy chain; the first entry is the origin.
    // It is spoofable and recorded as evidence, never used to authorize.
    const forwarded = h.get('x-forwarded-for');
    const ipAddress =
      forwarded?.split(',')[0]?.trim() || h.get('x-real-ip')?.trim() || 'unknown';
    return { ipAddress, userAgent: h.get('user-agent') || 'unknown' };
  } catch {
    // Called outside a request scope (a script, a test). Not worth failing over.
    return { ipAddress: 'unknown', userAgent: 'unknown' };
  }
}

export interface AuditEntryInput {
  actorUid: string;
  /** Display name or email — whatever identifies the staff member to a reader. */
  actorName: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  reason: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
}

/**
 * Stages one audit row inside an open transaction. Write-only, so it may be
 * called after the caller's own writes without violating Firestore's
 * reads-before-writes rule.
 */
export function stageAudit(
  tx: admin.firestore.Transaction,
  entry: AuditEntryInput,
  ctx: AuditContext,
): void {
  const ref = adminDb.collection('audit_log').doc();
  tx.create(ref, {
    entryId: ref.id,
    ...entry,
    beforeState: entry.beforeState ?? null,
    afterState: entry.afterState ?? null,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}
