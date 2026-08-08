/**
 * RTK Query baseQuery backed by Firebase (blueprint §4.3).
 *
 * Every read and mutation in the app funnels through here, which gives us one
 * place to normalise errors and one place to guarantee that what lands in the
 * Redux store is serialisable — Firestore hands back `Timestamp` and
 * `DocumentReference` instances, and putting those in a store breaks
 * time-travel debugging and React's equality checks.
 *
 * Query arguments are plain JSON on purpose: RTK Query derives its cache keys by
 * serialising the argument, so a live `QueryConstraint` object would produce
 * unstable keys and silently defeat caching.
 */

import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy as orderByField,
  query,
  where as whereField,
  Timestamp,
  type QueryConstraint,
  type WhereFilterOp,
} from 'firebase/firestore';
import { httpsCallable, type HttpsCallableResult } from 'firebase/functions';
import { FirebaseError } from 'firebase/app';

import { db, functions } from '../firebase';

// ---- Argument shapes -------------------------------------------------------

/**
 * Sentinel for "now, at execution time".
 *
 * A literal `new Date()` in a query spec would change on every render, and RTK
 * Query builds its cache key from the argument — so the key would never repeat
 * and the query would refetch forever. Resolving the sentinel inside the
 * baseQuery keeps the key stable while still filtering against the real clock.
 */
export const NOW = '$now' as const;

export interface QuerySpec {
  where?: [field: string, op: WhereFilterOp, value: unknown][];
  orderBy?: [field: string, direction?: 'asc' | 'desc'][];
  limit?: number;
}

export type FirebaseQueryArgs =
  | { kind: 'doc'; path: string; id: string }
  | { kind: 'collection'; path: string; spec?: QuerySpec }
  | { kind: 'callable'; name: string; data?: unknown };

export interface FirebaseQueryError {
  /** Firebase error code, e.g. "permission-denied", or "unknown". */
  code: string;
  /** Safe to render — server messages are written for end users. */
  message: string;
}

// ---- Serialisation ---------------------------------------------------------

/**
 * Converts Firestore values into JSON-safe equivalents, recursively.
 * Timestamps become ISO strings, which is what `src/lib/types.ts` already
 * declares for every date field.
 */
function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    // Plain objects only. Anything exotic (DocumentReference, GeoPoint, Bytes)
    // is dropped rather than half-serialised into something misleading.
    if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = serialize(v);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return value;
}

function serializeDoc(id: string, data: Record<string, unknown>): Record<string, unknown> {
  return { id, ...(serialize(data) as Record<string, unknown>) };
}

// ---- Error normalisation ---------------------------------------------------

/**
 * Firebase throws several unrelated error shapes. Collapse them into one so UI
 * code never has to sniff. Unrecognised failures get a generic message rather
 * than leaking an internal string to the user.
 */
function toQueryError(err: unknown): FirebaseQueryError {
  if (err instanceof FirebaseError) {
    // Callable errors arrive as "functions/failed-precondition"; keep the tail.
    const code = err.code.includes('/') ? err.code.split('/').slice(1).join('/') : err.code;
    if (code === 'permission-denied' || code === 'unauthenticated') {
      return { code, message: 'You do not have access to this.' };
    }
    return { code, message: err.message || 'Something went wrong.' };
  }
  if (err instanceof Error) return { code: 'unknown', message: err.message };
  return { code: 'unknown', message: 'Something went wrong.' };
}

function buildConstraints(spec: QuerySpec = {}): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  for (const [field, op, value] of spec.where ?? []) {
    constraints.push(whereField(field, op, value === NOW ? Timestamp.now() : value));
  }
  for (const [field, direction] of spec.orderBy ?? []) {
    constraints.push(orderByField(field, direction ?? 'asc'));
  }
  if (spec.limit !== undefined) constraints.push(limitTo(spec.limit));
  return constraints;
}

// ---- baseQuery -------------------------------------------------------------

export const firebaseBaseQuery: BaseQueryFn<
  FirebaseQueryArgs,
  unknown,
  FirebaseQueryError
> = async (args) => {
  try {
    switch (args.kind) {
      case 'doc': {
        const snap = await getDoc(doc(db, args.path, args.id));
        if (!snap.exists()) {
          return { error: { code: 'not-found', message: 'Not found.' } };
        }
        return { data: serializeDoc(snap.id, snap.data()) };
      }

      case 'collection': {
        const snap = await getDocs(
          query(collection(db, args.path), ...buildConstraints(args.spec)),
        );
        return { data: snap.docs.map((d) => serializeDoc(d.id, d.data())) };
      }

      case 'callable': {
        const fn = httpsCallable(functions, args.name);
        const result = (await fn(args.data ?? {})) as HttpsCallableResult<unknown>;
        return { data: serialize(result.data) };
      }
    }
  } catch (err) {
    return { error: toQueryError(err) };
  }
};
