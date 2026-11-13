'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Plane } from 'lucide-react';

const LINKS = [
  { href: '/#how', label: 'How It Works' },
  { href: '/#feeds', label: 'Open Flights' },
  { href: '/#trust', label: 'Safety' },
  { href: '/#about', label: 'About' },
];

/**
 * Public navigation. Transparent over the sky at the top of a page, then a
 * dark glass bar once the page scrolls — white text reads on both.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const glass = scrolled || open;

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] text-white transition-all duration-300 ${
        glass ? 'bg-navy/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-white">
          <span className="w-9 h-9 rounded-xl bg-white/12 border border-white/15 backdrop-blur flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </span>
          Spare<span className="text-[#ffd9a8]">KG</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/#beta" className="px-5 py-2.5 rounded-full bg-white text-navy text-sm font-semibold hover:bg-white/90 transition-colors">
            Join the beta
          </Link>
        </div>

        <button className="md:hidden text-white" onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 flex flex-col p-5 gap-4">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-white/90">
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-white/90">
            Sign in
          </Link>
          <Link href="/#beta" onClick={() => setOpen(false)} className="px-4 py-3 rounded-full bg-white text-navy text-sm font-semibold text-center">
            Join the beta
          </Link>
        </div>
      )}
    </nav>
  );
}
