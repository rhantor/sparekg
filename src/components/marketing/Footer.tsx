import Link from 'next/link';
import { Plane, Globe, AtSign, MessageCircle, Mail } from 'lucide-react';

const COLS = [
  {
    title: 'Platform',
    links: [
      { label: 'How It Works', href: '#how' },
      { label: 'Find Travelers', href: '#feeds' },
      { label: 'Find Senders', href: '#feeds' },
      { label: 'Join Beta', href: '#beta' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About SpareKG', href: '#about' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Press Kit', href: '#' },
    ],
  },
  {
    title: 'Legal & Support',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms & Conditions', href: '#' },
      { label: 'Safety Guidelines', href: '#trust' },
      { label: 'hello@sparekg.com', href: 'mailto:hello@sparekg.com' },
    ],
  },
];

const SOCIALS = [Globe, AtSign, MessageCircle, Mail];

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
          <div className="flex gap-2.5 mt-5">
            {SOCIALS.map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {COLS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
            {col.links.map((l) => (
              <a key={l.label} href={l.href} className="block text-sm text-white/55 hover:text-white mb-2.5 transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 pt-6 text-[0.8rem] text-white/50">
        <span>© 2025 SpareKG. All rights reserved · www.sparekg.com</span>
        <span>Made with care for the community</span>
      </div>
    </footer>
  );
}
