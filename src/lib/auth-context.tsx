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

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Posts the fresh ID token to the server to enforce approval + sync claims. */
async function syncSession(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/sync", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    // Not approved / invalid — the server already deleted unapproved accounts.
    await fbSignOut(auth).catch(() => {});
    throw new Error(data.error ?? "Your account could not be verified.");
  }

  const data = (await res.json()) as { needsRefresh?: boolean };
  if (data.needsRefresh) {
    // Pull the newly-set admin claim into the active token.
    await user.getIdToken(true);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser) {
        const tokenResult = await nextUser.getIdTokenResult().catch(() => null);
        setIsAdmin(tokenResult?.claims.admin === true);
        setUser(nextUser);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await syncSession(cred.user);
    const tokenResult = await cred.user.getIdTokenResult();
    setIsAdmin(tokenResult.claims.admin === true);
  }, []);

  const signInGoogle = useCallback(async () => {
    const provider = googleProvider ?? new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await syncSession(cred.user);
    const tokenResult = await cred.user.getIdTokenResult();
    setIsAdmin(tokenResult.claims.admin === true);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAdmin, signInEmail, signInGoogle, signOut }),
    [user, loading, isAdmin, signInEmail, signInGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
