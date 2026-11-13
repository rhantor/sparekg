import { Hero } from '@/components/marketing/Hero';
import { Journey } from '@/components/marketing/Journey';
import { LiveFlights } from '@/components/marketing/LiveFlights';
import { Beta } from '@/components/marketing/Beta';
import { Trust } from '@/components/marketing/Trust';
import { About } from '@/components/marketing/About';

// Open listings are read on the server; re-read them at most every five
// minutes rather than on every visit.
export const revalidate = 300;

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <LiveFlights />
      <Journey />
      <Trust />
      <Beta />
      <About />
    </main>
  );
}
