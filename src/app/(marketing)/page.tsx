import { Hero } from '@/components/marketing/Hero';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { Videos } from '@/components/marketing/Videos';
import { Feeds } from '@/components/marketing/Feeds';
import { Beta } from '@/components/marketing/Beta';
import { Trust } from '@/components/marketing/Trust';
import { About } from '@/components/marketing/About';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <Videos />
      <Feeds />
      <Beta />
      <Trust />
      <About />
    </main>
  );
}
