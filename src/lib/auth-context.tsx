'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, signInWithPopup, signOut, type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import type { AdminUser } from './types';

interface RegisterResult { ok: boolean; error?: string }

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  kycApproved: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<RegisterResult>;
  register: (email: string, password: string, displayName: string) => Promise<RegisterResult>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Best-effort: establish a server-side session cookie so Server Actions / Route
 * Handlers can authenticate without trusting client-supplied ids. Requires Admin
 * SDK credentials (FIREBASE_SERVICE_ACCOUNT_KEY); if absent, client auth still
 * gates the UI — never block sign-in on this.
 */
async function establishSession(fbUser: FirebaseUser) {
  try {
    const idToken = await fbUser.getIdToken();
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } catch (err) {
    console.warn('Session cookie not established (server-side admin features disabled):', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const admin = tokenResult.claims.admin === true;
        const role = admin
          ? (tokenResult.claims.superAdmin ? 'super_admin' : 'admin')
          : 'admin'; // Fallback for basic setup if claims not set yet

        setIsAdmin(admin);
        setKycApproved(tokenResult.claims.kycApproved === true);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'New User',
          photoUrl: firebaseUser.photoURL,
          role: role as 'super_admin' | 'admin',
        });
      } else {
        setUser(null);
        setIsAdmin(false);
        setKycApproved(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await establishSession(cred.user);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<RegisterResult> => {
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await establishSession(cred.user);
      return { ok: true };
    } catch (error) {
      const code = (error as { code?: string }).code || '';
      // User closed the popup — benign, don't surface an error.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { ok: false };
      }
      console.error('Google sign-in failed:', error);
      const msg =
        code === 'auth/unauthorized-domain' ? 'This site isn’t authorized for sign-in yet. Add its domain in Firebase → Authentication → Settings → Authorized domains.'
        : code === 'auth/popup-blocked' ? 'Your browser blocked the sign-in popup. Allow popups and try again.'
        : code === 'auth/operation-not-allowed' ? 'Google sign-in isn’t enabled in Firebase yet.'
        : 'Google sign-in failed. Please try again.';
      return { ok: false, error: msg };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<RegisterResult> => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) await updateProfile(cred.user, { displayName });
        await establishSession(cred.user);
        return { ok: true };
      } catch (error) {
        const code = (error as { code?: string }).code || '';
        const msg =
          code === 'auth/email-already-in-use' ? 'That email is already registered.'
          : code === 'auth/weak-password' ? 'Password should be at least 6 characters.'
          : code === 'auth/invalid-email' ? 'Please enter a valid email address.'
          : 'Could not create your account. Please try again.';
        return { ok: false, error: msg };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' });
    await signOut(auth);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isAdmin,
      isSuperAdmin: isAdmin && user?.role === 'super_admin',
      kycApproved,
      login,
      loginWithGoogle,
      register,
      logout,
      loading,
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
