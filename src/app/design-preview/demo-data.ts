import type { PassFlight } from '@/components/sky/BoardingPass';

/**
 * Sample listings for the design preview only. Invented people and flights —
 * the page says so, and nothing here is read by the real app.
 */
export const DEMO_FLIGHTS: PassFlight[] = [
  {
    id: 'demo-1', traveler: 'Rahim Karim', rating: 4.9, trips: 12,
    from: 'KUL', fromCity: 'Kuala Lumpur', to: 'DAC', toCity: 'Dhaka',
    date: '18 Nov', departs: '14:30', arrives: '16:35',
    airline: 'Malaysia Airlines', flightNo: 'MH196',
    kgLeft: 17, kgTotal: 20, pricePerKg: 25, ticketVerified: true,
  },
  {
    id: 'demo-2', traveler: 'Nusrat Ahmed', rating: 4.8, trips: 5,
    from: 'PEN', fromCity: 'Penang', to: 'DAC', toCity: 'Dhaka',
    date: '21 Nov', departs: '09:10', arrives: '11:05',
    airline: 'Biman Bangladesh', flightNo: 'BG087',
    kgLeft: 8, kgTotal: 15, pricePerKg: 22, ticketVerified: true,
  },
  {
    id: 'demo-3', traveler: 'Tanvir Hasan', rating: 0, trips: 0,
    from: 'KUL', fromCity: 'Kuala Lumpur', to: 'CGP', toCity: 'Chittagong',
    date: '24 Nov', departs: '20:45', arrives: '22:40',
    airline: 'Batik Air', flightNo: 'OD162',
    kgLeft: 12, kgTotal: 12, pricePerKg: 28, ticketVerified: false,
  },
  {
    id: 'demo-4', traveler: 'Farhana Islam', rating: 5, trips: 3,
    from: 'KUL', fromCity: 'Kuala Lumpur', to: 'DAC', toCity: 'Dhaka',
    date: '27 Nov', departs: '07:55', arrives: '10:00',
    airline: 'US-Bangla', flightNo: 'BS316',
    kgLeft: 5, kgTotal: 10, pricePerKg: 24, ticketVerified: true,
  },
];
