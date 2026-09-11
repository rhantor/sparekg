// Sample data for the authenticated user app.
//
// The marketplace pages now read live Firestore data; what remains here backs
// the parts of the shell that Phase 3+ will replace (points balance, and the
// admin console's mock screens). View-model types live in view-models.ts so the
// live and sample paths cannot drift apart.

import type { AppBid, AppFlight, AvatarColor } from './view-models';

export type { AppBid, AppFlight, AvatarColor, BidStatus, FlightStatus } from './view-models';

export interface CurrentUser {
  name: string;
  email: string;
  color: AvatarColor;
  kyc: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NONE';
  points: number;
  promo: number;
  rating: number;
  ratingCount: number;
  tripsAsTraveler: number;
  tripsAsSender: number;
  homeAirport: string;
}

export const currentUser: CurrentUser = {
  name: 'Rahim Khan',
  email: 'rahim.khan@gmail.com',
  color: 'ocean',
  kyc: 'APPROVED',
  points: 340,
  promo: 40,
  rating: 4.8,
  ratingCount: 15,
  tripsAsTraveler: 12,
  tripsAsSender: 3,
  homeAirport: 'KUL',
};

export const browseFlights: AppFlight[] = [
  {
    id: 'f1', travelerName: 'Ahmad Musa', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 87,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '25 Apr 2025', departureTime: '25 Apr, 09:15 · Kuala Lumpur time', arrivalTime: '25 Apr, 10:55 · Dhaka time', airline: 'Malaysia Airlines', kgTotal: 15, kgLeft: 8, pricePerKg: 20,
    categories: ['Clothes', 'Books', 'Documents'], status: 'LIVE', bids: 5, featured: true,
  },
  {
    id: 'f2', travelerName: 'Rahim Karim', travelerColor: 'teal', travelerRating: 5.0, travelerTrips: 120,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '2 May 2025', departureTime: '2 May, 13:40 · Kuala Lumpur time', arrivalTime: '2 May, 15:20 · Dhaka time', airline: 'Biman Bangladesh', kgTotal: 20, kgLeft: 12, pricePerKg: 18,
    categories: ['Electronics', 'Documents'], status: 'LIVE', bids: 3, featured: false,
  },
  {
    id: 'f3', travelerName: 'Siti Nur', travelerColor: 'navy', travelerRating: 4.6, travelerTrips: 42,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Chittagong', destinationCode: 'CGP',
    date: '10 May 2025', departureTime: '10 May, 21:05 · Kuala Lumpur time', arrivalTime: '10 May, 22:30 · Chittagong time', airline: 'US-Bangla', kgTotal: 10, kgLeft: 5, pricePerKg: 12,
    categories: ['Clothes', 'Personal'], status: 'LIVE', bids: 1, featured: false,
  },
  {
    id: 'f4', travelerName: 'Kamal Uddin', travelerColor: 'ocean', travelerRating: 4.2, travelerTrips: 6,
    verified: true, origin: 'Penang', originCode: 'PEN', destination: 'Dhaka', destinationCode: 'DAC',
    date: '14 May 2025', departureTime: '14 May, 07:50 · Penang time', arrivalTime: '14 May, 09:40 · Dhaka time', airline: 'Malindo Air', kgTotal: 12, kgLeft: 12, pricePerKg: 16,
    categories: ['Food', 'Cosmetics'], status: 'LIVE', bids: 0, featured: false,
  },
];

export const myFlights: AppFlight[] = [
  {
    id: 'mf1', travelerName: 'Rahim Khan', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 12,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '20 May 2025', departureTime: '20 May, 16:00 · Kuala Lumpur time', arrivalTime: '20 May, 17:40 · Dhaka time', airline: 'Malaysia Airlines', kgTotal: 15, kgLeft: 8, pricePerKg: 35,
    categories: ['Electronics', 'Clothing'], status: 'LIVE', bids: 3, mine: true, featured: true,
  },
  {
    id: 'mf2', travelerName: 'Rahim Khan', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 12,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '2 Apr 2025', departureTime: '2 Apr, 11:25 · Kuala Lumpur time', arrivalTime: '2 Apr, 13:05 · Dhaka time', airline: 'Biman Bangladesh', kgTotal: 20, kgLeft: 0, pricePerKg: 30,
    categories: ['Documents'], status: 'COMPLETED', bids: 6, mine: true, featured: false,
  },
];

export const myBids: AppBid[] = [
  {
    id: 'b1', flightId: 'f1', counterpartyName: 'Ahmad Musa', counterpartyColor: 'ocean',
    route: 'KUL → DAC', date: '25 Apr 2025', kg: 5, item: 'Documents & gifts',
    offeredTotal: 100, status: 'PENDING', role: 'sender',
    urgencyLevel: 2, urgencyExpiresAt: '2030-01-01T00:00:00Z',
  },
  {
    id: 'b2', flightId: 'f2', counterpartyName: 'Rahim Karim', counterpartyColor: 'teal',
    route: 'KUL → DAC', date: '2 May 2025', kg: 3, item: 'Electronics', offeredTotal: 54,
    status: 'AGREED', role: 'sender',
    urgencyLevel: 0, urgencyExpiresAt: null,
  },
];

export const incomingBids: AppBid[] = [
  {
    id: 'ib1', flightId: 'mf1', counterpartyName: 'Fatima Begum', counterpartyColor: 'teal',
    route: 'KUL → DAC', date: '20 May 2025', kg: 5, item: 'Samsung Galaxy S24 x2',
    offeredTotal: 150, status: 'PENDING', role: 'traveler',
    urgencyLevel: 1, urgencyExpiresAt: '2030-01-01T00:00:00Z',
  },
  {
    id: 'ib2', flightId: 'mf1', counterpartyName: 'Kamal Uddin', counterpartyColor: 'navy',
    route: 'KUL → DAC', date: '20 May 2025', kg: 2, item: 'Legal documents',
    offeredTotal: 80, status: 'AGREED', role: 'traveler',
    urgencyLevel: 0, urgencyExpiresAt: null,
  },
];
