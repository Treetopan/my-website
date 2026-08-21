"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { ref, serverTimestamp, update } from "firebase/database";
import { auth, realtimeDb } from "@/lib/firebase";

type AuthState = {
  user: User | null;
  /** True until the first onAuthStateChanged fires — not the same as signed out. */
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * Firebase surfaces error codes, not sentences. Anything we do not have a
 * specific line for falls through to the raw message rather than a shrug.
 */
export function authErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Sign in instead.";
    case "auth/invalid-email":
      return "That email address isn't valid.";
    case "auth/weak-password":
      return "Passwords need at least six characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a minute and try again.";
    case "auth/network-request-failed":
      return "Can't reach Firebase. Check your connection.";
    default:
      return error instanceof Error
        ? error.message
        : "Something went wrong. Try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,

      async signUp(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });

        // Mirror the profile into RTDB so rooms and leaderboards can read a
        // name without a second auth lookup per player.
        await update(ref(realtimeDb, `users/${cred.user.uid}`), {
          displayName,
          email,
          createdAt: serverTimestamp(),
        });
      },

      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },

      async signOut() {
        await fbSignOut(auth);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
