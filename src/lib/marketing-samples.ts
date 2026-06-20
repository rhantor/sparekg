// Sample content for the public landing page. Marketing/demo data only.

import type { TrustVariant } from '@/components/ui/TrustBadge';
import type { PriorityLevel } from '@/components/ui/PriorityBadge';

export type AvatarColor = 'ocean' | 'teal' | 'navy';

export interface FeedItem {
  name: string;
  color: AvatarColor;
  verified: boolean;
  rating: number;
  reviews: number;
  trips: number;
  badges: { variant: TrustVariant; label: string }[];
  route: [string, string];
  details: { label: string; value: string }[];
  priority: { level: PriorityLevel; label: string };
  priceLabel: string;
  price: string;
  priceUnit: string;
  bids: number;
  timer: string;
  side: 'traveler' | 'sender';
}

export const travelerFeed: FeedItem[] = [
  {
    name: 'Ahmad Musa', color: 'ocean', verified: true, rating: 4.8, reviews: 62, trips: 87,
    badges: [
      { variant: 'verified', label: 'Verified Traveler' },
      { variant: 'id', label: 'ID Verified' },
      { variant: 'top', label: 'Top Rated' },
    ],
    route: ['Kuala Lumpur', 'Dhaka'],
    details: [
      { label: 'Travel Date', value: '25 Apr 2025' },
      { label: 'Spare Weight', value: '10 KG' },
      { label: 'Item Preference', value: 'Clothes / Books' },
    ],
    priority: { level: 'express', label: 'Express · 1 Day · RM20–30/kg' },
    priceLabel: 'Offer Price', price: 'RM 20', priceUnit: '/ kg',
    bids: 5, timer: '1h 42m', side: 'traveler',
  },
  {
    name: 'Rahim Karim', color: 'teal', verified: true, rating: 5.0, reviews: 120, trips: 120,
    badges: [
      { variant: 'verified', label: 'Verified Traveler' },
      { variant: 'id', label: 'ID Verified' },
      { variant: 'frequent', label: 'Frequent Traveler' },
      { variant: 'top', label: 'Top Rated' },
    ],
    route: ['Kuala Lumpur', 'Dhaka'],
    details: [
      { label: 'Travel Date', value: '2 May 2025' },
      { label: 'Spare Weight', value: '7 KG' },
      { label: 'Item Preference', value: 'Electronics / Documents' },
    ],
    priority: { level: 'priority', label: 'Priority · 3 Days · RM15–22/kg' },
    priceLabel: 'Offer Price', price: 'RM 18', priceUnit: '/ kg',
    bids: 3, timer: '2h 15m', side: 'traveler',
  },
  {
    name: 'Siti Nur', color: 'navy', verified: true, rating: 4.6, reviews: 38, trips: 42,
    badges: [
      { variant: 'verified', label: 'Verified Traveler' },
      { variant: 'id', label: 'ID Verified' },
    ],
    route: ['Kuala Lumpur', 'Chittagong'],
    details: [
      { label: 'Travel Date', value: '10 May 2025' },
      { label: 'Spare Weight', value: '5 KG' },
      { label: 'Item Preference', value: 'Clothes / Personal' },
    ],
    priority: { level: 'flexible', label: 'Flexible · 30 Days · RM8–15/kg' },
    priceLabel: 'Offer Price', price: 'RM 12', priceUnit: '/ kg',
    bids: 1, timer: '0h 58m', side: 'traveler',
  },
];

export const senderFeed: FeedItem[] = [
  {
    name: 'Mohammed Hasan', color: 'teal', verified: true, rating: 4.9, reviews: 45, trips: 38,
    badges: [
      { variant: 'id', label: 'ID Verified' },
      { variant: 'top', label: 'Top Sender' },
    ],
    route: ['Malaysia', 'Dhaka'],
    details: [
      { label: 'Item Weight', value: '5 KG' },
      { label: 'Item Type', value: 'Personal Goods' },
      { label: 'Delivery City', value: 'Dhaka' },
    ],
    priority: { level: 'express', label: 'Express Delivery · 1 Day' },
    priceLabel: 'Sender Offer', price: 'RM 22', priceUnit: '/ kg',
    bids: 4, timer: '1h 20m', side: 'sender',
  },
  {
    name: 'Farhan Ahmed', color: 'ocean', verified: true, rating: 4.5, reviews: 19, trips: 14,
    badges: [
      { variant: 'id', label: 'ID Verified' },
      { variant: 'verified', label: 'Verified Member' },
    ],
    route: ['KL', 'Sylhet'],
    details: [
      { label: 'Item Weight', value: '3 KG' },
      { label: 'Item Type', value: 'Clothes & Gifts' },
      { label: 'Delivery City', value: 'Sylhet' },
    ],
    priority: { level: 'priority', label: 'Priority Delivery · 3 Days' },
    priceLabel: 'Sender Offer', price: 'RM 17', priceUnit: '/ kg',
    bids: 2, timer: '2h 05m', side: 'sender',
  },
  {
    name: 'Nurul Binte', color: 'navy', verified: true, rating: 4.7, reviews: 8, trips: 6,
    badges: [{ variant: 'id', label: 'ID Verified' }],
    route: ['Penang', 'Dhaka'],
    details: [
      { label: 'Item Weight', value: '2 KG' },
      { label: 'Item Type', value: 'Medicine / Docs' },
      { label: 'Delivery City', value: 'Dhaka' },
    ],
    priority: { level: 'standard', label: 'Standard · 15 Days · RM10–18/kg' },
    priceLabel: 'Sender Offer', price: 'RM 14', priceUnit: '/ kg',
    bids: 1, timer: '1h 50m', side: 'sender',
  },
];

export const tickerItems: string[] = [
  'KL → Dhaka — 12 active requests',
  'Penang → Dhaka — 5 active requests',
  'Johor → Sylhet — 3 active requests',
  'KL → Chittagong — 7 active requests',
  'New match: Rahim K. connected with Mohammed H.',
];

export const explainerVideos = [
  { title: 'How SpareKG Works', duration: '3 min overview' },
  { title: 'Why Luggage Weight Goes to Waste', duration: '2 min explainer' },
  { title: 'How Travelers Can Earn Money', duration: '2 min guide' },
  { title: 'Send Items Cheaper to Bangladesh', duration: '2 min guide' },
];

export const WHATSAPP_NUMBER = '601234567890';
