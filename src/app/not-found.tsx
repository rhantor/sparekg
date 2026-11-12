import type { Metadata } from 'next';
import Link from 'next/link';
import { Plane, Home, Search } from 'lucide-react';

export const metadata: Metadata = { title: 'Page not found' };

/** Any URL that matches no page, and every notFound() call. */
export default function NotFound() {
  return (
    <main className="site min-h-screen bg-sand flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center mx-auto mb-6">
          <Plane className="w-8 h-8 text-teal-500" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 mb-2">404</p>
        <h1 className="font-display text-3xl text-navy mb-3">This page took a different flight</h1>
        <p className="text-ash mb-8">
          The link may be old, or the listing may have closed. Let&apos;s get you back on route.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link href="/flights" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-line bg-white text-navy text-sm font-semibold hover:border-navy/25 transition-colors">
            <Search className="w-4 h-4" /> Browse flights
          </Link>
        </div>
      </div>
    </main>
  );
}
