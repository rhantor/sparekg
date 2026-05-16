'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AdminUser, AdminRole } from './types';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock admin accounts — swap for Firebase Auth later
const MOCK_ADMINS: Record<string, { password: string; user: AdminUser }> = {
  'admin@sparekg.com': {
    password: 'admin123',
    user: { uid: 'admin1', email: 'admin@sparekg.com', displayName: 'Admin User', photoUrl: null, role: 'admin' },
  },
  'super@sparekg.com': {
    password: 'super123',
    user: { uid: 'superadmin1', email: 'super@sparekg.com', displayName: 'Super Admin', photoUrl: null, role: 'super_admin' },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));
    const account = MOCK_ADMINS[email];
    if (account && account.password === password) {
      setUser(account.user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSuperAdmin: user?.role === 'super_admin',
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
