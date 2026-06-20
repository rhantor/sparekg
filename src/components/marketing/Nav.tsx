'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Plane } from 'lucide-react';

const LINKS = [
  { href: '#how', label: 'How It Works' },
  { href: '#feeds', label: 'Find Trips' },
  { href: '#about', label: 'About' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md border-b border-line' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-[1.35rem] font-semibold text-navy tracking-tight">
          <span className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
            <Plane className="w-4 h-4 text-teal-500" />
          </span>
          Spare<span className="text-teal">KG</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-ash hover:text-navy transition-colors">
              {l.label}
            </a>
          ))}
          <Link href="/login" className="text-sm font-medium text-ash hover:text-navy transition-colors">
            Sign In
          </Link>
          <a href="#beta" className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-semibold hover:bg-navy-700 transition-colors">
            Join Beta
          </a>
        </div>

        <button className="md:hidden text-navy" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-b border-line flex flex-col p-5 gap-3.5">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm font-medium text-navy">
              {l.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-ash">
            Sign In
          </Link>
          <a href="#beta" onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg bg-navy text-white text-sm font-semibold text-center">
            Join Beta
          </a>
        </div>
      )}
    </nav>
  );
}
