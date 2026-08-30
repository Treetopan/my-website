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
import { claimUsername, watchUsername, type ClaimResult } from "@/lib/social";

type AuthState = {
  user: User | null;
  /** True until the first onAuthStateChanged fires — not the same as signed out. */
  loading: boolean;
  /**
   * The name this player is known by, or null if they have not claimed one.
   * Watched rather than read once, so claiming a name updates every screen
   * showing it without a reload.
   */
  username: string | null;
  /** True until the username has been looked up. Not the same as having none. */
  usernameLoading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<ClaimResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Claims a username for the signed-in player, or says why it could not be. */
  setUsername: (username: string) => Promise<ClaimResult>;
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
  // Stamped with the uid it belongs to rather than cleared when the user
  // changes: an effect that clears state on the way out sets state during
  // render, and a name left over from the previous account would otherwise be
  // read as the new one's for a frame.
  const [profile, setProfile] = useState<{
    uid: string;
    username: string | null;
  } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  // The username lives in the database rather than on the auth profile,
  // because it is the thing another player looks you up by and a profile field
  // nobody else can read is no use for that. The profile carries a copy, which
  // is what rooms already show.
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    return watchUsername(uid, (name) => setProfile({ uid, username: name }));
  }, [user]);

  const mine = user && profile?.uid === user.uid ? profile : null;
  const username = mine?.username ?? null;
  const usernameLoading = user ? mine === null : false;

  const value = useMemo<AuthState>(() => {
    /**
     * Claiming is two writes: the index, which is what makes the name unique,
     * and the auth profile, which is the copy a room reads. The profile is
     * written second and only on success, so a name that lost the race never
     * ends up displayed as though it had been won.
     */
    async function claim(uid: string, raw: string): Promise<ClaimResult> {
      const result = await claimUsername(uid, raw);
      if (result.ok && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: result.username });
      }
      return result;
    }

    return {
      user,
      loading,
      username,
      usernameLoading,

      async signUp(email, password, wanted) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);

        // Mirror the account into RTDB so rooms and friends can read it
        // without a second auth lookup per player. The email is deliberately
        // not mirrored: that node is readable by every signed-in player, so a
        // copy of it here would be an address book the whole app can read.
        // Firebase Auth holds the address; the admin route joins it back on.
        await update(ref(realtimeDb, `users/${cred.user.uid}`), {
          createdAt: serverTimestamp(),
        });

        // A username that is taken by the time the account exists is not a
        // failed sign-up — the account is real and signed in. The gate asks
        // for another name rather than throwing the registration away.
        return claim(cred.user.uid, wanted);
      },

      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password);
      },

      async signOut() {
        await fbSignOut(auth);
      },

      async setUsername(raw) {
        if (!user) return { ok: false, problem: "You are not signed in." };
        return claim(user.uid, raw);
      },
    };
  }, [user, loading, username, usernameLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
