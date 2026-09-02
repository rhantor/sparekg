'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  updateProfile, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { AdminRole, AdminUser } from './types';

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

/**
 * Writes the chosen name onto the Firestore profile after sign-up.
 *
 * The `onUserCreate` trigger seeds the document the instant the Auth account
 * exists — which is before `updateProfile()` has run — so it stores the
 * placeholder 'New User' and, because it uses create(), never revisits it.
 *
 * Waiting for the document to appear is deliberate: writing it ourselves first
 * would make that create() fail with "already exists", leaving a profile with a
 * name and none of the other fields.
 */
async function backfillDisplayName(uid: string, displayName: string) {
  const userRef = doc(db, 'users', uid);

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        if (snap.data().displayName !== displayName) {
          await setDoc(userRef, { displayName }, { merge: true });
        }
        return;
      }
    } catch (err) {
      console.warn('Could not sync display name to profile:', err);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  console.warn('Profile document never appeared; display name not synced.');
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
        // No fallback: absent claims mean "not an admin". Defaulting to a role
        // here would have every signed-in user render as staff.
        const role: AdminRole | null = admin
          ? (tokenResult.claims.superAdmin === true ? 'super_admin' : 'admin')
          : null;

        setIsAdmin(admin);
        setKycApproved(tokenResult.claims.kycApproved === true);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'New User',
          photoUrl: firebaseUser.photoURL,
          role,
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

  // Complete a redirect-based Google sign-in (popup-blocked fallback).
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => { if (result?.user) establishSession(result.user); })
      .catch((err) => console.warn('Redirect sign-in did not complete:', err));
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
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      await establishSession(cred.user);
      return { ok: true };
    } catch (error) {
      const code = (error as { code?: string }).code || '';
      // User closed the popup — benign, don't surface an error. It is logged
      // anyway: the same code is reported when the popup completes at Google
      // but the credential never reaches the opener, and silence there once
      // made a real failure look like nothing happening at all.
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.warn(`Google sign-in ended early (${code}).`);
        return { ok: false };
      }
      // Popup blocked by the browser — fall back to a full-page redirect.
      if (code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider); // navigates away
          return { ok: false };
        } catch (redirectErr) {
          console.error('Redirect sign-in failed:', redirectErr);
        }
      }
      console.error('Google sign-in failed:', error);
      const msg =
        code === 'auth/unauthorized-domain' ? 'This site isn’t authorized for sign-in yet. Add its domain in Firebase → Authentication → Settings → Authorized domains.'
        : code === 'auth/operation-not-allowed' ? 'Google sign-in isn’t enabled in Firebase yet.'
        : 'Google sign-in failed. Please try again.';
      return { ok: false, error: msg };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<RegisterResult> => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
          // onAuthStateChanged already fired with a null displayName; reflect the
          // real name now rather than making the user reload to see it.
          setUser((prev) => (prev ? { ...prev, displayName } : prev));
          // Not awaited — a slow trigger must not hold up sign-up.
          void backfillDisplayName(cred.user.uid, displayName);
        }
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
