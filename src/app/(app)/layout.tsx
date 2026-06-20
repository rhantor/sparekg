'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/ui/Avatar';
import { currentUser } from '@/lib/app-samples';
import { Plane, Home, Search, PlusCircle, Layers, User, LogOut, Coins, ShieldAlert } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/flights', label: 'Flights', icon: Search },
  { href: '/flights/new', label: 'Post', icon: PlusCircle },
  { href: '/bids', label: 'Bids', icon: Layers },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, kycApproved, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated || !user) {
    return (
      <div className="site flex h-screen items-center justify-center bg-sand">
        <div className="w-9 h-9 rounded-full border-2 border-line border-t-teal animate-spin" />
      </div>
    );
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/home' && pathname.startsWith(href));

  return (
    <div className="site min-h-screen flex flex-col bg-sand">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-line">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <Link href="/home" className="flex items-center gap-2 font-display text-lg font-semibold text-navy">
            <span className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
              <Plane className="w-4 h-4 text-teal-500" />
            </span>
            Spare<span className="text-teal">KG</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? 'bg-navy/[0.05] text-navy' : 'text-ash hover:text-navy hover:bg-navy/[0.03]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-teal' : ''}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal/[0.08] text-teal-700 text-sm font-semibold">
              <Coins className="w-4 h-4" /> {currentUser.points}
            </span>
            <Link href="/profile">
              <Avatar name={user.displayName || currentUser.name} color={currentUser.color} size={34} />
            </Link>
            <button onClick={logout} aria-label="Sign out" className="w-9 h-9 rounded-lg flex items-center justify-center text-ash hover:text-rose-600 hover:bg-rose-500/[0.06] transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KYC banner */}
        {!kycApproved && (
          <Link
            href="/profile/kyc"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/[0.1] border-t border-amber-500/15 text-amber-700 hover:bg-amber-500/[0.14] transition-colors text-sm font-medium"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Verify your identity to start posting flights and bidding — complete KYC →
          </Link>
        )}
      </header>

      {/* Page content with transition */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-7 pb-24 md:pb-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around bg-white border-t border-line py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[0.65rem] font-medium ${active ? 'text-teal' : 'text-ash'}`}>
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
