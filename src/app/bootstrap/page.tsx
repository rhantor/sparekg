'use client';

/**
 * One-time super-admin claim.
 *
 * Deliberately outside the /admin route group: that shell now requires an admin
 * claim, which nobody has until this runs. This page is safe to leave deployed —
 * it holds no authority of its own. `makeSuperAdmin` independently checks that
 * the caller is on the BOOTSTRAP_SUPERADMIN_EMAIL allowlist, has a verified
 * email, is promoting only themselves, and that the seat is still unclaimed.
 */

import { useState } from 'react';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { ShieldCheck, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

export default function BootstrapPage() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (!user) return;
    setState('working');
    setError(null);
    try {
      await httpsCallable(functions, 'makeSuperAdmin')({ uid: user.uid });
      setState('done');
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not grant admin access.');
      setState('idle');
    }
  }

  return (
    <div className="site min-h-screen bg-sand flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-line shadow-soft p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-navy/[0.05] flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-7 h-7 text-teal" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-navy mb-2">Claim admin access</h1>

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-ash" />
          </div>
        ) : !isAuthenticated ? (
          <>
            <p className="text-ash mb-6">Sign in with the authorised account first.</p>
            <Link href="/login" className="inline-block px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
              Sign in
            </Link>
          </>
        ) : state === 'done' || isAdmin ? (
          <>
            <div className="flex items-center justify-center gap-2 text-teal font-medium mb-2">
              <CheckCircle2 className="w-5 h-5" /> Admin access active
            </div>
            <p className="text-sm text-ash mb-6">
              {state === 'done'
                ? 'Sign out and back in once so your session picks up the new permissions.'
                : 'This account already has admin rights.'}
            </p>
            <Link href="/admin" className="inline-block px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
              Open admin console
            </Link>
          </>
        ) : (
          <>
            <p className="text-ash mb-1">Signed in as</p>
            <p className="font-medium text-navy mb-6">{user?.email}</p>

            {error && (
              <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700 text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={claim}
              disabled={state === 'working'}
              className="w-full py-3 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {state === 'working' && <Loader2 className="w-4 h-4 animate-spin" />}
              {state === 'working' ? 'Claiming…' : 'Claim super admin'}
            </button>
            <p className="text-xs text-ash mt-3">
              Works once, only for the allowlisted address, and only on your own account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
