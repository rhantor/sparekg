'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/**
 * Catches a crash anywhere below the root layout, so a single failing page
 * shows a way out instead of a blank screen. Server errors arrive with only a
 * digest — the details stay in the server logs, never in the browser.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="site min-h-screen bg-sand flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="font-display text-3xl text-navy mb-3">Something went wrong</h1>
        <p className="text-ash mb-2">
          This page hit an unexpected problem. Nothing you did caused it, and no changes were lost.
        </p>
        {error.digest && (
          <p className="text-xs text-ash mb-8">Reference: <span className="font-mono">{error.digest}</span></p>
        )}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-line bg-white text-navy text-sm font-semibold hover:border-navy/25 transition-colors">
            <Home className="w-4 h-4" /> Home
          </Link>
        </div>
      </div>
    </main>
  );
}
