'use client';
import Link from 'next/link';
import { AlertCircle, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { DealRow } from '@/components/app/DealRow';
import { useAuth } from '@/lib/auth-context';
import { useMyDealsQuery } from '@/lib/store/api';
import { isActiveDeal } from '@/lib/deals';

export default function DeliveriesPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data: deals = [], isLoading, isError, error } = useMyDealsQuery(uid, { skip: !uid });

  const active = deals.filter(isActiveDeal);
  const past = deals.filter((d) => !isActiveDeal(d));

  return (
    <div>
      <PageHeader
        title="Deliveries"
        subtitle="Every accepted bid, as sender or traveler — from handover to delivery."
      />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 rounded-2xl border border-line bg-white/60 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-line p-10 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-3" />
          <p className="text-navy font-medium mb-1">Couldn&apos;t load your deliveries</p>
          <p className="text-sm text-ash">{error?.message ?? 'Please try again in a moment.'}</p>
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center mx-auto mb-3">
            <PackageCheck className="w-6 h-6 text-teal" />
          </div>
          <p className="text-navy font-medium mb-1">No deliveries yet</p>
          <p className="text-sm text-ash">
            A delivery starts when a traveler accepts a bid.{' '}
            <Link href="/flights" className="text-teal font-semibold">Find a flight</Link> or{' '}
            <Link href="/flights/new" className="text-teal font-semibold">post one</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-lg font-semibold text-navy mb-3">
              In progress <span className="text-ash font-normal text-base">({active.length})</span>
            </h2>
            {active.length > 0 ? (
              <div className="space-y-3">
                {active.map((d) => <DealRow key={d.transactionId} deal={d} uid={uid} />)}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-line p-6 text-center text-sm text-ash">
                Nothing in progress right now.
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-semibold text-navy mb-3">
                Delivered <span className="text-ash font-normal text-base">({past.length})</span>
              </h2>
              <div className="space-y-3">
                {past.map((d) => <DealRow key={d.transactionId} deal={d} uid={uid} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
