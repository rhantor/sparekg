'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ShieldCheck, Users, Coins, Scale,
  Flag, FileText, Settings, ClipboardList, Plane, LogOut, ChevronRight, Sun, Moon,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/kyc', label: 'KYC Queue', icon: ShieldCheck, badgeKey: 'kyc' as const },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/economy', label: 'Economy', icon: Coins },
  { href: '/admin/disputes', label: 'Disputes', icon: Scale, badgeKey: 'disputes' as const },
  { href: '/admin/reports', label: 'Reports', icon: Flag, badgeKey: 'reports' as const },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  { href: '/admin/settings', label: 'Settings', icon: Settings, superOnly: true },
];

const BADGE_COUNTS: Record<string, number> = { kyc: 3, disputes: 2, reports: 2 };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isSuperAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="shimmer w-10 h-10 rounded-full" />
      </div>
    );
  }

  const filteredNav = NAV_ITEMS.filter(item => !item.superOnly || isSuperAdmin);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[260px] shrink-0 flex flex-col border-r bg-surface-50" style={{ borderColor: 'var(--t-border)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--t-border)' }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-heading">SpareKG</h2>
            <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted">Admin Panel</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNav.map(item => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            const badge = item.badgeKey ? BADGE_COUNTS[item.badgeKey] : undefined;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-link ${isActive ? 'active' : ''}`}>
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1">{item.label}</span>
                {badge && badge > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-brand-500/20 text-brand-400 text-[0.625rem] font-bold px-1.5">
                    {badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User + Theme + Logout */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--t-border)' }}>
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {user.displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-heading truncate">{user.displayName}</p>
              <p className="text-[0.625rem] text-muted truncate">
                {user.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          </div>
          <button onClick={toggleTheme} className="sidebar-link w-full mb-1">
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button onClick={logout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-surface-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="p-6 lg:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
