'use client';
import {
  Coins, Gift, CalendarCheck, Plane, Send, Undo2, Sparkles, Zap, ShoppingCart, ShieldCheck,
  AlertCircle, History, type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { useAuth } from '@/lib/auth-context';
import { useAppConfigQuery, useGetUserQuery, useMyLedgerQuery } from '@/lib/store/api';
import { DEFAULT_POINTS_ECONOMY } from '@/lib/economy';
import type { PointsCategory, PointsLedgerEntry } from '@/lib/types';

/** How each ledger category reads in a statement. */
const CATEGORY: Partial<Record<PointsCategory, { label: string; Icon: LucideIcon }>> = {
  SIGNUP: { label: 'Welcome bonus', Icon: Gift },
  MONTHLY: { label: 'Monthly credit', Icon: CalendarCheck },
  TRIP_REWARD: { label: 'Trip reward', Icon: Plane },
  BID_HOLD: { label: 'Bid fee held', Icon: Send },
  BID_CAPTURE: { label: 'Bid accepted', Icon: ShieldCheck },
  BID_REFUND: { label: 'Bid fee returned', Icon: Undo2 },
  FEATURE: { label: 'Featured listing', Icon: Sparkles },
  URGENCY: { label: 'Urgency boost', Icon: Zap },
  PURCHASE: { label: 'Purchase', Icon: ShoppingCart },
  ADMIN_ADJUSTMENT: { label: 'Adjustment by SpareKG', Icon: ShieldCheck },
};

/** The live economy: app_config overrides on top of the server's defaults. */
function economyFrom(config: Record<string, unknown> | undefined): Record<string, number> {
  const stored = (config?.pointsEconomy ?? {}) as Record<string, unknown>;
  const merged = { ...DEFAULT_POINTS_ECONOMY };
  for (const key of Object.keys(merged)) {
    const v = stored[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) merged[key] = Math.round(v);
  }
  return merged;
}

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function PointsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { data: profile } = useGetUserQuery(uid, { skip: !uid });
  const { data: ledger = [], isLoading, isError } = useMyLedgerQuery(uid, { skip: !uid });
  const { data: appConfig } = useAppConfigQuery();
  const economy = economyFrom(appConfig);

  const bonus = profile?.promoBalance ?? 0;
  const purchased = profile?.pointsBalance ?? 0;
  // Zero-delta rows (a hold being captured) record a state change, not a
  // movement — they would read as "+0" noise in a statement.
  const rows = ledger.filter((e) => e.delta !== 0);

  const EARN = [
    { Icon: Gift, text: `${economy.signupBonus} points when you join` },
    { Icon: CalendarCheck, text: `Up to ${economy.monthlyFree} free points each month you're active` },
    { Icon: Plane, text: `${economy.tripRewardTraveler} points for each trip you carry` },
    { Icon: Send, text: `${economy.deliveryRewardSender} points for each delivery you send` },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Points" subtitle="What you have, how it's used, and every movement." />

      <div className="grid md:grid-cols-[1.2fr_1fr] gap-5 mb-8">
        <div className="bg-navy rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
            <Coins className="w-4 h-4 text-teal-300" /> Available to spend
          </div>
          <div className="font-display text-4xl font-semibold text-white">{bonus + purchased}</div>
          <div className="text-sm text-white/60 mt-1">{bonus} bonus · {purchased} purchased</div>
          <p className="text-xs text-white/50 mt-4 leading-relaxed">
            Bonus points are spent first. Placing a bid holds {economy.bidSubmitCost} points, returned in full if the
            bid is declined, withdrawn or expires.
          </p>
          <button
            disabled
            className="mt-5 w-full py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-semibold cursor-not-allowed"
            title="Buying points arrives with online payments"
          >
            Buy points — coming soon
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-soft p-6">
          <h2 className="font-display text-lg font-semibold text-navy mb-4">Ways to earn</h2>
          <ul className="space-y-3">
            {EARN.map(({ Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-ink">
                <span className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="font-display text-lg font-semibold text-navy mb-3 flex items-center gap-2">
        <History className="w-4 h-4 text-teal" /> History
      </h2>
      {isLoading || !uid ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl border border-line bg-white/60 animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-line p-8 text-center">
          <AlertCircle className="w-6 h-6 text-rose-500 mx-auto mb-2" />
          <p className="text-sm text-ash">Couldn&apos;t load your points history. Please try again.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-line p-8 text-center text-sm text-ash">
          No points activity yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-line shadow-soft divide-y divide-line overflow-hidden">
          {rows.map((e) => <LedgerRow key={e.entryId ?? e.createdAt} entry={e} />)}
        </div>
      )}
    </div>
  );
}

function LedgerRow({ entry: e }: { entry: PointsLedgerEntry }) {
  const meta = CATEGORY[e.category] ?? { label: e.category, Icon: Coins };
  const Icon = meta.Icon;
  const credit = e.delta > 0;
  return (
    <div className="flex items-center gap-4 p-4">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${credit ? 'bg-leaf/10 text-leaf' : 'bg-navy/[0.05] text-ash'}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-navy truncate">{e.description || meta.label}</div>
        <div className="text-xs text-ash">{meta.label} · {when(e.createdAt)}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`font-semibold ${credit ? 'text-leaf' : 'text-navy'}`}>{credit ? '+' : ''}{e.delta}</div>
        <div className="text-xs text-ash">bal. {e.balanceAfter}</div>
      </div>
    </div>
  );
}
