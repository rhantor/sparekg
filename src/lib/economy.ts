/**
 * Client-side view of boost pricing.
 *
 * These figures are for *display* only — the price a user is actually charged is
 * computed in `functions/src/points.ts` and returned as `pointsSpent`. Keeping a
 * copy here lets the UI show a cost before the user commits without a round
 * trip, but it is never the authority: if the two ever disagree, the server
 * wins and the confirmation shows what was really spent.
 *
 * The defaults mirror `DEFAULT_POINTS_ECONOMY` on the server, so a project with
 * no `app_config/main` document still shows the prices it will charge.
 */

export interface BoostPrices {
  featuredCostPer24h: number;
  urgencyLevel1CostPer24h: number;
  urgencyLevel2CostPer48h: number;
  urgencyLevel3CostPer72h: number;
}

export const DEFAULT_BOOST_PRICES: BoostPrices = {
  featuredCostPer24h: 15,
  urgencyLevel1CostPer24h: 10,
  urgencyLevel2CostPer48h: 25,
  urgencyLevel3CostPer72h: 50,
};

export type UrgencyLevel = 1 | 2 | 3;

export interface UrgencyTier {
  level: UrgencyLevel;
  label: string;
  hours: number;
  blurb: string;
  priceKey: keyof BoostPrices;
}

/** Mirrors `URGENCY_HOURS` on the server. Each tier is one fixed block. */
export const URGENCY_TIERS: UrgencyTier[] = [
  {
    level: 1,
    label: 'Priority',
    hours: 24,
    blurb: 'Sits above standard offers for a day.',
    priceKey: 'urgencyLevel1CostPer24h',
  },
  {
    level: 2,
    label: 'Express',
    hours: 48,
    blurb: 'Two days near the top of the list.',
    priceKey: 'urgencyLevel2CostPer48h',
  },
  {
    level: 3,
    label: 'Urgent',
    hours: 72,
    blurb: 'Three days in the highest tier.',
    priceKey: 'urgencyLevel3CostPer72h',
  },
];

/**
 * The full economy table, mirroring `DEFAULT_POINTS_ECONOMY` on the server.
 *
 * `BoostPrices` above is the subset the booking UI quotes. This is the whole set
 * and exists for the admin console, which has to render every tunable — including
 * ones no user-facing screen shows — and needs the same starting values the
 * server falls back to when `app_config/main` does not exist.
 */
export const DEFAULT_POINTS_ECONOMY: Record<string, number> = {
  signupBonus: 100,
  monthlyFree: 50,
  monthlyFreeCap: 200,
  flightPostCost: 0,
  bidSubmitCost: 10,
  featuredCostPer24h: 15,
  urgencyLevel1CostPer24h: 10,
  urgencyLevel2CostPer48h: 25,
  urgencyLevel3CostPer72h: 50,
  relistCost: 5,
  tripRewardTraveler: 25,
  deliveryRewardSender: 10,
  referralRewardReferrer: 50,
  referralRewardInvitee: 25,
};

/** Mirrors `DEFAULT_FEATURE_FLAGS` on the server. Both boosts ship dark. */
export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  enableFeaturedListings: false,
  enableUrgencyBoosts: false,
};

/**
 * Overlays an `app_config/main` document onto the flag defaults.
 *
 * Mirrors `getFeatureFlags` on the server, including its rule that a
 * non-boolean value falls back to the default. The server enforces these flags;
 * this exists so the UI does not advertise a button whose callable will reject
 * it. While a config read is in flight `config` is undefined and both flags
 * read false, which keeps a paid control from flickering into view on load.
 */
export function featureFlagsFrom(config: unknown): Record<string, boolean> {
  const stored = (config as { featureFlags?: Record<string, unknown> } | undefined)?.featureFlags;
  if (!stored) return DEFAULT_FEATURE_FLAGS;

  const merged = { ...DEFAULT_FEATURE_FLAGS };
  for (const key of Object.keys(DEFAULT_FEATURE_FLAGS)) {
    if (typeof stored[key] === 'boolean') merged[key] = stored[key] as boolean;
  }
  return merged;
}

/** Featured runs a traveler can buy in one go, in 24-hour blocks. */
export const FEATURED_BLOCK_OPTIONS = [1, 3, 7] as const;

/**
 * Overlays an `app_config/main` document onto the defaults.
 *
 * Field by field, ignoring anything non-numeric — the same rule the server
 * applies, so a malformed config cannot make the UI advertise a price of
 * `undefined` or a negative cost.
 */
export function boostPricesFrom(config: unknown): BoostPrices {
  const economy = (config as { pointsEconomy?: Record<string, unknown> } | undefined)?.pointsEconomy;
  if (!economy) return DEFAULT_BOOST_PRICES;

  const merged = { ...DEFAULT_BOOST_PRICES };
  for (const key of Object.keys(DEFAULT_BOOST_PRICES) as (keyof BoostPrices)[]) {
    const value = economy[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      merged[key] = Math.round(value);
    }
  }
  return merged;
}

/**
 * The urgency level actually in force right now.
 *
 * `expireBoosts` only sweeps hourly, so a stored level can outlive its paid
 * window. Anything that renders or prices a boost has to check the clock rather
 * than trust the stored field.
 */
export function activeUrgencyLevel(
  level: number | null | undefined,
  expiresAt: string | null | undefined,
  now: number = Date.now(),
): 0 | UrgencyLevel {
  if (!level || !expiresAt) return 0;
  if (Date.parse(expiresAt) <= now) return 0;
  return Math.min(3, Math.max(1, Math.round(level))) as UrgencyLevel;
}

/** Whether a listing's featured placement is still running. */
export function isFeaturedNow(
  isFeatured: boolean | undefined,
  featuredUntil: string | null | undefined,
  now: number = Date.now(),
): boolean {
  return Boolean(isFeatured) && Boolean(featuredUntil) && Date.parse(featuredUntil!) > now;
}
