import type { ReactNode } from 'react';
import Link from 'next/link';
import { LEGAL_UPDATED, SUPPORT_EMAIL } from '@/lib/site';

/**
 * Shared frame for Terms, Privacy and Prohibited Items: one readable column,
 * the effective date, and consistent heading/list styling for the prose.
 */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <main className="bg-sand pt-32 pb-24 px-6">
      <article className="max-w-3xl mx-auto bg-white rounded-3xl border border-line shadow-soft px-6 py-10 sm:px-12 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-3">Last updated {LEGAL_UPDATED}</p>
        <h1 className="font-display text-3xl sm:text-4xl text-navy mb-4">{title}</h1>
        <p className="text-ash leading-relaxed mb-10">{intro}</p>
        <div
          className="text-[0.95rem] leading-relaxed text-ink
            [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-navy [&_h2]:mt-10 [&_h2]:mb-3
            [&_h3]:font-semibold [&_h3]:text-navy [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-5 [&_ul]:list-disc [&_li]:mb-1.5
            [&_a]:text-teal-700 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2"
        >
          {children}
        </div>
      </article>
    </main>
  );
}

/** How to reach the team — an inbox once one is confirmed, the in-app channels until then. */
export function ContactLine() {
  if (SUPPORT_EMAIL) {
    return <>email us at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></>;
  }
  return (
    <>
      use <strong>Report a problem</strong> on the delivery concerned, or reach us through your{' '}
      <Link href="/profile">account</Link>
    </>
  );
}
