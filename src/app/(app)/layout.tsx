'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { StoreProvider } from '@/lib/store/StoreProvider';
import { useGetUserQuery } from '@/lib/store/api';
import { colorFor } from '@/lib/view-models';
import { Avatar } from '@/components/ui/Avatar';
import { SkyBackdrop } from '@/components/sky/SkyBackdrop';
import {
  Plane, Home, Search, PlusCircle, Layers, PackageCheck, User, LogOut, ShieldAlert,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/flights', label: 'Flights', icon: Search },
  { href: '/flights/new', label: 'Post', icon: PlusCircle },
  { href: '/bids', label: 'Bids', icon: Layers },
  { href: '/deliveries', label: 'Deliveries', icon: PackageCheck },
  { href: '/profile', label: 'Profile', icon: User },
];

/**
 * The one nav item for this path: the longest href it falls under, so
 * /flights/new lights up "Post" alone rather than "Flights" as well.
 */
function activeHref(pathname: string): string | undefined {
  return NAV_ITEMS
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // The shell is a child, not this component, so that it too can use the
  // marketplace hooks (the user's profile) under the provider.
  return (
    <StoreProvider>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, kycApproved, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: profile } = useGetUserQuery(user?.uid ?? '', { skip: !user?.uid });

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

  const current = activeHref(pathname);
  const isActive = (href: string) => href === current;

  return (
    <div className="site relative min-h-screen flex flex-col bg-sand">
      {/* A strip of sky behind the top of every page. Page titles sit on it,
          and the content below rises out of its clouds. */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[300px] md:h-[330px] pointer-events-none">
        <SkyBackdrop compact parallax />
      </div>

      <header className="sticky top-0 z-40 bg-navy/75 backdrop-blur-xl border-b border-white/10 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 md:px-6 py-3">
          <Link href="/home" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
            <span className="w-8 h-8 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center">
              <Plane className="w-4 h-4 text-white" />
            </span>
            Spare<span className="text-gold">KG</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/10 p-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    active ? 'text-navy' : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {/* The white pill glides between items. */}
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/profile" aria-label="Your profile">
              <Avatar
                name={profile?.displayName || user.displayName}
                color={colorFor(user.uid)}
                size={34}
              />
            </Link>
            <button onClick={logout} aria-label="Sign out" className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* KYC banner */}
        {!kycApproved && (
          <Link
            href="/profile/kyc"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/15 border-t border-gold/20 text-[#ffd9a8] hover:bg-gold/20 transition-colors text-sm font-medium"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Verify your identity to start posting flights and bidding — complete KYC →
          </Link>
        )}
      </header>

      {/* Page content with transition */}
      <main className="relative flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 pt-9 pb-28 md:pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            // No blur here: a leftover filter would trap fixed-position modals inside the page.
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around bg-white/90 backdrop-blur-xl border-t border-line py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`relative flex flex-col items-center gap-0.5 px-1.5 py-1 text-[0.65rem] font-medium ${active ? 'text-teal' : 'text-ash'}`}>
              {active && (
                <motion.span
                  layoutId="tab-dot"
                  className="absolute -top-2 h-1 w-6 rounded-full bg-teal"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className={`w-5 h-5 transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
