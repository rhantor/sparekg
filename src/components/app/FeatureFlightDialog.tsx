'use client';
import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAppConfigQuery, useFeatureFlightMutation } from '@/lib/store/api';
import { FEATURED_BLOCK_OPTIONS, boostPricesFrom } from '@/lib/economy';

interface FeatureFlightDialogProps {
  open: boolean;
  onClose: () => void;
  flightId: string;
  uid: string;
  /** ISO departure time — a featured run is clipped to it, so say so up front. */
  departureAt: string;
  /** Current run's end, when one is live, so "extend" reads honestly. */
  featuredUntil: string | null;
  balance: number;
}

function describeRun(blocks: number): string {
  return blocks === 1 ? '24 hours' : blocks === 7 ? '1 week' : `${blocks} days`;
}

/**
 * Buys featured placement on the traveler's own listing.
 *
 * The server clips a run to the flight's departure — placement after take-off is
 * placement nobody can act on. The dialog shows the clipped figure so the price
 * is never a surprise after the fact.
 */
export function FeatureFlightDialog({
  open,
  onClose,
  flightId,
  uid,
  departureAt,
  featuredUntil,
  balance,
}: FeatureFlightDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ until: string; spent: number } | null>(null);

  const { data: config } = useAppConfigQuery();
  const prices = boostPricesFrom(config);
  const [featureFlight, { isLoading }] = useFeatureFlightMutation();

  // Sampled once when the dialog mounts rather than read on every render: a
  // clock read during render is impure, and a dialog this short-lived gains
  // nothing from a ticking value.
  const [now] = useState(() => Date.now());
  const departure = Date.parse(departureAt);
  const runningUntil = featuredUntil && Date.parse(featuredUntil) > now ? Date.parse(featuredUntil) : null;

  async function buy(blocks: number) {
    setError(null);
    try {
      const res = await featureFlight({ flightId, blocks, uid }).unwrap();
      setDone({ until: res.featuredUntil, spent: res.pointsSpent });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not feature that listing.');
    }
  }

  function close() {
    setError(null);
    setDone(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Feature this listing"
      subtitle="Featured listings sit at the top of the browse results."
      maxWidth={480}
    >
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <p className="text-navy font-medium mb-1">Listing featured</p>
          <p className="text-sm text-ash mb-5">
            {done.spent} points spent. Featured until{' '}
            {new Date(done.until).toLocaleString(undefined, {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            .
          </p>
          <button
            onClick={close}
            className="px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 mb-4 rounded-lg bg-rose-500/[0.07] border border-rose-500/20 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {runningUntil && (
            <p className="text-xs text-ash mb-4 px-3 py-2 rounded-lg bg-teal/[0.05] border border-teal/15">
              Featured until{' '}
              {new Date(runningUntil).toLocaleString(undefined, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              . Buying more time adds to the end of that run.
            </p>
          )}

          <div className="space-y-2.5">
            {FEATURED_BLOCK_OPTIONS.map((blocks) => {
              const price = prices.featuredCostPer24h * blocks;
              const short = balance < price;
              const disabled = isLoading || short;

              // Mirror the server's clipping so the run shown is the run bought.
              const from = runningUntil ?? now;
              const uncapped = from + blocks * 24 * 3600_000;
              const clipped = uncapped > departure;

              return (
                <button
                  key={blocks}
                  onClick={() => buy(blocks)}
                  disabled={disabled}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    disabled
                      ? 'border-line bg-paper/60 cursor-not-allowed opacity-70'
                      : 'border-line hover:border-amber-500/40 hover:bg-amber-500/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy text-sm">{describeRun(blocks)}</div>
                      <div className="text-xs text-ash truncate">
                        {short
                          ? `Needs ${price - balance} more points.`
                          : clipped
                            ? 'Runs until departure, then stops.'
                            : 'Top of the browse list for the whole run.'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-navy text-sm">{price}</div>
                      <div className="text-[0.68rem] text-ash">points</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-5 pt-4 border-t border-line">
            <span className="text-xs text-ash">
              Balance: <span className="font-semibold text-navy">{balance}</span> points
            </span>
            {isLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-ash">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…
              </span>
            )}
          </div>

          <p className="text-[0.7rem] text-ash mt-3 leading-relaxed">
            Featured placement is not refundable and always ends at departure.
          </p>
        </>
      )}
    </Modal>
  );
}
