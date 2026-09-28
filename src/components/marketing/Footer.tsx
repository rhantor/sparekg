import Link from 'next/link';
import { Plane } from 'lucide-react';

// Only links that lead somewhere. Blog, careers, press and social profiles
// return when they exist; a link to "#" reads as a broken site.
const COLS = [
  {
    title: 'Platform',
    links: [
      { label: 'How It Works', href: '/#how' },
      { label: 'Open Flights', href: '/#feeds' },
      { label: 'Post a Flight', href: '/flights/new' },
      { label: 'Create Account', href: '/signup' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About SpareKG', href: '/#about' },
      { label: 'Trust & Safety', href: '/#trust' },
      { label: 'Join the Beta', href: '/#beta' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Prohibited Items', href: '/prohibited-items' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy text-white/60 px-6 pt-16 pb-8">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 pb-10 border-b border-white/10">
        <div className="col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold text-white">
            <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Plane className="w-4 h-4 text-teal-300" />
            </span>
            Spare<span className="text-teal-300">KG</span>
          </Link>
          <p className="text-sm leading-relaxed mt-4 max-w-[260px]">
            Connecting travelers with unused luggage space to people who need to send items
            internationally.
          </p>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
            {col.links.map((l) => (
              <Link key={l.label} href={l.href} className="block text-sm text-white/55 hover:text-white mb-2.5 transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 pt-6 text-[0.8rem] text-white/50">
        <span>© {new Date().getFullYear()} SpareKG. All rights reserved.</span>
        <span>Made with care for the community</span>
      </div>
    </footer>
  );
}
