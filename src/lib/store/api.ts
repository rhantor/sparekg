/**
 * The marketplace data layer.
 *
 * One `createApi` rather than a slice per collection, because the entities are
 * coupled: accepting a bid changes the bid *and* the flight's remaining kg and
 * status. Cross-api invalidation in RTK Query is clumsy, so keeping flights and
 * bids under a single tag namespace lets one mutation correctly refresh both.
 *
 * Reads go straight to Firestore under the security rules. Writes never do —
 * they all dispatch to a Cloud Function, because status, price and capacity are
 * server-owned (blueprint §4.4).
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  Bid, Flight, FlightTicket, LookupFlightResult, PointsLedgerEntry, TicketRejectionReason, User,
} from '../types';
import { firebaseBaseQuery, NOW, type QuerySpec } from './baseQuery';

const LIST = 'LIST' as const;

export interface FlightFilters {
  /** e.g. "KUL-DAC". Omit to browse every live route. */
  routeKey?: string;
  /** Hide listings that can't fit this shipment. Applied client-side (see below). */
  minKgRemaining?: number;
  max?: number;
}

export const marketplaceApi = createApi({
  reducerPath: 'marketplaceApi',
  baseQuery: firebaseBaseQuery,
  tagTypes: ['Flight', 'Bid', 'User', 'AppConfig'],
  // Firestore reads are billed per document, so hold results a little longer
  // than the 60s default — browsing back and forth shouldn't re-bill.
  keepUnusedDataFor: 180,
  endpoints: (builder) => ({
    // ---- Users ------------------------------------------------------------

    /** The signed-in user's profile document: balances, ratings, trip counts. */
    getUser: builder.query<User, string>({
      query: (uid) => ({ kind: 'doc', path: 'users', id: uid }),
      providesTags: (_r, _e, uid) => [{ type: 'User', id: uid }],
    }),

    // ---- Config -----------------------------------------------------------

    /**
     * Pricing and feature flags, readable by any signed-in user so the UI can
     * show what a boost costs before it is bought.
     *
     * The document is optional: a project without it errors with `not-found`,
     * and callers fall back to the defaults in `src/lib/economy.ts` — which are
     * the same figures the server would charge.
     */
    appConfig: builder.query<Record<string, unknown>, void>({
      query: () => ({ kind: 'doc', path: 'app_config', id: 'main' }),
      // Pricing changes about never; don't re-bill a read on every mount.
      keepUnusedDataFor: 3600,
      providesTags: ['AppConfig'],
    }),

    /**
     * Super-admin write of the economy tunables and feature flags.
     *
     * Rules deny every client write to `app_config`, so this goes through the
     * callable like every other mutation. Sends only the sections being changed;
     * the server merges them over what is stored.
     */
    updateAppConfig: builder.mutation<
      { pointsEconomy: Record<string, number>; featureFlags: Record<string, boolean> },
      { pointsEconomy?: Record<string, number>; featureFlags?: Record<string, boolean> }
    >({
      query: (data) => ({ kind: 'callable', name: 'updateAppConfig', data }),
      // The one-hour keepUnusedDataFor above means a stale price would otherwise
      // sit in the cache long after it was changed.
      invalidatesTags: ['AppConfig'],
    }),

    // ---- Points -----------------------------------------------------------

    /**
     * The caller's welcome bonus row, if it has landed.
     *
     * The bonus is issued by the `onUserCreate` auth trigger, which runs a moment
     * behind the redirect into the app and can fail on its own without failing
     * account creation. So the welcome dialog asks the ledger whether the points
     * are really there rather than announcing a figure from the config that may
     * never have been credited.
     *
     * `userId` is pinned to the caller and the limit kept small because the rules
     * only permit a list query that proves both.
     */
    signupBonus: builder.query<PointsLedgerEntry[], string>({
      query: (uid) => ({
        kind: 'collection',
        path: 'points_ledger',
        spec: {
          where: [
            ['userId', '==', uid],
            ['category', '==', 'SIGNUP'],
          ],
          orderBy: [['createdAt', 'desc']],
          limit: 1,
        },
      }),
      providesTags: (_r, _e, uid) => [{ type: 'User', id: uid }],
    }),

    // ---- Flights ----------------------------------------------------------

    listFlights: builder.query<Flight[], FlightFilters | void>({
      query: (filters) => {
        const f = filters || {};
        const spec: QuerySpec = {
          where: [
            ['status', '==', 'LIVE'],
            // Departed flights are dead weight in a browse list.
            ['departureAt', '>=', NOW],
          ],
          orderBy: [['departureAt', 'asc']],
          limit: f.max ?? 50,
        };
        if (f.routeKey) spec.where!.push(['routeKey', '==', f.routeKey]);
        return { kind: 'collection', path: 'flights', spec };
      },
      // Firestore permits only one range field per query, and departureAt already
      // uses it — so capacity is filtered here rather than costing a second index.
      //
      // Featured placement is applied here for the same reason: an `isFeatured`
      // sort would have to lead the orderBy, and Firestore requires the field a
      // query ranges on to come first. Sorting the page client-side is what a
      // traveler paid for — their listing sits above the rest of the results.
      //
      // `featuredUntil` is re-checked against the clock rather than trusting the
      // flag: `expireBoosts` only sweeps hourly, so a run that has just lapsed
      // can still be flagged and must not keep its placement.
      transformResponse: (docs: Flight[], _meta, filters) => {
        const min = (filters || {}).minKgRemaining;
        const visible = min ? docs.filter((d) => d.kgRemaining >= min) : docs;

        const now = Date.now();
        const featured = (f: Flight) =>
          f.isFeatured && f.featuredUntil !== null && Date.parse(f.featuredUntil) > now;

        // Stable within each group: the server already ordered by departureAt,
        // and Array.prototype.sort is required to be stable, so equal keys keep
        // that order instead of being reshuffled.
        return [...visible].sort((a, b) => Number(featured(b)) - Number(featured(a)));
      },
      providesTags: (result) => [
        { type: 'Flight' as const, id: LIST },
        ...(result ?? []).map((f) => ({ type: 'Flight' as const, id: f.flightId })),
      ],
    }),

    getFlight: builder.query<Flight, string>({
      query: (flightId) => ({ kind: 'doc', path: 'flights', id: flightId }),
      providesTags: (_r, _e, flightId) => [{ type: 'Flight', id: flightId }],
    }),

    /** The signed-in traveler's own listings, including ones hidden from browse. */
    myFlights: builder.query<Flight[], string>({
      query: (travelerId) => ({
        kind: 'collection',
        path: 'flights',
        spec: {
          where: [['travelerId', '==', travelerId]],
          orderBy: [['departureAt', 'desc']],
          limit: 50,
        },
      }),
      providesTags: (result) => [
        { type: 'Flight' as const, id: LIST },
        ...(result ?? []).map((f) => ({ type: 'Flight' as const, id: f.flightId })),
      ],
    }),

    postFlight: builder.mutation<{ flightId: string }, Record<string, unknown>>({
      query: (data) => ({ kind: 'callable', name: 'postFlight', data }),
      invalidatesTags: [{ type: 'Flight', id: LIST }],
    }),

    /**
     * A flight's published schedule, used to pre-fill the post form. A mutation
     * rather than a query: every call is billed by the provider, so it runs only
     * when the traveler presses the button, never on mount or refocus.
     */
    lookupFlight: builder.mutation<LookupFlightResult, { flightNumber: string; date: string }>({
      query: (data) => ({ kind: 'callable', name: 'lookupFlight', data }),
    }),

    /** The private ticket record behind a listing — readable by its traveler and staff only. */
    flightTicket: builder.query<FlightTicket, string>({
      query: (flightId) => ({ kind: 'doc', path: 'flight_tickets', id: flightId }),
      providesTags: (_r, _e, flightId) => [{ type: 'Flight' as const, id: `ticket-${flightId}` }],
    }),

    /** Staff decision on a listing's ticket. A rejection cancels the flight and refunds its bidders. */
    reviewFlightTicket: builder.mutation<
      { ticketStatus: 'VERIFIED' | 'REJECTED'; status: string; bidsDeclined: number },
      { flightId: string; decision: 'VERIFY' | 'REJECT'; reason?: TicketRejectionReason }
    >({
      query: (data) => ({ kind: 'callable', name: 'reviewFlightTicket', data }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Flight', id: arg.flightId },
        { type: 'Flight', id: `ticket-${arg.flightId}` },
        { type: 'Flight', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
      ],
    }),

    // ---- Bids -------------------------------------------------------------

    /**
     * Offers on one flight — what a traveler reviews before accepting.
     *
     * travelerId is pinned to the caller because bid reads are restricted to the
     * two parties, and Firestore rejects a list query it cannot prove is fully
     * readable. It also stops a sender enumerating rivals' offers.
     */
    bidsForFlight: builder.query<Bid[], { flightId: string; travelerId: string }>({
      query: ({ flightId, travelerId }) => ({
        kind: 'collection',
        path: 'bids',
        spec: {
          where: [
            ['travelerId', '==', travelerId],
            ['flightId', '==', flightId],
          ],
          orderBy: [['createdAt', 'desc']],
          limit: 100,
        },
      }),
      providesTags: (result, _e, { flightId }) => [
        { type: 'Bid' as const, id: `flight-${flightId}` },
        ...(result ?? []).map((b) => ({ type: 'Bid' as const, id: b.bidId })),
      ],
    }),

    /** Bids the signed-in user placed as a sender. */
    myBids: builder.query<Bid[], string>({
      query: (senderId) => ({
        kind: 'collection',
        path: 'bids',
        spec: {
          where: [['senderId', '==', senderId]],
          orderBy: [['createdAt', 'desc']],
          limit: 50,
        },
      }),
      providesTags: (result) => [
        { type: 'Bid' as const, id: LIST },
        ...(result ?? []).map((b) => ({ type: 'Bid' as const, id: b.bidId })),
      ],
    }),

    /** Bids awaiting the signed-in user's decision as a traveler. */
    incomingBids: builder.query<Bid[], string>({
      query: (travelerId) => ({
        kind: 'collection',
        path: 'bids',
        spec: {
          where: [['travelerId', '==', travelerId]],
          orderBy: [['createdAt', 'desc']],
          limit: 50,
        },
      }),
      providesTags: (result) => [
        { type: 'Bid' as const, id: LIST },
        ...(result ?? []).map((b) => ({ type: 'Bid' as const, id: b.bidId })),
      ],
    }),

    submitBid: builder.mutation<{ bidId: string }, Record<string, unknown>>({
      query: (data) => ({ kind: 'callable', name: 'submitBid', data }),
      // The flight's bidCount changed too.
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
        { type: 'Flight', id: String(arg.flightId) },
      ],
    }),

    /** Accepting consumes flight capacity, so the flight must refresh as well. */
    acceptBid: builder.mutation<
      { success: boolean; flightId: string; kgRemaining: number },
      { bidId: string; flightId: string }
    >({
      query: ({ bidId }) => ({ kind: 'callable', name: 'acceptBid', data: { bidId } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: arg.bidId },
        { type: 'Bid', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
        { type: 'Flight', id: arg.flightId },
        { type: 'Flight', id: LIST },
      ],
    }),

    declineBid: builder.mutation<{ success: boolean }, { bidId: string; flightId: string }>({
      query: ({ bidId }) => ({ kind: 'callable', name: 'declineBid', data: { bidId } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: arg.bidId },
        { type: 'Bid', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
      ],
    }),

    // ---- Paid boosts ------------------------------------------------------
    //
    // Both spend points, so the user document is invalidated alongside the
    // boosted entity — the balance in the header is stale the moment either
    // call succeeds.

    /** Buys featured placement on the caller's own listing, in 24-hour blocks. */
    featureFlight: builder.mutation<
      { flightId: string; featuredUntil: string; pointsSpent: number },
      { flightId: string; blocks: number; uid: string }
    >({
      query: ({ flightId, blocks }) => ({
        kind: 'callable',
        name: 'featureFlight',
        data: { flightId, blocks },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Flight', id: arg.flightId },
        // The browse list re-sorts once this listing is featured.
        { type: 'Flight', id: LIST },
        { type: 'User', id: arg.uid },
      ],
    }),

    /** Buys an urgency boost on the caller's own pending bid. */
    boostBid: builder.mutation<
      { bidId: string; level: 1 | 2 | 3; urgencyExpiresAt: string; pointsSpent: number },
      { bidId: string; level: 1 | 2 | 3; flightId: string; uid: string }
    >({
      query: ({ bidId, level }) => ({
        kind: 'callable',
        name: 'boostBid',
        data: { bidId, level },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: arg.bidId },
        { type: 'Bid', id: LIST },
        // The traveler's view of this flight's offers is ordered by urgency.
        { type: 'Bid', id: `flight-${arg.flightId}` },
        { type: 'User', id: arg.uid },
      ],
    }),
  }),
});

export const {
  useAppConfigQuery,
  useUpdateAppConfigMutation,
  useFlightTicketQuery,
  useReviewFlightTicketMutation,
  useLookupFlightMutation,
  useGetUserQuery,
  useSignupBonusQuery,
  useListFlightsQuery,
  useGetFlightQuery,
  useMyFlightsQuery,
  usePostFlightMutation,
  useBidsForFlightQuery,
  useMyBidsQuery,
  useIncomingBidsQuery,
  useSubmitBidMutation,
  useAcceptBidMutation,
  useDeclineBidMutation,
  useFeatureFlightMutation,
  useBoostBidMutation,
} = marketplaceApi;
