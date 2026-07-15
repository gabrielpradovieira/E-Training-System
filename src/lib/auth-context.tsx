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
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/client";
import { checkIsAdmin, createOwnProfile, ensureProfile } from "@/lib/data";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setIsAdmin(nextUser ? await checkIsAdmin() : false);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    try {
      const { isAdmin: admin } = await ensureProfile(cred.user);
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
      const { isAdmin: admin } = await ensureProfile(cred.user);
      setIsAdmin(admin);
    } catch (err) {
      await fbSignOut(auth).catch(() => {});
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
    }
    try {
      // Firestore rules reject this for non-approved emails.
      await createOwnProfile(cred.user);
    } catch (err) {
      // Not approved — remove the account we just created so nothing is left behind.
      await deleteUser(cred.user).catch(() => {});
      await fbSignOut(auth).catch(() => {});
      throw err;
    }
    setIsAdmin(await checkIsAdmin());
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, signInEmail, signInGoogle, register, signOut }),
    [user, loading, isAdmin, signInEmail, signInGoogle, register, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
