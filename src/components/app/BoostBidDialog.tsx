'use client';
import { useState } from 'react';
import { Zap, Loader2, AlertCircle, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAppConfigQuery, useBoostBidMutation } from '@/lib/store/api';
import {
  URGENCY_TIERS,
  boostPricesFrom,
  type UrgencyLevel,
} from '@/lib/economy';

interface BoostBidDialogProps {
  open: boolean;
  onClose: () => void;
  bidId: string;
  flightId: string;
  uid: string;
  /** The level already running, expiry already accounted for. 0 when none is. */
  activeLevel: 0 | UrgencyLevel;
  /** Spendable balance, for warning before the call rather than after it fails. */
  balance: number;
}

/**
 * Buys an urgency boost on a pending bid.
 *
 * Tiers below the one already running are shown as unavailable rather than
 * hidden: a sender who paid for Urgent should be able to see that Priority
 * exists and why it is closed to them, instead of watching options disappear.
 */
export function BoostBidDialog({
  open,
  onClose,
  bidId,
  flightId,
  uid,
  activeLevel,
  balance,
}: BoostBidDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ level: UrgencyLevel; spent: number } | null>(null);

  const { data: config } = useAppConfigQuery();
  const prices = boostPricesFrom(config);
  const [boostBid, { isLoading }] = useBoostBidMutation();

  async function buy(level: UrgencyLevel) {
    setError(null);
    try {
      const res = await boostBid({ bidId, level, flightId, uid }).unwrap();
      // Report what the server actually charged, not the price we displayed.
      setDone({ level, spent: res.pointsSpent });
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'Could not boost that bid.');
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
      title="Boost this bid"
      subtitle="Lift your offer above the others in the traveler's list."
      maxWidth={480}
    >
      {done ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-teal/10 text-teal flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6" />
          </div>
          <p className="text-navy font-medium mb-1">Boost applied</p>
          <p className="text-sm text-ash mb-5">
            {done.spent} points spent. Your bid is now at the{' '}
            {URGENCY_TIERS.find((t) => t.level === done.level)?.label} tier.
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

          <div className="space-y-2.5">
            {URGENCY_TIERS.map((tier) => {
              const price = prices[tier.priceKey];
              // A lower tier than the one running would buy less visibility than
              // the sender already has, so the server refuses it — say so here
              // rather than letting them spend and be rejected.
              const downgrade = activeLevel > tier.level;
              const short = balance < price;
              const disabled = isLoading || downgrade || short;

              return (
                <button
                  key={tier.level}
                  onClick={() => buy(tier.level)}
                  disabled={disabled}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    disabled
                      ? 'border-line bg-paper/60 cursor-not-allowed opacity-70'
                      : 'border-line hover:border-teal/40 hover:bg-teal/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy text-sm flex items-center gap-2">
                        {tier.label}
                        <span className="text-ash font-normal">· {tier.hours}h</span>
                        {activeLevel === tier.level && (
                          <span className="text-[0.68rem] font-semibold text-teal">running</span>
                        )}
                      </div>
                      <div className="text-xs text-ash truncate">
                        {downgrade
                          ? `A level ${activeLevel} boost is already running.`
                          : short
                            ? `Needs ${price - balance} more points.`
                            : activeLevel === tier.level
                              ? `Adds another ${tier.hours}h to the run.`
                              : tier.blurb}
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
            Boosts are not refundable, and a boost never outlives the bid it promotes.
          </p>
        </>
      )}
    </Modal>
  );
}
