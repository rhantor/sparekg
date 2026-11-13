import { Ban, ScanSearch, BadgeCheck, Star, Handshake, ShieldCheck } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';
import { Tilt } from '@/components/ui/Interactive';

const PRINCIPLES = [
  { Icon: Ban, title: 'No Illegal Items', text: 'All items must comply with airline rules and customs regulations. Prohibited items are strictly not allowed.' },
  { Icon: ScanSearch, title: 'Item Inspection', text: 'Travelers must inspect and verify all items before carrying. Never carry sealed packages from strangers.' },
  { Icon: BadgeCheck, title: 'Identity Verification', text: 'All users verify their identity before posting on the platform.' },
  { Icon: Star, title: 'Community Ratings', text: 'A two-way rating system lets travelers and senders review each other after every trip.' },
  { Icon: Handshake, title: 'Safe Transactions', text: 'Transparent agreements and fair pricing. Disputes are handled by our support team.' },
  { Icon: ShieldCheck, title: 'Privacy Protected', text: 'Personal details are only shared after both parties agree to connect through SpareKG.' },
];

export function Trust() {
  return (
    <section id="trust" className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <SectionHeader
            center
            label="Trust & Safety"
            title="Built on community trust"
            desc="Every transaction on SpareKG is guided by safety principles that protect both sides."
          />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16">
          {PRINCIPLES.map(({ Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.08}>
              <Tilt max={6} radius="1rem" className="h-full">
              <div className="group h-full bg-white rounded-2xl border border-line shadow-soft p-7 hover:shadow-float transition-shadow duration-300">
                <span className="w-11 h-11 rounded-xl bg-navy/[0.04] flex items-center justify-center mb-5 transition-all duration-500 group-hover:bg-teal group-hover:scale-110 group-hover:-rotate-6">
                  <Icon className="w-5 h-5 text-teal transition-colors group-hover:text-white" />
                </span>
                <h3 className="font-semibold text-navy mb-2">{title}</h3>
                <p className="text-sm text-ash leading-relaxed">{text}</p>
              </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
