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
import type { Bid, Flight, User } from '../types';
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
  tagTypes: ['Flight', 'Bid', 'User'],
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
      transformResponse: (docs: Flight[], _meta, filters) => {
        const min = (filters || {}).minKgRemaining;
        return min ? docs.filter((d) => d.kgRemaining >= min) : docs;
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
  }),
});

export const {
  useGetUserQuery,
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
} = marketplaceApi;
