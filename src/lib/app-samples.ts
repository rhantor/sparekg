// Sample data for the authenticated user app. Demo only — Section E wires Firestore.

export type FlightStatus = 'LIVE' | 'LOCKED' | 'IN_TRANSIT' | 'COMPLETED' | 'DRAFT';
export type BidStatus = 'PENDING' | 'AGREED' | 'HANDED_OVER' | 'DELIVERED' | 'DECLINED';
export type AvatarColor = 'ocean' | 'teal' | 'navy';

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

export interface AppFlight {
  id: string;
  travelerName: string;
  travelerColor: AvatarColor;
  travelerRating: number;
  travelerTrips: number;
  verified: boolean;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  date: string;
  airline: string;
  kgTotal: number;
  kgLeft: number;
  pricePerKg: number;
  categories: string[];
  status: FlightStatus;
  bids: number;
  mine?: boolean;
}

export const browseFlights: AppFlight[] = [
  {
    id: 'f1', travelerName: 'Ahmad Musa', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 87,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '25 Apr 2025', airline: 'Malaysia Airlines', kgTotal: 15, kgLeft: 8, pricePerKg: 20,
    categories: ['Clothes', 'Books', 'Documents'], status: 'LIVE', bids: 5,
  },
  {
    id: 'f2', travelerName: 'Rahim Karim', travelerColor: 'teal', travelerRating: 5.0, travelerTrips: 120,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '2 May 2025', airline: 'Biman Bangladesh', kgTotal: 20, kgLeft: 12, pricePerKg: 18,
    categories: ['Electronics', 'Documents'], status: 'LIVE', bids: 3,
  },
  {
    id: 'f3', travelerName: 'Siti Nur', travelerColor: 'navy', travelerRating: 4.6, travelerTrips: 42,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Chittagong', destinationCode: 'CGP',
    date: '10 May 2025', airline: 'US-Bangla', kgTotal: 10, kgLeft: 5, pricePerKg: 12,
    categories: ['Clothes', 'Personal'], status: 'LIVE', bids: 1,
  },
  {
    id: 'f4', travelerName: 'Kamal Uddin', travelerColor: 'ocean', travelerRating: 4.2, travelerTrips: 6,
    verified: true, origin: 'Penang', originCode: 'PEN', destination: 'Dhaka', destinationCode: 'DAC',
    date: '14 May 2025', airline: 'Malindo Air', kgTotal: 12, kgLeft: 12, pricePerKg: 16,
    categories: ['Food', 'Cosmetics'], status: 'LIVE', bids: 0,
  },
];

export const myFlights: AppFlight[] = [
  {
    id: 'mf1', travelerName: 'Rahim Khan', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 12,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '20 May 2025', airline: 'Malaysia Airlines', kgTotal: 15, kgLeft: 8, pricePerKg: 35,
    categories: ['Electronics', 'Clothing'], status: 'LIVE', bids: 3, mine: true,
  },
  {
    id: 'mf2', travelerName: 'Rahim Khan', travelerColor: 'ocean', travelerRating: 4.8, travelerTrips: 12,
    verified: true, origin: 'Kuala Lumpur', originCode: 'KUL', destination: 'Dhaka', destinationCode: 'DAC',
    date: '2 Apr 2025', airline: 'Biman Bangladesh', kgTotal: 20, kgLeft: 0, pricePerKg: 30,
    categories: ['Documents'], status: 'COMPLETED', bids: 6, mine: true,
  },
];

export interface AppBid {
  id: string;
  flightId: string;
  counterpartyName: string;
  counterpartyColor: AvatarColor;
  route: string;
  date: string;
  kg: number;
  item: string;
  offeredTotal: number;
  status: BidStatus;
  role: 'sender' | 'traveler';
}

export const myBids: AppBid[] = [
  {
    id: 'b1', flightId: 'f1', counterpartyName: 'Ahmad Musa', counterpartyColor: 'ocean',
    route: 'KUL → DAC', date: '25 Apr 2025', kg: 5, item: 'Documents & gifts',
    offeredTotal: 100, status: 'PENDING', role: 'sender',
  },
  {
    id: 'b2', flightId: 'f2', counterpartyName: 'Rahim Karim', counterpartyColor: 'teal',
    route: 'KUL → DAC', date: '2 May 2025', kg: 3, item: 'Electronics', offeredTotal: 54,
    status: 'AGREED', role: 'sender',
  },
];

export const incomingBids: AppBid[] = [
  {
    id: 'ib1', flightId: 'mf1', counterpartyName: 'Fatima Begum', counterpartyColor: 'teal',
    route: 'KUL → DAC', date: '20 May 2025', kg: 5, item: 'Samsung Galaxy S24 x2',
    offeredTotal: 150, status: 'PENDING', role: 'traveler',
  },
  {
    id: 'ib2', flightId: 'mf1', counterpartyName: 'Kamal Uddin', counterpartyColor: 'navy',
    route: 'KUL → DAC', date: '20 May 2025', kg: 2, item: 'Legal documents',
    offeredTotal: 80, status: 'AGREED', role: 'traveler',
  },
];
