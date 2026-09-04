"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { checkIsAdmin, ensureProfile } from "@/lib/data";
import type { UserProfile } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-reads the signed-in user's profile from Firestore and updates context. */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsAdmin(nextUser ? await checkIsAdmin() : false);
      if (!nextUser) setProfile(null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const { profile: nextProfile, isAdmin: admin } = await ensureProfile(cred.user);
      setProfile(nextProfile);
      setIsAdmin(admin);
    } catch (err) {
      await fbSignOut(auth).catch(() => {});
      throw err;
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    const provider = googleProvider ?? new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    try {
      // First-time Google users are provisioned here; unapproved ones are rejected.
      const { profile: nextProfile, isAdmin: admin } = await ensureProfile(cred.user);
      setProfile(nextProfile);
      setIsAdmin(admin);
    } catch (err) {
      await fbSignOut(auth).catch(() => {});
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    const { profile: nextProfile, isAdmin: admin } = await ensureProfile(auth.currentUser);
    setProfile(nextProfile);
    setIsAdmin(admin);
  }, []);

  const isTeacher = profile?.role === "teacher";

  const value = useMemo(
    () => ({ user, profile, loading, isAdmin, isTeacher, signInEmail, signInGoogle, signOut, refreshProfile }),
    [user, profile, loading, isAdmin, isTeacher, signInEmail, signInGoogle, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
