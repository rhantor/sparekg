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
  Bid, DeliveryCode, Dispute, Flight, FlightTicket, LookupFlightResult,
  TicketRejectionReason, Transaction, User,
} from '../types';
import {
  firebaseBaseQuery, NOW, type FirebaseQueryArgs, type FirebaseQueryError, type QuerySpec,
} from './baseQuery';

const LIST = 'LIST' as const;

/** A deal step changes the deal, its bid, and both parties' lists of each. */
const dealTags = (bidId: string) => [
  { type: 'Deal' as const, id: bidId },
  { type: 'Deal' as const, id: `dispute-${bidId}` },
  { type: 'Deal' as const, id: LIST },
  { type: 'Bid' as const, id: bidId },
  { type: 'Bid' as const, id: LIST },
];

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
  tagTypes: ['Flight', 'Bid', 'User', 'Deal'],
  // Firestore reads are billed per document, so hold results a little longer
  // than the 60s default — browsing back and forth shouldn't re-bill.
  keepUnusedDataFor: 180,
  endpoints: (builder) => ({
    // ---- Users ------------------------------------------------------------

    /** The signed-in user's profile document: contact details, ratings, trip counts. */
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

    /**
     * Accepting consumes flight capacity, so the flight must refresh as well —
     * and it opens a deal, so both parties' deal lists change.
     */
    acceptBid: builder.mutation<
      { success: boolean; flightId: string; kgRemaining: number; transactionId: string },
      { bidId: string; flightId: string }
    >({
      query: ({ bidId }) => ({ kind: 'callable', name: 'acceptBid', data: { bidId } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: arg.bidId },
        { type: 'Bid', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
        { type: 'Flight', id: arg.flightId },
        { type: 'Flight', id: LIST },
        { type: 'Deal', id: LIST },
      ],
    }),

    /** The sender takes back an unanswered bid. */
    withdrawBid: builder.mutation<{ success: boolean }, { bidId: string; flightId: string }>({
      query: ({ bidId }) => ({ kind: 'callable', name: 'withdrawBid', data: { bidId } }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Bid', id: arg.bidId },
        { type: 'Bid', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
      ],
    }),

    /** The traveler withdraws a listing nobody has been accepted on yet. */
    cancelFlight: builder.mutation<{ success: boolean; bidsDeclined: number }, { flightId: string }>({
      query: (data) => ({ kind: 'callable', name: 'cancelFlight', data }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Flight', id: arg.flightId },
        { type: 'Flight', id: LIST },
        { type: 'Bid', id: `flight-${arg.flightId}` },
        { type: 'Bid', id: LIST },
      ],
    }),

    // ---- Deals (agreed bids) -----------------------------------------------
    //
    // A deal is `transactions/{bidId}`: it shares its bid's id and mirrors its
    // status, so every step below refreshes the deal and the bid together.

    /**
     * Every deal the user is part of, on either side, newest first.
     *
     * Two queries because the rules only allow a list that pins the caller to
     * one side — Firestore cannot prove an `OR` across travelerId/senderId.
     */
    myDeals: builder.query<Transaction[], string>({
      async queryFn(uid, _api, _extra, baseQuery) {
        const side = (field: 'travelerId' | 'senderId'): FirebaseQueryArgs => ({
          kind: 'collection',
          path: 'transactions',
          spec: { where: [[field, '==', uid]], orderBy: [['createdAt', 'desc']], limit: 50 },
        });
        const [asTraveler, asSender] = await Promise.all([
          baseQuery(side('travelerId')),
          baseQuery(side('senderId')),
        ]);
        const error = (asTraveler.error ?? asSender.error) as FirebaseQueryError | undefined;
        if (error) return { error };
        const deals = [
          ...(asTraveler.data as Transaction[]),
          ...(asSender.data as Transaction[]),
        ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return { data: deals };
      },
      providesTags: (result) => [
        { type: 'Deal' as const, id: LIST },
        ...(result ?? []).map((d) => ({ type: 'Deal' as const, id: d.transactionId })),
      ],
    }),

    getDeal: builder.query<Transaction, string>({
      query: (id) => ({ kind: 'doc', path: 'transactions', id }),
      providesTags: (_r, _e, id) => [{ type: 'Deal', id }],
    }),

    /** The sender's copy of the delivery code. The rules refuse anyone else. */
    deliveryCode: builder.query<DeliveryCode, string>({
      query: (id) => ({ kind: 'doc', path: 'delivery_codes', id }),
      // The code never changes; there is no reason to read it twice.
      keepUnusedDataFor: 3600,
    }),

    confirmHandover: builder.mutation<{ status: string }, { bidId: string; note?: string }>({
      query: (data) => ({ kind: 'callable', name: 'confirmHandover', data }),
      invalidatesTags: (_r, _e, arg) => dealTags(arg.bidId),
    }),

    markDelivered: builder.mutation<
      { success: boolean; flightCompleted: boolean },
      { bidId: string; code: string }
    >({
      query: (data) => ({ kind: 'callable', name: 'markDelivered', data }),
      // Also on failure: a wrong code still bumps the attempt counter shown on the page.
      invalidatesTags: (_r, _e, arg) => [...dealTags(arg.bidId), { type: 'Flight', id: LIST }],
    }),

    /** A deal's dispute — readable by both parties so each sees staff's decision. */
    getDispute: builder.query<Dispute, string>({
      query: (id) => ({ kind: 'doc', path: 'disputes', id }),
      providesTags: (_r, _e, id) => [{ type: 'Deal', id: `dispute-${id}` }],
    }),

    openDispute: builder.mutation<{ success: boolean }, { bidId: string; reason: string }>({
      query: (data) => ({ kind: 'callable', name: 'openDispute', data }),
      invalidatesTags: (_r, _e, arg) => dealTags(arg.bidId),
    }),

    /** Staff decision on a dispute. The callable refuses anyone without the admin claim. */
    resolveDispute: builder.mutation<
      { success: boolean },
      {
        bidId: string;
        outcome: 'RESOLVED_FOR_SENDER' | 'RESOLVED_FOR_TRAVELER' | 'SPLIT' | 'CLOSED_INVALID';
        rationale: string;
      }
    >({
      query: (data) => ({ kind: 'callable', name: 'resolveDispute', data }),
      invalidatesTags: (_r, _e, arg) => dealTags(arg.bidId),
    }),

    submitRating: builder.mutation<
      { success: boolean },
      { bidId: string; stars: number; comment?: string }
    >({
      query: (data) => ({ kind: 'callable', name: 'submitRating', data }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Deal', id: arg.bidId }],
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
  useFlightTicketQuery,
  useReviewFlightTicketMutation,
  useLookupFlightMutation,
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
  useWithdrawBidMutation,
  useCancelFlightMutation,
  useMyDealsQuery,
  useGetDealQuery,
  useDeliveryCodeQuery,
  useGetDisputeQuery,
  useConfirmHandoverMutation,
  useMarkDeliveredMutation,
  useOpenDisputeMutation,
  useResolveDisputeMutation,
  useSubmitRatingMutation,
} = marketplaceApi;
