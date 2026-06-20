import { Plane, Globe, ArrowRight } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/ui/Reveal';

const STATS = [
  { num: '500+', label: 'Travelers monthly' },
  { num: '30%+', label: 'Luggage wasted' },
  { num: 'RM80+', label: 'Avg courier / 5kg' },
  { num: 'RM25', label: 'Avg SpareKG / 5kg' },
];

export function About() {
  return (
    <section id="about" className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        {/* Route visual — premium navy panel */}
        <Reveal x={-24} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-700 via-navy to-navy-900 p-9 shadow-float">
          <div className="absolute -bottom-24 -right-20 w-72 h-72 rounded-full bg-teal/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 bg-teal/15 border border-teal/25 text-teal-300 px-3 py-1 rounded-full text-xs font-medium mb-8">
              <Globe className="w-3.5 h-3.5" /> Focus Route · MY → BD
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-xl text-white">Kuala Lumpur</div>
                <div className="text-xs text-white/45 mt-0.5">MYS · KUL</div>
              </div>
              <div className="flex-1 h-px bg-white/20 flex items-center justify-center">
                <Plane className="w-5 h-5 text-teal-300" />
              </div>
              <div className="text-right">
                <div className="font-display text-xl text-white">Dhaka</div>
                <div className="text-xs text-white/45 mt-0.5">BGD · DAC</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-8">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/[0.06] border border-white/10 rounded-xl p-4 text-center">
                  <div className="font-display text-xl text-white">{s.num}</div>
                  <div className="text-xs text-white/50 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal x={24} delay={0.1}>
          <SectionHeader label="Our Story" title="Solving a real problem in our community" />
          <div className="mt-5 space-y-4 text-[0.975rem] text-ash leading-relaxed">
            <p>
              Every day, hundreds of travelers fly between Malaysia and Bangladesh, and much of their
              luggage allowance goes unused. Meanwhile, many people need to send small items
              internationally but face expensive shipping and long delays.
            </p>
            <p>
              SpareKG connects these two groups through a simple, trusted platform — making travel
              more rewarding and sending more affordable for everyone.
            </p>
            <p>
              Built for and by the Malaysian-Bangladeshi community, with plans to expand to more
              routes as we grow.
            </p>
          </div>
          <a href="#beta" className="inline-flex items-center gap-2 mt-7 px-6 py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors">
            Join the movement <ArrowRight className="w-4 h-4" />
          </a>
        </Reveal>
      </div>
    </section>
  );
}
